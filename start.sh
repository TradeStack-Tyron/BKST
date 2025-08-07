#!/bin/bash
set -e

echo "Starting BACKEND ONLY deployment - v6.4 - FIX ALEMBIC EXECUTION..."
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

echo "Checking venv bin directory for alembic:"
ls -la /opt/venv/bin/ | head -20

# Set the Python path
export PYTHONPATH="/app:$PYTHONPATH"

# Test alembic import
echo "Testing alembic import..."
python -c "import alembic; print('alembic module found')"

# Try different approaches to run alembic
echo "Running database migrations..."
if [ -f "/opt/venv/bin/alembic" ]; then
    echo "Using alembic binary from venv..."
    /opt/venv/bin/alembic upgrade head
elif python -c "import alembic.command, alembic.config" 2>/dev/null; then
    echo "Using alembic python API..."
    python -c "
import alembic.command
import alembic.config
cfg = alembic.config.Config('alembic.ini')
alembic.command.upgrade(cfg, 'head')
"
else
    echo "Skipping migrations - alembic not properly installed"
fi

# Start the FastAPI server
echo "Starting FastAPI server..."
exec python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT
