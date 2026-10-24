import json
from sqlalchemy.orm import Session
from backend.app.models.entities import (
    ExaminationModel,
    StudentGroupModel,
    RoomModel,
    TimeSlotModel,
    SchedulingConfigModel,
    TimetableModel,
    TimetableAssignmentModel,
    TimetableExplanationModel
)

DEMO_GROUPS = [
    {
        "id": "GRP-CS-3A",
        "name": "B.Tech Computer Science - Year 3 (Section A)",
        "code": "CS-3A",
        "student_count": 65,
        "shared_conflicts": ["AI-3"] # shares elective students with AI-3
    },
    {
        "id": "GRP-CS-3B",
        "name": "B.Tech Computer Science - Year 3 (Section B)",
        "code": "CS-3B",
        "student_count": 60,
        "shared_conflicts": []
    },
    {
        "id": "GRP-IT-3",
        "name": "B.Tech Information Technology - Year 3",
        "code": "IT-3",
        "student_count": 50,
        "shared_conflicts": []
    },
    {
        "id": "GRP-AI-3",
        "name": "B.Tech AI & Data Science - Year 3",
        "code": "AI-3",
        "student_count": 45,
        "shared_conflicts": ["CS-3A"] # shares elective students with CS-3A
    },
    {
        "id": "GRP-EC-3",
        "name": "B.Tech Electronics & Communication - Year 3",
        "code": "EC-3",
        "student_count": 55,
        "shared_conflicts": []
    }
]

DEMO_ROOMS = [
    {
        "id": "ROOM-AUD",
        "name": "University Grand Auditorium",
        "room_number": "AUD-01",
        "capacity": 150,
        "room_type": "Auditorium",
        "facilities": ["Projector", "Acoustic Panels", "Central AC", "PA System"],
        "unavailable_slots": [],
        "is_active": True
    },
    {
        "id": "ROOM-101",
        "name": "Lecture Complex - Hall 101",
        "room_number": "LC-101",
        "capacity": 80,
        "room_type": "Standard",
        "facilities": ["Projector", "AC", "Surveillance"],
        "unavailable_slots": [],
        "is_active": True
    },
    {
        "id": "ROOM-102",
        "name": "Lecture Complex - Hall 102",
        "room_number": "LC-102",
        "capacity": 65,
        "room_type": "Standard",
        "facilities": ["Projector", "AC", "Smart Board"],
        "unavailable_slots": [],
        "is_active": True
    },
    {
        "id": "ROOM-201",
        "name": "Academic Block - Room 201",
        "room_number": "AB-201",
        "capacity": 50,
        "room_type": "Standard",
        "facilities": ["Whiteboard", "Ventilation"],
        "unavailable_slots": [["2026-11-03", "SLOT-2"]], # Maintenance scheduled
        "is_active": True
    },
    {
        "id": "ROOM-LAB-AI",
        "name": "High-Performance Computing Lab",
        "room_number": "LAB-305",
        "capacity": 50,
        "room_type": "Lab",
        "facilities": ["GPU Workstations", "Central AC", "UPS Backup"],
        "unavailable_slots": [],
        "is_active": True
    }
]

DEMO_SLOTS = [
    {
        "id": "SLOT-1",
        "name": "Morning Session",
        "start_time": "09:30",
        "end_time": "12:30",
        "slot_order": 1,
        "is_active": True
    },
    {
        "id": "SLOT-2",
        "name": "Afternoon Session",
        "start_time": "14:00",
        "end_time": "17:00",
        "slot_order": 2,
        "is_active": True
    }
]

DEMO_DATES = [
    "2026-11-02",
    "2026-11-03",
    "2026-11-04",
    "2026-11-05",
    "2026-11-06"
]

