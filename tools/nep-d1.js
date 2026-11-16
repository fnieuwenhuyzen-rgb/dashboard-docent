// Nagebootste D1 voor lokaal testen: dezelfde aanroepen als Cloudflare D1 (prepare/bind/first/all/run, batch, exec),
// op een SQLite-database in het geheugen (node:sqlite, Node 22.5 of nieuwer). Alleen voor tools: serve-lokaal.js --api en test-regie.js.
// De migraties uit migrations/ worden bij het maken uitgevoerd, zodat de tabellen er zijn zoals op de echte database.
const fs = require('fs'), path = require('path');
const { DatabaseSync } = require('node:sqlite');

function nepD1(migraties = path.join(__dirname, '..', 'migrations')) {
  const db = new DatabaseSync(':memory:');
  if (migraties) fs.readdirSync(migraties).filter(f => f.endsWith('.sql')).sort().forEach(f => db.exec(fs.readFileSync(path.join(migraties, f), 'utf8')));
  const leest = sql => /^\s*(SELECT|WITH|PRAGMA)\b/i.test(sql) || /\bRETURNING\b/i.test(sql);
  function stmt(sql, params = []) {
    const s = {
      sql, params,
      bind: (...p) => stmt(sql, p),
      async first(kol) { const r = db.prepare(sql).get(...params); return r == null ? null : kol ? r[kol] : { ...r }; },
      async all() { return { results: db.prepare(sql).all(...params).map(r => ({ ...r })), meta: { changes: 0 } }; },
      async run() { return uitvoer(); }
    };
    function uitvoer() {
      if (leest(sql)) return { results: db.prepare(sql).all(...params).map(r => ({ ...r })), meta: { changes: 0 } };
      const r = db.prepare(sql).run(...params); return { results: [], meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } };
    }
    s._uitvoer = uitvoer;
    return s;
  }
  return {
    prepare: sql => stmt(sql),
    async batch(L) { // ondeelbaar, zoals D1
      db.exec('BEGIN');
      try { const uit = L.map(s => s._uitvoer()); db.exec('COMMIT'); return uit; } catch (e) { db.exec('ROLLBACK'); throw e; }
    },
    async exec(sql) { db.exec(sql); return { count: 1 }; },
    _db: db
  };
}
module.exports = { nepD1 };
