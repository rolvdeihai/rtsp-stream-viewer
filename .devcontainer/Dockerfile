FROM python:3.10

# Install system dependencies for OpenCV & ffmpeg
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsm6 \
    libxext6 \
 && rm -rf /var/lib/apt/lists/*

# Set work directory inside backend
WORKDIR /app/backend

# Copy only requirements.txt first (for caching)
COPY backend/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire repo (both backend and frontend)
COPY . .

# Expose the port Daphne will listen on
EXPOSE 7860

# Run Daphne server from backend folder
CMD ["daphne", "-b", "0.0.0.0", "-p", "7860", "backend.asgi:application"]
