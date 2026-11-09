/* Versies van de eigen staat. Elke staat die binnenkomt (localStorage, kopie, server, automatische kopie) gaat hier eerst doorheen:
   1. migreer: de migratieketen brengt een oude vorm stap voor stap naar het huidige schema (S.schema);
   2. schoon: onderdelen die er geldig uitzien maar binnenin kapot zijn (een taak zonder titel, een lijst waar een object hoort)
      worden aangepast of weggelaten, zodat geen scherm erop vastloopt. Onbekende velden blijven staan (een nieuwere versie van de app schrijft ze misschien).
   Nooit een uitzondering: niet te lezen is geen staat, dan komt de lege staat terug (het aanroepende stuk beslist of dat mag).
   Een nieuwe stap: voeg { naar: n+1, naam, doe(d) } toe aan STAPPEN en verhoog niets anders; SCHEMA volgt de lijst. */
(function (wortel, maak) { if (typeof module === 'object' && module.exports) module.exports = maak(); else wortel.STAAT = maak(); })(this, () => {
  const isObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const tekst = x => typeof x === 'string';
  const kloon = x => JSON.parse(JSON.stringify(x));

  /* De keten. Elke stap krijgt een eigen kopie en geeft de staat terug.
     Geschiedenis (git, public/app.js): zie handboek of tools/staten/ voor de vormen sinds 20-10-2026. */
  const STAPPEN = [
    { naar: 1, naam: 'vormen van vóór de versiemarkering (20 okt - 8 nov 2026)', doe(d) {
      // taken uit de eerste versies: titel en id kunnen ontbreken; de oude tempometingen (duur: per bron een lijst getallen) blijven voor herstelStaat in app.js
      if (Array.isArray(d.taken)) d.taken = d.taken.filter(isObj).map((k, i) => Object.assign({ id: 'oud' + i }, k));
      if (isObj(d.duur)) for (const b of Object.keys(d.duur)) if (!Array.isArray(d.duur[b])) delete d.duur[b];
      // vóór de Zermelo-API kon een rooster-uur een los getal als dag hebben als tekst
      if (Array.isArray(d.rooster)) d.rooster.forEach(u => { if (isObj(u) && u.dag !== undefined && typeof u.dag !== 'number') { const n = Number(u.dag); if (Number.isFinite(n)) u.dag = n; } });
      return d;
    } },
  ];
  const SCHEMA = STAPPEN[STAPPEN.length - 1].naar;

  /* ---- schoon: per onderdeel de vorm afdwingen, zonder het onderdeel zelf weg te gooien ---- */
  const tel = { n: 0 };
  const obj = (d, k) => { if (!isObj(d[k])) { if (d[k] !== undefined) tel.n++; d[k] = {}; } return d[k]; };
  const lijstObj = (d, k, ok) => { if (!Array.isArray(d[k])) { if (d[k] !== undefined) tel.n++; d[k] = []; return d[k]; } const w = d[k].filter(x => isObj(x) && (!ok || ok(x))); if (w.length !== d[k].length) tel.n++; d[k] = w; return w; };
  const mapWaarde = (o, f) => { for (const k of Object.keys(o)) { const v = f(o[k], k); if (v === undefined) { delete o[k]; tel.n++; } else o[k] = v; } };
  const alsObj = v => isObj(v) ? v : undefined;
  const alsTekst = v => tekst(v) ? v : undefined;
  const strLijst = v => Array.isArray(v) ? v.filter(tekst) : [];

  function schoon(d) {
    tel.n = 0;
    // schoon en dubbel testen: nieuweStaat() levert de basis; hier alleen de binnenvorm
    mapWaarde(obj(d, 'uitval'), v => strLijst(v));
    mapWaarde(obj(d, 'voortgang'), g => { if (!isObj(g)) return {}; mapWaarde(g, alsObj); return g; });
    mapWaarde(obj(d, 'les'), v => { if (!isObj(v)) return undefined; if (v.materiaal !== undefined && !(Array.isArray(v.materiaal) && v.materiaal.every(isObj))) delete v.materiaal; return v; });
    lijstObj(d, 'taken').forEach(k => { if (!tekst(k.titel)) k.titel = k.titel == null ? '' : String(k.titel); });
    mapWaarde(obj(d, 'dagTaken'), v => isObj(v) ? v : {});
    for (const k of ['sectieAf', 'koorAf', 'reclameAf', 'afLater', 'later', 'goed', 'klaarExtra', 'mag', 'magHw', 'minuten', 'schatStart', 'uitgesteld', 'afgesloten', 'reclame', 'duur']) obj(d, k);
    for (const k of ['sectieNotitie', 'taakNoot', 'rust']) mapWaarde(obj(d, k), alsTekst);
    mapWaarde(obj(d, 'groepLeergang'), alsTekst);
    mapWaarde(obj(d, 'afwezig'), v => isObj(v) ? (isObj(v.herstel) ? v : Object.assign(v, { herstel: {} })) : { herstel: {} });
    mapWaarde(obj(d, 'ankers'), g => { if (!isObj(g)) return {}; mapWaarde(g, alsObj); return g; });
    lijstObj(d, 'afwijkingen').forEach(a => { if (a.lesIds !== undefined && !Array.isArray(a.lesIds)) a.lesIds = []; });
    for (const k of ['sectieExtra', 'reclameExtra', 'pauzes', 'duurLog']) lijstObj(d, k);
    lijstObj(d, 'extraUren', x => tekst(x.s) && tekst(x.start) && tekst(x.eind) && tekst(x.groep));
    lijstObj(d, 'rollen', x => tekst(x.id)).forEach(r => { if (!tekst(r.naam)) r.naam = r.id; if (!tekst(r.uren)) r.uren = r.uren == null ? '' : String(r.uren); });
    lijstObj(d, 'potjes', x => tekst(x.id)).forEach(r => { if (!tekst(r.naam)) r.naam = r.id; if (!tekst(r.uren)) r.uren = r.uren == null ? '' : String(r.uren); });
    lijstObj(d, 'rooster', u => tekst(u.groep) && tekst(u.start) && tekst(u.eind)).forEach(u => { if (!tekst(u.id)) u.id = String(u.id == null ? u.groep + '-' + u.dag + '-' + u.start : u.id); if (u.lokaal != null && !tekst(u.lokaal)) u.lokaal = String(u.lokaal); });
    const b = obj(d, 'beoord');
    mapWaarde(obj(b, 'lijsten'), L => Array.isArray(L) ? L.filter(isObj).map(x => Object.assign({}, x, { id: x.id == null ? undefined : String(x.id), naam: tekst(x.naam) ? x.naam : '' })).filter(x => x.id !== undefined) : []);
    const rij = ll => { mapWaarde(ll, r => { if (!isObj(r)) r = {}; for (const k of ['s', 'v', 'opm']) if (!isObj(r[k])) r[k] = {}; return r; }); };
    mapWaarde(obj(b, 'toetsen'), t => { if (!isObj(t)) return undefined; if (!isObj(t.ll)) t.ll = {}; rij(t.ll); if (!Array.isArray(t.volgorde)) t.volgorde = []; if (t.herkans !== undefined) { if (!isObj(t.herkans)) delete t.herkans; else { if (!isObj(t.herkans.ll)) t.herkans.ll = {}; rij(t.herkans.ll); if (!Array.isArray(t.herkans.wie)) t.herkans.wie = []; } } return t; });
    return tel.n;
  }

  /* d: wat er binnenkomt (object, JSON-tekst of rommel); leeg: een nieuwe lege staat (nieuweStaat() van de app).
     Geeft { staat, van, naar, stappen:[namen], gerepareerd:n, nieuwer } en gooit nooit. */
  function migreer(d, leeg) {
    let x = d; if (tekst(x)) { try { x = JSON.parse(x); } catch (e) { x = null; } }
    const basis = isObj(leeg) ? leeg : {};
    if (!isObj(x)) return { staat: kloon(basis), van: null, naar: SCHEMA, stappen: [], gerepareerd: 0, nieuwer: false, leesbaar: false };
    x = kloon(x); // nooit de invoer zelf aanpassen
    const van = Number.isInteger(x.schema) && x.schema >= 0 ? x.schema : 0;
    const nieuwer = van > SCHEMA; const stappen = [];
    if (!nieuwer) for (const s of STAPPEN) if (s.naar > van) { try { x = s.doe(x) || x; stappen.push(s.naam); } catch (e) { /* een stap die struikelt laat de rest staan; schoon vangt de vorm */ } }
    // ontbrekende velden uit de lege staat (hetzelfde als vroeger Object.assign(nieuweStaat(), d)), maar elk veld een eigen kopie
    const uit = kloon(basis); for (const k of Object.keys(x)) if (x[k] !== null || !(k in uit)) uit[k] = x[k]; // een null is nooit een geldige waarde: dan geldt de standaard
    const n = schoon(uit);
    if (!nieuwer) uit.schema = SCHEMA; // een nieuwere schemaversie blijft zoals hij is: niet terugzetten naar een lager nummer
    return { staat: uit, van, naar: nieuwer ? van : SCHEMA, stappen, gerepareerd: n, nieuwer, leesbaar: true };
  }

  return { SCHEMA, STAPPEN, migreer, schoon, isObj };
});
