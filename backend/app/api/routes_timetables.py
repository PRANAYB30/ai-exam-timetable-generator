import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.entities import TimetableModel, TimetableAssignmentModel
from backend.app.schemas.entities import (
    TimetableResponse, TimetableGenerateRequest,
    AssignmentManualUpdate, AssignmentResponse, ExplanationResponse
)
from backend.app.services.scheduling_service import SchedulingService
from backend.app.services.import_export import ImportExportService
from backend.app.api.routes_dashboard import serialize_timetable

router = APIRouter(prefix="/api/timetables", tags=["Timetables"])

@router.post("/generate", response_model=TimetableResponse)
def generate_timetable(
    payload: Optional[TimetableGenerateRequest] = None,
    db: Session = Depends(get_db)
):
    title = payload.title if payload else None
    max_sec = payload.max_search_seconds if payload else None
    opt_soft = payload.optimize_soft_constraints if payload else None

    try:
        timetable = SchedulingService.generate_timetable(
            db=db,
            title=title,
            max_search_seconds=max_sec,
            optimize_soft=opt_soft
        )
        return serialize_timetable(timetable)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scheduling error: {str(e)}")

@router.get("", response_model=List[TimetableResponse])
def get_timetables(db: Session = Depends(get_db)):
    timetables = db.query(TimetableModel).order_by(TimetableModel.created_at.desc()).all()
    return [serialize_timetable(tt) for tt in timetables]

@router.get("/{timetable_id}", response_model=TimetableResponse)
def get_timetable(timetable_id: str, db: Session = Depends(get_db)):
    timetable = db.query(TimetableModel).filter(TimetableModel.id == timetable_id).first()
    if not timetable:
        raise HTTPException(status_code=404, detail="Timetable not found")
    return serialize_timetable(timetable)

@router.patch("/{timetable_id}/assignments/{assignment_id}", response_model=TimetableResponse)
def update_assignment(
    timetable_id: str,
    assignment_id: str,
    payload: AssignmentManualUpdate,
    db: Session = Depends(get_db)
):
    try:
        updated_tt = SchedulingService.manual_update_assignment(
            db=db,
            timetable_id=timetable_id,
            assignment_id=assignment_id,
            update=payload
        )
        return serialize_timetable(updated_tt)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{timetable_id}/repair", response_model=TimetableResponse)
def repair_timetable(timetable_id: str, db: Session = Depends(get_db)):
    try:
        repaired_tt = SchedulingService.repair_timetable(db=db, timetable_id=timetable_id)
        return serialize_timetable(repaired_tt)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{timetable_id}/export")
def export_timetable(timetable_id: str, db: Session = Depends(get_db)):
    timetable = db.query(TimetableModel).filter(TimetableModel.id == timetable_id).first()
    if not timetable:
        raise HTTPException(status_code=404, detail="Timetable not found")

    csv_data = ImportExportService.export_timetable_csv(timetable)
    filename = f"timetable_{timetable.id}.csv"

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.delete("/{timetable_id}", status_code=204)
def delete_timetable(timetable_id: str, db: Session = Depends(get_db)):
    timetable = db.query(TimetableModel).filter(TimetableModel.id == timetable_id).first()
    if not timetable:
        raise HTTPException(status_code=404, detail="Timetable not found")
    db.delete(timetable)
    db.commit()
    return None
