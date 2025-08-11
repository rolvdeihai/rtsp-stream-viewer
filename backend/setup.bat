@echo off
setlocal enabledelayedexpansion

REM ===== CONFIGURATION =====
set "PROJECT_DIR=%~dp0"
set "PYTHON_DIR=%PROJECT_DIR%python"
set "PYTHON_EXE=%PYTHON_DIR%\python.exe"
set "REQUIREMENTS=%PROJECT_DIR%requirements.txt"
set "MAIN_SCRIPT=manage.py"

REM ===== VERIFY PYTHON STRUCTURE =====
if not exist "%PYTHON_EXE%" (
    echo Downloading embedded Python...
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest 'https://www.python.org/ftp/python/3.11.9/python-3.11.9-embed-amd64.zip' -OutFile '%PROJECT_DIR%python.zip'"
    powershell -Command "Expand-Archive -Path '%PROJECT_DIR%python.zip' -DestinationPath '%PYTHON_DIR%' -Force"
    del "%PROJECT_DIR%python.zip"
)

REM ===== FIX ENCODINGS ERROR =====
if not exist "%PYTHON_DIR%\Lib\encodings" (
    echo Fixing standard library...
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest 'https://www.python.org/ftp/python/3.11.9/python-3.11.9-embed-amd64.zip' -OutFile '%PROJECT_DIR%python.zip'"
    powershell -Command "$shell = New-Object -ComObject Shell.Application; $zip = $shell.NameSpace('%PROJECT_DIR%python.zip'); $dest = $shell.NameSpace('%PYTHON_DIR%'); $dest.CopyHere($zip.Items(), 16)"
    del "%PROJECT_DIR%python.zip"
)

REM ===== CONFIGURE PYTHON =====
(
    echo python311.zip
    echo Lib
    echo Lib\site-packages
    echo import site
) > "%PYTHON_DIR%\python311._pth"

REM ===== INSTALL DEPENDENCIES =====
echo Installing packages...
start /wait "" "%PYTHON_EXE%" -m ensurepip
start /wait "" "%PYTHON_EXE%" -m pip install --upgrade pip
start /wait "" "%PYTHON_EXE%" -m pip install -r "%REQUIREMENTS%"

REM ===== CREATE LAUNCHER =====
(
    echo @echo off
    echo set "PATH=%~dp0python;%%PATH%%"
    echo "%~dp0python\python.exe" "%~dp0%MAIN_SCRIPT%" %%*
    echo pause
) > "%PROJECT_DIR%RUN_APP.bat"

echo.
echo ===== SETUP COMPLETE =====
echo Use RUN_APP.bat to launch your application
pause