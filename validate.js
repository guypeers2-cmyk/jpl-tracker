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
if (D.meta.playedThrough !== maxMd) errors.push(`meta.playedThrough=${D.meta.playedThrough} maar hoogste gespeelde speeldag=${maxMd}`);
const ALLOWED_STATUS = ['uitgesteld'];
for (const [k, m] of all) if (m && m.status && !ALLOWED_STATUS.includes(m.status)) errors.push(`onbekende status '${m.status}' (${m.home}-${m.away})`);
const expectedTotal = D.teams.length * (D.teams.length - 1);
if (played.length + D.fixtures.length !== expectedTotal) errors.push(`totaal ${played.length + D.fixtures.length} ≠ ${expectedTotal}`);
const ids = D.teams.map(t => t.code);
const pts = {}; ids.forEach(c => pts[c] = 0);
for (const m of played) {
  if (m.hg > m.ag) pts[m.home] += 3; else if (m.hg < m.ag) pts[m.away] += 3; else { pts[m.home]++; pts[m.away]++; }
}
for (const s of D.scorers || []) if (!codes.has(s.team)) errors.push('onbekende club bij topscorer ' + s.name);
// Seizoensschema tegen meta
const sStart = D.meta.seasonStart, sEnd = D.meta.seasonEnd;
for (const [k, m] of all) {
  if (!m) continue;
  const day = m.date.slice(0, 10);
  if (day < sStart || day > sEnd) errors.push(`datum buiten seizoen ${day} (${m.home}-${m.away})`);
  if (m.md < 1 || m.md > D.meta.matchdays) errors.push(`speeldag ${m.md} buiten 1..${D.meta.matchdays}`);
}
// Uitgestelde wedstrijden moeten een geldige datum hebben (geen lege of ontbrekende datum)
for (const m of D.matches.filter(Boolean)) if (m.status === 'uitgesteld' && !m.date) errors.push('uitgestelde wedstrijd zonder datum');
// Score-consistentie: gespeeld = numerieke score, open = geen score
for (const m of D.matches.filter(Boolean)) {
  if (!Number.isInteger(m.hg) || !Number.isInteger(m.ag)) errors.push(`gespeelde wedstrijd zonder geldige score: md${m.md} ${m.home}-${m.away}`);
  if (m.status === 'uitgesteld') warnings.push(`uitgestelde wedstrijd heeft wel een score: md${m.md} ${m.home}-${m.away} ${m.hg}-${m.ag} (controleer)`);
}
for (const f of D.fixtures) {
  if (f.hg != null || f.ag != null) errors.push(`open wedstrijd heeft al een score: md${f.md} ${f.home}-${f.away}`);
}
// Unieke clubnamen
const names = D.teams.map(t => t.name);
if (new Set(names).size !== names.length) errors.push('dubbele clubnamen in teams');
// Stand moet overeenkomen met de laatste snapshot van dezelfde speeldag
try {
  const snapDir = __dirname + '/snapshots';
  const files = fs.readdirSync(snapDir).filter(f => f.endsWith('.json')).sort();
  if (files.length) {
    const snap = JSON.parse(fs.readFileSync(snapDir + '/' + files[files.length - 1], 'utf8'));
    if (snap.playedThrough === D.meta.playedThrough) {
      const calc = {};
      D.teams.forEach(t => calc[t.code] = { p: 0, gf: 0, ga: 0, pts: 0 });
      for (const m of played) {
        const h = calc[m.home], a = calc[m.away];
        h.p++; a.p++; h.gf += m.hg; h.ga += m.ag; a.gf += m.ag; a.ga += m.hg;
        if (m.hg > m.ag) h.pts += 3; else if (m.hg < m.ag) a.pts += 3; else { h.pts++; a.pts++; }
      }
      for (const r of snap.table) {
        const c = calc[r.code];
        if (!c) { errors.push(`snapshot bevat onbekende club ${r.code}`); continue; }
        if (c.p !== r.p || c.pts !== r.pts || c.gf !== r.gf || c.ga !== r.ga)
          errors.push(`stand ${r.code} wijkt af van snapshot ${files[files.length - 1]} (p ${c.p}/${r.p}, pts ${c.pts}/${r.pts})`);
      }
    } else {
      warnings.push(`laatste snapshot is van speeldag ${snap.playedThrough}, data op ${D.meta.playedThrough}: vergelijking overgeslagen`);
    }
  }
} catch (e) { warnings.push('snapshot-controle niet uitgevoerd: ' + e.message); }
console.log(`Clubs: ${D.teams.length}  Gespeeld: ${played.length}  Open: ${D.fixtures.length}  Totaal: ${played.length + D.fixtures.length}`);
warnings.forEach(w => console.log('WAARSCHUWING: ' + w));
errors.forEach(e => console.log('FOUT: ' + e));
process.exit(errors.length ? 1 : 0);
