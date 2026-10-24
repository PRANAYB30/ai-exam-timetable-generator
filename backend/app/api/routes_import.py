from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.services.import_export import ImportExportService

router = APIRouter(prefix="/api/import", tags=["Import Data"])

@router.post("/rooms")
async def import_rooms(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    csv_str = content.decode("utf-8", errors="ignore")
    count, errors = ImportExportService.import_rooms_csv(db, csv_str)
    return {"imported": count, "errors": errors}

@router.post("/groups")
async def import_groups(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    csv_str = content.decode("utf-8", errors="ignore")
    count, errors = ImportExportService.import_groups_csv(db, csv_str)
    return {"imported": count, "errors": errors}

@router.post("/exams")
async def import_exams(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    csv_str = content.decode("utf-8", errors="ignore")
    count, errors = ImportExportService.import_exams_csv(db, csv_str)
    return {"imported": count, "errors": errors}
