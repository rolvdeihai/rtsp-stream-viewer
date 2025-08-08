# .devcontainer/Dockerfile

FROM python:3.10

# Install system dependencies for OpenCV & ffmpeg
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsm6 \
    libxext6 \
 && rm -rf /var/lib/apt/lists/*

# Set work directory inside container (root of repo backend folder)
WORKDIR /workspaces/rtsp-stream-viewer/backend

# Copy only requirements.txt first (for caching)
COPY backend/requirements.txt .

# Install Python dependencies globally (inside container)
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire repo
COPY . .

# Expose Daphne port
EXPOSE 7860

# Run Daphne automatically when container starts
CMD ["daphne", "-b", "0.0.0.0", "-p", "7860", "backend.asgi:application"]
