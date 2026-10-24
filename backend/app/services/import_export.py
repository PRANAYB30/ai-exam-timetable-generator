import csv
import io
import json
import uuid
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from backend.app.models.entities import (
    ExaminationModel,
    StudentGroupModel,
    RoomModel,
    TimetableModel,
    TimetableAssignmentModel
)

class ImportExportService:

    @staticmethod
    def export_timetable_csv(timetable: TimetableModel) -> str:
        """Exports the assignments of a timetable to a standard CSV string."""
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Date", "Slot Name", "Start Time", "End Time",
            "Subject Code", "Subject Name", "Student Groups",
            "Student Count", "Room Name", "Room Capacity", "Locked"
        ])

        # Sort assignments by date, then start_time, then room_name
        sorted_assignments = sorted(
            timetable.assignments,
            key=lambda a: (a.date, a.start_time, a.room_name)
        )

        for a in sorted_assignments:
            writer.writerow([
                a.date,
                a.slot_name,
                a.start_time,
                a.end_time,
                a.exam_code,
                a.exam_name,
                a.groups_str,
                a.student_count,
                a.room_name,
                a.room_capacity,
                "YES" if a.is_locked else "NO"
            ])

        return output.getvalue()

    @staticmethod
    def import_rooms_csv(db: Session, csv_content: str) -> Tuple[int, List[str]]:
        reader = csv.DictReader(io.StringIO(csv_content))
        added_count = 0
        errors = []

        for row_idx, row in enumerate(reader, start=2):
            name = row.get("name", "").strip()
            room_number = row.get("room_number", "").strip()
            cap_str = row.get("capacity", "").strip()
            room_type = row.get("room_type", "Standard").strip() or "Standard"

            if not name or not cap_str:
                errors.append(f"Row {row_idx}: Missing required fields (name, capacity)")
                continue

            try:
                capacity = int(cap_str)
                if capacity <= 0:
                    errors.append(f"Row {row_idx}: Capacity must be a positive integer")
                    continue
            except ValueError:
                errors.append(f"Row {row_idx}: Invalid capacity value '{cap_str}'")
                continue

            room_id = f"ROOM-{uuid.uuid4().hex[:6].upper()}"
            room = RoomModel(
                id=room_id,
                name=name,
                room_number=room_number or name,
                capacity=capacity,
                room_type=room_type,
                is_active=True
            )
            room.facilities = []
            room.unavailable_slots = []
            db.add(room)
            added_count += 1

        db.commit()
        return added_count, errors

    @staticmethod
    def import_groups_csv(db: Session, csv_content: str) -> Tuple[int, List[str]]:
        reader = csv.DictReader(io.StringIO(csv_content))
        added_count = 0
        errors = []

        for row_idx, row in enumerate(reader, start=2):
            name = row.get("name", "").strip()
            code = row.get("code", "").strip()
            count_str = row.get("student_count", "0").strip()

            if not name or not code:
                errors.append(f"Row {row_idx}: Missing required fields (name, code)")
                continue

            try:
                count = int(count_str) if count_str else 0
            except ValueError:
                errors.append(f"Row {row_idx}: Invalid student count '{count_str}'")
                continue

            # Check code uniqueness
            existing = db.query(StudentGroupModel).filter(StudentGroupModel.code == code).first()
            if existing:
                errors.append(f"Row {row_idx}: Student group with code '{code}' already exists")
                continue

            grp = StudentGroupModel(
                id=f"GRP-{uuid.uuid4().hex[:6].upper()}",
                name=name,
                code=code,
                student_count=count
            )
            grp.shared_conflicts = []
            db.add(grp)
            added_count += 1

        db.commit()
        return added_count, errors

    @staticmethod
    def import_exams_csv(db: Session, csv_content: str) -> Tuple[int, List[str]]:
        reader = csv.DictReader(io.StringIO(csv_content))
        added_count = 0
        errors = []

        all_groups = db.query(StudentGroupModel).all()
        code_to_group = {g.code: g for g in all_groups}

        for row_idx, row in enumerate(reader, start=2):
            code = row.get("code", "").strip()
            name = row.get("name", "").strip()
            groups_str = row.get("groups", "").strip()
            count_str = row.get("student_count", "").strip()
            room_type = row.get("room_type", "").strip()

            if not code or not name:
                errors.append(f"Row {row_idx}: Missing required fields (code, name)")
                continue

            # Parse group IDs
            group_codes = [c.strip() for c in groups_str.split(",") if c.strip()]
            matched_group_ids = []
            auto_student_count = 0

            for gc in group_codes:
                if gc in code_to_group:
                    matched_group_ids.append(code_to_group[gc].id)
                    auto_student_count += code_to_group[gc].student_count
                else:
                    errors.append(f"Row {row_idx}: Group code '{gc}' not found")

            # Student count
            if count_str:
                try:
                    count = int(count_str)
                except ValueError:
                    errors.append(f"Row {row_idx}: Invalid student_count '{count_str}'")
                    continue
            else:
                count = auto_student_count if auto_student_count > 0 else 50

            exam = ExaminationModel(
                id=f"EXAM-{uuid.uuid4().hex[:6].upper()}",
                code=code,
                name=name,
                student_count=count,
                duration_slots=1,
                required_room_type=room_type,
                preferred_gap_days=1,
                priority=1
            )
            exam.group_ids = matched_group_ids
            exam.allowed_dates = []
            exam.allowed_slots = []
            db.add(exam)
            added_count += 1

        db.commit()
        return added_count, errors
