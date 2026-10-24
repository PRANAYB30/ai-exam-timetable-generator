from __future__ import annotations
from dataclasses import dataclass, field
from typing import Dict, List, Set, Tuple, Optional
from collections import defaultdict
from .models import (
    CSPExam, CSPRoom, CSPSlot, CSPValue,
    SoftConstraintWeights, SoftScoreBreakdown
)
from .optimizer import evaluate_soft_constraints

@dataclass
class ScheduleIssue:
    issue_type: str # STUDENT_CLASH, SHARED_STUDENT_CLASH, ROOM_COLLISION, CAPACITY_EXCEEDED, ROOM_UNAVAILABLE, UNSCHEDULED_EXAM, INVALID_DATE, INVALID_SLOT, ROOM_TYPE_MISMATCH, FIXED_ASSIGNMENT_MISMATCH
    severity: str # HARD_VIOLATION, SOFT_WARNING
    description: str
    corrective_action: str
    exam_ids: List[str] = field(default_factory=list)
    exam_codes: List[str] = field(default_factory=list)
    date: Optional[str] = None
    slot_id: Optional[str] = None
    room_id: Optional[str] = None

@dataclass
class ValidationReport:
    is_valid: bool
    total_hard_violations: int
    total_soft_warnings: int
    hard_violations: List[ScheduleIssue] = field(default_factory=list)
    soft_warnings: List[ScheduleIssue] = field(default_factory=list)
    soft_score: Optional[SoftScoreBreakdown] = None
    summary: str = ""

