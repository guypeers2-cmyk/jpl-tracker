#!/usr/bin/env bash
# Maakt CHANGELOG.md op basis van git-commits sinds de vorige deploy-tag (deploy/<build>).
set -uo pipefail
cd "$(dirname "$0")/.."
LAST=$(git tag --list 'deploy/*' --sort=-creatordate | head -1)
RANGE=${LAST:+$LAST..}HEAD
{
  echo "# Changelog"
  echo
  echo "Gegenereerd: $(date +%F). Wijzigingen sinds ${LAST:-het begin}:"
  echo
  git log --no-merges --pretty='- %s (%h)' "$RANGE"
} > CHANGELOG.md
echo "CHANGELOG.md geschreven ($(git rev-list --count "$RANGE") commits)"
