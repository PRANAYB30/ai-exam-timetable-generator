#!/usr/bin/env bash
# Execute all AI engine and API integration tests
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

if [ -d ".venv" ]; then
    source .venv/bin/activate
fi

echo "=========================================================="
echo " Running Automated AI Engine & API Test Suite..."
echo "=========================================================="

export PYTHONPATH=.
python3 -m pytest backend/tests/ -v
