// Synchronisatie van de staat van Lesdag. Access laat alleen de eigenaar door; hier controleren we dat nog een keer met het token.
//   GET  /api/staat            alles: { versie, bijgewerkt, onderdelen }
//   GET  /api/staat?sinds=n    alleen { versie, bijgewerkt }: goedkope controle of er iets nieuws is
//   GET  /api/staat?backups=1  { dagen: [...] }
//   GET  /api/staat?backup=d   { onderdelen } van die back-up
//   GET  /api/staat?leerlingen=1  { onderdelen, back_ups }: hoeveel rijen met klassenlijsten en scores er staan
//   DELETE /api/staat?leerlingen=1  haalt alle klassenlijsten en scores weg, ook uit de back-ups: { onderdelen, back_ups }
//   GET  /api/staat?eerste=1  { rijen }: rijen in back-up "eerste";  DELETE ?eerste=1 wist die back-up
//   PUT  /api/staat            { basis, gewijzigd: { sleutel: waarde of null } } -> { versie }, of 409 als basis niet de laatste versie is
const MAX_RIJ = 1900000; // D1 staat 2 MB per rij toe
const BEWAAR_DAGEN = 30;

export async function onRequest({ request, env }) {
  if (!env.DB) return json({ fout: "geen opslag" }, 503);
  let email;
  try { email = await whoAmI(request, env); } catch (e) { return json({ fout: "niet ingelogd" }, 401); }
  if (email !== String(env.EIGENAAR || env.DEV_EMAIL).toLowerCase()) return json({ fout: "geen toegang" }, 403);
  if (request.method === "GET") { try { return await lees(new URL(request.url).searchParams, env); } catch (e) { if (e instanceof Beschadigd) return json({ fout: "beschadigd", sleutel: e.sleutel }, 500); throw e; } }
  if (request.method === "PUT") return schrijf(await request.json(), env);
  if (request.method === "DELETE") {
    // een andere website mag hier niets wissen: een DELETE met cookie van een andere herkomst wordt geweigerd
    const herkomst = request.headers.get("Origin");
    if (herkomst && herkomst !== new URL(request.url).origin) return json({ fout: "geen toegang" }, 403);
    return wis(new URL(request.url).searchParams, env);
  }
  return json({ fout: "methode" }, 405);
}

async function lees(q, env) {
  if (q.get("leerlingen")) {
    const [a, b] = await env.DB.batch([env.DB.prepare("SELECT COUNT(*) n FROM onderdeel WHERE sleutel LIKE ?").bind(LEERLING), env.DB.prepare("SELECT COUNT(*) n FROM back_up WHERE sleutel LIKE ?").bind(LEERLING)]);
    return json({ onderdelen: a.results[0].n, back_ups: b.results[0].n });
  }
  if (q.get("eerste")) return json({ rijen: (await env.DB.prepare("SELECT COUNT(*) n FROM back_up WHERE dag = 'eerste'").first()).n });
  if (q.get("backups")) {
    const { results } = await env.DB.prepare("SELECT dag FROM back_up GROUP BY dag ORDER BY dag DESC").all();
    return json({ dagen: results.map(r => r.dag) });
  }
  if (q.get("backup")) {
    const { results } = await env.DB.prepare("SELECT sleutel, waarde FROM back_up WHERE dag = ?").bind(q.get("backup")).all();
    return json({ onderdelen: rijen(results) });
  }
  if (q.get("sinds") !== null) return json(await env.DB.prepare("SELECT versie, bijgewerkt FROM meta WHERE id = 1").first());
  // in één batch, zodat versie en onderdelen bij elkaar horen
  const [a, b] = await env.DB.batch([env.DB.prepare("SELECT versie, bijgewerkt FROM meta WHERE id = 1"), env.DB.prepare("SELECT sleutel, waarde FROM onderdeel")]);
  return json({ ...a.results[0], onderdelen: rijen(b.results) });
}

// Alles wat onder beoord valt is leerlinggegevens (lijsten, weg, toetsen.*): sleutels "beoord.%". Wissen telt de versie op, zodat andere apparaten het zien.
const LEERLING = "beoord.%";
async function wis(q, env) {
  const db = env.DB;
  if (q.get("eerste")) {
    const n = (await db.prepare("DELETE FROM back_up WHERE dag = 'eerste'").run()).meta.changes;
    return json({ rijen: n });
  }
  if (!q.get("leerlingen")) return json({ fout: "verzoek" }, 400);
  const nu = Date.now();
  const res = await db.batch([
    db.prepare("DELETE FROM onderdeel WHERE sleutel LIKE ?").bind(LEERLING),
    db.prepare("DELETE FROM back_up WHERE sleutel LIKE ?").bind(LEERLING),
    db.prepare("UPDATE meta SET versie = versie + 1, bijgewerkt = ?, schrijver = NULL WHERE id = 1").bind(nu)
  ]);
  return json({ onderdelen: res[0].meta.changes, back_ups: res[1].meta.changes });
}

