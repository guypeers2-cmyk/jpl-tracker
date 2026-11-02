# JPL Tracker – audit & changes

Source: https://jpl-tracker.pages.dev/ (saved 2026-10-12). Original kept as received; changes below are in `index.html`.

## Changes made

1. **Timezone bug fixed (`dt()`).** Every match date was parsed with a hard-coded `+02:00` offset (CEST). Belgium switches to CET (+01:00) on 2026-10-25, so after that date every kickoff time would display one hour late (e.g. a 20:45 match shown as 21:45). `dt()` now converts Brussels wall-clock time to the correct instant using `Intl` with `Europe/Brussels`, handling DST automatically. Verified: 2026-10-09 20:45 → 18:45Z (CEST), 2026-11-01 20:45 → 19:45Z (CET).
2. **Schema.org JSON-LD:** `startDate` values on/after 2026-10-25 would need `+01:00`. All current entries are before that date, so the script that handles this is in place but nothing needed changing today.

## Verified OK

- Data integrity: 18 unique clubs, 63 played matches (7 × 9), 243 fixtures (8–34), no duplicate pairings, no unknown club codes.
- Standings recomputed from match results match the page's sorting rules (points, then goal difference, then goals for).
- Top-scorer goal shares are consistent with each club's goals scored.
- Renders in headless Chromium with zero JavaScript errors (offline, using only the saved copy).
- Accessibility basics: `lang="nl"`, viewport meta, `aria-label`s on search and inputs, `aria-label` on the tab nav, alt text on images.

## Issues found, not changed

- **Stale data (most important).** `meta.updated` is 2026-10-08 and `playedThrough` is 7. Matchday 8 fixtures on 9–11 October are still listed as upcoming, so the standings, scorers and results are behind. The page shows a warning when data is old, but the data itself needs refreshing from a reliable source.
- **Live features need the server.** The page calls `/api/live`, `/api/sporza`, `/api/stats`, `/api/goals`, `/api/coins` and `/api/push-sub`. These do not exist in a static copy, so live scores, the coins game and push notifications will not work offline. Errors are caught, so nothing crashes.
- **Third-party visitor counter.** A visitor ID is stored in `localStorage` and sent to `abacus.jasoncameron.dev` on each visit (skipped with `?nt`). This is tracking that may need a consent notice under GDPR/ePrivacy.
- **Update-check polling.** The page re-fetches its own HTML on a timer to detect new versions. This is wasteful on a static host; a service-worker update check would be cheaper.
- **Large single file.** The main script is ~370 KB minified inline, which hurts caching and makes maintenance hard. Splitting it into a separate `.js` and a data `.json` would help.
- **Minor data note:** a match on matchday 3 (GNT–OHL, marked "uitgesteld") is listed after a later matchday. It is correct as postponed, but the sort order should be checked when data is refreshed.

## Update: matchday 8 results (2026-10-12)

Added 7 finished matchday-8 results and removed them from fixtures (now 70 played, 236 upcoming, 306 total). Results were cross-checked against Sporza, Nieuwsblad, voetbaluitslagen.be and proleague.be:

| Match | Score |
|---|---|
| SK Beveren – Lommel SK | 1–3 |
| Cercle Brugge – Anderlecht | 1–2 |
| RAAL La Louvière – Club Brugge | 1–4 |
| KRC Genk – KV Kortrijk | 3–0 |
| Zulte Waregem – KAA Gent | 0–2 |
| Standard – Charleroi | 0–1 |
| Union SG – OH Leuven | 1–1 |

Still open (not confirmed in sources, left as fixtures): **KVC Westerlo – Antwerp** and **KV Mechelen – STVV**.

Known gaps:
- Top-scorer and assist tables were **not** updated for these matches, so they are from before matchday 8.
- `meta.playedThrough` still says 7. The app derives the current matchday from the match list, so it now shows matchday 8 as partly played.
- Kickoff times for the seven results come from the existing fixture list and were not re-verified.

## Update: matchday 8 complete (2026-10-12)

