@echo off
setlocal enabledelayedexpansion

set "PROJECT_DIR=%~dp0"
set "PACKAGES_DIR=%PROJECT_DIR%packages"

REM Use system Python
set "PYTHON_EXE=python.exe"

REM Set environment variables
set "PYTHONPATH=%PACKAGES_DIR%;%PROJECT_DIR%"
set "PATH=%PACKAGES_DIR%\cv2;%PACKAGES_DIR%;%PACKAGES_DIR%\Scripts;%PATH%"
set "OPENCV_FFMPEG_CAPTURE_OPTIONS=rtsp_transport;tcp"
set "OPENCV_VIDEOIO_DEBUG=1"

cd /d "%PROJECT_DIR%"

echo Starting Daphne server...
start "Daphne Server" cmd /c "%PYTHON_EXE% -m daphne -p 8000 backend.asgi:application && pause"

timeout /t 5 >nul

echo Opening RTSP Stream Viewer...
start "RTSP Stream Viewer" "https://rolvdeihai.github.io/rtsp-stream-viewer/"

echo.
echo ===== APPLICATION RUNNING =====
echo Press any key to close this window...
pause >nul