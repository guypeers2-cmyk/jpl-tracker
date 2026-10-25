// Schrijft de huidige stand naar snapshots/<datum>.json, zodat wijzigingen per speeldag zichtbaar blijven.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const DATA = new Function(fs.readFileSync(path.join(root, 'data.js'), 'utf8') + '\nreturn DATA;')();
const st = {};
DATA.teams.forEach(t => st[t.code] = { code: t.code, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 });
for (const m of DATA.matches.filter(Boolean)) {
  const h = st[m.home], a = st[m.away];
  h.p++; a.p++; h.gf += m.hg; h.ga += m.ag; a.gf += m.ag; a.ga += m.hg;
  if (m.hg > m.ag) { h.w++; h.pts += 3; a.l++; }
  else if (m.hg < m.ag) { a.w++; a.pts += 3; h.l++; }
  else { h.d++; a.d++; h.pts++; a.pts++; }
}
const table = Object.values(st).sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf);
const day = new Date().toISOString().slice(0, 10);
const out = { date: day, playedThrough: Math.max(...DATA.matches.filter(Boolean).map(m => m.md)), table };
fs.mkdirSync(path.join(root, 'snapshots'), { recursive: true });
fs.writeFileSync(path.join(root, 'snapshots', day + '.json'), JSON.stringify(out, null, 2));
console.log('Snapshot ' + day + ' geschreven (' + table.length + ' clubs)');
