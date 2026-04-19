FROM python:3.12-slim

WORKDIR /app

# Install system dependencies for pyzbar (QR decoding)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libzbar0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/

ENV PORT=8080
EXPOSE 8080

# Use --workers 1 on Cloud Run — multiple workers compete for
# the same CPU allocation and can cause OOM errors. Cloud Run
# handles concurrency through multiple instances, not workers.
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]
