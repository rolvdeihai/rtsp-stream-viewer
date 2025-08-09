# RTSP Stream Viewer

A full-stack application for viewing multiple RTSP streams in real-time with adaptive streaming capabilities.

## Features
- View multiple RTSP streams simultaneously in a responsive grid
- Adaptive streaming quality based on network conditions
- Play/pause controls for each stream
- Fullscreen mode
- User authentication
- Stream management (add/remove streams)
- Cross-browser compatibility

## Tech Stack
**Frontend:** React.js, WebSocket  
**Backend:** Django, Django Channels, OpenCV, FFmpeg  
**Deployment:** GitHub Pages (Frontend), Localhost/Heroku (Backend)

### Setup Instruction
1. Download and unzip `backend.zip`
2. Start `start.bat` file in backend/
3. The script will run automatically to expose the API endpoint & open the github pages