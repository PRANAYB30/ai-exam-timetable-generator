#!/usr/bin/env bash
# Start React + Vite development server
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR/frontend"

echo "=========================================================="
echo " Starting AI Exam Timetable Generator Frontend (Vite)..."
echo " Dashboard available at: http://localhost:5173"
echo "=========================================================="

npm run dev
