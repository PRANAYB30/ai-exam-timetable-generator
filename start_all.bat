@echo off
echo ==========================================================
echo  Starting AI Exam Timetable Generator (Full Stack)...
echo  Backend:  http://127.0.0.1:8000/docs
echo  Frontend: http://localhost:5173
echo ==========================================================

cd /d "%~dp0"
start "Timetable Backend (FastAPI)" cmd /k call "%~dp0start_backend.bat"
start "Timetable Frontend (Vite)" cmd /k call "%~dp0start_frontend.bat"
