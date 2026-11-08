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

  /* maakt de kopie van `dag` (jjjj-mm-dd) als die er nog niet is; geeft true als er een gemaakt is. tekst: de staat als JSON */
  async function maak(dag, tekst, tijd) {
    const db = await open(); try {
      if (await vraag(db.transaction(STORE).objectStore(STORE).get(dag))) return false;
      const t = db.transaction(STORE, 'readwrite'); t.objectStore(STORE).put({ dag, tijd: tijd || Date.now(), staat: String(tekst) }); await klaar(t);
      const dagen = (await alle(db)).map(x => x.dag).sort().reverse(); // oudste weg, de laatste 14 blijven
      if (dagen.length > BEWAAR) { const t2 = db.transaction(STORE, 'readwrite'); dagen.slice(BEWAAR).forEach(d => t2.objectStore(STORE).delete(d)); await klaar(t2); }
      return true;
    } finally { db.close(); }
  }
  async function lijst() { const db = await open(); try { return (await alle(db)).map(x => ({ dag: x.dag, tijd: x.tijd, grootte: (x.staat || '').length })).sort((a, b) => a.dag < b.dag ? 1 : -1); } finally { db.close(); } }
  async function haal(dag) { const db = await open(); try { const r = await vraag(db.transaction(STORE).objectStore(STORE).get(dag)); if (!r) return null; try { return JSON.parse(r.staat); } catch (e) { return null; } } finally { db.close(); } }
  async function wis() { const db = await open(); try { const t = db.transaction(STORE, 'readwrite'); t.objectStore(STORE).clear(); await klaar(t); } finally { db.close(); } }
  return { maak, lijst, haal, wis, BEWAAR, DB };
});
