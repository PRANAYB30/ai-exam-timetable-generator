import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.entities import RoomModel
from backend.app.schemas.entities import RoomCreate, RoomUpdate, RoomResponse

router = APIRouter(prefix="/api/rooms", tags=["Rooms"])

def to_response(r: RoomModel) -> RoomResponse:
    return RoomResponse(
        id=r.id,
        name=r.name,
        room_number=r.room_number,
        capacity=r.capacity,
        room_type=r.room_type,
        facilities=r.facilities,
        unavailable_slots=r.unavailable_slots,
        is_active=r.is_active
    )

@router.get("", response_model=List[RoomResponse])
def get_rooms(
    search: Optional[str] = Query(None, description="Search by room name or number"),
    room_type: Optional[str] = Query(None, description="Filter by room type"),
    min_capacity: Optional[int] = Query(None, description="Filter by minimum capacity"),
    active_only: bool = Query(False, description="Filter active rooms only"),
    db: Session = Depends(get_db)
):
    query = db.query(RoomModel)
    if active_only:
        query = query.filter(RoomModel.is_active == True)
    if room_type:
        query = query.filter(RoomModel.room_type == room_type)
    if min_capacity:
        query = query.filter(RoomModel.capacity >= min_capacity)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter((RoomModel.name.ilike(s)) | (RoomModel.room_number.ilike(s)))

    rooms = query.order_by(RoomModel.capacity.desc()).all()
    return [to_response(r) for r in rooms]

@router.get("/{room_id}", response_model=RoomResponse)
def get_room(room_id: str, db: Session = Depends(get_db)):
    room = db.query(RoomModel).filter(RoomModel.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return to_response(room)

@router.post("", response_model=RoomResponse, status_code=201)
def create_room(payload: RoomCreate, db: Session = Depends(get_db)):
    room_id = payload.id or f"ROOM-{uuid.uuid4().hex[:6].upper()}"
    room = RoomModel(
        id=room_id,
        name=payload.name.strip(),
        room_number=payload.room_number.strip(),
        capacity=payload.capacity,
        room_type=payload.room_type.strip() if payload.room_type else "Standard",
        is_active=payload.is_active
    )
    room.facilities = payload.facilities
    room.unavailable_slots = payload.unavailable_slots

    db.add(room)
    db.commit()
    db.refresh(room)
    return to_response(room)

@router.put("/{room_id}", response_model=RoomResponse)
def update_room(room_id: str, payload: RoomUpdate, db: Session = Depends(get_db)):
    room = db.query(RoomModel).filter(RoomModel.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    if payload.name is not None:
        room.name = payload.name.strip()
    if payload.room_number is not None:
        room.room_number = payload.room_number.strip()
    if payload.capacity is not None:
        room.capacity = payload.capacity
    if payload.room_type is not None:
        room.room_type = payload.room_type.strip()
    if payload.facilities is not None:
        room.facilities = payload.facilities
    if payload.unavailable_slots is not None:
        room.unavailable_slots = payload.unavailable_slots
    if payload.is_active is not None:
        room.is_active = payload.is_active

    db.commit()
    db.refresh(room)
    return to_response(room)

@router.delete("/{room_id}", status_code=204)
def delete_room(room_id: str, db: Session = Depends(get_db)):
    room = db.query(RoomModel).filter(RoomModel.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    db.delete(room)
    db.commit()
    return None
