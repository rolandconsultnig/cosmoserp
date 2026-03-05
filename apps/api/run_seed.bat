@echo off
set PGPASSWORD=Samolan123
cd /d e:\projects\CosmosERP\apps\api
node prisma/seed.js > seed_output.log 2>&1
echo Exit code: %ERRORLEVEL% >> seed_output.log
