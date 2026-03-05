@echo off
echo Killing any Vite processes...
taskkill /F /FI "IMAGENAME eq node.exe" /FI "WINDOWTITLE eq *vite*" 2>nul

echo Starting ERP on port 3060...
start "ERP" cmd /c "cd /d e:\projects\CosmosERP\apps\erp && node_modules\.bin\vite --port 3060"

echo Starting Marketplace on port 5174...
start "Marketplace" cmd /c "cd /d e:\projects\CosmosERP\apps\marketplace && node_modules\.bin\vite --port 5174"

echo Starting Admin on port 5175...
start "Admin" cmd /c "cd /d e:\projects\CosmosERP\apps\admin && node_modules\.bin\vite --port 5175"

echo All frontends started.
