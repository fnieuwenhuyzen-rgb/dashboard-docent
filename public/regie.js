/* Regie op de tablet (ontwerp 16-11-2026, handboek/werkvoorraad.md): het bord staat schermvullend op de laptop (gespiegeld op het
   digibord) en laat alleen zien wat voor leerlingen is. De tablet is de regie: fase, vorige/volgende, notities, de groepjestimer en de speling.
   Dit bestand: de rekenregel voor de speling (getest in tools/test-regie.js) en de verbinding via /api/regie (functions/api/regie.js).
   Over het netwerk gaat alleen les-id, dia en klokstand; de tablet bouwt de dia's zelf uit basis.json.
   Valt de verbinding weg, dan werkt het bord gewoon met de pijltjes op de laptop; de regie zegt dat ze niet verbonden is. */
(function (root) {
  const ONDERGRENS_SEC = 240; // afronden: zoveel tijd blijft altijd over voor afsluiten en opruimen (net als het opruimsignaal van de lesklok)

  // Speling: resterende lestijd min wat de fases die nog komen volgens plan nodig hebben.
  // slides: [{k, soort, min}] zoals op het bord; i: de dia die nu op het bord staat; restSec: lestijd die over is (lesklok);
  // inFaseSec: hoe lang de huidige dia al op het bord staat. De huidige fase telt mee voor wat er van zijn geplande minuten over is.
  // Afsluiten telt nooit als speling: er blijft minstens ONDERGRENS_SEC voor, of de geplande afsluiting als die langer is.
  function speling({ slides, i, restSec, inFaseSec }) {
    if (restSec == null || !slides || !slides[i]) return null;
    let nodig = 0, afsluiten = 0;
    slides.forEach((y, j) => {
      if (j < i || y.k !== 'fase') return;
      let sec = (+y.min || 0) * 60;
      if (j === i) sec = Math.max(0, sec - Math.max(0, inFaseSec || 0));
      if (y.soort === 'afsluiten') afsluiten += sec; else nodig += sec;
    });
    const reserve = slides[i].k === 'af' ? 0 : Math.max(ONDERGRENS_SEC, afsluiten);
    const sec = Math.round(restSec - nodig - reserve);
    const min = Math.round(sec / 60) || 0; // op de minuut afgerond; || 0 maakt van −0 gewoon 0
    return { sec, min, reserve, tekst: min > 0 ? '+' + min + ' min speling' : min < 0 ? '−' + -min + ' min' : 'precies op schema' };
  }
  // Wat staat er op de klok: left in seconden (negatief kan niet: op het bord stopt de klok op 0:00)
  const klokLeft = (klok, nu) => !klok || !klok.tot ? 0 : klok.loopt && klok.eind ? Math.max(0, Math.round((klok.eind - nu) / 1000)) : Math.max(0, klok.left || 0);

  const R = { speling, klokLeft, ONDERGRENS_SEC };
  if (typeof module !== 'undefined' && module.exports) module.exports = R;
  if (typeof document === 'undefined') { root.REGIE = R; return; }

  /* ---------- verbinding (alleen in de browser) ----------
     rol 'bord': zet de staat (bij elke wijziging en elke 15 s als hartslag) en haalt elke seconde nieuwe opdrachten.
     rol 'regie': haalt elke seconde de staat en stuurt opdrachten. */
  const URL_API = 'api/regie', TIK = 1000, HARTSLAG = 15000, LEVEND = 45000;
  let rol = null, bij = {}, timer = null, na = null, laatsteZet = '', laatsteZetMs = 0, status = 'uit', fouten = 0, bezig = false, wachtZet; // wachtZet: undefined = niets te versturen, null = "bord dicht"
  const zetStatus = s => { if (s !== status) { status = s; if (bij.status) bij.status(s); } };
  async function haal() {
    const r = await fetch(URL_API + (rol === 'bord' && na != null ? '?na=' + na : ''), { cache: 'no-store', credentials: 'same-origin' });
    if (!r.ok) throw new Error(r.status); return r.json();
  }
  async function ronde() {
    timer = null; if (!rol || bezig) return plan(); bezig = true;
    try {
      if (wachtZet !== undefined) await zetNu();
      else if (rol === 'bord' && laatsteZet && Date.now() - laatsteZetMs > HARTSLAG) await zetNu(JSON.parse(laatsteZet));
      const j = await haal(); fouten = 0; zetStatus('aan');
      if (rol === 'bord') {
        if (na == null) na = j.laatste; // oude opdrachten van een vorige les niet uitvoeren
        (j.opdrachten || []).forEach(o => { na = Math.max(na, o.nr); if (bij.opdracht) bij.opdracht(o); });
      } else if (bij.staat) bij.staat(j.staat && j.nu - j.ms < LEVEND ? j.staat : null, j);
    } catch (e) { fouten++; zetStatus('fout'); if (rol === 'regie' && bij.staat && fouten === 3) bij.staat(undefined); }
    bezig = false; plan();
  }
  const plan = () => { if (rol && !timer) timer = setTimeout(ronde, document.hidden ? 5000 : fouten > 2 ? Math.min(4000, TIK * fouten) : TIK); };
  async function zetNu(staat) {
    const s = staat !== undefined ? staat : wachtZet; wachtZet = undefined;
    const tekst = JSON.stringify(s);
    const r = await fetch(URL_API, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ staat: s }), credentials: 'same-origin' });
    if (!r.ok) { if (r.status !== 400) wachtZet = s; throw new Error(r.status); } // 400 weigert de server altijd: niet elke ronde opnieuw sturen, wel weer ophalen
    laatsteZet = s ? tekst : ''; laatsteZetMs = Date.now();
  }
  function start(nieuweRol, handlers) {
    if (rol !== nieuweRol) { na = null; laatsteZet = ''; }
    rol = nieuweRol; bij = handlers || {}; fouten = 0; if (!timer) timer = setTimeout(ronde, 0);
  }
  function stop() { rol = null; if (timer) { clearTimeout(timer); timer = null; } zetStatus('uit'); }
  // het bord: alleen versturen als er echt iets veranderd is (een lopende klok verandert niet: die heeft een eindtijd)
  function zet(staat) {
    const tekst = JSON.stringify(staat);
    if (staat && tekst === laatsteZet && wachtZet === undefined) return;
    wachtZet = staat; if (!bezig) { if (timer) clearTimeout(timer); timer = setTimeout(ronde, 0); }
  }
  // het bord gaat dicht: meteen zeggen, ook als de pagina daarna wegvalt
  function dicht() { try { fetch(URL_API, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ staat: null }), credentials: 'same-origin', keepalive: true }).catch(() => {}); } catch (e) {} laatsteZet = ''; }
  const nieuwId = () => Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  function stuur(opdracht) {
    return fetch(URL_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ opdracht }), credentials: 'same-origin' })
      .then(r => { if (!r.ok) throw new Error(r.status); zetStatus('aan'); return true; }).catch(() => { zetStatus('fout'); return false; });
  }
  root.REGIE = Object.assign(R, { start, stop, zet, dicht, stuur, nieuwId, status: () => status, rol: () => rol });
})(typeof window !== 'undefined' ? window : globalThis);
