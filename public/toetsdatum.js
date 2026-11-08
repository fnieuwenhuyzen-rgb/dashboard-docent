// Waar een toets echt valt: de `datum` in basis.json gaat voor de lesweek waarin de leergang hem zet (besluit Frans 4-11: PT1 vwo 4 en P9 vwo 5 staan op ma 23-11).
// Alleen rekenwerk zonder staat, zodat app.js en tools/test-toetsdatum.js dezelfde regel gebruiken.
// plek(kalender, toets, wLeergang) -> { datum, w, afwijkt }: datum = toets.datum of null, w = lesweek waarin die datum valt (valt hij in geen lesweek, dan wLeergang),
// afwijkt = de datum valt in een andere lesweek dan de leergang.
(function (wereld) {
  const dOf = s => new Date(s + 'T12:00:00');
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const addD = (s, n) => { const d = dOf(s); d.setDate(d.getDate() + n); return ymd(d); };
  function lesweekVan(kalender, s) { const k = s && (kalender.weken || []).find(k => s >= k.datum && s < addD(k.datum, 7)); return k ? k.w : null; }
  function plek(kalender, toets, wLeergang) {
    const datum = (toets && toets.datum) || null; const w = datum ? lesweekVan(kalender, datum) : null;
    return { datum, w: w || wLeergang, afwijkt: !!w && w !== wLeergang };
  }
  const api = { plek, lesweekVan };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else wereld.TOETSDATUM = api;
})(typeof window !== 'undefined' ? window : globalThis);
