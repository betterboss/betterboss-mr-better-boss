#!/bin/bash
# =============================================================================
# Better Boss — DocFill Extension Packager
# https://better-boss.ai
#
# Packages the extension/ directory into a distributable .zip file
# and copies it to public/ for self-hosted download.
#
# Usage: bash scripts/package-extension.sh
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
EXT_DIR="$ROOT_DIR/extension"
OUT_DIR="$ROOT_DIR/public"
ZIP_NAME="betterboss-docfill-extension.zip"

echo "[Better Boss] Packaging DocFill extension..."
echo "  Source: $EXT_DIR"
echo "  Output: $OUT_DIR/$ZIP_NAME"

# Verify extension directory exists
if [ ! -d "$EXT_DIR" ]; then
  echo "ERROR: Extension directory not found at $EXT_DIR"
  exit 1
fi

# Verify manifest.json exists
if [ ! -f "$EXT_DIR/manifest.json" ]; then
  echo "ERROR: manifest.json not found in $EXT_DIR"
  exit 1
fi

# Read version from manifest
VERSION=$(grep '"version"' "$EXT_DIR/manifest.json" | head -1 | sed 's/.*"\([0-9.]*\)".*/\1/')
echo "  Version: v$VERSION"

# Ensure output directory exists
mkdir -p "$OUT_DIR"

# Remove old zip
rm -f "$OUT_DIR/$ZIP_NAME"

# Create zip (excluding hidden files and any node_modules)
cd "$EXT_DIR"
zip -r "$OUT_DIR/$ZIP_NAME" \
  manifest.json \
  content.js \
  content.css \
  background.js \
  popup.html \
  popup.css \
  popup.js \
  options.html \
  options.css \
  options.js \
  icons/ \
  -x "*.DS_Store" "*.map" "node_modules/*"

# Show result
SIZE=$(du -h "$OUT_DIR/$ZIP_NAME" | cut -f1)
echo ""
echo "[Better Boss] Extension packaged successfully!"
echo "  File: $OUT_DIR/$ZIP_NAME"
echo "  Size: $SIZE"
echo "  Version: v$VERSION"
echo ""
echo "  Self-hosted download URL: https://better-boss.ai/$ZIP_NAME"
echo ""
