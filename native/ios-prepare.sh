#!/usr/bin/env bash
# Creates the iOS project from the web app and gives it the UniMate icon. Run from the repo root.
set -euo pipefail

npx cap add ios
npx cap sync ios

ICONSET=ios/App/App/Assets.xcassets/AppIcon.appiconset
rm -f "$ICONSET"/*.png
cp resources/icon.png "$ICONSET/AppIcon-512@2x.png"
cat > "$ICONSET/Contents.json" <<'JSON'
{
  "images": [
    { "filename": "AppIcon-512@2x.png", "idiom": "universal", "platform": "ios", "size": "1024x1024" }
  ],
  "info": { "author": "xcode", "version": 1 }
}
JSON
