from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.entities import SchedulingConfigModel
from backend.app.schemas.entities import SchedulingConfigBase, SchedulingConfigResponse

router = APIRouter(prefix="/api/config", tags=["Configuration"])

def to_response(c: SchedulingConfigModel) -> SchedulingConfigResponse:
    return SchedulingConfigResponse(
        id=c.id,
        exam_period_name=c.exam_period_name,
        start_date=c.start_date,
        end_date=c.end_date,
        available_dates=c.available_dates,
        default_duration_slots=c.default_duration_slots,
        min_preferred_gap_days=c.min_preferred_gap_days,
        max_search_seconds=c.max_search_seconds,
        max_backtracks=c.max_backtracks,
        optimize_soft_constraints=c.optimize_soft_constraints,
        weight_consecutive=c.weight_consecutive,
        weight_same_day=c.weight_same_day,
        weight_gap=c.weight_gap,
        weight_day_concentration=c.weight_day_concentration,
        weight_room_utilization=c.weight_room_utilization
    )

@router.get("", response_model=SchedulingConfigResponse)
def get_config(db: Session = Depends(get_db)):
    config = db.query(SchedulingConfigModel).first()
    if not config:
        config = SchedulingConfigModel(id="default")
        config.available_dates = ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06"]
        db.add(config)
        db.commit()
        db.refresh(config)
    return to_response(config)

@router.put("", response_model=SchedulingConfigResponse)
def update_config(payload: SchedulingConfigBase, db: Session = Depends(get_db)):
    config = db.query(SchedulingConfigModel).first()
    if not config:
        config = SchedulingConfigModel(id="default")
        db.add(config)

    config.exam_period_name = payload.exam_period_name
    config.start_date = payload.start_date
    config.end_date = payload.end_date
    config.available_dates = payload.available_dates
    config.default_duration_slots = payload.default_duration_slots
    config.min_preferred_gap_days = payload.min_preferred_gap_days
    config.max_search_seconds = payload.max_search_seconds
    config.max_backtracks = payload.max_backtracks
    config.optimize_soft_constraints = payload.optimize_soft_constraints
    config.weight_consecutive = payload.weight_consecutive
    config.weight_same_day = payload.weight_same_day
    config.weight_gap = payload.weight_gap
    config.weight_day_concentration = payload.weight_day_concentration
    config.weight_room_utilization = payload.weight_room_utilization

    db.commit()
    db.refresh(config)
    return to_response(config)
