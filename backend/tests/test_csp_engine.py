import pytest
from backend.app.ai.models import (
    CSPExam, CSPRoom, CSPSlot, CSPValue,
    SoftConstraintWeights
)
from backend.app.ai.csp_solver import CSPScheduler
from backend.app.ai.validator import TimetableValidator
from backend.app.ai.optimizer import evaluate_soft_constraints

def test_small_dataset_produces_valid_timetable():
    rooms = [
        CSPRoom(id="R1", name="Hall A", capacity=100),
        CSPRoom(id="R2", name="Hall B", capacity=80)
    ]
    slots = [
        CSPSlot(id="S1", name="Morning", start_time="09:00", end_time="12:00", slot_order=1),
        CSPSlot(id="S2", name="Afternoon", start_time="14:00", end_time="17:00", slot_order=2)
    ]
    dates = ["2026-11-01", "2026-11-02"]
    exams = [
        CSPExam(id="E1", code="CS101", name="Programming I", group_ids=("G1",), student_count=60),
        CSPExam(id="E2", code="CS102", name="Data Structures", group_ids=("G1",), student_count=60),
        CSPExam(id="E3", code="MA101", name="Calculus", group_ids=("G2",), student_count=70)
    ]

    scheduler = CSPScheduler(exams=exams, rooms=rooms, slots=slots, dates=dates)
    result = scheduler.solve()

    assert result.success is True
    assert len(result.assignments) == 3
    assert result.metrics.status in ["SUCCESS_OPTIMAL", "SUCCESS_FEASIBLE"]

    # Validate using independent validator
    validator = TimetableValidator(exams=exams, rooms=rooms, slots=slots, dates=dates)
    report = validator.validate(result.assignments)
    assert report.is_valid is True
    assert report.total_hard_violations == 0

def test_shared_group_exams_never_overlap():
    # E1 and E2 both belong to group G1. There's only 1 room and 1 slot per day.
    rooms = [CSPRoom(id="R1", name="Hall A", capacity=100)]
    slots = [CSPSlot(id="S1", name="Morning", start_time="09:00", end_time="12:00", slot_order=1)]
    dates = ["2026-11-01", "2026-11-02"]
    exams = [
        CSPExam(id="E1", code="CS101", name="Programming I", group_ids=("G1",), student_count=50),
        CSPExam(id="E2", code="CS102", name="Data Structures", group_ids=("G1",), student_count=50)
    ]

    scheduler = CSPScheduler(exams=exams, rooms=rooms, slots=slots, dates=dates)
    result = scheduler.solve()

    assert result.success is True
    v1 = result.assignments["E1"]
    v2 = result.assignments["E2"]
    # They cannot be on the same date since there is only 1 slot
    assert (v1.date, v1.slot_id) != (v2.date, v2.slot_id)

def test_room_clash_prevention():
    # Two exams from different groups, but only 1 room and 1 date & slot
    rooms = [CSPRoom(id="R1", name="Hall A", capacity=100)]
    slots = [CSPSlot(id="S1", name="Morning", start_time="09:00", end_time="12:00", slot_order=1)]
    dates = ["2026-11-01"]
    exams = [
        CSPExam(id="E1", code="CS101", name="Programming I", group_ids=("G1",), student_count=40),
        CSPExam(id="E2", code="EE101", name="Circuits", group_ids=("G2",), student_count=40)
    ]

    # Only 1 slot in 1 room on 1 date, but 2 exams -> Infeasible!
    scheduler = CSPScheduler(exams=exams, rooms=rooms, slots=slots, dates=dates)
    result = scheduler.solve()
    assert result.success is False
    assert result.status == "INFEASIBLE"

def test_insufficient_room_capacity_rejected():
    rooms = [
        CSPRoom(id="R1", name="Small Room", capacity=30)
    ]
    slots = [CSPSlot(id="S1", name="Morning", start_time="09:00", end_time="12:00", slot_order=1)]
    dates = ["2026-11-01"]
    exams = [
        CSPExam(id="E1", code="CS101", name="Large Class", group_ids=("G1",), student_count=60)
    ]

    scheduler = CSPScheduler(exams=exams, rooms=rooms, slots=slots, dates=dates)
    result = scheduler.solve()
    assert result.success is False
    assert result.status == "INFEASIBLE"
    assert any("capacity" in r.lower() for r in result.failure_reasons)

