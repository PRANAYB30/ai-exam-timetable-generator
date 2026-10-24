from __future__ import annotations
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

# ----------------- Examinations -----------------
class ExaminationBase(BaseModel):
    code: str = Field(..., json_schema_extra={"example": "CS301"})
    name: str = Field(..., json_schema_extra={"example": "Operating Systems"})
    student_count: int = Field(default=60, ge=1)
    group_ids: List[str] = Field(default_factory=list)
    duration_slots: int = Field(default=1, ge=1)
    allowed_dates: List[str] = Field(default_factory=list)
    allowed_slots: List[str] = Field(default_factory=list)
    required_room_type: str = Field(default="")
    preferred_gap_days: int = Field(default=1, ge=0)
    priority: int = Field(default=1, ge=1)
    is_fixed: bool = False
    fixed_date: Optional[str] = None
    fixed_slot_id: Optional[str] = None
    fixed_room_id: Optional[str] = None

class ExaminationCreate(ExaminationBase):
    id: Optional[str] = None

class ExaminationUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    student_count: Optional[int] = None
    group_ids: Optional[List[str]] = None
    duration_slots: Optional[int] = None
    allowed_dates: Optional[List[str]] = None
    allowed_slots: Optional[List[str]] = None
    required_room_type: Optional[str] = None
    preferred_gap_days: Optional[int] = None
    priority: Optional[int] = None
    is_fixed: Optional[bool] = None
    fixed_date: Optional[str] = None
    fixed_slot_id: Optional[str] = None
    fixed_room_id: Optional[str] = None

class ExaminationResponse(ExaminationBase):
    id: str
    model_config = ConfigDict(from_attributes=True)

# ----------------- Student Groups -----------------
class StudentGroupBase(BaseModel):
    name: str = Field(..., json_schema_extra={"example": "B.Tech Computer Science Year 3"})
    code: str = Field(..., json_schema_extra={"example": "CS-3A"})
    student_count: int = Field(default=60, ge=1)
    shared_conflicts: List[str] = Field(default_factory=list)

class StudentGroupCreate(StudentGroupBase):
    id: Optional[str] = None

class StudentGroupUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    student_count: Optional[int] = None
    shared_conflicts: Optional[List[str]] = None

class StudentGroupResponse(StudentGroupBase):
    id: str
    model_config = ConfigDict(from_attributes=True)

# ----------------- Rooms -----------------
class RoomBase(BaseModel):
    name: str = Field(..., json_schema_extra={"example": "Hall A"})
    room_number: str = Field(..., json_schema_extra={"example": "101"})
    capacity: int = Field(..., ge=1, json_schema_extra={"example": 80})
    room_type: str = Field(default="Standard")
    facilities: List[str] = Field(default_factory=list)
    unavailable_slots: List[List[str]] = Field(default_factory=list)
    is_active: bool = True

class RoomCreate(RoomBase):
    id: Optional[str] = None

class RoomUpdate(BaseModel):
    name: Optional[str] = None
    room_number: Optional[str] = None
    capacity: Optional[int] = None
    room_type: Optional[str] = None
    facilities: Optional[List[str]] = None
    unavailable_slots: Optional[List[List[str]]] = None
    is_active: Optional[bool] = None

class RoomResponse(RoomBase):
    id: str
    model_config = ConfigDict(from_attributes=True)

# ----------------- Time Slots -----------------
class TimeSlotBase(BaseModel):
    name: str = Field(..., json_schema_extra={"example": "Morning Session"})
    start_time: str = Field(..., json_schema_extra={"example": "09:30"})
    end_time: str = Field(..., json_schema_extra={"example": "12:30"})
    slot_order: int = Field(..., ge=1)
    is_active: bool = True

class TimeSlotCreate(TimeSlotBase):
    id: Optional[str] = None

class TimeSlotUpdate(BaseModel):
    name: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    slot_order: Optional[int] = None
    is_active: Optional[bool] = None

class TimeSlotResponse(TimeSlotBase):
    id: str
    model_config = ConfigDict(from_attributes=True)

# ----------------- Scheduling Config -----------------
class SchedulingConfigBase(BaseModel):
    exam_period_name: str = "End-Semester Examinations 2026"
    start_date: str = "2026-11-02"
    end_date: str = "2026-11-06"
    available_dates: List[str] = Field(default_factory=list)
    default_duration_slots: int = 1
    min_preferred_gap_days: int = 1
    max_search_seconds: float = 12.0
    max_backtracks: int = 5000
    optimize_soft_constraints: bool = True
    weight_consecutive: float = 20.0
    weight_same_day: float = 30.0
    weight_gap: float = 12.0
    weight_day_concentration: float = 5.0
    weight_room_utilization: float = 3.0

class SchedulingConfigResponse(SchedulingConfigBase):
    id: str
    model_config = ConfigDict(from_attributes=True)

# ----------------- Assignments & Timetables -----------------
class AssignmentResponse(BaseModel):
    id: str
    timetable_id: str
    exam_id: str
    exam_code: str
    exam_name: str
    date: str
    slot_id: str
    slot_name: str
    start_time: str
    end_time: str
    room_id: str
    room_name: str
    room_capacity: int
    student_count: int
    groups_str: str
    is_locked: bool

    model_config = ConfigDict(from_attributes=True)

class AssignmentManualUpdate(BaseModel):
    date: Optional[str] = None
    slot_id: Optional[str] = None
    room_id: Optional[str] = None
    is_locked: Optional[bool] = None

class ExplanationResponse(BaseModel):
    step: int
    event_type: str
    exam_code: str
    details: str
    reason: str

    model_config = ConfigDict(from_attributes=True)

class TimetableResponse(BaseModel):
    id: str
    title: str
    created_at: str
    status: str
    is_valid: bool
    total_exams: int
    scheduled_exams: int
    soft_penalty_total: float
    soft_scores: Dict[str, Any]
    metrics: Dict[str, Any]
    validation_report: Dict[str, Any]
    failure_reasons: List[str]
    assignments: List[AssignmentResponse] = []
    explanations: List[ExplanationResponse] = []

class TimetableGenerateRequest(BaseModel):
    title: Optional[str] = None
    max_search_seconds: Optional[float] = None
    optimize_soft_constraints: Optional[bool] = None

class DashboardStats(BaseModel):
    total_exams: int
    scheduled_exams: int
    available_rooms: int
    total_student_groups: int
    examination_days: int
    hard_violations: int
    room_utilization_percent: float
    latest_timetable: Optional[TimetableResponse] = None
    recent_activities: List[Dict[str, Any]] = []