The two open matches are now confirmed and added:
- KVC Westerlo 5–1 Antwerp (Sun 11 Oct, 18:30)
- KV Mechelen 4–3 STVV (Sun 11 Oct, 19:15)

Matchday 8 is complete: 72 played, 234 upcoming, 306 total. Standings now match the figure in the sources for Westerlo (6th, 13 pts, goal difference 20–17).

Still open:
- Top-scorer and assist tables are still from before matchday 8. The sources have the matchday 8 goal events, but merging them into season totals is a separate task.
- `meta.playedThrough` in the data still says 7. The app derives the current matchday from the match list, so it now correctly shows 8.

## Update: improvements and redeploy (2026-10-12)

- **Code split.** The 350 KB inline script is now two files: `data.js` (match, fixture and club data) and `app.js` (logic). Data edits no longer touch the app code, and the browser can cache each file separately. Rendered output was checked against the previous version and is identical apart from the live clock and visitor count.
- **Cache and security headers** added in `_headers`: HTML, `sw.js`, `data.js` and `app.js` always revalidate; images are cached for a week; basic security headers (nosniff, referrer policy, frame and permissions policy) are set.
- **Service worker** precaches the two new files and its cache version is bumped to `jpl-v76`, so returning visitors get the update.
- **Update-check interval** lengthened from 4 to 15 minutes to reduce background requests on the static host.
- **SEO basics:** `robots.txt` and `sitemap.xml` added.

Not changed, needs a decision:
- **Content Security Policy.** The page depends on inline styles and on third-party calls (visitor counter, Transfermarkt links). A strict CSP would need the styles moved out and the counter removed or consented; left for a later pass.
- **Visitor counter / consent.** Still active. A consent banner is needed under GDPR if it stays.
- **Top scorers and assists** still predate matchday 8.

## Update: audit pass (2026-10-12)

**Bug fixed:** after the code split, the "Nieuwe versie beschikbaar" banner appeared on every fresh load. The update check compared page length, which the split had changed. It now compares a build ID: `<meta name="build">` in `index.html` against the same tag in the freshly fetched page. **Bump the build ID on every deploy**, or visitors will not be told about the new version.

**Checked on the live site (desktop and mobile):** no unnamed buttons, links or inputs; all images have alt text; one `h1`; no horizontal scroll at 375 px; no JavaScript errors or console warnings; live files match the local copies.

**Still open:**
- Visitor counter and consent (needs a decision).
- Content Security Policy.
- Top scorers and assists still predate matchday 8. Two public sources disagree on the totals, so I haven't changed them.

**Service worker bug fixed:** the worker served every same-origin file cache-first, so returning visitors kept old `app.js` and `data.js`, and so old scores, until the cache name changed. Scripts, data and the manifest are now network-first, with the cache as offline fallback. Cache name bumped to `jpl-v77`. **Bump `CACHE` in `sw.js` on every deploy that changes these files.**

**False "new version" banner on first visit fixed:** the service worker announced an update whenever it activated, including the first install. It now only does so when an older cache existed.

## Update: autonome uitvoering van squads 1–6 (2026-10-12)

**Squad 1 Data:** `validate.js` toegevoegd (controle van clubs, wedstrijden, datums, totaal 306; slaagt). `meta.playedThrough` op 8 gezet. `DATA_SOURCES.md` toegevoegd. Topscorers en assists blijven open: de bronnen spreken elkaar tegen.

**Squad 3 Prestaties:** inline CSS (66 KB) verplaatst naar `styles.css`. Brotli-compressie bevestigd (HTML 66 KB → 22 KB).

**Squad 4 Beveiliging:** alle `target="_blank"`-links hebben `rel="noopener"`. Niet-bestaande `/api/*`-aanroepen krijgen nu een JSON-antwoord in plaats van de hele pagina (`_redirects` + `api-offline.json`). Visitor-teller en CSP bewust niet gewijzigd (juridische en productkeuze).

**Squad 5 Toegankelijkheid:** axe-core gaf één ernstige fout (taalknop: zichtbaar "FR" maar naam in het Frans). Opgelost; axe vindt nu nul fouten op desktop en mobiel. Reduced-motion-regel was ongeldig (`NaNs`), nu gerepareerd.

**Squad 6 DevOps:** `scripts/bump-build.js` (build-ID en cachenaam automatisch), `scripts/deploy.sh` (validatie, bump, link-check, deploy), `scripts/smoke.py` (smoketest), `scripts/check-links.js`, `RUNBOOK.md` (deploy en rollback), `CHECKLIST.md` (per speeldag), git-repository met `.gitignore`.

**Niet uitgevoerd (keuze of extern nodig):** visitor-teller/consent (26–27), privacyverklaring (32, juridische tekst), clublogo's (49), token intrekken (30, moet in het Cloudflare-dashboard), topscorers (2), archief en kalender-controle (7–8), overige UX- en prestatiepunten (10–25, 33–40, 41-deel).

## Update: vervolg autonome uitvoering (2026-10-12)

- **Franse weergave:** voettekst had Nederlandse tekst ("uitslagen", "gepland") en de verouderde tekst "63 gespeelde wedstrijden". Nu dynamisch (72) en in het Frans. Knop "Installeer de app" vertaald. Gecontroleerd: geen Nederlandse woorden meer in FR-modus.
- **Staging:** project `jpl-tracker-staging` aangemaakt; `deploy.sh <project>` deployt naar een willekeurig project. Eerst staging, dan productie.
- **Wrangler** vastgezet op 3.114.17 in `deploy.sh`.
- **Taalknop** toegankelijke naam gecorrigeerd (axe: nul fouten).

Nog open: topscorers/assists, visitor-teller en consent, privacyverklaring, CSP, "laatst gecontroleerd"-tijdstip, aftraptijden-controle, archief, UX-punten uit squad 2, minificatie, uptime-monitoring, juridische controle clublogo's.

## Update: squad 2 en 4 afgerond waar mogelijk (2026-10-12)
- Standregel toont "bijgewerkt" met de datum van de laatste update (taak 13).
- Klok heeft een tijdzonelabel (taak 16).
- Gecontroleerd: focusstijl aanwezig (38), push-opt-in gebeurt pas na klik (33), contrast zonder fouten in axe (36), toetsenbordvolgorde werkt (35).
- Niet gedaan: lege status voor "Vandaag" en uitgestelde wedstrijden (11, 12), "laatst gecontroleerd" per uitslag (5), header-compactering (14), minificatie (21): levert weinig op bij de huidige bestandsgrootte.

## Update: Squad 1 Data (2026-10-12)
- `validate.js`: verkeerd `meta.playedThrough` is nu een fout (niet alleen een waarschuwing). Onbekende statuswaarden worden geweigerd.
- Uitgestelde wedstrijd GNT–OHL heeft nu `status:"uitgesteld"` naast de notitie.
- `scripts/snapshot.js`: schrijft de stand per dag naar `snapshots/<datum>.json`.
- Nog open binnen Squad 1: twee-bronnen-automatisering, topscorers, "laatst gecontroleerd" per wedstrijd (data en weergave), aftraptijden-controle, archief.

## Update: afwerking (2026-10-12)

**Gedaan**
- Lege "Vandaag"-kaart toont nu "Vandaag geen wedstrijden" met de volgende wedstrijd (NL en FR). Zie taak 10.
- Printstijl voor de stand (taak 18).
- HSTS-header met `max-age` (taak 33). Zonder `includeSubDomains`, zodat andere pages.dev-projecten niet worden geraakt.
- Smoketest controleert nu ook toetsenbordnavigatie, het aantal tabs en de voettekst (taak 34).
- `scripts/fr-scan.py`: vertaalscan voor de Franse weergave, nu in de CI (taken 36, 37).
- `package.json` met vastgezette versies van Wrangler en axe-core (taak 44).
- `.github/workflows/ci.yml`: validatie, linkcontrole, FR-scan en deploy naar staging op `main` (taak 41, 42).
- Minificatie (taak 19) getest: geen winst (352 KB tegen 351 KB), dus niet doorgevoerd.

