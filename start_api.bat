@echo off
echo Stopping any existing node processes on port 5133...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5133') do taskkill /F /PID %%a 2>nul
timeout /t 1 /nobreak >nul
echo Starting Cosmos ERP API on port 5133...
cd /d e:\projects\CosmosERP\apps\api
node src/index.js