DEMO_EXAMS = [
    {
        "id": "EXAM-CS301",
        "code": "CS301",
        "name": "Operating Systems",
        "student_count": 65,
        "group_ids": ["GRP-CS-3A"],
        "duration_slots": 1,
        "allowed_dates": [],
        "allowed_slots": [],
        "required_room_type": "",
        "preferred_gap_days": 1,
        "priority": 3
    },
    {
        "id": "EXAM-CS302",
        "code": "CS302",
        "name": "Database Management Systems",
        "student_count": 65,
        "group_ids": ["GRP-CS-3A"],
        "duration_slots": 1,
        "allowed_dates": [],
        "allowed_slots": [],
        "required_room_type": "",
        "preferred_gap_days": 1,
        "priority": 2
    },
    {
        "id": "EXAM-CS303",
        "code": "CS303",
        "name": "Computer Networks",
        "student_count": 60,
        "group_ids": ["GRP-CS-3B"],
        "duration_slots": 1,
        "allowed_dates": [],
        "allowed_slots": [],
        "required_room_type": "",
        "preferred_gap_days": 1,
        "priority": 2
    },
    {
        "id": "EXAM-CS304",
        "code": "CS304",
        "name": "Software Engineering",
        "student_count": 60,
        "group_ids": ["GRP-CS-3B"],
        "duration_slots": 1,
        "allowed_dates": [],
        "allowed_slots": [],
        "required_room_type": "",
        "preferred_gap_days": 1,
        "priority": 1
    },
    {
        "id": "EXAM-AI301",
        "code": "AI301",
        "name": "Artificial Intelligence & ML",
        "student_count": 45,
        "group_ids": ["GRP-AI-3"],
        "duration_slots": 1,
        "allowed_dates": [],
        "allowed_slots": [],
        "required_room_type": "",
        "preferred_gap_days": 1,
        "priority": 3
    },
    {
        "id": "EXAM-AI302",
        "code": "AI302",
        "name": "Deep Learning & Robotics Lab",
        "student_count": 45,
        "group_ids": ["GRP-AI-3"],
        "duration_slots": 1,
        "allowed_dates": [],
        "allowed_slots": [],
        "required_room_type": "Lab", # strictly requires Lab room
        "preferred_gap_days": 1,
        "priority": 2
    },
    {
        "id": "EXAM-IT301",
        "code": "IT301",
        "name": "Web Technologies & Microservices",
        "student_count": 50,
        "group_ids": ["GRP-IT-3"],
        "duration_slots": 1,
        "allowed_dates": [],
        "allowed_slots": [],
        "required_room_type": "",
        "preferred_gap_days": 1,
        "priority": 2
    },
    {
        "id": "EXAM-IT302",
        "code": "IT302",
        "name": "Information Security & Cryptography",
        "student_count": 50,
        "group_ids": ["GRP-IT-3"],
        "duration_slots": 1,
        "allowed_dates": [],
        "allowed_slots": [],
        "required_room_type": "",
        "preferred_gap_days": 1,
        "priority": 1
    },
    {
        "id": "EXAM-EC301",
        "code": "EC301",
        "name": "Digital Signal Processing",
        "student_count": 55,
        "group_ids": ["GRP-EC-3"],
        "duration_slots": 1,
        "allowed_dates": [],
        "allowed_slots": [],
        "required_room_type": "",
        "preferred_gap_days": 1,
        "priority": 2
    },
    {
        "id": "EXAM-EC302",
        "code": "EC302",
        "name": "Microprocessors & Embedded Systems",
        "student_count": 55,
        "group_ids": ["GRP-EC-3"],
        "duration_slots": 1,
        "allowed_dates": [],
        "allowed_slots": [],
        "required_room_type": "",
        "preferred_gap_days": 1,
        "priority": 1
    },
    {
        "id": "EXAM-ENG300",
        "code": "ENG300",
        "name": "Universal Human Values & Professional Ethics",
        "student_count": 125, # High capacity! Requires Auditorium
        "group_ids": ["GRP-CS-3A", "GRP-CS-3B"], # Combined batches
        "duration_slots": 1,
        "allowed_dates": [],
        "allowed_slots": [],
        "required_room_type": "",
        "preferred_gap_days": 1,
        "priority": 3
    },
    {
        "id": "EXAM-ELC301",
        "code": "ELC301",
        "name": "Cloud Computing Elective",
        "student_count": 45,
        "group_ids": ["GRP-AI-3"], # Shares students with CS-3A
        "duration_slots": 1,
        "allowed_dates": [],
        "allowed_slots": [],
        "required_room_type": "",
        "preferred_gap_days": 1,
        "priority": 2
    }
]

def reset_and_seed_demo_data(db: Session):
    """
    Clears all existing database tables and loads the curated academic demo dataset.
    """
    # Delete in child-to-parent order
    db.query(TimetableExplanationModel).delete()
    db.query(TimetableAssignmentModel).delete()
    db.query(TimetableModel).delete()
    db.query(ExaminationModel).delete()
    db.query(StudentGroupModel).delete()
    db.query(RoomModel).delete()
    db.query(TimeSlotModel).delete()
    db.query(SchedulingConfigModel).delete()

    # Seed Groups
    for g in DEMO_GROUPS:
        group_obj = StudentGroupModel(
            id=g["id"],
            name=g["name"],
            code=g["code"],
            student_count=g["student_count"]
        )
        group_obj.shared_conflicts = g["shared_conflicts"]
        db.add(group_obj)

    # Seed Rooms
    for r in DEMO_ROOMS:
        room_obj = RoomModel(
            id=r["id"],
            name=r["name"],
            room_number=r["room_number"],
            capacity=r["capacity"],
            room_type=r["room_type"],
            is_active=r["is_active"]
        )
        room_obj.facilities = r["facilities"]
        room_obj.unavailable_slots = r["unavailable_slots"]
        db.add(room_obj)

    # Seed Slots
    for s in DEMO_SLOTS:
        slot_obj = TimeSlotModel(
            id=s["id"],
            name=s["name"],
            start_time=s["start_time"],
            end_time=s["end_time"],
            slot_order=s["slot_order"],
            is_active=s["is_active"]
        )
        db.add(slot_obj)

    # Seed Examinations
    for e in DEMO_EXAMS:
        exam_obj = ExaminationModel(
            id=e["id"],
            code=e["code"],
            name=e["name"],
            student_count=e["student_count"],
            duration_slots=e["duration_slots"],
            required_room_type=e["required_room_type"],
            preferred_gap_days=e["preferred_gap_days"],
            priority=e["priority"]
        )
        exam_obj.group_ids = e["group_ids"]
        exam_obj.allowed_dates = e["allowed_dates"]
        exam_obj.allowed_slots = e["allowed_slots"]
        db.add(exam_obj)

    # Seed Configuration
    config_obj = SchedulingConfigModel(
        id="default",
        exam_period_name="End-Semester Examinations Nov 2026",
        start_date="2026-11-02",
        end_date="2026-11-06",
        default_duration_slots=1,
        min_preferred_gap_days=1,
        max_search_seconds=12.0,
        max_backtracks=5000,
        optimize_soft_constraints=True,
        weight_consecutive=20.0,
        weight_same_day=30.0,
        weight_gap=12.0,
        weight_day_concentration=5.0,
        weight_room_utilization=3.0
    )
    config_obj.available_dates = DEMO_DATES
    db.add(config_obj)

    db.commit()
