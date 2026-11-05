// Test de iCal-generator: node tools/test-agendafeed.js
const assert = require('assert');
const { ics } = require('../public/agendafeed.js');
const uit = ics([
  { uid: 'les:a b', d: '2026-11-09', van: 510, tot: 555, titel: 'h3a: Noten, ritme; maat', lokaal: '009' },
  { uid: 'sectie:1', d: '2026-12-31', van: null, tot: null, titel: 'Deadline' },
  { uid: 'koor:1', d: '2026-11-10', van: 1140, tot: null, titel: 'é'.repeat(60) }
], Date.UTC(2026, 10, 5, 9, 0, 0));
const regels = uit.split('\r\n');

assert(uit.endsWith('END:VCALENDAR\r\n'), 'sluit af met CRLF');
assert(!/[^\r]\n/.test(uit), 'alleen CRLF');
assert(regels.every(r => Buffer.byteLength(r) <= 75), 'hooguit 75 bytes per regel');
const plat = uit.replace(/\r\n /g, '');
assert(plat.includes('SUMMARY:h3a: Noten\\, ritme\\; maat'), 'tekens geescaped');
assert(plat.includes('DTSTART;TZID=Europe/Amsterdam:20261109T083000'), 'begintijd');
assert(plat.includes('DTEND;TZID=Europe/Amsterdam:20261109T091500'), 'eindtijd');
assert(plat.includes('UID:les_a_b@lesdag'), 'uid zonder vreemde tekens');
assert(plat.includes('LOCATION:009'), 'lokaal');
assert(plat.includes('DTSTART;VALUE=DATE:20261231') && plat.includes('DTEND;VALUE=DATE:20270101'), 'hele dag eindigt de dag erna, ook over de jaargrens');
assert(plat.includes('DTEND;TZID=Europe/Amsterdam:20261110T200000'), 'zonder eindtijd een uur');
assert(plat.includes('SUMMARY:' + 'é'.repeat(60)), 'lange regel met letters van twee bytes blijft heel');
assert(plat.includes('DTSTAMP:20261105T090000Z'), 'tijdstempel');
assert.strictEqual((uit.match(/BEGIN:VEVENT/g) || []).length, 3);
console.log('agendafeed: alles goed');
