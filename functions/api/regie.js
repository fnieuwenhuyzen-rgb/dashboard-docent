// Regie op de tablet: het bord (de laptop, gespiegeld op het digibord) en de tablet van Frans praten via deze rij.
// Access laat alleen de eigenaar door; hier controleren we dat nog een keer met het token (whoAmI uit staat.js).
// Over deze lijn gaat alleen: welke les (les-id en rooster-uur), welke dia, en de stand van de groepjestimer. Geen namen,
// geen notities, geen leerlinggegevens: schoonStaat en schoonOpdracht laten alleen die velden door.
//   GET  /api/regie            { staat, ms, nu, laatste }: waar het bord is (staat null = geen bord open); laatste = hoogste opdrachtnummer
//   GET  /api/regie?na=n       hetzelfde plus { opdrachten: [{ nr, id, t, i, sec }] } met nummer > n, van de laatste minuut (het bord vraagt dit)
//   PUT  /api/regie            { staat } of { staat: null }: het bord zegt waar het is, of dat het dicht is
//   POST /api/regie            { opdracht: { id, t, i?, sec? } }: de tablet stuurt "volgende", "vorige", "ga", "timer", "pauze", "stop", "sluit"
import { whoAmI } from "./staat.js";

const OPDRACHTEN = ["volgende", "vorige", "ga", "timer", "pauze", "stop", "sluit"];
const BEWAAR_MS = 60000; // een opdracht die een minuut oud is, voert het bord niet meer uit

export async function onRequest({ request, env }) {
  if (!env.DB) return json({ fout: "geen opslag" }, 503);
  let email;
  try { email = await whoAmI(request, env); } catch (e) { return json({ fout: "niet ingelogd" }, 401); }
  if (email !== String(env.EIGENAAR || env.DEV_EMAIL).toLowerCase()) return json({ fout: "geen toegang" }, 403);
  if (!["GET", "PUT", "POST"].includes(request.method)) return json({ fout: "methode" }, 405);
  if (request.method !== "GET") { // een andere website mag hier niets sturen
    const herkomst = request.headers.get("Origin");
    if (herkomst && herkomst !== new URL(request.url).origin) return json({ fout: "geen toegang" }, 403);
  }
  await tabellen(env.DB);
  const db = env.DB, nu = Date.now();
  if (request.method === "GET") {
    const naRuw = new URL(request.url).searchParams.get("na");
    const [a, b] = await db.batch([db.prepare("SELECT staat, ms FROM regie WHERE id = 1"), db.prepare("SELECT COALESCE(MAX(nr), 0) AS laatste FROM regie_opdracht")]);
    const rij = a.results[0] || null; const uit = { staat: rij && rij.staat ? JSON.parse(rij.staat) : null, ms: rij ? rij.ms : 0, nu, laatste: b.results[0].laatste };
    if (naRuw !== null && /^\d+$/.test(naRuw)) {
      const { results } = await db.prepare("SELECT nr, opdracht FROM regie_opdracht WHERE nr > ? AND ms > ? ORDER BY nr").bind(+naRuw, nu - BEWAAR_MS).all();
      uit.opdrachten = results.map(r => Object.assign({ nr: r.nr }, JSON.parse(r.opdracht)));
    }
    return json(uit);
  }
  let body; try { body = await request.json(); } catch (e) { return json({ fout: "verzoek" }, 400); }
  if (request.method === "PUT") {
    if (!body || !("staat" in body)) return json({ fout: "verzoek" }, 400);
    const staat = body.staat === null ? null : schoonStaat(body.staat);
    if (body.staat !== null && !staat) return json({ fout: "verzoek" }, 400);
    await db.prepare("INSERT INTO regie (id, staat, ms) VALUES (1, ?, ?) ON CONFLICT (id) DO UPDATE SET staat = excluded.staat, ms = excluded.ms").bind(staat ? JSON.stringify(staat) : null, nu).run();
    return json({ ms: nu });
  }
  if (request.method === "POST") {
    const o = schoonOpdracht(body && body.opdracht);
    if (!o) return json({ fout: "verzoek" }, 400);
    const res = await db.batch([
      db.prepare("DELETE FROM regie_opdracht WHERE ms < ?").bind(nu - BEWAAR_MS),
      db.prepare("INSERT OR IGNORE INTO regie_opdracht (id, opdracht, ms) VALUES (?, ?, ?)").bind(o.id, JSON.stringify(o), nu) // hetzelfde id twee keer (opnieuw verstuurd) telt één keer
    ]);
    return json({ nieuw: res[1].meta.changes === 1 });
  }
  return json({ fout: "methode" }, 405);
}

let klaar = false;
async function tabellen(db) { // dezelfde tabellen als migrations/0002_regie.sql; zo werkt het ook als die migratie nog niet is uitgevoerd
  if (klaar) return;
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS regie (id INTEGER PRIMARY KEY CHECK (id = 1), staat TEXT, ms INTEGER NOT NULL DEFAULT 0)"),
    db.prepare("CREATE TABLE IF NOT EXISTS regie_opdracht (nr INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, opdracht TEXT NOT NULL, ms INTEGER NOT NULL)")
  ]);
  klaar = true;
}

const geheel = (x, min, max) => Number.isInteger(x) && x >= min && x <= max;
// Alleen deze velden; al het andere valt weg. Een veld met een verkeerde vorm maakt het hele verzoek ongeldig.
export function schoonStaat(x) {
  if (!x || typeof x !== "object") return null;
  const uit = {
    uid: x.uid, s: x.s, les: x.les, i: x.i, n: x.n, fb: x.fb || 0,
    klok: x.klok ? { tot: x.klok.tot, left: x.klok.left, eind: x.klok.eind || 0, loopt: x.klok.loopt === true } : null
  };
  // een gewone spatie mag: een Zermelo-uur zonder vast rooster heet z-<start>-<groep>, en de groep kan "kmu h3" zijn
  if (typeof uit.uid !== "string" || !/^[^\t\n\r\f\v<>"'&\\]{1,80}$/.test(uit.uid) || uit.uid.trim() !== uit.uid) return null;
  if (typeof uit.s !== "string" || !/^\d{4}-\d\d-\d\d$/.test(uit.s)) return null;
  if (typeof uit.les !== "string" || !/^[a-z0-9_-]{1,20}:[\w.-]{1,20}$/i.test(uit.les)) return null;
  if (!geheel(uit.i, 0, 500) || !geheel(uit.n, 1, 500) || uit.i >= uit.n || !geheel(uit.fb, 0, 9e15)) return null;
  if (uit.klok && (!geheel(uit.klok.tot, 0, 36000) || !geheel(uit.klok.left, -36000, 36000) || !geheel(uit.klok.eind, 0, 9e15))) return null;
  return uit;
}
export function schoonOpdracht(x) {
  if (!x || typeof x !== "object" || typeof x.id !== "string" || !/^[\w-]{6,40}$/.test(x.id) || !OPDRACHTEN.includes(x.t)) return null;
  const uit = { id: x.id, t: x.t };
  if (x.t === "ga") { if (!geheel(x.i, 0, 500)) return null; uit.i = x.i; }
  if (x.t === "timer") { if (!geheel(x.sec, 10, 7200)) return null; uit.sec = x.sec; }
  return uit;
}

const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
