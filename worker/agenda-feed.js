// Cloudflare Worker lesdag-agenda: geeft de agendafeed aan Outlook. Outlook kan niet inloggen, dus dit staat bewust niet achter Access.
// Hij kan één ding: met de geheime link het iCal-bestand lezen. Zijn database (lesdag-agenda) bevat alleen dat bestand en de link, geen leerlinggegevens.
// Online zetten: wrangler deploy -c worker/agenda-feed.toml

export default {
  async fetch(req, env) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('Alleen lezen', { status: 405 });
    const m = new URL(req.url).pathname.match(/^\/([0-9a-f]{64})\.ics$/);
    if (!m) return new Response('Niet gevonden', { status: 404 });
    let rij = null;
    try { rij = await env.DB.prepare('SELECT ics FROM feed WHERE id = 1 AND token = ?').bind(m[1]).first(); }
    catch (e) { return new Response('Niet gevonden', { status: 404 }); } // nog geen tabel: de feed is nooit aangezet
    if (!rij) return new Response('Niet gevonden', { status: 404 });
    return new Response(req.method === 'HEAD' ? null : rij.ics, {
      headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'private, max-age=300', 'X-Robots-Tag': 'noindex', 'Referrer-Policy': 'no-referrer' }
    });
  }
};
