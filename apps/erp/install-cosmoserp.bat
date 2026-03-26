@echo off
echo ====================================
echo   CosmosERP v1.04 Installation
echo ====================================
echo.

echo Checking for connected Android devices...
adb devices
echo.

if "%1"=="debug" (
    echo Installing CosmosERP v1.04 DEBUG version...
    adb install "android\app\build\outputs\apk\debug\CosmosERP-v1.04-Debug.apk"
    if %errorlevel% equ 0 (
        echo ✅ Debug APK installed successfully!
        echo 📱 App ready for testing on device
    ) else (
        echo ❌ Installation failed!
        echo 💡 Make sure USB debugging is enabled
    )
) else if "%1"=="release" (
    echo Installing CosmosERP v1.04 RELEASE version...
    echo ⚠️  Note: Release APK must be signed before installation
    adb install "android\app\build\outputs\apk\release\CosmosERP-v1.04-Release-Unsigned.apk"
    if %errorlevel% equ 0 (
        echo ✅ Release APK installed successfully!
    ) else (
        echo ❌ Installation failed!
        echo 💡 Make sure the APK is properly signed
    )
) else (
    echo Usage: install-cosmoserp.bat [debug^|release]
    echo.
    echo   debug   - Install debug version for testing
    echo   release - Install release version (must be signed)
    echo.
    echo Available APK files:
    echo   📱 Debug: CosmosERP-v1.04-Debug.apk (7.90 MB)
    echo   📱 Release: CosmosERP-v1.04-Release-Unsigned.apk (2.50 MB)
)

echo.
echo ====================================
echo   Installation Complete
echo ====================================
pause
