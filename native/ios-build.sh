#!/usr/bin/env bash
# Builds the unsigned iOS archive. On failure it prints the Xcode errors as GitHub annotations. Run from the repo root.
set -uo pipefail

LOG="${RUNNER_TEMP:-/tmp}/xcodebuild.log"
ARCHIVE="${RUNNER_TEMP:-/tmp}/App.xcarchive"
rm -rf "$ARCHIVE"

(
  cd ios/App
  xcodebuild \
    -workspace App.xcworkspace \
    -scheme App \
    -configuration Release \
    -sdk iphoneos \
    -destination 'generic/platform=iOS' \
    -archivePath "$ARCHIVE" \
    archive \
    CODE_SIGNING_ALLOWED=NO \
    CODE_SIGNING_REQUIRED=NO \
    CODE_SIGN_IDENTITY=""
) 2>&1 | tee "$LOG"
status=${PIPESTATUS[0]}

if [ "$status" -ne 0 ]; then
  grep -E "error:" "$LOG" | sort -u | head -15 | while IFS= read -r line; do
    echo "::error::${line//%/%25}"
  done
  exit "$status"
fi
