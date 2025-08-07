#!/bin/bash
set -e

echo "Starting deployment..."
echo "Current directory: $(pwd)"
echo "Directory contents:"
ls -la

# Navigate to the server directory
cd bskt_app/server

echo "Server directory contents:"
ls -la

# Set the Python path
export PYTHONPATH="/app/bskt_app/server:$PYTHONPATH"

# Run migrations
echo "Running database migrations..."
alembic upgrade head

# Start the FastAPI server
echo "Starting FastAPI server..."
exec python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT
