from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.services.demo_data import reset_and_seed_demo_data

router = APIRouter(prefix="/api/demo", tags=["Demo Data"])

@router.post("/reset")
def reset_demo(db: Session = Depends(get_db)):
    """Resets the entire database with the clean academic demo dataset."""
    reset_and_seed_demo_data(db)
    return {"message": "Demo dataset seeded successfully", "status": "OK"}
