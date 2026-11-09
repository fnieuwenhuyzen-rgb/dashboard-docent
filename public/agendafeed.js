// Maakt van een lijst agendapunten een iCal-bestand voor Outlook. Alleen rekenwerk, geen toegang tot de staat van Lesdag:
// wat erin mag, bepaalt agendaItems() in app.js. Tests: tools/test-agendafeed.js.
// Punt: { uid, d: 'JJJJ-MM-DD', van: minuten | null, tot: minuten | null, titel, lokaal }. Zonder van is het een punt voor de hele dag.
(function (wereld) {
  const TZ = 'Europe/Amsterdam';
  const VTIMEZONE = ['BEGIN:VTIMEZONE', 'TZID:' + TZ,
    'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
    'BEGIN:STANDARD', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
    'END:VTIMEZONE'];
  const twee = n => String(n).padStart(2, '0');
  const dag = d => d.replace(/-/g, '');
  const tijd = (d, m) => `${dag(d)}T${twee(Math.floor(m / 60))}${twee(m % 60)}00`;
  const volgendeDag = d => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + 1); return x.toISOString().slice(0, 10); };
  const tekst = s => String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  const uidDeel = s => String(s).replace(/[^A-Za-z0-9._-]/g, '_');

  // iCal staat hooguit 75 bytes per regel toe; een vervolgregel begint met een spatie. Nooit midden in een letter afbreken.
  function vouw(regel) {
    const uit = []; let huidig = '', bytes = 0;
    for (const teken of regel) {
      const n = new TextEncoder().encode(teken).length;
      if (bytes + n > (uit.length ? 74 : 75)) { uit.push(huidig); huidig = ''; bytes = 0; }
      huidig += teken; bytes += n;
    }
    uit.push(huidig);
    return uit.join('\r\n ');
  }

  function ics(punten, nu) {
    const stempel = new Date(nu).toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
    const r = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Lesdag//Agendafeed//NL', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Lesdag', 'X-WR-TIMEZONE:' + TZ,
      'REFRESH-INTERVAL;VALUE=DURATION:PT1H', 'X-PUBLISHED-TTL:PT1H', ...VTIMEZONE];
    for (const p of punten) {
      r.push('BEGIN:VEVENT', `UID:${uidDeel(p.uid)}@lesdag`, 'DTSTAMP:' + stempel);
      if (p.van != null) r.push(`DTSTART;TZID=${TZ}:${tijd(p.d, p.van)}`, `DTEND;TZID=${TZ}:${tijd(p.d, p.tot != null && p.tot > p.van ? p.tot : p.van + 60)}`);
      else r.push('DTSTART;VALUE=DATE:' + dag(p.d), 'DTEND;VALUE=DATE:' + dag(volgendeDag(p.d)), 'TRANSP:TRANSPARENT');
      r.push('SUMMARY:' + tekst(p.titel));
      if (p.lokaal) r.push('LOCATION:' + tekst(p.lokaal));
      r.push('END:VEVENT');
    }
    r.push('END:VCALENDAR');
    return r.map(vouw).join('\r\n') + '\r\n';
  }

  /* Titels in de veilige stand (standaard). Een Zermelo-afspraak (surveillance, toets, overleg) kan vak, groep of een naam bevatten:
     die krijgt een vaste titel. Een toets uit de toetsweek van de leergang (z.tz) heeft een eigen titel uit basis.json en mag blijven.
     Bij een les gaat alleen de lestitel uit de leergang mee, nooit een tekst uit Zermelo of van Frans zelf. */
  function zTitel(z, tz, ruim) {
    if (ruim) return null;
    if (z.dienst) return 'Surveillance';
    if (z.toets) return tz ? null : 'Toets';
    return 'Afspraak';
  }
  function lesSub(x, leergangTitel, ruim, sub) {
    if (ruim) return sub;
    return x && !x.uitval && !x.fout && leergangTitel ? leergangTitel : '';
  }

  const api = { ics, zTitel, lesSub };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else wereld.AGENDAFEED = api;
})(typeof window !== 'undefined' ? window : globalThis);
