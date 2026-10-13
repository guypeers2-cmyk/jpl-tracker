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

## Terugzetten vanuit een git-tag (zonder Cloudflare-dashboard)
1. Lijst met tags: `git tag --list 'deploy/*' --sort=-creatordate`.
2. Haal de bestanden van die tag op in een tijdelijke map: `D=$(mktemp -d) && git archive deploy/<build> | tar -x -C "$D"`.
3. Upload alleen de statische bestanden (geen build-bump):
   `npx -y wrangler@3.114.17 pages deploy "$D" --project-name jpl-tracker --branch main`
4. Smoke-test: `python3 scripts/smoke.py https://jpl-tracker.pages.dev/`. De build-ID moet die van de tag zijn.
5. Zet daarna de repo terug naar de laatste versie, zodat de volgende deploy niet het oude bestand overschrijft.

## Changelog
`./scripts/changelog.sh` schrijft `CHANGELOG.md` met alle commits sinds de vorige `deploy/<build>`-tag. Productie-deploys zetten die tag automatisch, na een geslaagde smoketest.

## Veelvoorkomende problemen
- **Bezoekers zien oude scores:** `CACHE` in `sw.js` is niet opgehoogd. Het deploy-script doet dat automatisch; draai het niet handmatig zonder bump.
- **"Nieuwe versie"-banner bij nieuwe bezoekers:** build-ID in `index.html` klopt niet met de nieuwe deploy.
- **Uitslagen ontbreken:** `node validate.js` draaien en de bron in `DATA_SOURCES.md` controleren.

## CI
De CI installeert via `npm ci`, valideert, test DST-tijden, controleert `rel="noopener"`, zoekt naar geheimen, draait `npm audit` (productie-afhankelijkheden, niveau high) en de FR-scan. Na de staging-deploy draait ook de smoketest.

## Overige controles
- `node scripts/snapshot-diff.js`: verschillen tussen de twee laatste stand-snapshots.
- `node scripts/test-dst.js`: tijdconversie rond 25 oktober.
- `python3 scripts/a11y-check.py`: axe in licht en donker thema, voorkeur licht, taalwissel, focusstijl.
- `node scripts/csp-report.js`: telling van inline stijlen en scripts (voorbereiding op een strikte CSP).
- `node scripts/css-unused.js`: klassen in de CSS die nergens worden gebruikt (schatting).
`.github/workflows/ci.yml` valideert en controleert elke push. Deploy naar staging gebeurt automatisch op `main`, met de secrets `CLOUDFLARE_API_TOKEN` en `CLOUDFLARE_ACCOUNT_ID` in de GitHub-instellingen. Productie blijft handmatig via `./scripts/deploy.sh jpl-tracker`.
