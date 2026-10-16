#!/usr/bin/env bash
# Deploy naar Cloudflare Pages. Vereist: CLOUDFLARE_API_TOKEN en CLOUDFLARE_ACCOUNT_ID in de omgeving.
# Gebruik: CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... ./scripts/deploy.sh [project]
set -euo pipefail
PROJECT="${1:-jpl-tracker}"
: "${CLOUDFLARE_API_TOKEN:?Zet CLOUDFLARE_API_TOKEN}"
: "${CLOUDFLARE_ACCOUNT_ID:?Zet CLOUDFLARE_ACCOUNT_ID}"
cd "$(dirname "$0")/.."
node validate.js
node scripts/check-links.js
CURRENT_BUILD="$(grep -o 'name="build" content="[^"]*"' index.html | sed 's/.*content="\(.*\)"/\1/')"
if [ "$PROJECT" = "jpl-tracker" ]; then
  # Productie: alleen de build die op staging is getest, zonder opnieuw te bumpen
  if [ ! -f .staging-ok ] || [ "$(cat .staging-ok)" != "$CURRENT_BUILD" ]; then
    echo "GEBLOKKEERD: productie vereist een geslaagde staging-test van build $CURRENT_BUILD."
    echo "Draai eerst: ./scripts/deploy.sh jpl-tracker-staging && python3 scripts/smoke.py https://jpl-tracker-staging.pages.dev/"
    exit 1
  fi
else
  node scripts/bump-build.js
  rm -f .staging-ok
fi
OUT="$(mktemp -d)"
node scripts/make-ics.js
cp index.html app.js data.js styles.css sw.js theme-init.js calendar.ics privacy.html manifest.webmanifest og.png icon-192.png icon-512.png apple-touch-icon.png favicon.ico _headers _redirects api-offline.json robots.txt sitemap.xml "$OUT/"
# Controle: elk lokaal bestand dat index.html laadt moet in de upload zitten (anders geeft Pages de HTML-fallback)
for ref in $(grep -oE '(src|href)="[^":#?]+"' index.html | sed -E 's/^(src|href)="//; s/"$//' | grep -v '^data:\|^//\|^https\?:' | sort -u); do
  f="${ref#/}"; [ "$f" = "./" ] && continue
  if [ ! -f "$OUT/$f" ] && [ "$f" != "" ]; then echo "FOUT: $f ontbreekt in de upload"; exit 1; fi
done
npx -y wrangler@3.114.17 pages deploy "$OUT" --project-name "$PROJECT" --branch main --commit-dirty=true
echo "Upload klaar: $PROJECT"
if [ "$PROJECT" = "jpl-tracker" ]; then
  # Na productie: wacht tot Pages de nieuwe build serveert, dan smoketest; alleen bij OK een git-tag zetten
  sleep 30
  if python3 scripts/smoke.py "https://jpl-tracker.pages.dev/"; then
    git tag "deploy/$CURRENT_BUILD" 2>/dev/null && echo "git-tag deploy/$CURRENT_BUILD gezet"
  else
    echo "SMOKETEST NA PRODUCTIE FAALT: draai RUNBOOK.md (terugdraaien)"; exit 1
  fi
else
  echo "Klaar. Draai daarna: python3 scripts/smoke.py https://$PROJECT.pages.dev/"
fi
