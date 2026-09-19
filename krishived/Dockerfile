FROM python:3.11-slim

WORKDIR /app

# Install system dependencies needed for OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install PyTorch CPU and Python packages
COPY ml_service/requirements.txt requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

# Copy model and backend source code
COPY models /app/models
COPY ml_service /app/ml_service

EXPOSE 8008

ENV PORT=8008
ENV PYTHONUNBUFFERED=1

CMD ["python", "ml_service/server.py"]
