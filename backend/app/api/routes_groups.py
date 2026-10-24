import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.entities import StudentGroupModel, ExaminationModel
from backend.app.schemas.entities import StudentGroupCreate, StudentGroupUpdate, StudentGroupResponse

router = APIRouter(prefix="/api/groups", tags=["Student Groups"])

def to_response(g: StudentGroupModel) -> StudentGroupResponse:
    return StudentGroupResponse(
        id=g.id,
        name=g.name,
        code=g.code,
        student_count=g.student_count,
        shared_conflicts=g.shared_conflicts
    )

@router.get("", response_model=List[StudentGroupResponse])
def get_groups(
    search: Optional[str] = Query(None, description="Search by name or code"),
    db: Session = Depends(get_db)
):
    query = db.query(StudentGroupModel)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter((StudentGroupModel.name.ilike(s)) | (StudentGroupModel.code.ilike(s)))
    groups = query.order_by(StudentGroupModel.code).all()
    return [to_response(g) for g in groups]

@router.get("/{group_id}", response_model=StudentGroupResponse)
def get_group(group_id: str, db: Session = Depends(get_db)):
    grp = db.query(StudentGroupModel).filter(StudentGroupModel.id == group_id).first()
    if not grp:
        raise HTTPException(status_code=404, detail="Student group not found")
    return to_response(grp)

@router.post("", response_model=StudentGroupResponse, status_code=201)
def create_group(payload: StudentGroupCreate, db: Session = Depends(get_db)):
    existing = db.query(StudentGroupModel).filter(StudentGroupModel.code == payload.code.strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Group code '{payload.code}' is already registered")

    grp_id = payload.id or f"GRP-{uuid.uuid4().hex[:6].upper()}"
    grp = StudentGroupModel(
        id=grp_id,
        name=payload.name.strip(),
        code=payload.code.strip(),
        student_count=payload.student_count
    )
    grp.shared_conflicts = payload.shared_conflicts
    db.add(grp)
    db.commit()
    db.refresh(grp)
    return to_response(grp)

@router.put("/{group_id}", response_model=StudentGroupResponse)
def update_group(group_id: str, payload: StudentGroupUpdate, db: Session = Depends(get_db)):
    grp = db.query(StudentGroupModel).filter(StudentGroupModel.id == group_id).first()
    if not grp:
        raise HTTPException(status_code=404, detail="Student group not found")

    if payload.code is not None and payload.code.strip() != grp.code:
        conflict = db.query(StudentGroupModel).filter(StudentGroupModel.code == payload.code.strip()).first()
        if conflict:
            raise HTTPException(status_code=400, detail=f"Group code '{payload.code}' is already registered")
        grp.code = payload.code.strip()

    if payload.name is not None:
        grp.name = payload.name.strip()
    if payload.student_count is not None:
        grp.student_count = payload.student_count
    if payload.shared_conflicts is not None:
        grp.shared_conflicts = payload.shared_conflicts

    db.commit()
    db.refresh(grp)
    return to_response(grp)

@router.delete("/{group_id}", status_code=204)
def delete_group(group_id: str, db: Session = Depends(get_db)):
    grp = db.query(StudentGroupModel).filter(StudentGroupModel.id == group_id).first()
    if not grp:
        raise HTTPException(status_code=404, detail="Student group not found")

    # Check if used by any examination
    exams = db.query(ExaminationModel).all()
    referencing = [e.code for e in exams if group_id in e.group_ids]
    if referencing:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete group '{grp.code}'; it is enrolled in examinations: {', '.join(referencing)}"
        )

    db.delete(grp)
    db.commit()
    return None
