@echo off
echo ==========================================================
echo  Running AI Exam Timetable Generator Pytest Suite...
echo ==========================================================

cd /d "%~dp0"

if exist .venv\Scripts\activate.bat (
    call .venv\Scripts\activate.bat
)

set PYTHONPATH=.
pytest backend/tests/ -v
pause