def test_unavailable_room_slot_respected():
    # Room R1 is unavailable on 2026-11-01 slot S1
    rooms = [
        CSPRoom(id="R1", name="Main Hall", capacity=100, unavailable_slots=(("2026-11-01", "S1"),))
    ]
    slots = [
        CSPSlot(id="S1", name="Morning", start_time="09:00", end_time="12:00", slot_order=1),
        CSPSlot(id="S2", name="Afternoon", start_time="14:00", end_time="17:00", slot_order=2)
    ]
    dates = ["2026-11-01"]
    exams = [
        CSPExam(id="E1", code="CS101", name="Intro", group_ids=("G1",), student_count=50)
    ]

    scheduler = CSPScheduler(exams=exams, rooms=rooms, slots=slots, dates=dates)
    result = scheduler.solve()
    assert result.success is True
    assigned = result.assignments["E1"]
    # Must be scheduled in S2, not S1
    assert assigned.slot_id == "S2"

def test_backtracking_recovery():
    # Create a scenario where an early decision (if chosen greedily) leads to a conflict that requires backtracking
    rooms = [
        CSPRoom(id="R_BIG", name="Large Hall", capacity=100),
        CSPRoom(id="R_SMALL", name="Small Lab", capacity=40)
    ]
    slots = [CSPSlot(id="S1", name="Morning", start_time="09:00", end_time="12:00", slot_order=1)]
    dates = ["2026-11-01"]
    # E1 has 30 students, E2 has 80 students. Both need to be scheduled on 2026-11-01 S1.
    # E2 can ONLY fit in R_BIG. E1 could fit in either, but MUST take R_SMALL so E2 gets R_BIG!
    exams = [
        CSPExam(id="E1", code="EXAM_SMALL", name="Small Exam", group_ids=("G1",), student_count=30),
        CSPExam(id="E2", code="EXAM_BIG", name="Big Exam", group_ids=("G2",), student_count=80)
    ]

    scheduler = CSPScheduler(exams=exams, rooms=rooms, slots=slots, dates=dates)
    result = scheduler.solve()
    assert result.success is True
    assert result.assignments["E2"].room_id == "R_BIG"
    assert result.assignments["E1"].room_id == "R_SMALL"

def test_independent_validator_detects_conflicts():
    rooms = [CSPRoom(id="R1", name="Hall A", capacity=50)]
    slots = [CSPSlot(id="S1", name="Slot 1", start_time="09:00", end_time="12:00", slot_order=1)]
    dates = ["2026-11-01"]
    exams = [
        CSPExam(id="E1", code="CS101", name="Exam 1", group_ids=("G1",), student_count=30),
        CSPExam(id="E2", code="CS102", name="Exam 2", group_ids=("G1",), student_count=30)
    ]

    # Deliberately build an invalid assignment where both exams are scheduled in the same room & slot
    bad_assignments = {
        "E1": CSPValue(date="2026-11-01", slot_id="S1", room_id="R1"),
        "E2": CSPValue(date="2026-11-01", slot_id="S1", room_id="R1")
    }

    validator = TimetableValidator(exams=exams, rooms=rooms, slots=slots, dates=dates)
    report = validator.validate(bad_assignments)

    assert report.is_valid is False
    assert report.total_hard_violations >= 2 # Room collision AND Student clash
    violation_types = [v.issue_type for v in report.hard_violations]
    assert "ROOM_COLLISION" in violation_types
    assert "STUDENT_CLASH" in violation_types

def test_soft_constraint_penalty_calculation():
    rooms = [CSPRoom(id="R1", name="Hall A", capacity=100)]
    slots = [
        CSPSlot(id="S1", name="Morning", start_time="09:00", end_time="12:00", slot_order=1),
        CSPSlot(id="S2", name="Afternoon", start_time="14:00", end_time="17:00", slot_order=2)
    ]
    dates = ["2026-11-01", "2026-11-02"]
    exams = [
        CSPExam(id="E1", code="CS101", name="Exam 1", group_ids=("G1",), student_count=50),
        CSPExam(id="E2", code="CS102", name="Exam 2", group_ids=("G1",), student_count=50)
    ]
    exams_by_id = {e.id: e for e in exams}
    rooms_by_id = {r.id: r for r in rooms}
    slots_by_id = {s.id: s for s in slots}

    # Case A: Same group has consecutive exams on same day
    consecutive_assignments = {
        "E1": CSPValue(date="2026-11-01", slot_id="S1", room_id="R1"),
        "E2": CSPValue(date="2026-11-01", slot_id="S2", room_id="R1")
    }
    weights = SoftConstraintWeights(
        consecutive_exam_penalty=20.0,
        same_day_multiple_exam_penalty=30.0
    )
    score = evaluate_soft_constraints(
        consecutive_assignments, exams_by_id, rooms_by_id, slots_by_id, dates, weights
    )

    assert score.consecutive_exam_penalty == 20.0
    assert score.same_day_multiple_exam_penalty == 30.0
    assert score.total_penalty >= 50.0


