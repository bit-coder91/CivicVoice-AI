@echo off
title CivicVoice AI Startup
echo ===================================================
echo Starting CivicVoice AI Services...
echo ===================================================
echo.

REM 1. Start Flask NLP Service
echo [1/3] Starting Flask NLP Service...
cd flask-nlp

if not exist .venv (
    echo Creating Python virtual environment...
    python -m venv .venv
)
call .venv\Scripts\activate.bat
echo Installing Python dependencies...
pip install -r requirements.txt -q

start "CivicVoice - Flask NLP (Port 5001)" cmd /k "title CivicVoice - Flask NLP && python app.py"
cd ..


REM 2. Start Spring Boot Backend
echo.
echo [2/3] Starting Spring Boot Backend...
cd spring-backend

start "CivicVoice - Spring Boot (Port 8080)" cmd /k "title CivicVoice - Spring Boot && .\mvnw.cmd spring-boot:run"
cd ..


REM 3. Start Frontend UI
echo.
echo [3/3] Starting Frontend Server...
cd frontend

start "CivicVoice - Frontend (Port 5500)" cmd /k "title CivicVoice - Frontend && python -m http.server 5500"
cd ..

echo.
echo ===================================================
echo SUCCESS: All services are starting up!
echo ===================================================
echo - Frontend is running at: http://localhost:5500
echo - Backend is running at:  http://localhost:8080
echo - NLP is running at:      http://localhost:5001
echo.
echo Note: Three new terminal windows have opened. 
echo To stop the servers, simply close those windows.
echo.
pause
