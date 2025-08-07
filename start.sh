#!/bin/bash
set -e

echo "Starting BACKEND ONLY deployment - v2..."
echo "Current directory: $(pwd)"
echo "Directory contents:"
ls -la

echo "Python version:"
python --version

# Set the Python path
export PYTHONPATH="/app:$PYTHONPATH"

#!/bin/bash
set -e

echo "Starting BACKEND ONLY deployment - v4..."
echo "Current directory: $(pwd)"
echo "Directory contents:"
ls -la

echo "Python version:"
python --version

echo "Pip version:"
pip3 --version

# Set the Python path
export PYTHONPATH="/app:$PYTHONPATH"

# Run migrations
echo "Running database migrations..."
python -m alembic upgrade head

# Start the FastAPI server
echo "Starting FastAPI server..."
exec python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT

# Run migrations
echo "Running database migrations..."
python -m alembic upgrade head

# Start the FastAPI server
echo "Starting FastAPI server..."
exec python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT
