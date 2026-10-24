from __future__ import annotations
import time
from typing import Dict, List, Set, Tuple, Optional
from collections import defaultdict

from .models import (
    CSPExam, CSPRoom, CSPSlot, CSPValue,
    SoftConstraintWeights, SolverMetrics, DecisionEvent,
    SoftScoreBreakdown, TimetableResult
)
from .constraints import is_unary_consistent, are_binary_consistent, is_assignment_valid
from .heuristics import select_unassigned_variable_mrv_degree, order_domain_values_lcv
from .optimizer import evaluate_soft_constraints

class CSPScheduler:
    """
    Intelligent Examination Scheduling Engine implementing CSP with:
    - Minimum Remaining Values (MRV) Variable Ordering
    - Degree Heuristic Tie-Breaking
    - Least Constraining Value (LCV) Value Ordering
    - Forward Checking (FC) Constraint Propagation
    - Branch & Bound Soft-Constraint Optimization
    - Real decision event tracing for Viva & AI Explainability
    """

    def __init__(
        self,
        exams: List[CSPExam],
        rooms: List[CSPRoom],
        slots: List[CSPSlot],
        dates: List[str],
        shared_group_conflicts: Optional[Set[Tuple[str, str]]] = None,
        weights: Optional[SoftConstraintWeights] = None,
        max_search_seconds: float = 12.0,
        max_backtracks: int = 5000,
        optimize_soft_constraints: bool = True,
        optimization_budget_seconds: float = 3.0
    ):
        self.exams = exams
        self.rooms = rooms
        self.slots = slots
        self.dates = sorted(dates)
        self.shared_group_conflicts = shared_group_conflicts or set()
        self.weights = weights or SoftConstraintWeights()
        self.max_search_seconds = max_search_seconds
        self.max_backtracks = max_backtracks
        self.optimize_soft_constraints = optimize_soft_constraints
        self.optimization_budget_seconds = optimization_budget_seconds

        # Fast lookup indexes
        self.exams_by_id: Dict[str, CSPExam] = {e.id: e for e in self.exams}
        self.rooms_by_id: Dict[str, CSPRoom] = {r.id: r for r in self.rooms}
        self.slots_by_id: Dict[str, CSPSlot] = {s.id: s for s in self.slots}

        # Solver execution state
        self.metrics = SolverMetrics()
        self.events: List[DecisionEvent] = []
        self.check_counter = [0]
        self.step_counter = 0

        # Best solution tracking (Branch and Bound)
        self.best_assignments: Optional[Dict[str, CSPValue]] = None
        self.best_score: Optional[SoftScoreBreakdown] = None
        self.first_feasible_time: Optional[float] = None

    def _log_event(self, event_type: str, exam: Optional[CSPExam], details: str, reason: str):
        """Records an authentic algorithmic decision event for explainability."""
        self.step_counter += 1
        if len(self.events) < 150: # keep memory bounded to most relevant events
            self.events.append(DecisionEvent(
                step=self.step_counter,
                event_type=event_type,
                exam_id=exam.id if exam else "SYSTEM",
                exam_code=exam.code if exam else "N/A",
                details=details,
                reason=reason
            ))

    def pre_check_feasibility(self) -> Tuple[bool, List[str]]:
        """
        Fast analytical check for obvious structural infeasibility
        prior to launching CSP search.
        """
        failures = []

        if not self.exams:
            failures.append("No examinations provided for scheduling.")
        if not self.rooms:
            failures.append("No examination rooms available.")
        if not self.slots:
            failures.append("No time slots configured.")
        if not self.dates:
            failures.append("No examination dates configured.")

        if failures:
            return False, failures

        total_slot_periods = len(self.dates) * len(self.slots)

        # 1. Capacity and room type availability for each exam
        for exam in self.exams:
            eligible_rooms = [
                r for r in self.rooms
                if r.capacity >= exam.student_count
                and (not exam.required_room_type or r.room_type.lower() == exam.required_room_type.lower())
            ]
            if not eligible_rooms:
                req_type = f" of type '{exam.required_room_type}'" if exam.required_room_type else ""
                failures.append(
                    f"Exam {exam.code} ({exam.name}) requires capacity {exam.student_count}{req_type}, "
                    f"but no available room satisfies both capacity and room type."
                )

        # 2. Student group clash pigeonhole check:
        # A single group cannot have more exams than available total slots
        group_exam_counts: Dict[str, List[str]] = defaultdict(list)
        for exam in self.exams:
            for gid in exam.group_ids:
                group_exam_counts[gid].append(exam.code)

        for gid, codes in group_exam_counts.items():
            if len(codes) > total_slot_periods:
                failures.append(
                    f"Student group '{gid}' has {len(codes)} exams ({', '.join(codes)}), "
                    f"which exceeds the total available time slots ({total_slot_periods}) in the examination period."
                )

        # 3. Overall room-slot capacity
        total_room_slots = total_slot_periods * len(self.rooms)
        if len(self.exams) > total_room_slots:
            failures.append(
                f"Total required exams ({len(self.exams)}) exceeds total available room-slot capacity ({total_room_slots})."
            )

        if failures:
            return False, failures
        return True, []

    def compute_initial_domains(self) -> Tuple[bool, Dict[str, List[CSPValue]], List[str]]:
        """
        Builds initial domains for each examination variable and enforces unary constraints.
        """
        domains: Dict[str, List[CSPValue]] = {}
        infeasible_reasons = []

        # All conceivable (date, slot, room) triplets
        all_possible_values: List[CSPValue] = []
        for d in self.dates:
            for s in self.slots:
                for r in self.rooms:
                    all_possible_values.append(CSPValue(date=d, slot_id=s.id, room_id=r.id))

        for exam in self.exams:
            exam_domain: List[CSPValue] = []
            for val in all_possible_values:
                room = self.rooms_by_id[val.room_id]
                consistent, _ = is_unary_consistent(exam, val, room)
                if consistent:
                    exam_domain.append(val)

            if not exam_domain:
                infeasible_reasons.append(
                    f"Exam {exam.code} ({exam.name}) has zero valid assignment options after unary constraint filtering "
                    f"(Student count: {exam.student_count}, Allowed dates: {exam.allowed_dates or 'Any'}, "
                    f"Required room type: {exam.required_room_type or 'Any'})."
                )

            domains[exam.id] = exam_domain

        if infeasible_reasons:
            return False, domains, infeasible_reasons
        return True, domains, []

    def solve(self) -> TimetableResult:
        """
        Executes the AI CSP search algorithm.
        """
        start_time = time.time()
        self.metrics.search_duration_seconds = 0.0
        self.metrics.assignments_attempted = 0
        self.metrics.backtracks = 0
        self.metrics.constraint_checks = 0
        self.metrics.forward_checking_prunes = 0
        self.metrics.nodes_explored = 0
        self.events.clear()

        # Step 1: Pre-feasibility verification
        feasible, pre_failures = self.pre_check_feasibility()
        if not feasible:
            self.metrics.status = "INFEASIBLE"
            self.metrics.search_duration_seconds = time.time() - start_time
            self._log_event(
                "INFEASIBILITY_DETECTED", None,
                "Analytical pre-check discovered fundamental constraint violation",
                "; ".join(pre_failures)
            )
            return TimetableResult(
                success=False,
                status="INFEASIBLE",
                metrics=self.metrics,
                failure_reasons=pre_failures,
                explanations=self.events
            )

        # Step 2: Generate initial domains with unary constraint filtering
        domain_ok, domains, domain_failures = self.compute_initial_domains()
        if not domain_ok:
            self.metrics.status = "INFEASIBLE"
            self.metrics.search_duration_seconds = time.time() - start_time
            self._log_event(
                "INFEASIBILITY_DETECTED", None,
                "Unary domain reduction left one or more examinations with zero candidate slots/rooms",
                "; ".join(domain_failures)
            )
            return TimetableResult(
                success=False,
                status="INFEASIBLE",
                metrics=self.metrics,
                failure_reasons=domain_failures,
                explanations=self.events
            )

        # Step 3: Launch Backtracking Search with MRV, Degree, LCV, and Forward Checking
        assignments: Dict[str, CSPValue] = {}
        unassigned_ids = [e.id for e in self.exams]

        self._log_event(
            "START_SEARCH", None,
            f"CSP initialized with {len(self.exams)} variables, {len(self.rooms)} rooms, "
            f"{len(self.dates)} dates, {len(self.slots)} slots.",
            "Initial domain pruning completed successfully."
        )

        search_result = self._backtrack(assignments, unassigned_ids, domains, start_time)

        self.metrics.search_duration_seconds = time.time() - start_time

        if self.best_assignments is not None:
            # We found at least one valid complete timetable!
            self.best_score = evaluate_soft_constraints(
                self.best_assignments,
                self.exams_by_id,
                self.rooms_by_id,
                self.slots_by_id,
                self.dates,
                self.weights
            )
            final_status = "SUCCESS_OPTIMAL" if search_result == "EXHAUSTED" else "SUCCESS_FEASIBLE"
            self.metrics.status = final_status
            self._log_event(
                "SOLUTION_FOUND", None,
                f"Valid conflict-free timetable established (Penalty: {self.best_score.total_penalty:.2f})",
                f"Explored {self.metrics.nodes_explored} nodes, {self.metrics.backtracks} backtracks in {self.metrics.search_duration_seconds:.3f}s"
            )
            return TimetableResult(
                success=True,
                status=final_status,
                assignments=self.best_assignments,
                metrics=self.metrics,
                soft_score=self.best_score,
                explanations=self.events
            )
        else:
            # No complete assignment satisfying hard constraints found
            status = "TIMEOUT" if (time.time() - start_time) >= self.max_search_seconds else "INFEASIBLE"
            if self.metrics.backtracks >= self.max_backtracks:
                status = "BUDGET_EXCEEDED"
            self.metrics.status = status

            reasons = [
                f"CSP search terminated with status '{status}' after exploring {self.metrics.nodes_explored} nodes and {self.metrics.backtracks} backtracks.",
                "Hard constraint conflicts prevented assigning all examinations simultaneously. Consider adding examination dates, increasing room availability, or relaxing mutually clashing student group requirements."
            ]
            self._log_event(
                "SEARCH_TERMINATED", None,
                f"Search concluded without finding a complete conflict-free schedule ({status})",
                reasons[1]
            )
            return TimetableResult(
                success=False,
                status=status,
                metrics=self.metrics,
                failure_reasons=reasons,
                explanations=self.events
            )

    def _backtrack(
        self,
        assignments: Dict[str, CSPValue],
        unassigned_ids: List[str],
        domains: Dict[str, List[CSPValue]],
        start_time: float
    ) -> str:
        """
        Recursive Backtracking Search with MRV, Degree heuristic, LCV, and Forward Checking.
        Returns:
            - "FOUND_CONTINUE": valid solution found, continuing optimization
            - "STOP": time limit / budget exceeded, stop search immediately
            - "EXHAUSTED": complete search tree under this branch explored
        """
        # Time and search limits check
        elapsed = time.time() - start_time
        if elapsed >= self.max_search_seconds:
            return "STOP"
        if self.metrics.backtracks >= self.max_backtracks:
            return "STOP"

        # Optimization budget check after first feasible solution
        if self.first_feasible_time is not None:
            if not self.optimize_soft_constraints:
                return "STOP"
            if (time.time() - self.first_feasible_time) >= self.optimization_budget_seconds:
                return "STOP"

        # Base case: All variables assigned!
        if not unassigned_ids:
            score = evaluate_soft_constraints(
                assignments,
                self.exams_by_id,
                self.rooms_by_id,
                self.slots_by_id,
                self.dates,
                self.weights
            )
            if self.best_assignments is None:
                self.first_feasible_time = time.time()
                self.best_assignments = assignments.copy()
                self.best_score = score
                self._log_event(
                    "FIRST_FEASIBLE_FOUND", None,
                    f"First valid timetable found! Soft penalty: {score.total_penalty:.2f}",
                    "All hard constraints satisfied. Commencing optimization phase within remaining time budget."
                )
            elif score.total_penalty < self.best_score.total_penalty:
                self.best_assignments = assignments.copy()
                self.best_score = score
                self._log_event(
                    "BETTER_SOLUTION_FOUND", None,
                    f"Improved timetable found! Lower penalty: {score.total_penalty:.2f} (improved by {self.best_score.total_penalty - score.total_penalty:.2f})",
                    "Soft-constraint optimization improved exam spacing or room utilization."
                )

            # Continue searching if optimizing, otherwise return
            return "FOUND_CONTINUE" if self.optimize_soft_constraints else "STOP"

        # 1. Variable Selection: MRV with Degree Heuristic tie-breaker
        var_id, mrv_degree_reason = select_unassigned_variable_mrv_degree(
            unassigned_ids, domains, self.exams_by_id, self.shared_group_conflicts
        )
        exam = self.exams_by_id[var_id]

        self.metrics.nodes_explored += 1
        self._log_event("VARIABLE_SELECTION", exam, f"Exam {exam.code} selected for assignment", mrv_degree_reason)

        # 2. Value Ordering: LCV (Least Constraining Value)
        current_domain = domains.get(var_id, [])
        if not current_domain:
            self.metrics.backtracks += 1
            self._log_event(
                "BACKTRACK", exam,
                f"Dead-end reached for {exam.code}: domain is empty",
                "Prior assignments left no valid slot/room combination."
            )
            return "EXHAUSTED"

        ordered_values = order_domain_values_lcv(
            var_id, current_domain, unassigned_ids, domains,
            self.exams_by_id, self.rooms_by_id, self.slots_by_id,
            self.shared_group_conflicts
        )

        remaining_unassigned = [eid for eid in unassigned_ids if eid != var_id]

        for val, eliminated_count, lcv_reason in ordered_values:
            self.metrics.assignments_attempted += 1

            # Check hard constraints against current assignments
            valid, invalid_reason = is_assignment_valid(
                exam, val, assignments, self.exams_by_id,
                self.rooms_by_id, self.shared_group_conflicts,
                self.check_counter
            )
            self.metrics.constraint_checks = self.check_counter[0]

            if not valid:
                continue

            # Assign variable
            assignments[var_id] = val
            room = self.rooms_by_id[val.room_id]
            slot = self.slots_by_id[val.slot_id]
            self._log_event(
                "ASSIGNMENT", exam,
                f"Assigned {exam.code} -> Date: {val.date}, Slot: {slot.name}, Room: {room.name}",
                f"LCV: {lcv_reason}"
            )

            # 3. Forward Checking: prune incompatible values from remaining unassigned variables
            fc_success, prunings = self._forward_check(
                exam, val, remaining_unassigned, domains
            )

            if fc_success:
                status = self._backtrack(assignments, remaining_unassigned, domains, start_time)
                if status == "STOP":
                    # Restore prunings before returning
                    self._restore_prunings(domains, prunings)
                    del assignments[var_id]
                    return "STOP"

            # Revert assignment & restore domains (backtrack step)
            self._restore_prunings(domains, prunings)
            del assignments[var_id]

        self.metrics.backtracks += 1
        self._log_event(
            "BACKTRACK", exam,
            f"Exhausted all candidate options for {exam.code}. Reversing previous assignment.",
            "Backtracking to explore alternative branch in constraint tree."
        )
        return "EXHAUSTED"

    def _forward_check(
        self,
        assigned_exam: CSPExam,
        assigned_val: CSPValue,
        remaining_unassigned: List[str],
        domains: Dict[str, List[CSPValue]]
    ) -> Tuple[bool, Dict[str, List[CSPValue]]]:
        """
        Forward Checking:
        Prunes values from remaining unassigned variables that conflict with assigned_exam = assigned_val.
        Returns:
            (success: bool, prunings: Dict[exam_id, List[pruned_values]])
        If any remaining variable's domain becomes empty, returns False immediately.
        """
        prunings: Dict[str, List[CSPValue]] = defaultdict(list)

        for other_id in remaining_unassigned:
            other_exam = self.exams_by_id[other_id]
            remaining_vals: List[CSPValue] = []

            for other_val in domains[other_id]:
                consistent, _ = are_binary_consistent(
                    assigned_exam, assigned_val,
                    other_exam, other_val,
                    self.shared_group_conflicts
                )
                if consistent:
                    remaining_vals.append(other_val)
                else:
                    prunings[other_id].append(other_val)
                    self.metrics.forward_checking_prunes += 1

            domains[other_id] = remaining_vals

            # If forward checking wiped out an unassigned variable's domain: dead end detected!
            if len(remaining_vals) == 0:
                self._log_event(
                    "PRUNED", other_exam,
                    f"Domain wipeout: {other_exam.code} has 0 valid options remaining after assigning {assigned_exam.code}",
                    "Forward checking detected imminent conflict; triggering immediate backtrack."
                )
                return False, prunings

        return True, prunings

    def _restore_prunings(
        self,
        domains: Dict[str, List[CSPValue]],
        prunings: Dict[str, List[CSPValue]]
    ):
        """Restores values pruned during forward checking upon backtrack."""
        for eid, pruned_vals in prunings.items():
            domains[eid].extend(pruned_vals)
