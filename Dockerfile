FROM python:3.10

# Install system dependencies for OpenCV & ffmpeg
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsm6 \
    libxext6 \
 && rm -rf /var/lib/apt/lists/*

# Set work directory inside container
WORKDIR /app

# Copy backend requirements first (for better Docker layer caching)
COPY backend/requirements.txt ./requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire backend code (only the backend folder, not frontend)
COPY backend/ ./

# Railway exposes dynamic PORT — use it instead of hardcoding
EXPOSE 8000

# Start Daphne with Railway's assigned $PORT
CMD ["sh", "-c", "daphne -b 0.0.0.0 -p $PORT backend.asgi:application"]
