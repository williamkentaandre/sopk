#!/bin/sh
# Injecte out/ dans le .app à chaque build Xcode (alwaysOutOfDate = 1).
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/out"
SRC_PUBLIC="$SRCROOT/App/public"
APP_PUBLIC="$BUILT_PRODUCTS_DIR/$CONTENTS_FOLDER_PATH/public"

if [ ! -f "$OUT/index.html" ]; then
  echo "warning: $OUT/index.html absent — bundle public/ existant conservé."
  echo "         Pour mettre à jour le web : cd sopk-mobile-first && npm run cap:deploy"
  if [ -d "$SRC_PUBLIC" ] && [ -f "$SRC_PUBLIC/plan/index.html" ]; then
    echo "         Utilisation de ios/App/App/public/ (dernier cap:deploy)."
    exit 0
  fi
  echo "error: aucun bundle web utilisable."
  exit 1
fi

if [ -z "$BUILT_PRODUCTS_DIR" ] || [ -z "$CONTENTS_FOLDER_PATH" ]; then
  echo "error: variables Xcode manquantes."
  exit 1
fi

/usr/bin/ditto "$OUT" "$SRC_PUBLIC"
rm -rf "$APP_PUBLIC"
/usr/bin/ditto "$OUT" "$APP_PUBLIC"

STAMP="$(cat "$OUT/build-stamp.txt" 2>/dev/null || echo unknown)"
echo "Web bundle injecté — version $STAMP"
