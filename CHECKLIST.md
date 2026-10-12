# Checklist per speeldag

- [ ] Uitslagen van de speeldag ophalen uit twee bronnen (zie `DATA_SOURCES.md`).
- [ ] Wedstrijden verplaatsen van `fixtures` naar `matches` in `data.js`.
- [ ] `meta.updated` en `meta.playedThrough` bijwerken.
- [ ] Topscorers en assists bijwerken (alleen met een bron met doelpuntenlijst).
- [ ] `node validate.js` slaagt zonder fouten.
- [ ] `./scripts/deploy.sh` uitvoeren.
- [ ] `python3 scripts/smoke.py` toont "OK".
- [ ] Git-commit met datum en speeldag.
