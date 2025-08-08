FROM python:3.10

# Install system dependencies for OpenCV & ffmpeg
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsm6 \
    libxext6 \
    curl \
 && rm -rf /var/lib/apt/lists/*

# Install Node.js (LTS) and npm
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
 && apt-get install -y nodejs

# Set work directory
WORKDIR /workspaces/rtsp-stream-viewer

# Copy backend requirements and install Python deps
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy entire repo
COPY . .

# Install frontend dependencies
WORKDIR /workspaces/rtsp-stream-viewer/frontend
RUN npm install

# Back to root workspace folder
WORKDIR /workspaces/rtsp-stream-viewer

# Expose Daphne port
EXPOSE 7860
EXPOSE 3000

# Create an entrypoint script to run backend and frontend concurrently
RUN echo '#!/bin/bash\n\
cd backend && daphne -b 0.0.0.0 -p 7860 backend.asgi:application &\n\
cd ../frontend && npm start' > /entrypoint.sh

RUN chmod +x /entrypoint.sh

# Run the entrypoint script
CMD ["/entrypoint.sh"]
