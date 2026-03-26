@echo off
echo Building Cosmos ERP APK...
echo.

echo Step 1: Building web app for Android...
cd /d "%~dp0"
call npm run build:android
if %errorlevel% neq 0 (
    echo Build failed at web app step
    pause
    exit /b 1
)

echo.
echo Step 2: Syncing with Capacitor...
call npx cap sync android
if %errorlevel% neq 0 (
    echo Sync failed
    pause
    exit /b 1
)

echo.
echo Step 3: Building debug APK...
cd android
call gradlew assembleDebug
if %errorlevel% neq 0 (
    echo Debug APK build failed
    pause
    exit /b 1
)

echo.
echo Step 4: Building release APK...
call gradlew assembleRelease
if %errorlevel% neq 0 (
    echo Release APK build failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo BUILD COMPLETE!
echo ========================================
echo Debug APK: android\app\build\outputs\apk\debug\app-debug.apk
echo Release APK: android\app\build\outputs\apk\release\app-release-unsigned.apk
echo.
echo Debug APK size: 
for %%I in (android\app\build\outputs\apk\debug\app-debug.apk) do echo %%~znI bytes
echo Release APK size:
for %%I in (android\app\build\outputs\apk\release\app-release-unsigned.apk) do echo %%~znI bytes
echo.
echo To install debug APK: adb install android\app\build\outputs\apk\debug\app-debug.apk
echo.
pause
