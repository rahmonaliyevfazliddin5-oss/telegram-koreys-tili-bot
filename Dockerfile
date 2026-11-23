# Multi-stage Dockerfile
# Stage 1: Build Preact / Vite frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /web
COPY web/package*.json ./
RUN npm install
COPY web/ ./
RUN npm run build

# Stage 2: Python backend
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /workspace

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
COPY --from=frontend-builder /web/dist /workspace/web/dist

EXPOSE 8000

CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1"]
