// Werkt de statische pagina's bij na een data-update: noscript-stand, datumlabel in app.js, sitemap-lastmod.
const fs = require('fs');
const vm = require('vm');
const root = __dirname + '/../';
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(root + 'data.js', 'utf8') + ';this.D=DATA;', ctx);
const D = ctx.D;

const now = new Date();
const iso = now.toLocaleDateString('sv-SE', { timeZone: 'Europe/Brussels' });
const [y, mo, d] = iso.split('-').map(Number);
const MN = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const label = `${d} ${MN[mo - 1]} ${y}`;

const st = {};
D.teams.forEach(t => st[t.code] = { code: t.code, name: t.full, p: 0, pts: 0, w: 0, gf: 0, ga: 0 });
for (const m of D.matches) {
  const h = st[m.home], a = st[m.away];
  h.p++; a.p++; h.gf += m.hg; h.ga += m.ag; a.gf += m.ag; a.ga += m.hg;
  if (m.hg > m.ag) { h.w++; h.pts += 3; } else if (m.hg < m.ag) { a.w++; a.pts += 3; } else { h.pts++; a.pts++; }
}
const table = Object.values(st).sort((x, y) => y.pts - x.pts || y.w - x.w || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf);
const md = Math.max(...D.matches.map(m => m.md));
const top = table.slice(0, 6).map((r, i) => `<li>${i + 1}. ${r.name} - ${r.pts} pt</li>`).join('');
const sc = [...D.scorers].sort((x, y) => y.goals - x.goals).slice(0, 5)
  .map(s => `<li>${s.name} (${D.teams.find(t => t.code === s.team).full}) - ${s.goals} doelpunten</li>`).join('');
const block = `<noscript><div class="st1"><h2>Jupiler Pro League 2026-27: stand na speeldag ${md}</h2><ol>${top}</ol><h2>Topscorers</h2><ul>${sc}</ul><p>Schakel JavaScript in voor de live stand, alle ${D.matches.length} uitslagen, doelpuntenmakers per wedstrijd, onderlinge duels, transfers en het volledige archief.</p></div></noscript>`;

let html = fs.readFileSync(root + 'index.html', 'utf8');
html = html.replace(/<noscript>[\s\S]*?<\/noscript>/, block);
fs.writeFileSync(root + 'index.html', html);

// datumlabels in app.js: vervang de bestaande "stand <datum> 2026" (nl en fr)
let app = fs.readFileSync(root + 'app.js', 'utf8');
app = app.replace(/stand \d{1,2} [a-z]{3} 2026/, 'stand ' + label)
         .replace(/u00e9tat \d{1,2} [a-z]{3} 2026/, 'u00e9tat ' + label);
fs.writeFileSync(root + 'app.js', app);

let sm = fs.readFileSync(root + 'sitemap.xml', 'utf8').replace(/<lastmod>[^<]*<\/lastmod>/g, `<lastmod>${iso}</lastmod>`);
fs.writeFileSync(root + 'sitemap.xml', sm);
console.log('pages ok, speeldag', md, 'datum', iso);
