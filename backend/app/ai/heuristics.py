from __future__ import annotations
from typing import Dict, List, Set, Tuple, Optional
from .models import CSPExam, CSPRoom, CSPSlot, CSPValue
from .constraints import are_binary_consistent

def select_unassigned_variable_mrv_degree(
    unassigned_exam_ids: List[str],
    domains: Dict[str, List[CSPValue]],
    exams_by_id: Dict[str, CSPExam],
    shared_group_conflicts: Set[Tuple[str, str]]
) -> Tuple[str, str]:
    """
    Selects the next unassigned variable using MRV (Minimum Remaining Values),
    breaking ties with the Degree Heuristic, then priority, then exam code.
    Returns (selected_exam_id, rationale_string).
    """
    # 1. Compute MRV values (domain length)
    min_domain_size = float('inf')
    candidates: List[str] = []

    for eid in unassigned_exam_ids:
        size = len(domains.get(eid, []))
        if size < min_domain_size:
            min_domain_size = size
            candidates = [eid]
        elif size == min_domain_size:
            candidates.append(eid)

    if len(candidates) == 1:
        chosen = candidates[0]
        chosen_exam = exams_by_id[chosen]
        rationale = f"MRV selected {chosen_exam.code} with minimum remaining domain size ({min_domain_size} options)"
        return chosen, rationale

    # 2. Degree Heuristic tie-breaker:
    # Degree = number of constraints on remaining unassigned variables.
    # Specifically, how many unassigned exams share student groups or have shared-student conflicts.
    unassigned_set = set(unassigned_exam_ids)
    candidate_degrees: List[Tuple[int, int, int, str, str]] = []

    for eid in candidates:
        exam = exams_by_id[eid]
        degree = 0
        for other_id in unassigned_set:
            if other_id == eid:
                continue
            other_exam = exams_by_id[other_id]
            # Check group overlap or shared group conflict
            has_group_conflict = bool(set(exam.group_ids).intersection(set(other_exam.group_ids)))
            if not has_group_conflict:
                for g1 in exam.group_ids:
                    for g2 in other_exam.group_ids:
                        if (g1, g2) in shared_group_conflicts or (g2, g1) in shared_group_conflicts:
                            has_group_conflict = True
                            break
                    if has_group_conflict:
                        break
            if has_group_conflict:
                degree += 1

        # We sort by:
        # - degree DESC
        # - priority DESC
        # - student_count DESC
        # - code ASC (for deterministic reproducible results)
        candidate_degrees.append((degree, exam.priority, exam.student_count, exam.code, eid))

    # Sort candidates
    candidate_degrees.sort(key=lambda x: (-x[0], -x[1], -x[2], x[3]))
    best = candidate_degrees[0]
    chosen_id = best[4]
    chosen_exam = exams_by_id[chosen_id]
    rationale = (
        f"MRV tied ({min_domain_size} options); Degree heuristic chose {chosen_exam.code} "
        f"with degree {best[0]} (connected to {best[0]} unassigned exams), priority {best[1]}"
    )
    return chosen_id, rationale


def order_domain_values_lcv(
    exam_id: str,
    domain_values: List[CSPValue],
    unassigned_exam_ids: List[str],
    domains: Dict[str, List[CSPValue]],
    exams_by_id: Dict[str, CSPExam],
    rooms_by_id: Dict[str, CSPRoom],
    slots_by_id: Dict[str, CSPSlot],
    shared_group_conflicts: Set[Tuple[str, str]]
) -> List[Tuple[CSPValue, int, str]]:
    """
    Orders the values in the domain of exam_id according to LCV (Least Constraining Value).
    A value is preferred if it rules out the fewest options from the remaining unassigned variables.
    Returns list of tuples: (val, eliminated_count, rationale).
    """
    exam = exams_by_id[exam_id]
    other_unassigned_ids = [eid for eid in unassigned_exam_ids if eid != exam_id]

    scored_values: List[Tuple[int, int, str, CSPValue, str]] = []

    for val in domain_values:
        eliminated_count = 0
        # Count how many values in neighbors' domains would become inconsistent with this assignment
        for other_id in other_unassigned_ids:
            other_exam = exams_by_id[other_id]
            for other_val in domains.get(other_id, []):
                consistent, _ = are_binary_consistent(exam, val, other_exam, other_val, shared_group_conflicts)
                if not consistent:
                    eliminated_count += 1

        # Secondary sorting criteria:
        # - Room capacity waste: (room.capacity - exam.student_count) ASC
        room = rooms_by_id.get(val.room_id)
        cap_waste = (room.capacity - exam.student_count) if room else 0
        slot = slots_by_id.get(val.slot_id)
        slot_order = slot.slot_order if slot else 0

        rationale = f"Date {val.date}, Slot {slot.name if slot else val.slot_id}, Room {room.name if room else val.room_id} (eliminates {eliminated_count} options)"
        scored_values.append((eliminated_count, cap_waste, val.date, val, rationale))

    # Sort ascending by eliminated_count (Least Constraining first), then cap_waste, date
    scored_values.sort(key=lambda x: (x[0], x[1], x[2]))

    return [(item[3], item[0], item[4]) for item in scored_values]
