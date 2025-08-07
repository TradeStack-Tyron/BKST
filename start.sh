#!/bin/bash
set -e

echo "Starting BACKEND ONLY deployment - v5..."
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

# Set the Python path
export PYTHONPATH="/app:$PYTHONPATH"

# Run migrations
echo "Running database migrations..."
python -m alembic upgrade head

# Start the FastAPI server
echo "Starting FastAPI server..."
exec python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT
