# Databronnen JPL Tracker

Elk veld in `data.js` heeft een bron. Een uitslag wordt pas opgenomen als minstens twee onafhankelijke bronnen dezelfde score geven.

| Veld | Bron | Controle |
|---|---|---|
| `teams` (naam, stadion, kleuren, website) | Clubwebsites | Eenmalig per seizoen |
| `matches` (uitslagen) | Sporza, Nieuwsblad, voetbaluitslagen.be, proleague.be | Twee bronnen moeten overeenkomen |
| `fixtures` (programma, aftraptijden) | proleague.be kalender | Controle bij elke wijziging |
| `scorers` (topscorers) | Nog niet bijgewerkt na speeldag 7 | Open |
| `assists` (assists) | Nog niet bijgewerkt na speeldag 7 | Open |
| `managerChanges` | Clubnieuws | Handmatig |
| `supercup` | Officiële bron | Eenmalig |

## Werkwijze per speeldag
1. Uitslagen ophalen uit twee bronnen en vergelijken.
2. Wedstrijden verplaatsen van `fixtures` naar `matches`.
3. `meta.playedThrough` en `meta.updated` bijwerken.
4. `node validate.js` uitvoeren; geen fouten toegestaan.
5. Build-ID en `sw.js`-cachenaam ophogen, daarna deployen.


## Statuswaarden in data.js
- Geen `status`: gewone wedstrijd. Score in `hg`/`ag` bij een gespeelde wedstrijd, geen score bij een open wedstrijd (`fixtures`).
- `status:"uitgesteld"`: toegestane waarde (zie `validate.js`). Een uitgestelde wedstrijd hoort niet in `fixtures` te staan zonder datum.
- Onbekende statuswaarden worden door `validate.js` geweigerd.
- Een uitgestelde wedstrijd met een score geeft een waarschuwing. Controleer dan de bron.

## Topscorers en assists (bijgewerkt 2026-10-13)
- Bron: topscorervoetbal.nl, stand van zondag 11 oktober 22:32 (na speeldag 8, 72 wedstrijden).
- Topscorers: alle 24 spelers met 3 of meer doelpunten. `share` = % van het teamdoel, `minPerGoal` = minuten per doelpunt.
- Assists: 15 spelers met 3 of meer assists. Spelers met minder dan 3 assists staan in de bronlijst niet, daarom tonen ze in de topscorerlijst 0 assists. Dat is een bronbeperking, geen echte 0.

## Nieuws en extra cijfers (2026-10-13)
- Nieuws: koppen van de overzichtspagina van voetbal24.be (8-10 okt 2026) en nieuwsblad.be (tag Jupiler Pro League, 11 okt). De artikelen zelf zijn niet gelezen; de koppen blijven Nederlands, ook in de Franse weergave. Nieuw toevoegen: `news` in data.js.
- Extra cijfers (Statistiek): beide ploegen scoren, over 2,5 doelpunt, clean sheets en gemiddelde doelpunten. Zelf berekend uit de wedstrijden; gecontroleerd tegen voetbaluitslagen.be (43
## Nieuws en extra cijfers (2026-10-13)
- Nieuws: koppen van de overzichtspagina van voetbal24.be (8-10 okt 2026) en nieuwsblad.be (tag Jupiler Pro League, 11 okt). De artikelen zelf zijn niet gelezen; de koppen blijven Nederlands, ook in de Franse weergave. Nieuw toevoegen: `news` in data.js.
- Extra cijfers (Statistiek): beide ploegen scoren, over 2,5 doelpunt, clean sheets en gemiddelde doelpunten. Zelf berekend uit de wedstrijden; gecontroleerd tegen voetbaluitslagen.be (43%, 61%, 57%).
- Bron voor verdere cijfers (niet overgenomen): voetbalkrant.com statistieken (totaal 218 doelpunten, 18 penalty's, 9 owngoals, 236 gele en 14 rode kaarten).
- Gele kaarten per speler (Statistiek): de top-5 (4 gele kaarten) staat in beide bronnen (voetbaluitslagen.be en voetbalkrant.com). Totalen gele/rode kaarten, penalty's en owngoals zijn NIET overgenomen: de bronnen spreken elkaar tegen (voetbalkrant hoofdpagina 72 wedstrijden, subpagina's 24-42).
- Nieuws bijgewerkt 16 okt 2026: 4 koppen van 14-15 okt (voetbalprimeur.be, nieuwsblad.be) toegevoegd; lijst is nu 12 koppen. Koppen uit zoekresultaten, niet de artikelen gelezen.
- Speeldag 9 (uitslagen, 25 okt 2026): bron officiële wedstrijdpagina's proleague.be (status "Voltooid"): ANT 3-0 CHA (24/10), OHL 2-2 LOM (24/10), LAL 3-0 ZWA (24/10), WES 4-4 BEV (24/10), GNK 2-1 STA (25/10). KOR-MEC uitgesteld, nieuwe datum wo 4 nov 14:30 (proleague.be kalender). CLU-STV, GNT-AND, USG-CER nog niet opgenomen (op de bronpagina nog niet voltooid).
- Doelpuntenmakers speeldag 9 NIET verwerkt: topscorers/assists nog niet bijgewerkt (per-wedstrijd controle nog nodig).
