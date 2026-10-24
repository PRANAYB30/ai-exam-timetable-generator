import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.entities import (
    ExaminationModel,
    RoomModel,
    StudentGroupModel,
    SchedulingConfigModel,
    TimetableModel,
    TimetableAssignmentModel
)
from backend.app.schemas.entities import DashboardStats, TimetableResponse, AssignmentResponse, ExplanationResponse

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

def serialize_timetable(tt: TimetableModel) -> TimetableResponse:
    soft_scores = {}
    metrics = {}
    validation_report = {}
    failure_reasons = []

    try:
        soft_scores = json.loads(tt.soft_scores_json or "{}")
    except:
        pass
    try:
        metrics = json.loads(tt.metrics_json or "{}")
    except:
        pass
    try:
        validation_report = json.loads(tt.validation_report_json or "{}")
    except:
        pass
    try:
        failure_reasons = json.loads(tt.failure_reasons_json or "[]")
    except:
        pass

    assignments = [
        AssignmentResponse(
            id=a.id,
            timetable_id=a.timetable_id,
            exam_id=a.exam_id,
            exam_code=a.exam_code,
            exam_name=a.exam_name,
            date=a.date,
            slot_id=a.slot_id,
            slot_name=a.slot_name,
            start_time=a.start_time,
            end_time=a.end_time,
            room_id=a.room_id,
            room_name=a.room_name,
            room_capacity=a.room_capacity,
            student_count=a.student_count,
            groups_str=a.groups_str,
            is_locked=a.is_locked
        )
        for a in tt.assignments
    ]

    explanations = [
        ExplanationResponse(
            step=e.step,
            event_type=e.event_type,
            exam_code=e.exam_code,
            details=e.details,
            reason=e.reason
        )
        for e in tt.explanations
    ]

    return TimetableResponse(
        id=tt.id,
        title=tt.title,
        created_at=tt.created_at.isoformat() if tt.created_at else "",
        status=tt.status,
        is_valid=tt.is_valid,
        total_exams=tt.total_exams,
        scheduled_exams=tt.scheduled_exams,
        soft_penalty_total=tt.soft_penalty_total,
        soft_scores=soft_scores,
        metrics=metrics,
        validation_report=validation_report,
        failure_reasons=failure_reasons,
        assignments=assignments,
        explanations=explanations
    )

@router.get("", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    total_exams = db.query(ExaminationModel).count()
    available_rooms = db.query(RoomModel).filter(RoomModel.is_active == True).count()
    total_student_groups = db.query(StudentGroupModel).count()
    config = db.query(SchedulingConfigModel).first()
    exam_days = len(config.available_dates) if config else 0

    latest_tt = db.query(TimetableModel).order_by(TimetableModel.created_at.desc()).first()

    scheduled_exams = 0
    hard_violations = 0
    room_utilization_percent = 0.0

    if latest_tt:
        scheduled_exams = latest_tt.scheduled_exams
        try:
            v_report = json.loads(latest_tt.validation_report_json or "{}")
            hard_violations = v_report.get("total_hard_violations", 0)
        except:
            hard_violations = 0

        # Compute utilization percent
        if latest_tt.assignments:
            total_seats_used = sum(a.student_count for a in latest_tt.assignments)
            total_room_capacity = sum(a.room_capacity for a in latest_tt.assignments)
            if total_room_capacity > 0:
                room_utilization_percent = round((total_seats_used / total_room_capacity) * 100, 1)

    recent_activities = []
    recent_timetables = db.query(TimetableModel).order_by(TimetableModel.created_at.desc()).limit(5).all()
    for tt in recent_timetables:
        recent_activities.append({
            "id": tt.id,
            "title": tt.title,
            "status": tt.status,
            "is_valid": tt.is_valid,
            "scheduled_exams": tt.scheduled_exams,
            "penalty": tt.soft_penalty_total,
            "created_at": tt.created_at.isoformat() if tt.created_at else ""
        })

    return DashboardStats(
        total_exams=total_exams,
        scheduled_exams=scheduled_exams,
        available_rooms=available_rooms,
        total_student_groups=total_student_groups,
        examination_days=exam_days,
        hard_violations=hard_violations,
        room_utilization_percent=room_utilization_percent,
        latest_timetable=serialize_timetable(latest_tt) if latest_tt else None,
        recent_activities=recent_activities
    )
