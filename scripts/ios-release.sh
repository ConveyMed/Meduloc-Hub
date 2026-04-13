#!/usr/bin/env bash
# Meduloc Hub — iOS release: build → sync → archive → export → upload to App Store Connect
# Usage: ./scripts/ios-release.sh
#
# Requires env vars (set in ~/.zshrc or prefix the command):
#   ASC_KEY_ID      — App Store Connect API Key ID (10 chars, e.g. ABC123DEF4)
#   ASC_ISSUER_ID   — App Store Connect Issuer ID (UUID)
#   ASC_KEY_PATH    — Absolute path to AuthKey_XXXXXXXXXX.p8
#
# The .p8 must also exist at ~/.appstoreconnect/private_keys/AuthKey_<KEY_ID>.p8
# (xcrun altool reads from there by default). This script symlinks it for you.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

: "${ASC_KEY_ID:?Set ASC_KEY_ID in your env}"
: "${ASC_ISSUER_ID:?Set ASC_ISSUER_ID in your env}"
: "${ASC_KEY_PATH:?Set ASC_KEY_PATH to the absolute path of your AuthKey_*.p8}"

# Ensure altool can find the key
mkdir -p "$HOME/.appstoreconnect/private_keys"
KEY_DEST="$HOME/.appstoreconnect/private_keys/AuthKey_${ASC_KEY_ID}.p8"
if [ ! -f "$KEY_DEST" ]; then
  cp "$ASC_KEY_PATH" "$KEY_DEST"
  echo "Copied API key to $KEY_DEST"
fi

echo "=== 1/5  Web build ==="
npm run build

echo "=== 2/5  Capacitor sync (iOS) ==="
rm -rf "$ROOT/ios/App/build"
npx cap sync ios

echo "=== 3/5  Xcode archive ==="
cd "$ROOT/ios/App"
xcodebuild \
  -workspace App.xcworkspace \
  -scheme App \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath build/App.xcarchive \
  -allowProvisioningUpdates \
  clean archive

echo "=== 4/5  Export signed IPA ==="
xcodebuild -exportArchive \
  -archivePath build/App.xcarchive \
  -exportPath build \
  -exportOptionsPlist ExportOptions.plist \
  -allowProvisioningUpdates

IPA_PATH="$(ls build/*.ipa | head -1)"
echo "Built IPA: $IPA_PATH"

echo "=== 5/5  Upload to App Store Connect ==="
xcrun altool --upload-app \
  --type ios \
  --file "$IPA_PATH" \
  --apiKey "$ASC_KEY_ID" \
  --apiIssuer "$ASC_ISSUER_ID"

echo
echo "Done. Build uploaded. It will appear in TestFlight after processing (5-30 min)."
echo "Then go to App Store Connect to submit for review, or use TestFlight for internal testing."
