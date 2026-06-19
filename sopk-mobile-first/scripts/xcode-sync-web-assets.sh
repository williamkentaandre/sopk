#!/bin/sh
# Copie `out/` → `ios/App/App/public` avant chaque build Xcode (évite un bundle WebView obsolète).
set -e
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v node >/dev/null 2>&1; then
  echo "error: node introuvable. Installe Node.js 22+ ou ajoute-le au PATH de Xcode."
  exit 1
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "$NODE_MAJOR" -lt 22 ]; then
  echo "error: Node.js 22+ requis (actuel: $(node -v)). Mets à jour Node puis relance le build Xcode."
  exit 1
fi

if [ ! -f out/index.html ]; then
  echo "error: out/index.html absent."
  echo "       Depuis le Mac, lance : cd $(basename "$ROOT") && npm run cap:deploy"
  exit 1
fi

node scripts/patch-apple-sign-in-presentation.mjs
npm run cap:copy
date -u +"%Y-%m-%dT%H:%M:%SZ" > ios/App/App/public/build-stamp.txt
echo "Capacitor web assets OK — build $(cat ios/App/App/public/build-stamp.txt)"
