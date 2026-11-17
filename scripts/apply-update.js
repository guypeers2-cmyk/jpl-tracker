// Past een bronupdate toe op data.js. Gebruik: node scripts/apply-update.js <input.json> [--dry]
// Schrijft ALLEEN als de berekende stand exact overeenkomt met de bronstand. Anders geen wijziging.
const fs = require('fs');
const vm = require('vm');
const root = __dirname + '/../';
const inputPath = process.argv[2];
const dry = process.argv.includes('--dry');
const inp = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const s = fs.readFileSync(root + 'data.js', 'utf8');
const ctx = {}; vm.createContext(ctx); vm.runInContext(s + ';this.D=DATA;', ctx);
const D = ctx.D;
const out = { ok: false, reason: '', newMatches: 0, scorers: 0, assists: 0, changed: false };

function fail(msg) { out.reason = msg; console.log(JSON.stringify(out)); process.exit(0); }

// 1. nieuwe wedstrijden: alleen toevoegen als ze nog niet bestaan; bestaande moeten gelijk zijn
const existing = new Map(D.matches.map(m => [m.md + '|' + m.home + '|' + m.away, m]));
const toAdd = [];
for (const r of inp.results) {
  const k = r.md + '|' + r.home + '|' + r.away;
  const e = existing.get(k);
  if (e) {
    if (e.hg !== r.hg || e.ag !== r.ag) fail(`conflict bij ${k}: data ${e.hg}-${e.ag}, bron ${r.hg}-${r.ag}`);
    continue;
  }
  toAdd.push(r);
}
const used = [];
const newMatches = toAdd.map(r => {
  const f = D.fixtures.find(x => x.md === r.md && x.home === r.home && x.away === r.away);
  if (!f) fail(`geen programma-regel voor md${r.md} ${r.home}-${r.away}; handmatig controleren`);
  used.push(f);
  return { md: r.md, date: f.date, home: r.home, away: r.away, hg: r.hg, ag: r.ag };
});
const keepFix = D.fixtures.filter(f => !used.includes(f));
const allMatches = D.matches.concat(newMatches);

// 2. stand-controle tegen bron (wedstrijden, W, G, V, doelpunten, punten)
const st = {};
D.teams.forEach(t => st[t.code] = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 });
for (const m of allMatches) {
  const h = st[m.home], a = st[m.away];
  h.p++; a.p++; h.gf += m.hg; h.ga += m.ag; a.gf += m.ag; a.ga += m.hg;
  if (m.hg > m.ag) { h.w++; h.pts += 3; a.l++; } else if (m.hg < m.ag) { a.w++; a.pts += 3; h.l++; } else { h.d++; a.d++; h.pts++; a.pts++; }
}
const bad = [];
for (const [c, r] of Object.entries(inp.standings)) {
  const o = st[c];
  if (!o) { bad.push('onbekende club ' + c); continue; }
  if (o.p !== r.p || o.w !== r.w || o.d !== r.d || o.l !== r.l || o.gf !== r.gf || o.ga !== r.ga || o.pts !== r.pts)
    bad.push(`${c}: ${o.p}g ${o.w}-${o.d}-${o.l} ${o.gf}-${o.ga} ${o.pts}pt vs bron ${r.p}g ${r.w}-${r.d}-${r.l} ${r.gf}-${r.ga} ${r.pts}pt`);
}
if (Object.keys(inp.standings).length !== D.teams.length) bad.push('bron heeft niet 18 clubs');
if (bad.length) fail('stand wijkt af: ' + bad.join(' | '));

// 3. topscorers / assists: sanity-checks
if (inp.scorers.length < 30 || inp.scorers.length > 45) fail('onverwacht aantal topscorers: ' + inp.scorers.length);
if (inp.assists.length < 10) fail('te weinig assistgevers: ' + inp.assists.length);
const scorersOut = inp.scorers.map(x => ({ name: x.name, team: x.team, nat: x.nat, age: x.age, goals: x.goals, assists: x.assists, minPerGoal: x.minPerGoal, share: x.share }));
const assistsOut = inp.assists.map(x => ({ name: x.name, team: x.team, assists: x.assists }));

// 4. speeldag-status: hoogste speeldag met alle wedstrijden gespeeld
const perMd = {};
for (const m of allMatches) perMd[m.md] = (perMd[m.md] || 0) + 1;
const maxMd = Math.max(...allMatches.map(m => m.md));

// 5. wijzigingen?
const oldScorers = JSON.stringify(D.scorers), oldAssists = JSON.stringify(D.assists);
const newsOk = Array.isArray(inp.news) && inp.news.length >= 3;
const yellowOk = Array.isArray(inp.yellow) && inp.yellow.length >= 5;
const extraChanged = (newsOk && JSON.stringify(D.news) !== JSON.stringify(inp.news)) || (yellowOk && JSON.stringify(D.yellowLeaders) !== JSON.stringify(inp.yellow));
const changed = newMatches.length > 0 || oldScorers !== JSON.stringify(scorersOut) || oldAssists !== JSON.stringify(assistsOut) || extraChanged;
out.newMatches = newMatches.length; out.scorers = scorersOut.length; out.assists = assistsOut.length; out.changed = changed; out.extra = extraChanged;
out.ok = true;
out.maxMd = maxMd;
if (!changed || dry) { console.log(JSON.stringify(out)); process.exit(0); }

// 6. schrijven: zelfde splitsing als eerdere updates
const jsonK = o => JSON.stringify(o).replace(/"(\w+)":/g, '$1:');
const i0 = s.indexOf('matches:['), iMC = s.indexOf('],managerChanges:[');
const iFx = s.indexOf('],fixtures:[');
if (i0 < 0 || iMC < 0 || iFx < 0) fail('merker niet gevonden in data.js');
const existingMatches = s.slice(i0, iFx);
const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Brussels' });
const text = s.slice(0, i0) + existingMatches + ',' + newMatches.map(jsonK).join(',') + ']' +
  ',fixtures:' + jsonK(keepFix) +
  ',scorers:' + jsonK(scorersOut) + ',assists:' + jsonK(assistsOut) + s.slice(iMC + 1);
let text2 = text;
{
  const a = text2.indexOf('yellowLeaders:['), b = text2.indexOf(',news:['), c = text2.indexOf(',meta:{');
  if (a < 0 || b < 0 || c < 0 || !(a < b && b < c)) fail('merker yellowLeaders/news/meta niet gevonden');
  const yl = yellowOk ? inp.yellow : D.yellowLeaders;
  const nw = newsOk ? inp.news : D.news;
  text2 = text2.slice(0, a) + 'yellowLeaders:' + jsonK(yl) + ',news:' + jsonK(nw) + text2.slice(c);
}
const fixed = text2.replace(/playedThrough:\d+/, 'playedThrough:' + maxMd).replace(/updated:"[^"]*"/, 'updated:"' + today + '"');
const c2 = {}; vm.createContext(c2); vm.runInContext(fixed + ';this.D=DATA;', c2);
if (c2.D.matches.length !== allMatches.length) fail('controle na schrijven mislukt');
fs.writeFileSync(root + 'data.js', fixed);
out.written = true;
console.log(JSON.stringify(out));
