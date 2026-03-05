@echo off
echo === Stopping all services on ports 5133, 3060, 5174, 5175, 5176 ===

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5133 "') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3060 "') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5174 "') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5175 "') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5176 "') do taskkill /F /PID %%a 2>nul

timeout /t 2 /nobreak >nul

echo === Starting API on port 5133 ===
start "CosmosAPI" cmd /k "cd /d e:\projects\CosmosERP\apps\api && node src/index.js"

timeout /t 2 /nobreak >nul

echo === Starting ERP on port 3060 ===
start "CosmosERP" cmd /k "cd /d e:\projects\CosmosERP\apps\erp && node_modules\.bin\vite --port 3060"

echo === Starting Marketplace on port 5174 ===
start "CosmosMarket" cmd /k "cd /d e:\projects\CosmosERP\apps\marketplace && node_modules\.bin\vite --port 5174"

echo === Starting Admin on port 5175 ===
start "CosmosAdmin" cmd /k "cd /d e:\projects\CosmosERP\apps\admin && node_modules\.bin\vite --port 5175"

echo === All services started ===
