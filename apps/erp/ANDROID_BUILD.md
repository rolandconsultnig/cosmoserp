# Build Cosmos POS as Android APK

The ERP app (which includes the POS) can be built as a standalone Android APK using Capacitor.

## Prerequisites

- **Node.js** 18+
- **Android Studio** (Hedgehog 2023.1.1 or newer) with Android SDK
- **Java 17** (required by Android Gradle)

## 1. Install dependencies

From the repo root or from `apps/erp`:

```bash
cd apps/erp
npm install
```

## 2. Set your API URL (required for the APK)

The app must know your backend API URL when running on a device. Set it at build time:

**Windows (PowerShell):**
```powershell
$env:VITE_API_URL="https://your-api-domain.com/api"
```

**Linux/macOS:**
```bash
export VITE_API_URL="https://your-api-domain.com/api"
```

Use your real API base URL (e.g. `https://api.cosmoserp.com/api`). Do not add a trailing slash.

## 3. Add the Android platform (first time only)

```bash
cd apps/erp
npx cap add android
```

## 4. Build the web app and sync to Android

```bash
npm run cap:sync
```

This runs `build:android` (Vite build with mobile-friendly base path) and then `cap sync android`.

## 5. Build the APK

**Option A – Android Studio (recommended)**

```bash
npx cap open android
```

In Android Studio:

1. Wait for Gradle sync to finish.
2. **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
3. The APK will be at  
   `apps/erp/android/app/build/outputs/apk/debug/app-debug.apk`  
   (or **release** if you built a release variant).

**Option B – Command line (if Android SDK is in PATH)**

```bash
cd android
./gradlew assembleDebug
```

APK output: `android/app/build/outputs/apk/debug/app-debug.apk`.

## 6. Run on a device or emulator

```bash
npx cap run android
```

(Device or emulator must be connected or running.)

## Scripts summary

| Script | Description |
|--------|-------------|
| `npm run build:android` | Build web assets for Android (base path `./`, no `/erp/`) |
| `npm run cap:sync` | Build for Android + copy to `android/` and sync native deps |
| `npm run cap:open:android` | Open the Android project in Android Studio |
| `npm run cap:run:android` | Run the app on a connected device/emulator |

## Config

- **App ID:** `com.cosmoserp.pos`
- **App name:** Cosmos POS
- **Config file:** `apps/erp/capacitor.config.json`

To change app name or ID, edit `capacitor.config.json` and run `npx cap sync android` again.

## Release APK (signed)

For a signed release APK you need a keystore. In Android Studio:

1. **Build → Generate Signed Bundle / APK**.
2. Choose **APK**, create or select a keystore, and complete the wizard.

The signed APK can be used for distribution (e.g. Play Store or sideloading).
