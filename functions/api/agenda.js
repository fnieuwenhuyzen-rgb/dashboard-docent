// De agendafeed voor Outlook, achter Access. Alleen de eigenaar schrijft hier. De worker lesdag-agenda leest dezelfde database zonder login.
// AGENDA is bewust een eigen database, los van lesdag-sync: de openbare worker kan zo nooit bij klassenlijsten of scores.
//   GET    /api/agenda  { aan, token, bijgewerkt }
//   POST   /api/agenda  maakt de geheime link, of een nieuwe (de oude werkt dan niet meer): { aan, token, bijgewerkt }
//   PUT    /api/agenda  { ics }: de nieuwe inhoud
//   DELETE /api/agenda  stopt de feed en wist de inhoud
import { whoAmI } from "./staat.js";

const MAX_ICS = 1500000;
const TABEL = "CREATE TABLE IF NOT EXISTS feed (id INTEGER PRIMARY KEY CHECK (id = 1), token TEXT NOT NULL, ics TEXT NOT NULL, bijgewerkt INTEGER NOT NULL)";
const LEEG = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Lesdag//Agendafeed//NL\r\nX-WR-CALNAME:Lesdag\r\nEND:VCALENDAR\r\n";

export async function onRequest({ request, env }) {
  if (!env.AGENDA) return json({ fout: "geen opslag" }, 503);
  let email;
  try { email = await whoAmI(request, env); } catch (e) { return json({ fout: "niet ingelogd" }, 401); }
  if (email !== String(env.EIGENAAR || env.DEV_EMAIL).toLowerCase()) return json({ fout: "geen toegang" }, 403);
  const db = env.AGENDA;
  await db.prepare(TABEL).run();
  const stand = async () => {
    const r = await db.prepare("SELECT token, bijgewerkt FROM feed WHERE id = 1").first();
    return r ? { aan: true, token: r.token, bijgewerkt: r.bijgewerkt } : { aan: false };
  };

  if (request.method === "GET") return json(await stand());
  if (request.method === "POST") {
    const token = [...crypto.getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2, "0")).join("");
    await db.prepare("INSERT INTO feed (id, token, ics, bijgewerkt) VALUES (1, ?, ?, ?) ON CONFLICT (id) DO UPDATE SET token = excluded.token").bind(token, LEEG, Date.now()).run();
    return json(await stand());
  }
  if (request.method === "PUT") {
    const { ics } = await request.json().catch(() => ({}));
    if (typeof ics !== "string" || !ics.startsWith("BEGIN:VCALENDAR") || !ics.trimEnd().endsWith("END:VCALENDAR")) return json({ fout: "verzoek" }, 400);
    if (new TextEncoder().encode(ics).length > MAX_ICS) return json({ fout: "te groot" }, 413);
    const res = await db.prepare("UPDATE feed SET ics = ?, bijgewerkt = ? WHERE id = 1").bind(ics, Date.now()).run();
    if (res.meta.changes !== 1) return json({ fout: "feed staat uit" }, 409);
    return json(await stand());
  }
  if (request.method === "DELETE") {
    await db.prepare("DELETE FROM feed WHERE id = 1").run();
    return json({ aan: false });
  }
  return json({ fout: "methode" }, 405);
}

const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
