#!/usr/bin/env bash
# Zoekt in de repo naar tokens of sleutels. Faalt als er een treffer is.
set -uo pipefail
cd "$(dirname "$0")/.."
PATTERN='cfut_[A-Za-z0-9_-]{20,}|CLOUDFLARE_API_TOKEN=[A-Za-z0-9_-]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|ghp_[A-Za-z0-9]{30,}'
if git grep -nIE "$PATTERN" -- . ':!scripts/secret-scan.sh' >/tmp/secret-hits.txt 2>/dev/null; then
  echo "GEVONDEN: mogelijke geheimen in de repo:"; sed 's/\(.\{0,20\}\).*/\1…/' /tmp/secret-hits.txt | head -20; exit 1
fi
echo "OK: geen geheimen gevonden"
