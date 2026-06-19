#!/usr/bin/env bash
# Publie regimesopk.com (Next.js export → Vercel).
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build
echo ""
echo "→ Connexion Vercel (une fois) : npx vercel login"
echo "→ Déploiement production     : npx vercel --prod"
echo ""
npx vercel --prod
