from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.database import engine, Base, SessionLocal
from backend.app.models.entities import ExaminationModel
from backend.app.services.demo_data import reset_and_seed_demo_data

from backend.app.api.routes_dashboard import router as dashboard_router
from backend.app.api.routes_exams import router as exams_router
from backend.app.api.routes_groups import router as groups_router
from backend.app.api.routes_rooms import router as rooms_router
from backend.app.api.routes_slots import router as slots_router
from backend.app.api.routes_config import router as config_router
from backend.app.api.routes_timetables import router as timetables_router
from backend.app.api.routes_demo import router as demo_router
from backend.app.api.routes_import import router as import_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB & seed demo data if empty
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        exam_count = db.query(ExaminationModel).count()
        if exam_count == 0:
            print("Database empty. Seeding academic demo dataset...")
            reset_and_seed_demo_data(db)
            print("Demo dataset seeded successfully!")
    finally:
        db.close()
    yield

# Create all database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI-Based Exam Timetable Generator API",
    description="Intelligent CSP-based examination scheduling engine with heuristics and soft constraint optimization (PBL-I).",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In development allow all local frontend ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(dashboard_router)
app.include_router(exams_router)
app.include_router(groups_router)
app.include_router(rooms_router)
app.include_router(slots_router)
app.include_router(config_router)
app.include_router(timetables_router)
app.include_router(demo_router)
app.include_router(import_router)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "AI Exam Timetable Generator",
        "engine": "CSP Backtracking with MRV, Degree & LCV",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
