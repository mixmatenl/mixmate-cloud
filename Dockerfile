FROM python:3.11-slim

WORKDIR /app

# Python dependencies
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Node + frontend build
RUN apt-get update && apt-get install -y nodejs npm && rm -rf /var/lib/apt/lists/*
COPY frontend/package.json frontend/package.json
RUN cd frontend && npm install
COPY frontend/ frontend/
RUN cd frontend && npm run build

# Backend code
COPY backend/ backend/

EXPOSE 8000
CMD uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}
