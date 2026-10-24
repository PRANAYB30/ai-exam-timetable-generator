import json
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from backend.app.database import Base

class ExaminationModel(Base):
    __tablename__ = "examinations"

    id = Column(String, primary_key=True, index=True)
    code = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False)
    student_count = Column(Integer, default=0)
    group_ids_json = Column(Text, default="[]") # JSON list of group IDs
    duration_slots = Column(Integer, default=1)
    allowed_dates_json = Column(Text, default="[]") # JSON list of dates
    allowed_slots_json = Column(Text, default="[]") # JSON list of slot IDs
    required_room_type = Column(String, default="")
    preferred_gap_days = Column(Integer, default=1)
    priority = Column(Integer, default=1)
    is_fixed = Column(Boolean, default=False)
    fixed_date = Column(String, nullable=True)
    fixed_slot_id = Column(String, nullable=True)
    fixed_room_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    @property
    def group_ids(self):
        try:
            return json.loads(self.group_ids_json or "[]")
        except:
            return []

    @group_ids.setter
    def group_ids(self, val):
        self.group_ids_json = json.dumps(val or [])

    @property
    def allowed_dates(self):
        try:
            return json.loads(self.allowed_dates_json or "[]")
        except:
            return []

    @allowed_dates.setter
    def allowed_dates(self, val):
        self.allowed_dates_json = json.dumps(val or [])

    @property
    def allowed_slots(self):
        try:
            return json.loads(self.allowed_slots_json or "[]")
        except:
            return []

    @allowed_slots.setter
    def allowed_slots(self, val):
        self.allowed_slots_json = json.dumps(val or [])


class StudentGroupModel(Base):
    __tablename__ = "student_groups"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    code = Column(String, unique=True, index=True, nullable=False)
    student_count = Column(Integer, default=0)
    shared_conflicts_json = Column(Text, default="[]") # JSON list of group codes sharing students

    @property
    def shared_conflicts(self):
        try:
            return json.loads(self.shared_conflicts_json or "[]")
        except:
            return []

    @shared_conflicts.setter
    def shared_conflicts(self, val):
        self.shared_conflicts_json = json.dumps(val or [])


class RoomModel(Base):
    __tablename__ = "rooms"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    room_number = Column(String, nullable=False)
    capacity = Column(Integer, nullable=False)
    room_type = Column(String, default="Standard")
    facilities_json = Column(Text, default="[]") # JSON list of tags
    unavailable_slots_json = Column(Text, default="[]") # JSON list of [date, slot_id]
    is_active = Column(Boolean, default=True)

    @property
    def facilities(self):
        try:
            return json.loads(self.facilities_json or "[]")
        except:
            return []

    @facilities.setter
    def facilities(self, val):
        self.facilities_json = json.dumps(val or [])

    @property
    def unavailable_slots(self):
        try:
            return json.loads(self.unavailable_slots_json or "[]")
        except:
            return []

    @unavailable_slots.setter
    def unavailable_slots(self, val):
        self.unavailable_slots_json = json.dumps(val or [])


class TimeSlotModel(Base):
    __tablename__ = "time_slots"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    start_time = Column(String, nullable=False) # e.g. "09:30"
    end_time = Column(String, nullable=False)   # e.g. "12:30"
    slot_order = Column(Integer, nullable=False)
    is_active = Column(Boolean, default=True)


class SchedulingConfigModel(Base):
    __tablename__ = "scheduling_configs"

    id = Column(String, primary_key=True, default="default")
    exam_period_name = Column(String, default="End-Semester Examinations 2026")
    start_date = Column(String, default="2026-11-02")
    end_date = Column(String, default="2026-11-06")
    available_dates_json = Column(Text, default="[]")
    default_duration_slots = Column(Integer, default=1)
    min_preferred_gap_days = Column(Integer, default=1)
    max_search_seconds = Column(Float, default=12.0)
    max_backtracks = Column(Integer, default=5000)
    optimize_soft_constraints = Column(Boolean, default=True)
    weight_consecutive = Column(Float, default=20.0)
    weight_same_day = Column(Float, default=30.0)
    weight_gap = Column(Float, default=12.0)
    weight_day_concentration = Column(Float, default=5.0)
    weight_room_utilization = Column(Float, default=3.0)

    @property
    def available_dates(self):
        try:
            return json.loads(self.available_dates_json or "[]")
        except:
            return []

    @available_dates.setter
    def available_dates(self, val):
        self.available_dates_json = json.dumps(val or [])


class TimetableModel(Base):
    __tablename__ = "timetables"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="SUCCESS_FEASIBLE")
    is_valid = Column(Boolean, default=True)
    total_exams = Column(Integer, default=0)
    scheduled_exams = Column(Integer, default=0)
    soft_penalty_total = Column(Float, default=0.0)
    soft_scores_json = Column(Text, default="{}")
    metrics_json = Column(Text, default="{}")
    validation_report_json = Column(Text, default="{}")
    failure_reasons_json = Column(Text, default="[]")

    assignments = relationship("TimetableAssignmentModel", back_populates="timetable", cascade="all, delete-orphan")
    explanations = relationship("TimetableExplanationModel", back_populates="timetable", cascade="all, delete-orphan")


class TimetableAssignmentModel(Base):
    __tablename__ = "timetable_assignments"

    id = Column(String, primary_key=True, index=True)
    timetable_id = Column(String, ForeignKey("timetables.id"), nullable=False, index=True)
    exam_id = Column(String, nullable=False)
    exam_code = Column(String, nullable=False)
    exam_name = Column(String, nullable=False)
    date = Column(String, nullable=False)
    slot_id = Column(String, nullable=False)
    slot_name = Column(String, nullable=False)
    start_time = Column(String, nullable=False)
    end_time = Column(String, nullable=False)
    room_id = Column(String, nullable=False)
    room_name = Column(String, nullable=False)
    room_capacity = Column(Integer, default=0)
    student_count = Column(Integer, default=0)
    groups_str = Column(String, default="")
    is_locked = Column(Boolean, default=False)

    timetable = relationship("TimetableModel", back_populates="assignments")


class TimetableExplanationModel(Base):
    __tablename__ = "timetable_explanations"

    id = Column(String, primary_key=True, index=True)
    timetable_id = Column(String, ForeignKey("timetables.id"), nullable=False, index=True)
    step = Column(Integer, default=0)
    event_type = Column(String, nullable=False)
    exam_code = Column(String, default="")
    details = Column(Text, nullable=False)
    reason = Column(Text, default="")

    timetable = relationship("TimetableModel", back_populates="explanations")
