# Stage 1: Frontend bouwen met Node 20
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Python backend
FROM python:3.11-slim
WORKDIR /app

# Python packages
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Backend code
COPY backend/ ./backend/

# Frontend dist van stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Startscript
COPY run.py ./

CMD ["python3", "run.py"]
