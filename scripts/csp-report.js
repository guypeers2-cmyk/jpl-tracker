// Voorbereiding op een strikte CSP: telt inline stijlen en scripts. Verandert niets. Gebruik: node scripts/csp-report.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const count = (s, re) => (s.match(re) || []).length;
console.log('index.html:');
console.log('  inline style-attributen:', count(html, /\sstyle="/g));
console.log('  inline <script> blokken (zonder src):', count(html, /<script(?![^>]*\ssrc=)[^>]*>/g));
console.log('  inline event-handlers (onclick=…):', count(html, /\son[a-z]+="/g));
console.log('app.js (in JavaScript-strings gegenereerd):');
console.log('  style-attributen in templates:', count(app, /style=\\?"/g));
console.log('  innerHTML-toewijzingen:', count(app, /\.innerHTML\s*=/g));
console.log('Let op: het besluit over \'unsafe-inline\' in de CSP blijft aan de eigenaar.');
