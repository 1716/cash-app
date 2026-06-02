#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ASSETS_DIR="$ROOT_DIR/cashapp-spoof/CashApp-main/CashApp-main/CashappSpoof/Assets.xcassets"
DEST_DRAWABLE_DIR="$ROOT_DIR/app/src/main/res/drawable"

mkdir -p "$DEST_DRAWABLE_DIR"

echo "Copying available spoof images to Android drawables..."

FILES=(
  cashappsend.imageset/cashappsend.png
  homebackground.imageset/homebackground.png
  activity.imageset/activity.PNG
  finished.imageset/finished.png
)

for f in "${FILES[@]}"; do
  src="$ASSETS_DIR/$f"
  if [ -f "$src" ]; then
    name=$(basename "$f")
    lname=$(echo "$name" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9_.]/_/g')
    dest="$DEST_DRAWABLE_DIR/${lname%.*}.png"
    cp "$src" "$dest"
    echo "Copied $src -> $dest"
  else
    echo "Skip missing $src"
  fi
done

echo "Done. You can now build the Android app." 
