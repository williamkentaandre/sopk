#!/bin/sh
set -e
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
node scripts/generate-ios-app-icon.mjs
echo "Icônes iOS régénérées ($(date -u +%Y-%m-%dT%H:%M:%SZ))"
