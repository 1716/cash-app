# Spoof integration

This adds a minimal native `SpoofActivity` that displays the spoof image from the `cashapp-spoof` folder.

Steps to enable and run locally:

1. Copy image assets into Android drawables:

```bash
cd android
./scripts/install-spoof-assets.sh
```

2. Build the app (from the `android` folder) using Gradle / Android Studio.

3. Launch the spoof activity on a connected device or emulator:

```bash
adb shell am start -n com.cashapp.mobile/.SpoofActivity
```

Notes:
- The script copies a small set of images referenced in the iOS `Assets.xcassets` folder. Add more images to the `FILES` array in `scripts/install-spoof-assets.sh` as needed.
- Integrating the spoof UI into the Capacitor web UI requires adding a JS bridge or a custom Capacitor plugin. This change only adds a native activity and helper assets.
