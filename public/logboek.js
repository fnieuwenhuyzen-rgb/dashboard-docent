/* Foutlogboek op dit apparaat: uitzonderingen en de melding "Dit scherm lukt nu niet", de laatste 200, in localStorage (lesdag-logboek).
   Bewust apart van de staat: het gaat niet mee in een kopie en niet naar de server. Er komen geen leerlinggegevens en geen tokens in:
   van een melding blijft alleen de soort fout over, namen van eigenschappen en de plek in de code. Alles tussen aanhalingstekens dat geen
   gewone, kleine programmanaam is, alle lange tekens-reeksen, e-mailadressen en alles na ? in een adres wordt vervangen door "…". */
(function (wortel, maak) { if (typeof module === 'object' && module.exports) module.exports = maak; else wortel.LOGBOEK = maak(wortel); })(this, wereld => {
  const SLEUTEL = 'lesdag-logboek', MAX = 200;
  const w = wereld || {};
  const BEKEND = /^(TypeError|RangeError|SyntaxError|ReferenceError|EvalError|URIError|Error|AbortError|NotFoundError|QuotaExceededError|SecurityError|Promise|JSON|Object|Array|String|Number|Boolean|Map|Set|Date|Window|Document|Element|Node|HTMLElement|URL|IndexedDB|NaN|Failed|Cannot|Unexpected|Invalid|Uncaught|Unhandled|Network|Script|Illegal|Maximum|Out|Unable)[,.:;]?$/;
  function schoon(t) {
    let s = String(t == null ? '' : t);
    s = s.replace(/(https?:\/\/[^\s'")]*?)\?[^\s'")]*/g, '$1?…'); // geen zoekdeel van een adres (daar kan een token staan)
    s = s.replace(/Bearer\s+\S+/gi, 'Bearer …').replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '…');
    s = s.replace(/(["'`“‘])((?:(?!\1).){0,200})\1/g, (m, q, inh) => /^[a-z_$][\w$]{0,30}$/.test(inh) ? m : q + '…' + q); // alleen kleine programmanamen blijven
    s = s.replace(/[A-Za-z0-9_\-+/=]{20,}/g, '…'); // lange reeksen: tokens, sleutels, base64
    // vrije tekst uit onze eigen code kan een naam bevatten: een woord met hoofdletter midden in een zin gaat weg, behalve bekende woorden van de browser
    s = s.split(' ').map((wd, i) => i > 0 && /^[A-Z][A-Za-zÀ-ÿ'-]*[,.:;]?$/.test(wd) && !BEKEND.test(wd) ? '…' : wd).join(' ');
    return s.replace(/\s+/g, ' ').slice(0, 240);
  }
  function plek(stack) { // alleen bestand:regel:kolom van de eerste regels, zonder adres of query
    const r = []; for (const m of String(stack || '').matchAll(/([\w.-]+\.js):(\d+):(\d+)/g)) { r.push(m[1] + ':' + m[2] + ':' + m[3]); if (r.length >= 3) break; } return r.join(' < ');
  }
  function lees() { try { const a = JSON.parse(w.localStorage.getItem(SLEUTEL) || '[]'); return Array.isArray(a) ? a.filter(x => x && typeof x === 'object') : []; } catch (e) { return []; } }
  function schrijf(a) { try { w.localStorage.setItem(SLEUTEL, JSON.stringify(a.slice(-MAX))); } catch (e) { try { w.localStorage.setItem(SLEUTEL, JSON.stringify(a.slice(-20))); } catch (e2) {} } }
  let tijd = () => new Date().toISOString();
  const scherm = () => { try { return String(w.location.hash || '').replace(/^#/, '').split('/')[0].replace(/[^a-z-]/gi, '').slice(0, 20) || 'nu'; } catch (e) { return ''; } };
  let laatste = null; // dezelfde fout vlak achter elkaar (een scherm dat elke seconde opnieuw tekent) telt op in plaats van het logboek te vullen
  function noteer(soort, fout, extra) {
    try {
      const e = fout && typeof fout === 'object' ? fout : { message: fout };
      const bericht = schoon((e.name && e.name !== 'Error' ? e.name + ': ' : '') + (e.message != null ? e.message : e));
      const rij = { t: tijd(), soort: String(soort).slice(0, 20), scherm: scherm(), bericht, plek: plek(e.stack || extra) };
      const a = lees(); const l = a[a.length - 1];
      if (l && l.soort === rij.soort && l.bericht === rij.bericht && l.plek === rij.plek && l.scherm === rij.scherm) { l.aantal = (l.aantal || 1) + 1; l.laatst = rij.t; } else a.push(rij);
      schrijf(a); laatste = rij; return rij;
    } catch (x) { return null; }
  }
  function tekst() { // wat Frans kan kopiëren en plakken
    const a = lees(); const kop = ['Lesdag foutlogboek (' + a.length + ' regels, laatste 200), ' + (w.navigator ? w.navigator.userAgent.replace(/\s+/g, ' ').slice(0, 120) : '')];
    return kop.concat(a.map(r => `${r.t}${r.aantal > 1 ? ' (' + r.aantal + 'x, laatst ' + r.laatst + ')' : ''} [${r.soort}${r.scherm ? ' ' + r.scherm : ''}] ${r.bericht}${r.plek ? ' @ ' + r.plek : ''}`)).join('\n');
  }
  function wis() { try { w.localStorage.removeItem(SLEUTEL); } catch (e) {} laatste = null; }
  if (typeof w.addEventListener === 'function') {
    w.addEventListener('error', ev => { if (ev && ev.target && ev.target !== w && ev.target.tagName) return; noteer('uitzondering', ev && ev.error ? ev.error : { message: ev && ev.message }, (ev && ev.filename ? String(ev.filename).split('/').pop() : '') + ':' + (ev && ev.lineno) + ':' + (ev && ev.colno)); }, true);
    w.addEventListener('unhandledrejection', ev => { noteer('belofte', ev && ev.reason); });
  }
  return { noteer, fout: (e, soort) => noteer(soort || 'scherm', e), lees, tekst, wis, schoon, plek, MAX, SLEUTEL, zetTijd: f => { tijd = f; } };
});
