// Maakt calendar.ics uit data.js: alle wedstrijden als agenda-items (Europe/Brussels).
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'data.js'), 'utf8');
const DATA = new Function(src.replace(/^[\s\S]*?const DATA=/, 'return ').replace(/;\s*$/, ';'))();
const T = Object.fromEntries(DATA.teams.map(t => [t.code, t]));
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const esc = s => String(s).replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
const fold = line => line.replace(/(.{70})(?=.)/g, '$1\r\n ');
const local = d => d.replace(/[-:]/g, '').replace('T', 'T') + '00'; // 2026-08-07T20:45 -> 20260807T204500
const end = d => {
  const [date, time] = d.split('T'); const [h, m] = time.split(':').map(Number);
  const dt = new Date(Date.UTC(...date.split('-').map((v, i) => i === 1 ? v - 1 : +v), h + 2, m));
  return dt.toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', 'T') + '00';
};
const lines = [
  'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//JPL Tracker//NL', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
  'X-WR-CALNAME:' + esc('Jupiler Pro League ' + DATA.meta.season),
  'X-WR-TIMEZONE:Europe/Brussels',
  'BEGIN:VTIMEZONE', 'TZID:Europe/Brussels',
  'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
  'BEGIN:STANDARD', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
  'END:VTIMEZONE'
];
for (const m of [...DATA.matches, ...DATA.fixtures]) {
  const h = T[m.home], a = T[m.away];
  const played = typeof m.hg === 'number' && typeof m.ag === 'number';
  const summary = `${h.name} - ${a.name}` + (played ? ` (${m.hg}-${m.ag})` : '');
  lines.push('BEGIN:VEVENT',
    `UID:${m.home}-${m.away}-${m.date.replace(/[-:T]/g, "")}@jpl-tracker`,
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=Europe/Brussels:${local(m.date)}`,
    `DTEND;TZID=Europe/Brussels:${end(m.date)}`,
    'SUMMARY:' + esc(summary),
    'LOCATION:' + esc(h.stadium + ', ' + h.city),
    'DESCRIPTION:' + esc(`Speeldag ${m.md}`),
    'END:VEVENT');
}
lines.push('END:VCALENDAR');
fs.writeFileSync(path.join(root, 'calendar.ics'), lines.map(fold).join('\r\n') + '\r\n');
console.log('calendar.ics:', (DATA.matches.length + DATA.fixtures.length), "wedstrijden");
