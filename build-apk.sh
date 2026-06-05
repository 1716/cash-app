#!/bin/bash

echo "🔨 Starting Cash App APK Build..."

# 1. Install Dependencies
echo "📦 Installing npm dependencies..."
npm install

# 2. Build Web App
echo "🏗️ Building web app..."
npm run build:web

# 3. Sync with Capacitor
echo "🔄 Syncing Capacitor..."
npx cap sync android

# 4. Build Android APK
echo "📱 Building Android APK (debug)..."
export JAVA_HOME="/nix/store/5badkg3gmzg1c29akwglknkizfg6zj0g-openjdk-17.0.17+8"
cd android && ./gradlew assembleDebug && cd ..

# 5. Success!
echo "
✅ Build complete!

📍 APK Location: android/app/build/outputs/apk/debug/app-debug.apk

To build release APK, run:
  npm run build:web
  npx cap build android --release
"