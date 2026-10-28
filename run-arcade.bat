@echo off
title Twin Spin Arcade - Launcher
color 0a

:: Add Node.js to PATH
set "PATH=%PATH%;%LOCALAPPDATA%\Programs\nodejs;%ProgramFiles%\nodejs;%ProgramFiles(x86)%\nodejs"

echo.
echo  Checking Node.js...

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    color 0c
    echo.
    echo  ERROR: Node.js not found on this PC!
    echo  Download from: https://nodejs.org
    echo.
    pause
    exit /b 1
)

echo  Node.js OK: 
node -v

echo.
echo  Killing any old server on port 5000...
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":5000 "') do (
    taskkill /PID %%p /F >nul 2>nul
)
ping 127.0.0.1 -n 2 >nul

cd /d "%~dp0server"

if not exist "node_modules\" (
    echo.
    echo  Installing packages (one-time setup)...
    echo.
    call npm install
    echo.
)

echo.
echo  ===================================================
echo    TWIN SPIN ARCADE CAFE - BILLING SYSTEM
echo  ===================================================
echo    URL:  http://localhost:5000
echo    Admin:    admin / admin123
echo    Counter:  counter1 / staff123
echo  ===================================================
echo.
echo  Opening browser in 3 seconds...
echo  DO NOT CLOSE THIS WINDOW while using the app!
echo.
ping 127.0.0.1 -n 4 >nul

start "" "http://localhost:5000"

echo  Server is running... (Press Ctrl+C to stop)
echo.
node server.js

echo.
color 0c
echo  Server stopped! 
echo.
echo  If you saw an error above, screenshot it and share.
echo.
pause