**Externe domeinen (taak 31)**
- `abacus.jasoncameron.dev`: visitor-teller (zie taak 26).
- `www.transfermarkt.com`: links naar clubprofielen en transfers, alleen als gebruiker klikt.
- Clubsites (rusg.brussels, kaagent.be, enz.): alleen links, geen scripts of stijlen.
- Er worden geen externe scripts of stijlen geladen, behalve de teller.

**Geblokkeerd, niet door mij te beslissen of te doen**
- Visitor-teller en consent (26, 27), privacyverklaring en juridische controle (29, 49), token intrekken (30).
- Git-remote (43): vraagt een repository-URL van jou.
- Uptime-monitor en foutbewaking (45, 46): vraagt een externe dienst.
- Topscorers en assists (2), aftraptijden (6), archief (7), twee-bronnen-automatisering (1): vraagt een bron.
- CSP (28) en inline stijlen (35): ruim 200 `style`-attributen moeten eerst naar klassen.
- Overige ontwerp- en prestatiepunten (12, 14, 15, 17, 20, 21, 22, 23, 24, 25, 32, 38, 39, 40, 47, 48): vragen een keuze of meer tijd dan deze sessie.

## Update: productie-poort, datachecks en toegankelijkheid (2026-10-12)
- **Deploy-poort (taak 47):** `deploy.sh jpl-tracker` weigert nu tenzij staging voor exact dezelfde build is getest. De staging-smoketest zet `.staging-ok` alleen als het live build-ID gelijk is aan het lokale. Productie bumpt niet opnieuw, zodat je precies het getestte bestand uitrolt.
- **Datachecks (taak 7, 9):** validatie controleert nu het seizoensschema (datums binnen `seasonStart`..`seasonEnd`), speeldagen binnen 1..34, en uitgestelde wedstrijden met een datum.
- **Reduced motion (taak 35):** de smoketest controleert onder `prefers-reduced-motion` dat geen animatie langer duurt dan 0,01 s.
- **Kopstructuur (taak 36):** `scripts/headings.py` controleert precies één h1 en geen overgeslagen niveaus. Resultaat: 1 h1, 45 koppen, geen sprongen.

## Update: beslissingen eigenaar (2026-10-13)
- **Bezoekersteller verwijderd.** Geen verzoek meer naar abacus.jasoncameron.dev, geen opslag van een bezoeker-ID. Daarmee vervalt de consent-vraag.
- **Strikte CSP:** `script-src 'self'` en `style-src 'self'` zonder `'unsafe-inline'`. Het thema-script staat in `theme-init.js`. Inline stijlen staan als `data-st` en worden via `el.style.cssText` toegepast (`applyST` in `app.js`).
- **Testproject `jpl-tracker-deploy`** verwijderd in Cloudflare.
- **Git-remote:** geen. Alles blijft lokaal.
- `meta.updated` naar 2026-10-13 (GNT–OHL is vandaag gecorrigeerd).

## Update: 16 okt 2026
- Privacypagina live (`privacy.html`), CSP-melding opgelost, coins-opslag vermeld.
- Nieuws bijgewerkt (14-15 okt). Speeldag 9 begint 23 okt; daarna opnieuw data bijwerken.
- KV-binding `COINS` (preview) verwijderd. Coins-pincode-hashing wacht op backend.
- `npm audit`: 0 kwetsbaarheden.


## Update 2 november 2026 (speeldag 10)

- Data: speeldag 9 (bar KOR-MEC) en speeldag 10 toegevoegd, `meta.playedThrough` 10.
- Topscorers (34) en assists (18) vervangen door de bronlijst van topscorervoetbal.nl (1 nov 21:44). Leeftijd, nationaliteit, minuten per doelpunt en % teamdoel komen uit dezelfde bronpagina.
- Controle: stand tegen de bronstand van 1 nov (na ronde 10): alle 18 clubs komen overeen op wedstrijden en punten. Kortrijk en Mechelen hebben 9 wedstrijden.
- Validatie: 306 wedstrijden, 89 gespeeld, 217 open. Waarschuwing speeldag 9 (8 gespeeld) is verwacht door KOR-MEC op 4 nov.
