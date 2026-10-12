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
