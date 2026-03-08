# Build Cosmos POS debug APK
# Requires: Android Studio installed (uses its bundled JDK)

$jbr = "C:\Program Files\Android\Android Studio\jbr"
if (-not (Test-Path $jbr)) {
    Write-Host "ERROR: Android Studio JBR not found at $jbr" -ForegroundColor Red
    exit 1
}

$env:JAVA_HOME = $jbr
Set-Location $PSScriptRoot

Write-Host "Building debug APK..." -ForegroundColor Cyan
& .\gradlew.bat assembleDebug

if ($LASTEXITCODE -eq 0) {
    $apk = ".\app\build\outputs\apk\debug\app-debug.apk"
    if (Test-Path $apk) {
        Write-Host "`nSUCCESS: APK built at:" -ForegroundColor Green
        Write-Host (Resolve-Path $apk).Path
    }
} else {
    Write-Host "`nBuild failed. Check errors above." -ForegroundColor Red
    exit 1
}
