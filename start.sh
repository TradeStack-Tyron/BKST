#!/bin/bash
set -e

echo "Starting BACKEND ONLY deployment - v6.3 - SAFE DEBUGGING..."
echo "Current directory: $(pwd)"
echo "Directory contents:"
ls -la

# Activate virtual environment
echo "Activating virtual environment..."
source /opt/venv/bin/activate

echo "Python version:"
python --version

echo "Pip version:"
pip --version

echo "Checking installed packages:"
pip list | grep -E "(alembic|uvicorn|fastapi)"

echo "Checking PATH:"
echo $PATH

echo "Checking venv bin directory:"
ls -la /opt/venv/bin/

# Set the Python path
export PYTHONPATH="/app:$PYTHONPATH"

# Run migrations using python -m alembic (more reliable)
echo "Running database migrations..."
python -c "import alembic; print('alembic module found')"
/opt/venv/bin/python -m alembic upgrade head

# Start the FastAPI server
echo "Starting FastAPI server..."
exec python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT
