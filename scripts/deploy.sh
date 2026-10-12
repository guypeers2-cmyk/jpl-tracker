#!/usr/bin/env bash
# Deploy naar Cloudflare Pages. Vereist: CLOUDFLARE_API_TOKEN en CLOUDFLARE_ACCOUNT_ID in de omgeving.
# Gebruik: CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... ./scripts/deploy.sh [project]
set -euo pipefail
PROJECT="${1:-jpl-tracker}"
: "${CLOUDFLARE_API_TOKEN:?Zet CLOUDFLARE_API_TOKEN}"
: "${CLOUDFLARE_ACCOUNT_ID:?Zet CLOUDFLARE_ACCOUNT_ID}"
cd "$(dirname "$0")/.."
node validate.js
node scripts/bump-build.js
node scripts/check-links.js
OUT="$(mktemp -d)"
cp index.html app.js data.js styles.css sw.js manifest.webmanifest og.png icon-192.png icon-512.png apple-touch-icon.png favicon.ico _headers _redirects api-offline.json robots.txt sitemap.xml "$OUT/"
npx -y wrangler@3.114.17 pages deploy "$OUT" --project-name "$PROJECT" --branch main --commit-dirty=true
echo "Klaar. Draai daarna: python3 scripts/smoke.py https://$PROJECT.pages.dev/"
