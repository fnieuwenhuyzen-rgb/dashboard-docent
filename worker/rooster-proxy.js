// Cloudflare Worker: haalt je Zermelo-rooster op voor Lesdag.
// Nodig omdat de browser Zermelo niet rechtstreeks mag lezen (CORS).
// De Worker kan drie dingen en verder niets: een koppelcode inwisselen, je eigen afspraken lezen, en je agenda (iCal) lezen.
// Hij antwoordt alleen aan jouw Lesdag-adres, bewaart niets en logt niets.

const LESDAG = 'https://lesdag-muziek.pages.dev'; // pas aan naar het adres van je Lesdag
const TESTADRES = /^https:\/\/[a-z0-9-]+\.lesdag-muziek\.pages\.dev$/; // proefversies op een eigen branch (alleen dit Pages-project kan daar staan)
const API = 'https://csgpm.zportal.nl/api/v3';
// Bewust zonder students: Lesdag heeft geen leerlingen uit Zermelo nodig.
const VELDEN = 'id,appointmentInstance,start,end,subjects,groups,locations,type,cancelled,valid,hidden,changeDescription,remark';
const MAX_BEREIK = 6 * 7 * 86400; // seconden

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
    const json = (data, status = 200) => new Response(JSON.stringify(data), {
      status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
    });

    if (body.actie === 'koppel') {
      const code = String(body.code || '').replace(/\s/g, '');
      if (!/^[A-Za-z0-9]{6,32}$/.test(code)) return json({ fout: 'Ongeldige koppelcode' }, 400);
      const r = await fetch(API + '/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body: new URLSearchParams({ grant_type: 'authorization_code', code }).toString()
      });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d || !d.access_token) return json({ fout: 'Zermelo weigert de koppelcode. Een code werkt maar één keer: maak een nieuwe aan.' }, r.ok ? 502 : r.status);
      return json({ token: d.access_token, verloopt: d.expires_in || null });
    }

    if (body.actie === 'afspraken') {
      const token = String(body.token || '');
      if (!/^[A-Za-z0-9]{10,128}$/.test(token)) return json({ fout: 'Ongeldige koppeling' }, 400);
      const van = parseInt(body.van, 10), tot = parseInt(body.tot, 10);
      if (!van || !tot || tot <= van || tot - van > MAX_BEREIK) return json({ fout: 'Ongeldige periode' }, 400);
      const url = API + '/appointments?user=~me&valid=true&start=' + van + '&end=' + tot + '&fields=' + VELDEN;
      const r = await fetch(url, { headers: { Accept: 'application/json', Authorization: 'Bearer ' + token } });
      const d = await r.json().catch(() => null);
      const antw = d && d.response;
      if (!r.ok || !antw) return json({ fout: (antw && antw.message) || 'Zermelo antwoordt ' + r.status }, r.ok ? 502 : r.status);
      return json({ afspraken: antw.data || [] });
    }

    const token = String(body.token || '');
    if (!/^[A-Za-z0-9]{10,64}$/.test(token)) return new Response('Ongeldige link', { status: 400, headers: cors });
    const weken = Math.min(Math.max(parseInt(body.weken, 10) || 2, 1), 6);

    const url = API + '/ical?access_token=' + encodeURIComponent(token) +
      '&startWeekOffset=0&endWeekOffset=' + (weken - 1) + '&valid=true&user=~me';
    const r = await fetch(url, { headers: { Accept: 'text/calendar' } });
    const txt = await r.text();
    return new Response(txt, {
      status: r.status,
      headers: { ...cors, 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'no-store' }
    });
  }
};
