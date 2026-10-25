// Overzicht per speeldag, afgeleid uit data.js: wat is gespeeld, wat staat open, wat moet je nog doen.
const fs = require('fs');
const path = require('path');
const D = new Function(fs.readFileSync(path.join(__dirname, '..', 'data.js'), 'utf8') + '\nreturn DATA;')();
const played = D.matches.filter(Boolean), open = D.fixtures.filter(Boolean);
const lastMd = Math.max(...played.map(m => m.md));
const nextMd = Math.min(...open.map(f => f.md));
const postponed = played.filter(m => m.status === 'uitgesteld').map(m => `${m.home}-${m.away}`);
console.log(`Laatste gespeelde speeldag: ${lastMd}`);
console.log(`Volgende open speeldag: ${nextMd} (${open.filter(f => f.md === nextMd).length} wedstrijden)`);
console.log(`Gespeeld: ${played.length} · Open: ${open.length} · Totaal: ${played.length + open.length}`);
console.log(`Uitgesteld: ${postponed.length ? postponed.join(', ') : 'geen'}`);
console.log('Checklist voor de volgende update:');
console.log(`  [ ] Uitslagen van speeldag ${nextMd} ophalen zodra die gespeeld is (zie DATA_SOURCES.md)`);
console.log('  [ ] node validate.js');
console.log('  [ ] ./scripts/deploy.sh jpl-tracker-staging, dan smoke.py op staging');
console.log('  [ ] ./scripts/deploy.sh jpl-tracker (poort controleert de staging-vlag)');
