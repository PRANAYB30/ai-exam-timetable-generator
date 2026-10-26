@echo off
echo ==========================================================
echo  Starting AI Exam Timetable Generator Frontend (Vite)...
echo  Dashboard available at: http://localhost:5173
echo ==========================================================

cd /d "%~dp0frontend"
call npm run dev
pause
