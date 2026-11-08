/* Synchronisatie tussen apparaten. De app blijft werken vanuit localStorage; dit loopt daar los bovenop, ook na een tijd zonder verbinding.
   Elk apparaat onthoudt de laatst gesynchroniseerde versie (basis, in IndexedDB) en vergelijkt die met zijn eigen staat en die van de server.
   Zo zijn wijzigingen van beide kanten te herkennen en blijven ze bewaard, zonder dat de rest van de app iets hoeft bij te houden. */
(function (wortel, maak) { if (typeof module === 'object' && module.exports) module.exports = maak(); else wortel.SYNC = maak(); })(this, () => {
  const isObj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
  const kloon = x => x === undefined ? undefined : JSON.parse(JSON.stringify(x));
  function gelijk(a, b) {
    if (a === b) return true;
    if (Array.isArray(a)) return Array.isArray(b) && a.length === b.length && a.every((x, i) => gelijk(x, b[i]));
    if (!isObj(a) || !isObj(b)) return false;
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (!gelijk(a[k], b[k])) return false;
    return true;
  }
  const heeftIds = L => Array.isArray(L) && L.every(x => isObj(x) && x.id != null) && new Set(L.map(x => x.id)).size === L.length;

  /* b: laatst gemeenschappelijk; l: dit apparaat; s: server. opt.lokaalNieuwer beslist bij hetzelfde veld op twee plekken.
     opt.zonderBasis: twee bronnen die elkaar nog nooit zagen (Edge, Chrome, tablet): dan wint aan (true) van uit, zodat afgevinkte taken niet terugkomen. */
  function samenvoegen(b, l, s, opt = {}) {
    if (gelijk(l, s)) return l;
    if (gelijk(l, b)) return s;
    if (gelijk(s, b)) return l;
    if (l === undefined) return s; // de een verwijderde, de ander bewerkte: de bewerking wint
    if (s === undefined) return l;
    if (isObj(l) && isObj(s)) {
      const u = {}, B = isObj(b) ? b : {};
      for (const k of new Set([...Object.keys(l), ...Object.keys(s)])) { const v = samenvoegen(B[k], l[k], s[k], opt); if (v !== undefined) u[k] = v; }
      return u;
    }
    if (heeftIds(l) && heeftIds(s)) {
      const B = heeftIds(b) ? b : [], vind = (L, id) => L.find(x => x.id === id), u = [];
      for (const x of [...l, ...s.filter(y => !vind(l, y.id))]) { const v = samenvoegen(vind(B, x.id), vind(l, x.id), vind(s, x.id), opt); if (v !== undefined) u.push(v); }
      return u;
    }
    if (Array.isArray(l) && Array.isArray(s)) { // lijst zonder ids (minutenlog, krabbels): bewaar wat erbij kwam, haal weg wat de ander weghaalde
      const B = Array.isArray(b) ? b : [], in_ = (L, x) => L.some(y => gelijk(x, y));
      return [...l.filter(x => !(in_(B, x) && !in_(s, x))), ...s.filter(x => !in_(B, x) && !in_(l, x))];
    }
    if (opt.zonderBasis && typeof l === 'boolean' && typeof s === 'boolean') return l || s;
    return opt.lokaalNieuwer ? l : s;
  }

  /* per onderdeel een rij op de server: alleen wat wijzigde gaat over de lijn, en de toetsen (met krabbels) blijven elk onder de rijlimiet */
  const TOETS = 'beoord.toetsen.';
  function delen(doc) {
    const d = {};
    for (const [k, v] of Object.entries(doc)) {
      if (k !== 'beoord' || !isObj(v)) { if (v !== undefined) d[k] = v; continue; }
      for (const [b, w] of Object.entries(v)) {
        if (b === 'toetsen' && isObj(w)) for (const [t, x] of Object.entries(w)) d[TOETS + t] = x;
        else if (w !== undefined) d['beoord.' + b] = w;
      }
    }
    return d;
  }
  function samen(d) {
    const doc = {};
    for (const [k, v] of Object.entries(d || {})) {
      if (k.startsWith(TOETS)) { const b = doc.beoord = doc.beoord || {}; (b.toetsen = b.toetsen || {})[k.slice(TOETS.length)] = v; }
      else if (k.startsWith('beoord.')) (doc.beoord = doc.beoord || {})[k.slice(7)] = v;
      else doc[k] = v;
    }
    return doc;
  }
  function verschil(nieuw, oud) { // wat naar de server moet om van oud naar nieuw te komen; null = weghalen
    const n = delen(nieuw), o = delen(oud), g = {};
    for (const k of new Set([...Object.keys(n), ...Object.keys(o)])) if (!gelijk(n[k], o[k])) g[k] = n[k] === undefined ? null : n[k];
    return g;
  }
  const leegWaarde = x => x == null || x === '' || x === 0 || x === false || (Array.isArray(x) ? x.every(leegWaarde) : isObj(x) && Object.values(x).every(leegWaarde));
  const NIET_MEETELLEN = ['v', 'magVanaf']; // zet de app zelf bij de eerste start
  const leeg = doc => Object.entries(doc || {}).every(([k, x]) => NIET_MEETELLEN.includes(k) || leegWaarde(x));
  const telling = d => ({ taken: (d.taken || []).length, rooster: (d.rooster || []).length, klassen: Object.keys((d.beoord || {}).lijsten || {}).length, toetsen: Object.keys((d.beoord || {}).toetsen || {}).length });

  /* app: { haal(): doc, zet(doc), mag(): mag er nu gesynchroniseerd worden, status(soort, tekst), nieuwer(ms): is de staat nieuwer dan ms, kopie(): download }
     opslag: { haal(k), zet(k, v) } voor de basis; vlag: { aan(), zet() } onthoudt op dit apparaat dat synchroniseren aanstaat */
  function maak({ app, opslag, vlag, fetch: f, url = 'api/staat', slot }) {
    let timer = null, nogEens = false;
    class Stop extends Error { constructor(soort) { super(soort); this.soort = soort; } }
    async function vraag(pad, init = {}) {
      let r;
      try { r = await f(url + pad, { credentials: 'same-origin', redirect: 'manual', cache: 'no-store', ...init }); }
      catch (e) { throw new Stop('offline'); }
      if (r.type === 'opaqueredirect' || r.status === 401 || r.status === 403 || (r.status >= 300 && r.status < 400)) throw new Stop('login');
      if (r.status === 503) throw new Stop('uit');
      if (r.status === 409) return { conflict: true };
      if (!r.ok) throw new Stop(r.status === 413 ? 'tegroot' : 'fout');
      return r.json();
    }
    function controleer(doc) { if (app.fouten && app.fouten(doc).length) throw new Stop('kapot'); }
    const haalAlles = async () => { const a = await vraag(''); return { versie: a.versie, bijgewerkt: a.bijgewerkt, doc: samen(a.onderdelen) }; };
    const stuur = (basis, gewijzigd, keepalive) => { const body = JSON.stringify({ basis, gewijzigd }); return vraag('', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body, keepalive: !!keepalive && body.length < 60000 }); };
    function meld(e) {
      if (!(e instanceof Stop)) { console.warn(e); app.status('fout', 'Synchroniseren mislukt, staat op dit apparaat'); return; }
      if (e.soort === 'offline') app.status('', 'Offline, staat op dit apparaat');
      else if (e.soort === 'login') app.status('fout login', 'Opnieuw inloggen');
      else if (e.soort === 'uit') app.status('', 'Op dit apparaat');
      else if (e.soort === 'leeg') app.status('fout', 'Die back-up is leeg, er is niets teruggezet');
      else if (e.soort === 'kapot') app.status('fout', 'Gegevens op de server zijn beschadigd, niets overgenomen');
      else if (e.soort === 'tegroot') app.status('fout', 'Te groot om te synchroniseren, staat op dit apparaat');
      else app.status('fout', 'Server niet bereikbaar, staat op dit apparaat');
    }
    // wat er tijdens het netwerkverkeer op dit apparaat veranderde, blijft staan
    function pasToe(voor, doc) {
      const nu = kloon(app.haal()); if (!gelijk(nu, voor)) nogEens = true;
      const d = gelijk(nu, voor) ? doc : samenvoegen(voor, nu, doc, { lokaalNieuwer: true });
      if (!gelijk(nu, d)) app.zet(d);
    }

    async function ronde(keepalive) {
      for (let poging = 0; poging < 4; poging++) {
        const basis = (await opslag.haal('basis')) || { versie: 0, doc: {} };
        const lokaal = kloon(app.haal());
        const kort = await vraag('?sinds=' + basis.versie);
        const server = kort.versie === basis.versie ? { versie: basis.versie, bijgewerkt: kort.bijgewerkt, doc: basis.doc } : await haalAlles();
        /* twee situaties waarin "wat de ander weghaalde" een ramp is, geen wens:
           - dit apparaat is zijn eigen staat kwijt (leeg beginnen, wissen) maar de basis weet nog beter: de server geeft alles terug, er wordt niets weggehaald;
           - de server is leeg of ouder dan de basis (nieuwe of teruggezette database): dan telt de basis niet en blijft alles van dit apparaat bewaard, ook wat de server mist. */
        const kwijt = leeg(lokaal) && !leeg(basis.doc);
        const serverTerug = !kwijt && !leeg(basis.doc) && (leeg(server.doc) || server.versie < basis.versie);
        const doc = kwijt ? server.doc : samenvoegen(serverTerug ? {} : basis.doc, lokaal, server.doc, { lokaalNieuwer: serverTerug || app.nieuwer(server.bijgewerkt), zonderBasis: serverTerug });
        const g = verschil(doc, server.doc);
        let versie = server.versie;
        if (Object.keys(g).length) { const r = await stuur(server.versie, g, keepalive); if (r.conflict) continue; versie = r.versie; }
        await opslag.zet('basis', { versie, doc });
        pasToe(lokaal, doc);
        return;
      }
      throw new Error('te veel botsingen');
    }
    const opSlot = fn => slot ? slot(fn) : fn();
    async function nu(keepalive) {
      if (!vlag.aan()) return;
      if (!app.mag()) { later(10000); return; }
      await opSlot(async () => {
        app.status('bezig', 'Synchroniseren…');
        try { await ronde(keepalive); app.status('ok', 'Gesynchroniseerd'); }
        catch (e) { meld(e); }
      });
      if (nogEens) { nogEens = false; later(1000); }
    }
    function later(ms) { clearTimeout(timer); timer = setTimeout(() => nu(), ms); }
    function gewijzigd() { if (vlag.aan()) { app.status('bezig', 'Wachten op synchroniseren…'); later(2500); } }

    /* eerste keer op dit apparaat: eerst een kopie, dan samenvoegen, terugvragen en vergelijken. Pas daarna staat het aan. */
    async function aanzetten() {
      return opSlot(async () => {
        const lokaal = kloon(app.haal());
        const server = await haalAlles();
        const hadData = !leeg(lokaal);
        if (hadData) { await opslag.zet('voor-sync', { op: Date.now(), doc: lokaal }); await app.kopie(); }
        const doc = !hadData ? server.doc : leeg(server.doc) ? lokaal : samenvoegen({}, lokaal, server.doc, { zonderBasis: true, lokaalNieuwer: app.nieuwer(server.bijgewerkt) });
        const g = verschil(doc, server.doc);
        const r = Object.keys(g).length ? await stuur(server.versie, g) : { versie: server.versie };
        if (r.conflict) throw new Stop('fout');
        const terug = await haalAlles();
        if (!gelijk(delen(terug.doc), delen(kloon(doc)))) throw new Error('de server gaf iets anders terug');
        await opslag.zet('basis', { versie: terug.versie, doc: terug.doc });
        vlag.zet();
        pasToe(lokaal, doc);
        app.status('ok', 'Gesynchroniseerd');
        return { hier: telling(lokaal), server: telling(server.doc), samen: telling(doc) };
      });
    }
    /* bij het starten: staat het aan, synchroniseer. Een nieuw, leeg apparaat neemt de server vanzelf over; een apparaat met eigen gegevens wacht op de knop. */
    async function start() {
      if (vlag.aan()) return nu();
      try {
        const s = await vraag('?sinds=0');
        if (s.versie > 0 && leeg(kloon(app.haal()))) { await aanzetten(); return; }
        app.status('', s.versie > 0 || !leeg(kloon(app.haal())) ? 'Nog niet gekoppeld' : 'Op dit apparaat');
      } catch (e) { meld(e); }
    }
    const backups = async () => (await vraag('?backups=1')).dagen;
    /* een back-up die leeg of beschadigd is mag nooit als staat terugkomen: de app zet hem op al je apparaten neer */
    const backup = async dag => { const d = samen((await vraag('?backup=' + encodeURIComponent(dag))).onderdelen); if (leeg(d)) throw new Stop('leeg'); controleer(d); return d; };
    const stop = () => { clearTimeout(timer); nogEens = false; }; // voor de tests: geen verdwaalde timer na afloop
    return { stop, nu, later, gewijzigd, aanzetten, start, backups, backup, meld, aan: () => vlag.aan() };
  }

  /* kleine opslag in IndexedDB: de basis kan even groot zijn als de staat zelf en past dan niet meer naast de staat in localStorage */
  function idbOpslag() {
    let p = null;
    const db = () => p || (p = new Promise((ok, nee) => { const q = indexedDB.open('lesdag-sync', 1); q.onupgradeneeded = () => q.result.createObjectStore('kv'); q.onsuccess = () => ok(q.result); q.onerror = () => nee(q.error); }));
    const tx = (modus, fn) => db().then(d => new Promise((ok, nee) => { const t = d.transaction('kv', modus); const r = fn(t.objectStore('kv')); t.oncomplete = () => ok(r.result); t.onerror = () => nee(t.error); }));
    return { haal: k => tx('readonly', s => s.get(k)), zet: (k, v) => tx('readwrite', s => s.put(v, k)) };
  }
  return { samenvoegen, gelijk, delen, samen, verschil, leeg, telling, maak, idbOpslag };
});
