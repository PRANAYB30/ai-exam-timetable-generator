from __future__ import annotations
from typing import Dict, Set, Tuple, List, Optional
from .models import CSPExam, CSPRoom, CSPSlot, CSPValue

def is_unary_consistent(exam: CSPExam, val: CSPValue, room: CSPRoom) -> Tuple[bool, Optional[str]]:
    """
    Checks if an assignment value satisfies unary constraints for the given examination.
    Unary constraints depend only on the examination and the assigned value/room.
    """
    # 1. Capacity check
    if room.capacity < exam.student_count:
        return False, f"Room {room.name} capacity ({room.capacity}) is less than required ({exam.student_count})"

    # 2. Required room type check
    if exam.required_room_type and exam.required_room_type.strip():
        if room.room_type.lower() != exam.required_room_type.lower():
            return False, f"Room {room.name} type ({room.room_type}) does not match required ({exam.required_room_type})"

    # 3. Allowed dates
    if exam.allowed_dates and len(exam.allowed_dates) > 0:
        if val.date not in exam.allowed_dates:
            return False, f"Date {val.date} not in exam's allowed dates ({exam.allowed_dates})"

    # 4. Allowed slots
    if exam.allowed_slot_ids and len(exam.allowed_slot_ids) > 0:
        if val.slot_id not in exam.allowed_slot_ids:
            return False, f"Slot {val.slot_id} not in exam's allowed slots ({exam.allowed_slot_ids})"

    # 5. Room availability
    if (val.date, val.slot_id) in room.unavailable_slots:
        return False, f"Room {room.name} is marked unavailable on {val.date} during slot {val.slot_id}"

    # 6. Fixed assignment constraints
    if exam.is_fixed:
        if exam.fixed_date and val.date != exam.fixed_date:
            return False, f"Exam is locked to date {exam.fixed_date}, not {val.date}"
        if exam.fixed_slot_id and val.slot_id != exam.fixed_slot_id:
            return False, f"Exam is locked to slot {exam.fixed_slot_id}, not {val.slot_id}"
        if exam.fixed_room_id and val.room_id != exam.fixed_room_id:
            return False, f"Exam is locked to room {exam.fixed_room_id}, not {val.room_id}"

    return True, None


def are_binary_consistent(
    exam1: CSPExam,
    val1: CSPValue,
    exam2: CSPExam,
    val2: CSPValue,
    shared_group_conflicts: Set[Tuple[str, str]]
) -> Tuple[bool, Optional[str]]:
    """
    Checks if two assignments are mutually consistent:
    1. Different examinations cannot occupy the same room at the same (date, slot).
    2. Examinations with common or shared-student groups cannot occur at the same (date, slot).
    """
    # If they are at different dates or slots, there can be no clash
    if val1.date != val2.date or val1.slot_id != val2.slot_id:
        return True, None

    # Both are at the same date and slot!
    # Constraint A: Room collision
    if val1.room_id == val2.room_id:
        return False, f"Room conflict: Both {exam1.code} and {exam2.code} assigned to room {val1.room_id} on {val1.date} slot {val1.slot_id}"

    # Constraint B: Direct student group clash
    common_groups = set(exam1.group_ids).intersection(set(exam2.group_ids))
    if common_groups:
        group_list = ", ".join(sorted(common_groups))
        return False, f"Student group clash: Group(s) [{group_list}] have overlapping exams ({exam1.code} and {exam2.code}) on {val1.date} slot {val1.slot_id}"

    # Constraint C: Shared students across different groups
    for g1 in exam1.group_ids:
        for g2 in exam2.group_ids:
            if (g1, g2) in shared_group_conflicts or (g2, g1) in shared_group_conflicts:
                return False, f"Shared-student clash: Group {g1} and Group {g2} share students and have overlapping exams ({exam1.code} and {exam2.code}) on {val1.date} slot {val1.slot_id}"

    return True, None


def is_assignment_valid(
    exam: CSPExam,
    val: CSPValue,
    current_assignments: Dict[str, CSPValue],
    exams_by_id: Dict[str, CSPExam],
    rooms_by_id: Dict[str, CSPRoom],
    shared_group_conflicts: Set[Tuple[str, str]],
    check_counter: Optional[List[int]] = None
) -> Tuple[bool, Optional[str]]:
    """
    Verifies that assigning `exam = val` does not violate any hard constraints with existing assignments.
    """
    if check_counter is not None:
        check_counter[0] += 1

    room = rooms_by_id.get(val.room_id)
    if not room:
        return False, f"Room ID {val.room_id} not found"

    # 1. Unary check
    unary_ok, reason = is_unary_consistent(exam, val, room)
    if not unary_ok:
        return False, reason

    # 2. Binary checks against all already-assigned exams
    for other_id, other_val in current_assignments.items():
        if other_id == exam.id:
            continue
        other_exam = exams_by_id[other_id]
        binary_ok, reason = are_binary_consistent(exam, val, other_exam, other_val, shared_group_conflicts)
        if not binary_ok:
            return False, reason

    return True, None
