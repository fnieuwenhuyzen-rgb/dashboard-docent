// Cloudflare Worker: haalt je Zermelo-agenda op voor Lesdag.
// Nodig omdat de browser de Zermelo-link niet rechtstreeks mag lezen (CORS).
// De Worker stuurt alleen door naar de agenda van csgpm.zportal.nl en antwoordt alleen aan jouw Lesdag-adres.

const LESDAG = 'https://lesdag-muziek.pages.dev'; // pas aan naar het adres van je Lesdag
const TESTADRES = /^https:\/\/[a-z0-9-]+\.lesdag-muziek\.pages\.dev$/; // proefversies op een eigen branch (alleen dit Pages-project kan daar staan)

export default {
  async fetch(req) {
    const origin = req.headers.get('Origin') || '';
    const toegestaan = origin === LESDAG || TESTADRES.test(origin) || /^http:\/\/localhost(:\d+)?$/.test(origin);
    const cors = {
      'Access-Control-Allow-Origin': toegestaan ? origin : LESDAG,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin'
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (!toegestaan) return new Response('Niet toegestaan', { status: 403, headers: cors });
    if (req.method !== 'POST') return new Response('Alleen POST', { status: 405, headers: cors });

    let body;
    try { body = await req.json(); } catch (e) { return new Response('Ongeldig verzoek', { status: 400, headers: cors }); }
    const token = String(body.token || '');
    if (!/^[A-Za-z0-9]{10,64}$/.test(token)) return new Response('Ongeldige link', { status: 400, headers: cors });
    const weken = Math.min(Math.max(parseInt(body.weken, 10) || 2, 1), 6);

    const url = 'https://csgpm.zportal.nl/api/v3/ical?access_token=' + encodeURIComponent(token) +
      '&startWeekOffset=0&endWeekOffset=' + (weken - 1) + '&valid=true&user=~me';
    const r = await fetch(url, { headers: { Accept: 'text/calendar' } });
    const txt = await r.text();
    return new Response(txt, {
      status: r.status,
      headers: { ...cors, 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'no-store' }
    });
  }
};
