// Controleert dat alle lokale bestanden die index.html en app.js laden bestaan.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const refs = new Set();
for (const m of html.matchAll(/(?:src|href)="([^":#?]+)"/g)) if (!m[1].startsWith('data:') && !m[1].startsWith('//')) refs.add(m[1]);
const bad = [...refs].filter(r => !fs.existsSync(path.join(root, r.replace(/^\//, ''))) && r !== './');
if (bad.length) { console.log('ONTBREKEND: ' + bad.join(', ')); process.exit(1); }
console.log(`Links OK (${refs.size} lokale verwijzingen)`);
