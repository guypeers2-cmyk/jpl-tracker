// Elke target="_blank" moet rel="noopener" (of noreferrer) hebben. Gebruik: node scripts/check-noopener.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
let bad = 0, total = 0;
for (const f of ['index.html', 'app.js']) {
  const lines = fs.readFileSync(path.join(root, f), 'utf8').split('\n');
  lines.forEach((line, i) => {
    // Bij target="_blank" binnen dezelfde regel moet rel="noopener" staan
    const re = /target=\\?"_blank\\?"/g; let m;
    while ((m = re.exec(line))) {
      total++;
      const win = line.slice(Math.max(0, m.index - 200), m.index + 200);
      if (!/rel=\\?"[^"\\]*noopener/.test(win)) { bad++; console.log(`${f}:${i + 1}: target=_blank zonder noopener`); }
    }
  });
}
console.log(`target=_blank gevonden: ${total}, zonder noopener: ${bad}`);
process.exit(bad ? 1 : 0);
