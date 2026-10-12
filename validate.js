// Validatie van data.js vóór deploy. Gebruik: node validate.js
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/data.js', 'utf8');
const D = new Function(src + '\nreturn DATA;')();
const errors = [], warnings = [];
const codes = new Set(D.teams.map(t => t.code));
if (codes.size !== D.teams.length) errors.push('dubbele clubcodes');
if (D.teams.length !== D.meta.teams) errors.push(`aantal clubs ${D.teams.length} ≠ meta.teams ${D.meta.teams}`);
const all = [...D.matches.map(m => ['match', m]), ...D.fixtures.map(f => ['fixture', f])];
for (const [k, m] of all) {
  if (!m) { errors.push('leeg element in ' + k + 's'); continue; }
  if (!codes.has(m.home) || !codes.has(m.away)) errors.push(`onbekende club in ${k} md${m.md}: ${m.home}-${m.away}`);
  if (m.home === m.away) errors.push(`zelfde club thuis en uit: ${m.home}`);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(m.date)) errors.push(`ongeldige datum ${m.date} (${m.home}-${m.away})`);
}
const pairs = new Map();
for (const [k, m] of all) {
  if (!m) continue;
  const key = m.md + '|' + m.home + '|' + m.away;
  if (pairs.has(key)) errors.push('dubbele wedstrijd ' + key);
  pairs.set(key, k);
}
const played = D.matches.filter(Boolean);
const perMd = {};
for (const m of played) perMd[m.md] = (perMd[m.md] || 0) + 1;
for (const [md, n] of Object.entries(perMd)) if (n !== D.teams.length / 2) warnings.push(`speeldag ${md}: ${n} gespeelde wedstrijden`);
const maxMd = Math.max(...played.map(m => m.md));
if (D.meta.playedThrough !== maxMd) warnings.push(`meta.playedThrough=${D.meta.playedThrough} maar hoogste gespeelde speeldag=${maxMd}`);
const expectedTotal = D.teams.length * (D.teams.length - 1);
if (played.length + D.fixtures.length !== expectedTotal) errors.push(`totaal ${played.length + D.fixtures.length} ≠ ${expectedTotal}`);
const ids = D.teams.map(t => t.code);
const pts = {}; ids.forEach(c => pts[c] = 0);
for (const m of played) {
  if (m.hg > m.ag) pts[m.home] += 3; else if (m.hg < m.ag) pts[m.away] += 3; else { pts[m.home]++; pts[m.away]++; }
}
for (const s of D.scorers || []) if (!codes.has(s.team)) errors.push('onbekende club bij topscorer ' + s.name);
console.log(`Clubs: ${D.teams.length}  Gespeeld: ${played.length}  Open: ${D.fixtures.length}  Totaal: ${played.length + D.fixtures.length}`);
warnings.forEach(w => console.log('WAARSCHUWING: ' + w));
errors.forEach(e => console.log('FOUT: ' + e));
process.exit(errors.length ? 1 : 0);