async function schrijf({ basis, gewijzigd }, env) {
  if (!Number.isInteger(basis) || !gewijzigd || typeof gewijzigd !== "object") return json({ fout: "verzoek" }, 400);
  const paren = Object.entries(gewijzigd).map(([k, v]) => [k, v === null ? null : JSON.stringify(v)]);
  const teGroot = paren.find(([k, w]) => w && new TextEncoder().encode(w).length > MAX_RIJ);
  if (teGroot) return json({ fout: "te groot", sleutel: teGroot[0] }, 413);
  const db = env.DB, nu = Date.now(), ik = crypto.randomUUID(), dag = new Date(nu).toISOString().slice(0, 10);
  const oud = new Date(nu - BEWAAR_DAGEN * 864e5).toISOString().slice(0, 10);
  const vanMij = "(SELECT schrijver FROM meta WHERE id = 1) = ?";
  const res = await db.batch([
    db.prepare("UPDATE meta SET versie = versie + 1, bijgewerkt = ?, schrijver = ? WHERE id = 1 AND versie = ?").bind(nu, ik, basis),
    // de stand van vóór de eerste wijziging van vandaag
    db.prepare(`INSERT OR IGNORE INTO back_up (dag, sleutel, waarde) SELECT ?, sleutel, waarde FROM onderdeel WHERE ${vanMij} AND NOT EXISTS (SELECT 1 FROM back_up WHERE dag = ?)`).bind(dag, ik, dag),
    db.prepare("DELETE FROM back_up WHERE dag < ? AND dag <> 'eerste'").bind(oud),
    ...paren.map(([k, w]) => w === null
      ? db.prepare(`DELETE FROM onderdeel WHERE sleutel = ? AND ${vanMij}`).bind(k, ik)
      : db.prepare(`INSERT INTO onderdeel (sleutel, waarde) SELECT ?, ? WHERE ${vanMij} ON CONFLICT (sleutel) DO UPDATE SET waarde = excluded.waarde`).bind(k, w, ik)),
    db.prepare(`INSERT OR IGNORE INTO back_up (dag, sleutel, waarde) SELECT 'eerste', sleutel, waarde FROM onderdeel WHERE ? = 0 AND ${vanMij}`).bind(basis, ik)
  ]);
  const m = await db.prepare("SELECT versie, bijgewerkt FROM meta WHERE id = 1").first();
  return json(m, res[0].meta.changes === 1 ? 200 : 409);
}

// een rij die geen JSON is: nooit overslaan (de client zou dat als "verwijderd" lezen), maar stoppen met een eigen foutmelding
class Beschadigd extends Error { constructor(sleutel) { super("beschadigd"); this.sleutel = sleutel; } }
const rijen = L => Object.fromEntries(L.map(r => { try { return [r.sleutel, JSON.parse(r.waarde)]; } catch (e) { throw new Beschadigd(r.sleutel); } }));
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

/* ---- Access-token controleren (zelfde aanpak als de Koorapp) ---- */
let keyCache = { at: 0, keys: {} };

export async function whoAmI(request, env) {
  // Alleen lokaal (wrangler pages dev --binding DEV_EMAIL=...) mag een vast testadres gebruikt worden.
  const host = new URL(request.url).hostname;
  if (env.DEV_EMAIL && (host === "localhost" || host === "127.0.0.1")) return env.DEV_EMAIL.toLowerCase();

  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) throw new Error("geen token");
  const [h, p, s] = token.split(".");
  const header = JSON.parse(b64text(h)), payload = JSON.parse(b64text(p));
  const key = await accessKey(env, header.kid);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64bytes(s), new TextEncoder().encode(h + "." + p));
  if (!ok) throw new Error("handtekening");
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.includes(env.ACCESS_AUD)) throw new Error("aud");
  if (payload.iss !== env.ACCESS_TEAM) throw new Error("iss");
  if (!payload.exp || payload.exp * 1000 < Date.now()) throw new Error("verlopen");
  if (!payload.email) throw new Error("geen e-mail");
  return String(payload.email).toLowerCase();
}

async function accessKey(env, kid) {
  if (!keyCache.keys[kid] || Date.now() - keyCache.at > 3600e3) {
    const res = await fetch(env.ACCESS_TEAM + "/cdn-cgi/access/certs");
    const { keys } = await res.json();
    const out = {};
    for (const jwk of keys) out[jwk.kid] = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    keyCache = { at: Date.now(), keys: out };
  }
  const k = keyCache.keys[kid];
  if (!k) throw new Error("onbekende sleutel");
  return k;
}

const b64bytes = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=")), c => c.charCodeAt(0));
const b64text = s => new TextDecoder().decode(b64bytes(s));
