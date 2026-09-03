@echo off
title Head-Tilt Flappy Bird
echo ========================================================
echo        HEAD-TILT FLAPPY BIRD (Webcam Eye-Tilt)
echo ========================================================
echo Starting local web server on port 8080...
echo Opening http://localhost:8080 in your default browser...
echo.
echo Press Ctrl+C in this window to stop the server.
echo ========================================================
start "" http://localhost:8080
python -m http.server 8080
