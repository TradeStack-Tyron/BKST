#!/bin/bash
set -e

echo "Starting backend deployment..."
echo "Current directory: $(pwd)"
echo "Directory contents:"
ls -la

# Set the Python path
export PYTHONPATH="/app:$PYTHONPATH"

# Install requirements
echo "Installing Python requirements..."
pip install -r requirements.txt

# Run migrations
echo "Running database migrations..."
python -m alembic upgrade head

# Start the FastAPI server
echo "Starting FastAPI server..."
exec python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT
