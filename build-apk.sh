#!/bin/bash
# Build script for Cash App APK

echo "🔨 Starting Cash App APK Build..."

# Install dependencies
echo "📦 Installing npm dependencies..."
npm install

# Build the web app
echo "🏗️ Building web app..."
npm run build

# Sync Capacitor
echo "🔄 Syncing Capacitor..."
npx cap sync

# Build Android APK (debug)
echo "📱 Building Android APK (debug)..."
npx cap build android

echo "✅ Build complete!"
echo ""
echo "📍 APK Location: android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "To build release APK, run:"
echo "  npm run build"
echo "  npx cap build android --release"