def test_shared_student_cross_group_conflict():
    # Group A and Group B share students (e.g. elective course)
    rooms = [
        CSPRoom(id="R1", name="Hall A", capacity=100),
        CSPRoom(id="R2", name="Hall B", capacity=100)
    ]
    slots = [CSPSlot(id="S1", name="Morning", start_time="09:00", end_time="12:00", slot_order=1)]
    dates = ["2026-11-01", "2026-11-02"]
    exams = [
        CSPExam(id="E1", code="CS301", name="AI", group_ids=("GRP_CS",), student_count=40),
        CSPExam(id="E2", code="DS301", name="Data Mining", group_ids=("GRP_DS",), student_count=40)
    ]
    shared_conflicts = {("GRP_CS", "GRP_DS")}

    scheduler = CSPScheduler(
        exams=exams, rooms=rooms, slots=slots, dates=dates, shared_group_conflicts=shared_conflicts
    )
    result = scheduler.solve()
    assert result.success is True
    v1 = result.assignments["E1"]
    v2 = result.assignments["E2"]
    # Even though there are 2 rooms at slot S1, they CANNOT be scheduled at the same (date, slot) because of shared students!
    assert (v1.date, v1.slot_id) != (v2.date, v2.slot_id)

def test_multi_day_multi_room_complex_schedule():
    rooms = [
        CSPRoom(id="R101", name="Hall 101", capacity=120),
        CSPRoom(id="R102", name="Hall 102", capacity=80),
        CSPRoom(id="LAB1", name="CS Lab 1", capacity=40, room_type="Lab")
    ]
    slots = [
        CSPSlot(id="S_MORN", name="Morning", start_time="09:30", end_time="12:30", slot_order=1),
        CSPSlot(id="S_AFT", name="Afternoon", start_time="14:00", end_time="17:00", slot_order=2)
    ]
    dates = ["2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13"]

    exams = [
        CSPExam(id="E1", code="CS101", name="Intro to Prog", group_ids=("BTECH_CS_1",), student_count=75),
        CSPExam(id="E2", code="CS102", name="Data Structures", group_ids=("BTECH_CS_1",), student_count=75),
        CSPExam(id="E3", code="CS103", name="Digital Logic", group_ids=("BTECH_CS_1",), student_count=75),
        CSPExam(id="E4", code="EC101", name="Circuits", group_ids=("BTECH_EC_1",), student_count=60),
        CSPExam(id="E5", code="EC102", name="Signals & Systems", group_ids=("BTECH_EC_1",), student_count=60),
        CSPExam(id="E6", code="CS_LAB", name="Python Programming Lab", group_ids=("BTECH_CS_1",), student_count=35, required_room_type="Lab"),
        CSPExam(id="E7", code="MATH1", name="Applied Mathematics", group_ids=("BTECH_CS_1", "BTECH_EC_1"), student_count=110),
        CSPExam(id="E8", code="ENV10", name="Environmental Science", group_ids=("BTECH_EC_1",), student_count=60)
    ]

    scheduler = CSPScheduler(exams=exams, rooms=rooms, slots=slots, dates=dates)
    result = scheduler.solve()
    assert result.success is True
    assert len(result.assignments) == 8

    # Check CS_LAB is in LAB1
    assert result.assignments["E6"].room_id == "LAB1"
    # Check MATH1 (110 students) is in R101 (only room with capacity >= 110)
    assert result.assignments["E7"].room_id == "R101"

    # Independent validation
    validator = TimetableValidator(exams=exams, rooms=rooms, slots=slots, dates=dates)
    report = validator.validate(result.assignments)
    assert report.is_valid is True
    assert report.total_hard_violations == 0
