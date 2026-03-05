@echo off
echo === Installing all dependencies ===
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo npm install failed!
    pause
    exit /b 1
)

echo.
echo === Generating Prisma Client ===
cd apps\api
call npx prisma generate
if %ERRORLEVEL% NEQ 0 (
    echo Prisma generate failed!
    pause
    exit /b 1
)

echo.
echo === Running Prisma Migrations ===
call npx prisma migrate dev --name init
if %ERRORLEVEL% NEQ 0 (
    echo Migration failed!
    pause
    exit /b 1
)

echo.
echo === Seeding Database ===
call npx prisma db seed
if %ERRORLEVEL% NEQ 0 (
    echo Seed failed!
    pause
    exit /b 1
)

echo.
echo === All done! Run: npm run dev ===
pause
