@echo off
echo ==========================================================
echo  Starting AI Exam Timetable Generator Backend (FastAPI)...
echo  API Docs available at: http://127.0.0.1:8000/docs
echo ==========================================================

cd /d "%~dp0"

if exist .venv\Scripts\activate.bat (
    call .venv\Scripts\activate.bat
)

set PYTHONPATH=.
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
pause
