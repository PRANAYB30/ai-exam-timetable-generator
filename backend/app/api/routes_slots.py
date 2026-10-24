import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.entities import TimeSlotModel
from backend.app.schemas.entities import TimeSlotCreate, TimeSlotUpdate, TimeSlotResponse

router = APIRouter(prefix="/api/slots", tags=["Time Slots"])

def to_response(s: TimeSlotModel) -> TimeSlotResponse:
    return TimeSlotResponse(
        id=s.id,
        name=s.name,
        start_time=s.start_time,
        end_time=s.end_time,
        slot_order=s.slot_order,
        is_active=s.is_active
    )

@router.get("", response_model=List[TimeSlotResponse])
def get_slots(db: Session = Depends(get_db)):
    slots = db.query(TimeSlotModel).order_by(TimeSlotModel.slot_order).all()
    return [to_response(s) for s in slots]

@router.post("", response_model=TimeSlotResponse, status_code=201)
def create_slot(payload: TimeSlotCreate, db: Session = Depends(get_db)):
    slot_id = payload.id or f"SLOT-{uuid.uuid4().hex[:6].upper()}"
    slot = TimeSlotModel(
        id=slot_id,
        name=payload.name.strip(),
        start_time=payload.start_time.strip(),
        end_time=payload.end_time.strip(),
        slot_order=payload.slot_order,
        is_active=payload.is_active
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return to_response(slot)

@router.put("/{slot_id}", response_model=TimeSlotResponse)
def update_slot(slot_id: str, payload: TimeSlotUpdate, db: Session = Depends(get_db)):
    slot = db.query(TimeSlotModel).filter(TimeSlotModel.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Time slot not found")

    if payload.name is not None:
        slot.name = payload.name.strip()
    if payload.start_time is not None:
        slot.start_time = payload.start_time.strip()
    if payload.end_time is not None:
        slot.end_time = payload.end_time.strip()
    if payload.slot_order is not None:
        slot.slot_order = payload.slot_order
    if payload.is_active is not None:
        slot.is_active = payload.is_active

    db.commit()
    db.refresh(slot)
    return to_response(slot)

@router.delete("/{slot_id}", status_code=204)
def delete_slot(slot_id: str, db: Session = Depends(get_db)):
    slot = db.query(TimeSlotModel).filter(TimeSlotModel.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Time slot not found")
    db.delete(slot)
    db.commit()
    return None
