# Runbook JPL Tracker

## Deploy
0. Eerst naar staging: `./scripts/deploy.sh jpl-tracker-staging` en smoke-test op `jpl-tracker-staging.pages.dev`.
0a. Productie wordt geblokkeerd tot staging voor dezelfde build is getest (`.staging-ok`).
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

## CI
`.github/workflows/ci.yml` valideert en controleert elke push. Deploy naar staging gebeurt automatisch op `main`, met de secrets `CLOUDFLARE_API_TOKEN` en `CLOUDFLARE_ACCOUNT_ID` in de GitHub-instellingen. Productie blijft handmatig via `./scripts/deploy.sh jpl-tracker`.
