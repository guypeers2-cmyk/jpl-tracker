# Privacy: concept (NIET gepubliceerd)

Status: concept op basis van de broncode van `app.js` en `theme-init.js` (13 okt 2026).
Dit moet de beheerder controleren voordat het op de site komt. Punten met **[bevestigen]** zijn niet uit de repository af te leiden.

## Lokaal opgeslagen (localStorage, alleen op jouw apparaat)
| Sleutel | Inhoud | Doel |
|---|---|---|
| `jpl-theme` | licht/donker | thema onthouden |
| `jpl-lang` | NL/FR | taal onthouden |
| `jpl-club`, `jpl-club-pal` | gekozen club en kleurpalet | weergave |
| `jpl-fav`, `jpl-gffav` | favoriete club en favoriete wedstrijden | personalisatie |
| `jpl-wi` | aan/uit (wedstrijdinfo) | weergave |
| `jpl-notif`, `jpl-push` | meldingen aan/uit en de push-abonnementsstatus | meldingen |
| `jpl-goal` | opgeslagen doelpuntinvoer | eigen voorspellingen |
| `jpl-coins-auth` | **naam + pincode** van het coins-account | inloggen op de coins-ranglijst |

De code zet zelf geen cookies. **[bevestigen]** of de hostingdienst (Cloudflare Pages) cookies of vergelijkbare identificatoren gebruikt.

## Naar de server gestuurd
- **Coins-account:** naam en pincode bij aanmaken/inloggen (`POST /api/coins`). Daarnaast een ranglijst met naam en profiel (`GET /api/coins?action=lb`). **[bevestigen]** of de pincode gehasht wordt opgeslagen.
- **Pushmeldingen:** het abonnementseindpunt, de sleutels en de favoriete club (`POST/DELETE /api/push-sub`). Een eindpunt is een gebruikersidentificatie bij de browserleverancier.
- **Doelpuntinvoer:** `GET /api/goals` met wedstrijdgegevens. **[bevestigen]** of er IP-adressen of andere gegevens worden bewaard.
- **Live- en statistiekdata:** `GET /api/live`, `/api/stats`, `/api/sporza`. Alleen wedstrijdgegevens in de aanvraag; server-logs **[bevestigen]**.

## Derden
- Geen externe scripts, lettertypen of trackers (CSP: `script-src 'self'`, `connect-src 'self'`). De bezoekersteller is in oktober 2026 verwijderd.
- De pushdienst van de browser (Google, Mozilla, Apple) ontvangt het abonnementseindpunt.

## Bewaartermijnen en rechten (nog in te vullen)
- Bewaartermijn coins-account en ranglijst: **[bevestigen]**
- Bewaartermijn push-abonnementen: **[bevestigen]** (verwijderen bij uitschrijven)
- Verwijderen van account: **[bevestigen]** hoe een gebruiker dat doet (nu: `localStorage` wissen werkt lokaal, niet op de server)
- Contact voor privacyvragen: **[bevestigen]**


## Bevestigd van buitenaf (13 okt 2026, productie en staging)
- Geen `Set-Cookie`-headers op de pagina of op de API. De code zet geen cookies.
- Alle server-endpoints (`/api/live`, `/api/goals`, `/api/push-sub`, `/api/sporza`, `/api/stats`, `/api/coins?action=lb`) antwoorden met: `{"ok":false,"error":"Live-API niet beschikbaar op deze statische kopie"}`.
- `POST /api/coins` geeft **405** (geen account-aanmaak mogelijk).
- Gevolg: op de live site wordt op dit moment **geen** persoonsgegevens op een server verwerkt of bewaard. Bewaartermijnen, IP-logs en pincode-hashing zijn daarom voor deze versie niet van toepassing. Ze worden wél van toepassing zodra een backend wordt uitgerold.
- Gevolg voor gebruikers: coins-account, pushmeldingen, doelpuntinvoer en live-data werken op de statische kopie niet. De pincode in `localStorage` wordt dus alleen lokaal bewaard.

## Nog open (vraag aan de eigenaar)
- Komt er een backend bij (dan dit document uitbreiden met bewaartermijnen, hashing, logs)?
- Contactadres voor privacyvragen.
- Blijft de coins-functie bestaan terwijl ze niet werkt?

## Beveiligingsbevinding (niet privacy-tekst, wel relevant)
`jpl-coins-auth` bewaart de pincode in platte tekst in localStorage. Iedereen met toegang tot het apparaat of een XSS-lek kan die lezen. Advies: alleen een sessietoken lokaal bewaren; de pincode alleen server-side gehasht. Dat vraagt een wijziging in de backend, die niet in deze repository staat.
