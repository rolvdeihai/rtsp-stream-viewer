@echo off

REM Activate the venv
call venv\Scripts\activate.bat

REM Run Daphne server
start "" daphne -p 8000 backend.asgi:application

REM Open frontend URL
start "" "https://rolvdeihai.github.io/rtsp-stream-viewer/"

pause