class TimetableValidator:
    """
    Independent schedule validator that audits any timetable against
    all hard constraints and soft criteria, completely decoupled from the CSP solver.
    """

    def __init__(
        self,
        exams: List[CSPExam],
        rooms: List[CSPRoom],
        slots: List[CSPSlot],
        dates: List[str],
        shared_group_conflicts: Optional[Set[Tuple[str, str]]] = None,
        weights: Optional[SoftConstraintWeights] = None
    ):
        self.exams = exams
        self.rooms = rooms
        self.slots = slots
        self.dates = set(dates)
        self.shared_group_conflicts = shared_group_conflicts or set()
        self.weights = weights or SoftConstraintWeights()

        self.exams_by_id = {e.id: e for e in self.exams}
        self.rooms_by_id = {r.id: r for r in self.rooms}
        self.slots_by_id = {s.id: s for s in self.slots}

    def validate(self, assignments: Dict[str, CSPValue]) -> ValidationReport:
        hard_violations: List[ScheduleIssue] = []
        soft_warnings: List[ScheduleIssue] = []

        # 1. Check all required examinations are scheduled
        for exam in self.exams:
            if exam.id not in assignments:
                hard_violations.append(ScheduleIssue(
                    issue_type="UNSCHEDULED_EXAM",
                    severity="HARD_VIOLATION",
                    description=f"Required exam {exam.code} ({exam.name}) is not scheduled in this timetable.",
                    corrective_action="Assign a valid date, time slot, and room for this examination or regenerate the schedule.",
                    exam_ids=[exam.id],
                    exam_codes=[exam.code]
                ))

        # 2. Check each assignment individually (Unary constraints)
        for exam_id, val in assignments.items():
            exam = self.exams_by_id.get(exam_id)
            if not exam:
                hard_violations.append(ScheduleIssue(
                    issue_type="UNKNOWN_EXAM",
                    severity="HARD_VIOLATION",
                    description=f"Assignment references unknown exam ID {exam_id}.",
                    corrective_action="Remove obsolete assignment from timetable.",
                    exam_ids=[exam_id]
                ))
                continue

            # Date validity
            if val.date not in self.dates:
                hard_violations.append(ScheduleIssue(
                    issue_type="INVALID_DATE",
                    severity="HARD_VIOLATION",
                    description=f"Exam {exam.code} is assigned to date {val.date}, which is outside the active examination period.",
                    corrective_action=f"Move exam to one of the configured dates: {', '.join(sorted(self.dates))}.",
                    exam_ids=[exam.id],
                    exam_codes=[exam.code],
                    date=val.date
                ))
            elif exam.allowed_dates and val.date not in exam.allowed_dates:
                hard_violations.append(ScheduleIssue(
                    issue_type="INVALID_DATE",
                    severity="HARD_VIOLATION",
                    description=f"Exam {exam.code} is scheduled on {val.date}, but its allowed dates are {exam.allowed_dates}.",
                    corrective_action=f"Reschedule {exam.code} to one of its allowed dates.",
                    exam_ids=[exam.id],
                    exam_codes=[exam.code],
                    date=val.date
                ))

            # Slot validity
            if val.slot_id not in self.slots_by_id:
                hard_violations.append(ScheduleIssue(
                    issue_type="INVALID_SLOT",
                    severity="HARD_VIOLATION",
                    description=f"Exam {exam.code} is assigned to unknown slot ID {val.slot_id}.",
                    corrective_action="Assign exam to a valid configured time slot.",
                    exam_ids=[exam.id],
                    exam_codes=[exam.code],
                    slot_id=val.slot_id
                ))
            elif exam.allowed_slot_ids and val.slot_id not in exam.allowed_slot_ids:
                hard_violations.append(ScheduleIssue(
                    issue_type="INVALID_SLOT",
                    severity="HARD_VIOLATION",
                    description=f"Exam {exam.code} is assigned to slot {val.slot_id}, which is not in its allowed slots.",
                    corrective_action="Move exam to an allowed time slot.",
                    exam_ids=[exam.id],
                    exam_codes=[exam.code],
                    slot_id=val.slot_id
                ))

            # Room validity
            room = self.rooms_by_id.get(val.room_id)
            if not room:
                hard_violations.append(ScheduleIssue(
                    issue_type="UNKNOWN_ROOM",
                    severity="HARD_VIOLATION",
                    description=f"Exam {exam.code} assigned to unknown room ID {val.room_id}.",
                    corrective_action="Assign an existing, registered room.",
                    exam_ids=[exam.id],
                    exam_codes=[exam.code],
                    room_id=val.room_id
                ))
            else:
                # Capacity check
                if room.capacity < exam.student_count:
                    hard_violations.append(ScheduleIssue(
                        issue_type="CAPACITY_EXCEEDED",
                        severity="HARD_VIOLATION",
                        description=f"Room {room.name} has capacity {room.capacity}, but exam {exam.code} has {exam.student_count} students.",
                        corrective_action=f"Reassign {exam.code} to a larger room with at least {exam.student_count} seats.",
                        exam_ids=[exam.id],
                        exam_codes=[exam.code],
                        room_id=room.id,
                        date=val.date,
                        slot_id=val.slot_id
                    ))

                # Room type check
                if exam.required_room_type and exam.required_room_type.strip():
                    if room.room_type.lower() != exam.required_room_type.lower():
                        hard_violations.append(ScheduleIssue(
                            issue_type="ROOM_TYPE_MISMATCH",
                            severity="HARD_VIOLATION",
                            description=f"Exam {exam.code} requires a '{exam.required_room_type}' room, but {room.name} is a '{room.room_type}'.",
                            corrective_action=f"Assign {exam.code} to a room of type '{exam.required_room_type}'.",
                            exam_ids=[exam.id],
                            exam_codes=[exam.code],
                            room_id=room.id
                        ))

                # Room availability check
                if (val.date, val.slot_id) in room.unavailable_slots:
                    hard_violations.append(ScheduleIssue(
                        issue_type="ROOM_UNAVAILABLE",
                        severity="HARD_VIOLATION",
                        description=f"Room {room.name} is marked as unavailable on {val.date} during slot {val.slot_id}.",
                        corrective_action=f"Move {exam.code} to a slot when {room.name} is available, or use another room.",
                        exam_ids=[exam.id],
                        exam_codes=[exam.code],
                        date=val.date,
                        slot_id=val.slot_id,
                        room_id=room.id
                    ))

            # Fixed assignment check
            if exam.is_fixed:
                if exam.fixed_date and val.date != exam.fixed_date:
                    hard_violations.append(ScheduleIssue(
                        issue_type="FIXED_ASSIGNMENT_MISMATCH",
                        severity="HARD_VIOLATION",
                        description=f"Exam {exam.code} has locked date {exam.fixed_date}, but is assigned to {val.date}.",
                        corrective_action=f"Restore exam date to {exam.fixed_date} or unlock fixed constraint.",
                        exam_ids=[exam.id],
                        exam_codes=[exam.code]
                    ))
                if exam.fixed_slot_id and val.slot_id != exam.fixed_slot_id:
                    hard_violations.append(ScheduleIssue(
                        issue_type="FIXED_ASSIGNMENT_MISMATCH",
                        severity="HARD_VIOLATION",
                        description=f"Exam {exam.code} has locked slot {exam.fixed_slot_id}, but is assigned to {val.slot_id}.",
                        corrective_action=f"Restore exam slot to {exam.fixed_slot_id} or unlock fixed constraint.",
                        exam_ids=[exam.id],
                        exam_codes=[exam.code]
                    ))
                if exam.fixed_room_id and val.room_id != exam.fixed_room_id:
                    hard_violations.append(ScheduleIssue(
                        issue_type="FIXED_ASSIGNMENT_MISMATCH",
                        severity="HARD_VIOLATION",
                        description=f"Exam {exam.code} has locked room {exam.fixed_room_id}, but is assigned to {val.room_id}.",
                        corrective_action=f"Restore exam room to {exam.fixed_room_id} or unlock fixed constraint.",
                        exam_ids=[exam.id],
                        exam_codes=[exam.code]
                    ))

        # 3. Check pairwise conflicts (Binary constraints: Room Collision, Student Clash, Shared Clash)
        assigned_items = list(assignments.items())
        for i in range(len(assigned_items)):
            id1, val1 = assigned_items[i]
            exam1 = self.exams_by_id.get(id1)
            if not exam1:
                continue

            for j in range(i + 1, len(assigned_items)):
                id2, val2 = assigned_items[j]
                exam2 = self.exams_by_id.get(id2)
                if not exam2:
                    continue

                # Same date and time slot?
                if val1.date == val2.date and val1.slot_id == val2.slot_id:
                    # A. Room Collision
                    if val1.room_id == val2.room_id:
                        room_name = self.rooms_by_id[val1.room_id].name if val1.room_id in self.rooms_by_id else val1.room_id
                        hard_violations.append(ScheduleIssue(
                            issue_type="ROOM_COLLISION",
                            severity="HARD_VIOLATION",
                            description=f"Room conflict: Both {exam1.code} and {exam2.code} occupy room {room_name} on {val1.date} in slot {val1.slot_id}.",
                            corrective_action=f"Move one of the examinations ({exam1.code} or {exam2.code}) to a different room or time slot.",
                            exam_ids=[exam1.id, exam2.id],
                            exam_codes=[exam1.code, exam2.code],
                            date=val1.date,
                            slot_id=val1.slot_id,
                            room_id=val1.room_id
                        ))

                    # B. Student Group Clash
                    common_groups = set(exam1.group_ids).intersection(set(exam2.group_ids))
                    if common_groups:
                        groups_str = ", ".join(sorted(common_groups))
                        hard_violations.append(ScheduleIssue(
                            issue_type="STUDENT_CLASH",
                            severity="HARD_VIOLATION",
                            description=f"Student group clash: Group(s) [{groups_str}] are scheduled for both {exam1.code} and {exam2.code} simultaneously on {val1.date} slot {val1.slot_id}.",
                            corrective_action=f"Reschedule {exam1.code} or {exam2.code} to a different time slot or date.",
                            exam_ids=[exam1.id, exam2.id],
                            exam_codes=[exam1.code, exam2.code],
                            date=val1.date,
                            slot_id=val1.slot_id
                        ))

                    # C. Shared-Student Group Conflict
                    for g1 in exam1.group_ids:
                        for g2 in exam2.group_ids:
                            if (g1, g2) in self.shared_group_conflicts or (g2, g1) in self.shared_group_conflicts:
                                hard_violations.append(ScheduleIssue(
                                    issue_type="SHARED_STUDENT_CLASH",
                                    severity="HARD_VIOLATION",
                                    description=f"Shared-student clash: Group {g1} ({exam1.code}) and Group {g2} ({exam2.code}) share students and are scheduled at the same time on {val1.date} slot {val1.slot_id}.",
                                    corrective_action=f"Move {exam1.code} or {exam2.code} to separate time slots to prevent student conflict.",
                                    exam_ids=[exam1.id, exam2.id],
                                    exam_codes=[exam1.code, exam2.code],
                                    date=val1.date,
                                    slot_id=val1.slot_id
                                ))

        # 4. Evaluate soft constraints & warnings
        soft_score = evaluate_soft_constraints(
            assignments,
            self.exams_by_id,
            self.rooms_by_id,
            self.slots_by_id,
            list(self.dates),
            self.weights
        )

        for detail in soft_score.details:
            soft_warnings.append(ScheduleIssue(
                issue_type="SOFT_PENALTY",
                severity="SOFT_WARNING",
                description=detail,
                corrective_action="Adjust date or room assignment to optimize student rest gap or room utilization."
            ))

        is_valid = len(hard_violations) == 0

        summary = (
            f"Schedule Audit Passed: 0 hard-constraint violations. Soft penalty score: {soft_score.total_penalty:.2f}."
            if is_valid else
            f"Schedule Audit Failed: {len(hard_violations)} hard-constraint violation(s) detected. Fix conflicts or run AI repair."
        )

        return ValidationReport(
            is_valid=is_valid,
            total_hard_violations=len(hard_violations),
            total_soft_warnings=len(soft_warnings),
            hard_violations=hard_violations,
            soft_warnings=soft_warnings,
            soft_score=soft_score,
            summary=summary
        )
