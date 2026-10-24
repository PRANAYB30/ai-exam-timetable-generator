import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.entities import ExaminationModel, StudentGroupModel
from backend.app.schemas.entities import ExaminationCreate, ExaminationUpdate, ExaminationResponse

router = APIRouter(prefix="/api/exams", tags=["Examinations"])

def to_response(e: ExaminationModel) -> ExaminationResponse:
    return ExaminationResponse(
        id=e.id,
        code=e.code,
        name=e.name,
        student_count=e.student_count,
        group_ids=e.group_ids,
        duration_slots=e.duration_slots,
        allowed_dates=e.allowed_dates,
        allowed_slots=e.allowed_slots,
        required_room_type=e.required_room_type or "",
        preferred_gap_days=e.preferred_gap_days,
        priority=e.priority,
        is_fixed=e.is_fixed,
        fixed_date=e.fixed_date,
        fixed_slot_id=e.fixed_slot_id,
        fixed_room_id=e.fixed_room_id
    )

@router.get("", response_model=List[ExaminationResponse])
def get_examinations(
    search: Optional[str] = Query(None, description="Search by subject code or name"),
    room_type: Optional[str] = Query(None, description="Filter by required room type"),
    group_id: Optional[str] = Query(None, description="Filter by student group"),
    db: Session = Depends(get_db)
):
    query = db.query(ExaminationModel)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter((ExaminationModel.code.ilike(s)) | (ExaminationModel.name.ilike(s)))
    if room_type:
        query = query.filter(ExaminationModel.required_room_type == room_type)

    exams = query.order_by(ExaminationModel.code).all()

    if group_id:
        exams = [e for e in exams if group_id in e.group_ids]

    return [to_response(e) for e in exams]

@router.get("/{exam_id}", response_model=ExaminationResponse)
def get_examination(exam_id: str, db: Session = Depends(get_db)):
    exam = db.query(ExaminationModel).filter(ExaminationModel.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found")
    return to_response(exam)

@router.post("", response_model=ExaminationResponse, status_code=201)
def create_examination(payload: ExaminationCreate, db: Session = Depends(get_db)):
    # Auto-calculate student count from groups if 0 and groups provided
    count = payload.student_count
    if count <= 0 and payload.group_ids:
        groups = db.query(StudentGroupModel).filter(StudentGroupModel.id.in_(payload.group_ids)).all()
        count = sum(g.student_count for g in groups)

    exam_id = payload.id or f"EXAM-{uuid.uuid4().hex[:6].upper()}"
    exam = ExaminationModel(
        id=exam_id,
        code=payload.code.strip(),
        name=payload.name.strip(),
        student_count=max(1, count),
        duration_slots=payload.duration_slots,
        required_room_type=payload.required_room_type.strip() if payload.required_room_type else "",
        preferred_gap_days=payload.preferred_gap_days,
        priority=payload.priority,
        is_fixed=payload.is_fixed,
        fixed_date=payload.fixed_date,
        fixed_slot_id=payload.fixed_slot_id,
        fixed_room_id=payload.fixed_room_id
    )
    exam.group_ids = payload.group_ids
    exam.allowed_dates = payload.allowed_dates
    exam.allowed_slots = payload.allowed_slots

    db.add(exam)
    db.commit()
    db.refresh(exam)
    return to_response(exam)

@router.put("/{exam_id}", response_model=ExaminationResponse)
def update_examination(exam_id: str, payload: ExaminationUpdate, db: Session = Depends(get_db)):
    exam = db.query(ExaminationModel).filter(ExaminationModel.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found")

    if payload.code is not None:
        exam.code = payload.code.strip()
    if payload.name is not None:
        exam.name = payload.name.strip()
    if payload.student_count is not None:
        exam.student_count = payload.student_count
    if payload.group_ids is not None:
        exam.group_ids = payload.group_ids
    if payload.duration_slots is not None:
        exam.duration_slots = payload.duration_slots
    if payload.allowed_dates is not None:
        exam.allowed_dates = payload.allowed_dates
    if payload.allowed_slots is not None:
        exam.allowed_slots = payload.allowed_slots
    if payload.required_room_type is not None:
        exam.required_room_type = payload.required_room_type
    if payload.preferred_gap_days is not None:
        exam.preferred_gap_days = payload.preferred_gap_days
    if payload.priority is not None:
        exam.priority = payload.priority
    if payload.is_fixed is not None:
        exam.is_fixed = payload.is_fixed
    if payload.fixed_date is not None:
        exam.fixed_date = payload.fixed_date
    if payload.fixed_slot_id is not None:
        exam.fixed_slot_id = payload.fixed_slot_id
    if payload.fixed_room_id is not None:
        exam.fixed_room_id = payload.fixed_room_id

    db.commit()
    db.refresh(exam)
    return to_response(exam)

@router.delete("/{exam_id}", status_code=204)
def delete_examination(exam_id: str, db: Session = Depends(get_db)):
    exam = db.query(ExaminationModel).filter(ExaminationModel.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found")
    db.delete(exam)
    db.commit()
    return None
