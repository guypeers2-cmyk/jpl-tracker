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
