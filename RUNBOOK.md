# Runbook JPL Tracker

## Deploy
1. Omgeving: `export CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=...` (token met alleen Pages-bewerkrechten).
2. `./scripts/deploy.sh` (validatie, build-ID en cachenaam ophogen, link-check, upload).
3. `python3 scripts/smoke.py https://jpl-tracker.pages.dev/` moet "OK" tonen.
4. Commit in git met de build-ID in het bericht.

## Terugdraaien (rollback)
1. Cloudflare-dashboard → Workers & Pages → jpl-tracker → Deployments.
2. Oude deployment kiezen → "Rollback to this deployment".
3. Smoke-test opnieuw draaien.

## Veelvoorkomende problemen
- **Bezoekers zien oude scores:** `CACHE` in `sw.js` is niet opgehoogd. Het deploy-script doet dat automatisch; draai het niet handmatig zonder bump.
- **"Nieuwe versie"-banner bij nieuwe bezoekers:** build-ID in `index.html` klopt niet met de nieuwe deploy.
- **Uitslagen ontbreken:** `node validate.js` draaien en de bron in `DATA_SOURCES.md` controleren.
