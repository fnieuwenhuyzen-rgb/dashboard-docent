/* Automatische kopie: één keer per dag een kopie van de eigen staat in IndexedDB op dit apparaat, de laatste veertien dagen.
   De kopie is de staat zoals hij op de eerste start van die dag was: een vergissing van vandaag is dus nog terug te halen.
   Alleen de staat (S), nooit de Zermelo-koppeling of de gegevens uit `lesdag-apparaat`. Terugzetten gaat in app.js met dezelfde vraag
   als bij Kopie terugzetten. Zonder IndexedDB (privévenster) doet dit niets en gaat er niets mis. */
(function (wortel, maak) { if (typeof module === 'object' && module.exports) module.exports = maak; else wortel.AUTOKOPIE = maak(wortel); })(this, wereld => {
  const DB = 'lesdag-autokopie', STORE = 'dagen', BEWAAR = 14;
  const w = wereld || {};
  const open = () => new Promise((ok, nee) => {
    if (!w.indexedDB) return nee(new Error('geen IndexedDB'));
    let q; try { q = w.indexedDB.open(DB, 1); } catch (e) { return nee(e); }
    q.onupgradeneeded = () => { if (!q.result.objectStoreNames.contains(STORE)) q.result.createObjectStore(STORE, { keyPath: 'dag' }); };
    q.onsuccess = () => ok(q.result); q.onerror = () => nee(q.error || new Error('IndexedDB')); q.onblocked = () => nee(new Error('IndexedDB geblokkeerd'));
  });
  const klaar = t => new Promise((ok, nee) => { t.oncomplete = () => ok(); t.onerror = t.onabort = () => nee(t.error || new Error('transactie mislukt')); });
  const vraag = r => new Promise((ok, nee) => { r.onsuccess = () => ok(r.result); r.onerror = () => nee(r.error); });
  async function alle(db) { return (await vraag(db.transaction(STORE).objectStore(STORE).getAll())) || []; }

  /* maakt de kopie van `dag` (jjjj-mm-dd) als die er nog niet is; geeft true als er een gemaakt is. tekst: de staat als JSON.
     eind = true: de kopie bij Dag afsluiten (sleutel 'jjjj-mm-dd-eind'); die wordt bij elke nieuwe afsluiting van die dag ververst, zodat de invoer van de dag erin zit. */
  async function maak(dag, tekst, tijd, eind) {
    const sleutel = eind ? dag + '-eind' : dag;
    const db = await open(); try {
      if (!eind && await vraag(db.transaction(STORE).objectStore(STORE).get(sleutel))) return false;
      const t = db.transaction(STORE, 'readwrite'); t.objectStore(STORE).put({ dag: sleutel, eind: !!eind, tijd: tijd || Date.now(), staat: String(tekst) }); await klaar(t);
      const sl = (await alle(db)).map(x => x.dag), dagen = [...new Set(sl.map(d => d.slice(0, 10)))].sort().reverse(); // oudste weg: de laatste 14 dagen blijven, met allebei hun kopieën
      if (dagen.length > BEWAAR) { const weg = new Set(dagen.slice(BEWAAR)); const t2 = db.transaction(STORE, 'readwrite'); sl.filter(d => weg.has(d.slice(0, 10))).forEach(d => t2.objectStore(STORE).delete(d)); await klaar(t2); }
      return true;
    } finally { db.close(); }
  }
  async function lijst() { const db = await open(); try { return (await alle(db)).map(x => ({ dag: x.dag, eind: !!x.eind, tijd: x.tijd, grootte: (x.staat || '').length })).sort((a, b) => a.dag < b.dag ? 1 : -1); } finally { db.close(); } }
  async function haal(dag) { const db = await open(); try { const r = await vraag(db.transaction(STORE).objectStore(STORE).get(dag)); if (!r) return null; try { return JSON.parse(r.staat); } catch (e) { return null; } } finally { db.close(); } }
  async function wis() { const db = await open(); try { const t = db.transaction(STORE, 'readwrite'); t.objectStore(STORE).clear(); await klaar(t); } finally { db.close(); } }
  return { maak, lijst, haal, wis, BEWAAR, DB };
});
