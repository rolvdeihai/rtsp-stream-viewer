# RTSP Stream Viewer - Comprehensive Setup Guide

# Live Demo URL: https://rolvdeihai.github.io/rtsp-stream-viewer/

## Project Overview
A full-stack application for viewing multiple RTSP streams in real-time with adaptive streaming capabilities. Features include:
- View multiple RTSP streams simultaneously
- Play/pause controls for each stream
- Fullscreen mode
- Adaptive quality based on network conditions
- User authentication
- Stream management (add/remove streams)
- Cross-browser compatibility

## Tech Stack
- **Frontend**: React.js, WebSocket
- **Backend**: Django, Django Channels, OpenCV
- **Deployment**: GitHub Pages (Frontend), Localhost/Embedded Python (Backend)

## Setup Instructions (Choose One Method)

### Method 1: Automated Setup (Recommended for Windows)
1. Download [backend.zip](https://drive.google.com/drive/folders/1puxEOGDxZdRU2GV0UR6_DeiZyXYFBxq7?usp=sharing)
2. Extract the ZIP file to a simple path without spaces (e.g., `C:\RTSP_Viewer`)
3. Run the setup files:
   - First run `setup.bat` (wait for installation to complete)
   - Then run `start.bat` to launch the application
   - RUN_APP.bat is a mistake for earlier testing, please don't run it and ignore it. Use start.bat instead
4. The application will automatically:
   - Start the backend server
   - Open the stream viewer in your default browser

### Method 2: Manual Setup (For Advanced Users or Problematic Systems)

#### Backend Setup:
```bash
# 1. Create and activate virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac

# 2. Install dependencies
pip install -r requirements.txt

# 3. Apply database migrations
python manage.py migrate

# 4. Create admin user (use credentials below)
python manage.py createsuperuser

# 5. Start Daphne server
daphne -p 8000 backend.asgi:application
```

#### Frontend Setup:
1. Open [RTSP Stream Viewer](https://rolvdeihai.github.io/rtsp-stream-viewer/) in your browser
2. Configure streams using the admin interface:
   - Username: `admin`
   - Password: `streamviewer123`
  
#### Manual Local Setup:
1. Open Terminal then type: cd frontend
2. Install dependencies: npm install
3. Copy paste .env.local from https://drive.google.com/drive/folders/1puxEOGDxZdRU2GV0UR6_DeiZyXYFBxq7?usp=sharing to /frontend
4. Run the frontend: npm start

## Configuration Options

### Environment Variables
Create a `.env` file in the backend directory:
```env
# For development only!
DEBUG=1
SECRET_KEY=your-secret-key

# Production settings (recommended)
# DEBUG=0
# ALLOWED_HOSTS=.yourdomain.com
```

### Stream Settings
After logging in:
1. Navigate to "Streams" in the admin panel
2. Add streams with:
   - Name: Display name
   - URL: RTSP stream URL (format: `rtsp://username:password@ip_address:port/stream_path`)
   - Active: Check to enable

## Troubleshooting Common Issues

### Python not found error:
- Install Python from [python.org](https://python.org)
- Check "Add Python to PATH" during installation

### Django module not found:
```bash
pip install -r requirements.txt
```

### Powershell not recognized:
Use the Manual Setup method instead of batch files

### Stream not loading:
1. Check RTSP URL format
2. Verify network access to the camera
3. Ensure backend server is running on port 8000

## System Requirements
- Windows 7+ / macOS 10.15+ / Ubuntu 18.04+
- 4GB RAM minimum (8GB recommended for multiple streams)
- Python 3.8+
- Modern web browser (Chrome, Firefox, Edge)

## Performance Tips
1. Reduce the number of simultaneous streams
2. Decrease stream resolution at source if possible
3. Use wired network connection instead of WiFi
4. Close other bandwidth-intensive applications

## FAQ

### Why do I see a black screen?
This usually means:
- Incorrect RTSP URL
- Camera credentials need updating
- Network firewall blocking the stream

### Can I use this on mobile?
The web interface works on mobile browsers, but backend requires a desktop OS

### How do I add more users?
Use the Django admin panel at `http://localhost:8000/admin`

### Why is the video lagging?
Try:
- Reducing the quality in camera settings
- Connecting to a faster network
- Lowering the target FPS in backend settings

## Support
For additional help, create an issue on our [GitHub repository](https://github.com/rolvdeihai/rtsp-stream-viewer)

---

**Note**: For optimal performance, ensure your cameras support RTSP protocol and are on the same network as your backend server. The application is designed for local network use - for remote access, consider port forwarding or VPN solutions.
