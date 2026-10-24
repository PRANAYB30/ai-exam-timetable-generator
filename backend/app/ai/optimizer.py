from __future__ import annotations
from datetime import datetime
from typing import Dict, List, Set, Tuple
from collections import defaultdict
import math
from .models import (
    CSPExam, CSPRoom, CSPSlot, CSPValue,
    SoftConstraintWeights, SoftScoreBreakdown
)

def parse_iso_date(date_str: str) -> datetime:
    try:
        return datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        return datetime.min

def evaluate_soft_constraints(
    assignments: Dict[str, CSPValue],
    exams_by_id: Dict[str, CSPExam],
    rooms_by_id: Dict[str, CSPRoom],
    slots_by_id: Dict[str, CSPSlot],
    all_dates: List[str],
    weights: SoftConstraintWeights
) -> SoftScoreBreakdown:
    """
    Evaluates soft constraints and calculates the weighted penalty score for a complete or partial timetable.
    Lower penalty = better schedule quality.
    """
    details: List[str] = []
    consecutive_penalty = 0.0
    same_day_penalty = 0.0
    gap_penalty = 0.0
    day_concentration_penalty = 0.0
    room_utilization_penalty = 0.0

    # Group examinations by student group
    group_schedule: Dict[str, List[Tuple[CSPExam, CSPValue]]] = defaultdict(list)
    day_exam_counts: Dict[str, int] = defaultdict(int)

    for exam_id, val in assignments.items():
        exam = exams_by_id[exam_id]
        day_exam_counts[val.date] += 1
        for gid in exam.group_ids:
            group_schedule[gid].append((exam, val))

        # Room utilization penalty
        room = rooms_by_id.get(val.room_id)
        if room and room.capacity > 0:
            wasted_seats = max(0, room.capacity - exam.student_count)
            # Wasted ratio normalized to 0.0-1.0
            wasted_ratio = wasted_seats / room.capacity
            room_pen = wasted_ratio * weights.room_utilization_penalty
            room_utilization_penalty += room_pen
            if wasted_ratio > 0.5:
                details.append(
                    f"Room utilization: {exam.code} ({exam.student_count} students) placed in {room.name} "
                    f"({room.capacity} cap, {wasted_seats} empty seats, penalty +{room_pen:.2f})"
                )

    # Analyze group schedules
    for gid, group_exams in group_schedule.items():
        # Sort exams chronologically: by date, then slot order
        def sort_key(item: Tuple[CSPExam, CSPValue]):
            slot = slots_by_id.get(item[1].slot_id)
            slot_order = slot.slot_order if slot else 0
            return (item[1].date, slot_order)

        sorted_exams = sorted(group_exams, key=sort_key)

        # 1. Check same-day multiple exams & consecutive exams
        date_slots: Dict[str, List[Tuple[CSPExam, int]]] = defaultdict(list)
        for ex, v in sorted_exams:
            s = slots_by_id.get(v.slot_id)
            s_order = s.slot_order if s else 0
            date_slots[v.date].append((ex, s_order))

        for d, slot_list in date_slots.items():
            if len(slot_list) > 1:
                pen = (len(slot_list) - 1) * weights.same_day_multiple_exam_penalty
                same_day_penalty += pen
                exam_codes = ", ".join(e[0].code for e in slot_list)
                details.append(
                    f"Multiple exams same day: Group {gid} has {len(slot_list)} exams on {d} ({exam_codes}, penalty +{pen:.2f})"
                )

                # Check consecutive slots
                sorted_by_order = sorted(slot_list, key=lambda x: x[1])
                for i in range(len(sorted_by_order) - 1):
                    if sorted_by_order[i+1][1] == sorted_by_order[i][1] + 1:
                        consecutive_penalty += weights.consecutive_exam_penalty
                        details.append(
                            f"Consecutive slots: Group {gid} has back-to-back exams ({sorted_by_order[i][0].code} and {sorted_by_order[i+1][0].code}) on {d} (penalty +{weights.consecutive_exam_penalty:.2f})"
                        )

        # 2. Check spacing between distinct exam days
        unique_dates = sorted(list(date_slots.keys()))
        for i in range(len(unique_dates) - 1):
            d1 = parse_iso_date(unique_dates[i])
            d2 = parse_iso_date(unique_dates[i+1])
            diff_days = abs((d2 - d1).days)
            # Find the max preferred gap of the exams on day 1
            exams_d1 = date_slots[unique_dates[i]]
            max_preferred = max(e[0].preferred_gap_days for e in exams_d1) if exams_d1 else 1

            if diff_days < max_preferred:
                gap_pen = (max_preferred - diff_days) * weights.insufficient_gap_penalty
                gap_penalty += gap_pen
                details.append(
                    f"Insufficient gap: Group {gid} has exams on {unique_dates[i]} and {unique_dates[i+1]} "
                    f"({diff_days} day gap < preferred {max_preferred} days, penalty +{gap_pen:.2f})"
                )

    # 3. Day concentration penalty:
    # Penalize uneven distribution of exams over available days
    total_exams = len(assignments)
    num_days = max(1, len(all_dates))
    expected_per_day = total_exams / num_days
    variance = 0.0
    for d in all_dates:
        count = day_exam_counts.get(d, 0)
        variance += (count - expected_per_day) ** 2
    variance /= num_days
    std_dev = math.sqrt(variance)
    day_concentration_penalty = std_dev * weights.day_concentration_penalty
    if std_dev > 1.0:
        details.append(
            f"Exam distribution: Day load standard deviation is {std_dev:.2f} (penalty +{day_concentration_penalty:.2f})"
        )

    total_penalty = (
        consecutive_penalty +
        same_day_penalty +
        gap_penalty +
        day_concentration_penalty +
        room_utilization_penalty
    )

    return SoftScoreBreakdown(
        total_penalty=round(total_penalty, 2),
        consecutive_exam_penalty=round(consecutive_penalty, 2),
        same_day_multiple_exam_penalty=round(same_day_penalty, 2),
        insufficient_gap_penalty=round(gap_penalty, 2),
        day_concentration_penalty=round(day_concentration_penalty, 2),
        room_utilization_penalty=round(room_utilization_penalty, 2),
        details=details
    )
