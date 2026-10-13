// Test van de tijdconversie (dt) rond de zomer-/wintertijd-wissel. Gebruik: node scripts/test-dst.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const start = src.indexOf('function brusselsOffsetMs'), end = src.indexOf('const LCL=');
if (start < 0 || end < 0) { console.log('FOUT: dt-functie niet gevonden in app.js'); process.exit(1); }
const ctx = {}; vm.createContext(ctx);
vm.runInContext('var TZ="Europe/Brussels";' + src.slice(start, end) + ';this.dt=dt;', ctx);
const cases = [
  ['2026-10-24T20:45', '2026-10-24T18:45:00.000Z', 'CEST vóór wissel'],
  ['2026-10-25T20:45', '2026-10-25T19:45:00.000Z', 'CET na wissel'],
  ['2026-10-09T20:45', '2026-10-09T18:45:00.000Z', 'CEST'],
];
let bad = 0;
for (const [input, want, label] of cases) {
  const got = ctx.dt(input).toISOString();
  const ok = got === want;
  if (!ok) bad++;
  console.log(`${ok ? 'OK ' : 'FOUT'} ${label}: ${input} → ${got} (verwacht ${want})`);
}
process.exit(bad ? 1 : 0);
