// Vergelijkt de twee laatste snapshots en toont wie van positie of punten veranderde.
// Gebruik: node scripts/snapshot-diff.js
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'snapshots');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort();
if (files.length < 2) { console.log('Minstens twee snapshots nodig; er zijn er ' + files.length + '.'); process.exit(0); }
const load = f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
const a = load(files[files.length - 2]), b = load(files[files.length - 1]);
const pos = s => Object.fromEntries(s.table.map((r, i) => [r.code, { i: i + 1, ...r }]));
const pa = pos(a), pb = pos(b);
console.log(`Van ${files[files.length - 2]} (SD${a.playedThrough}) naar ${files[files.length - 1]} (SD${b.playedThrough})`);
let changes = 0;
for (const code of Object.keys(pb)) {
  const x = pa[code], y = pb[code];
  if (!x) { console.log(`  ${code}: nieuw in stand`); changes++; continue; }
  if (x.i !== y.i || x.pts !== y.pts) {
    console.log(`  ${code}: positie ${x.i}→${y.i}, punten ${x.pts}→${y.pts}`); changes++;
  }
}
if (!changes) console.log('  Geen wijzigingen in positie of punten.');
