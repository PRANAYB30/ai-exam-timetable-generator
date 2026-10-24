#!/usr/bin/env bash
# Start FastAPI backend server
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

if [ -d ".venv" ]; then
    source .venv/bin/activate
fi

echo "=========================================================="
echo " Starting AI Exam Timetable Generator Backend (FastAPI)..."
echo " API Docs available at: http://127.0.0.1:8000/docs"
echo "=========================================================="

export PYTHONPATH=.
python3 -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
