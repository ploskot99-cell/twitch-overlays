@echo off
REM Serves the overlays and opens the control room in your browser.
REM Keep this window open while you stream.
cd /d "%~dp0"
echo.
echo   Control Room        http://localhost:8777/
echo   StreamElements      http://localhost:8777/se-preview.html
echo.
echo   Do not open the .html files by double-clicking them - the browser
echo   blocks file:// pages from reading the other files.
echo.
start "" http://localhost:8777/
node serve.js
