/* Lesmodus: de presentatie voor het digibord.
   Een les heeft een vaste boog: jouw kaart (voor de les) → welkom met lesvraag en agenda → doel en succescriteria →
   per fase een eigen slide (soort, kop voor de leerlingen, stappen, beeld, timer) → check → rode draad → thuis → afronden.
   Fasen zijn tekstregels ("10 min · instructie: …") of objecten {min, soort, kop, stappen[], docent, klaar, beeld}. */
(function () {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  // ---------- fasesoorten ----------
  const SOORT = {
    start:     { naam: 'Opening',   kleur: '#0f766e', zacht: '#99f6e4', re: /opwarm|^start|welkom|binnenkomst/i },
    luisteren: { naam: 'Luisteren', kleur: '#1d4ed8', zacht: '#bfdbfe', re: /luister|kijk|video|beluister|fragment/i },
    uitleg:    { naam: 'Uitleg',    kleur: '#6d28d9', zacht: '#ddd6fe', re: /instructie|uitleg|demonstr|modell|voorkennis/i },
    doen:      { naam: 'Aan de slag', kleur: '#15803d', zacht: '#bbf7d0', re: /^doen|oefen|spelen|maken|groep|repet|samenspel|zingen|opnem|werk/i },
    gesprek:   { naam: 'Gesprek',   kleur: '#c2410c', zacht: '#fed7aa', re: /gesprek|bespreek|kiezen|stemmen|rondje|delen|terugkoppel/i },
    check:     { naam: 'Check',     kleur: '#b45309', zacht: '#fde68a', re: /check|quiz|exit|toets|wisbord|duimen|overhor/i },
    afsluiten: { naam: 'Afsluiting', kleur: '#be123c', zacht: '#fecdd3', re: /afsluit|afrond|terugblik|opruim|vooruitblik|checklist/i }
  };
  const ICOON = {
    start: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
    luisteren: '<path d="M4 14v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="13" width="4" height="7" rx="1.5"/><rect x="17" y="13" width="4" height="7" rx="1.5"/>',
    uitleg: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1.1 2.2h5c.1-1 .5-1.7 1.1-2.2A6 6 0 0 0 12 3z"/>',
    doen: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
    gesprek: '<path d="M4 5h11v8H8l-4 3z"/><path d="M20 10v8h-3l-3 2v-2H9"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    afsluiten: '<path d="M5 21V4"/><path d="M5 4h12l-3 4 3 4H5"/>'
  };
  const ico = s => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICOON[s] || ICOON.doen}</svg>`;
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

  function soortVan(tekst) { for (const k in SOORT) if (SOORT[k].re.test(tekst)) return k; return 'doen'; }
  // Elke fase naar één vorm: {min, soort, kop, stappen, docent, klaar, beeld, tekst}
  function fase(f) {
    if (f && typeof f === 'object') {
      const o = Object.assign({ min: 0, stappen: [], docent: '', klaar: '' }, f);
      if (!o.soort) o.soort = soortVan((o.kop || '') + ' ' + (o.docent || ''));
      if (!o.kop) o.kop = o.docent || '';
      o.tekst = `${o.min} min · ${SOORT[o.soort] ? SOORT[o.soort].naam.toLowerCase() : o.soort}: ${o.kop}`;
      return o;
    }
    const s = String(f || ''); const m = s.match(/^(\d+)\s*min\s*·?\s*(.*)$/i);
    const min = m ? +m[1] : 0; let rest = m ? m[2] : s;
    let soort = 'doen', kop = rest;
    const d = rest.match(/^([^:]{2,24}):\s*(.+)$/);
    if (d) { soort = soortVan(d[1]); kop = d[2]; } else soort = soortVan(rest);
    return { min, soort, kop: cap(kop.trim()), stappen: [], docent: '', klaar: '', tekst: s };
  }
  const faseTekst = f => fase(f).tekst;

  // ---------- bewerken: fasen als tekst en terug ----------
  function fasenNaarTekst(fasen) {
    return (fasen || []).map(f => {
      if (!f || typeof f !== 'object') return String(f);
      const r = [`${f.min || 0} min · ${f.soort || 'doen'} · ${f.kop || ''}`];
      (f.stappen || []).forEach(s => r.push('- ' + s));
      if (f.klaar) r.push('? ' + f.klaar);
      if (f.docent) r.push('> ' + f.docent);
      return r.join('\n');
    }).join('\n');
  }
  function tekstNaarFasen(tekst, oud) {
    const out = []; let cur = null;
    for (const raw of String(tekst || '').split('\n')) {
      const ln = raw.trim(); if (!ln) continue;
      const m = ln.match(/^(\d+)\s*min\s*·\s*([a-z]+)\s*·\s*(.+)$/i);
      if (m && SOORT[m[2].toLowerCase()]) { cur = { min: +m[1], soort: m[2].toLowerCase(), kop: m[3].trim(), stappen: [] }; out.push(cur); continue; }
      if (/^\d+\s*min/i.test(ln) || !cur) { cur = null; out.push(ln); continue; }
      if (ln.startsWith('- ')) cur.stappen.push(ln.slice(2).trim());
      else if (ln.startsWith('> ')) cur.docent = ((cur.docent ? cur.docent + ' ' : '') + ln.slice(2).trim());
      else if (ln.startsWith('? ')) cur.klaar = ln.slice(2).trim();
      else cur.stappen.push(ln);
    }
    // beeld bewaren van de oude fase op dezelfde plek
    (oud || []).forEach((o, i) => { if (o && typeof o === 'object' && o.beeld && out[i] && typeof out[i] === 'object' && !out[i].beeld) out[i].beeld = o.beeld; });
    return out.map(f => { if (typeof f === 'object') { if (!f.stappen.length) delete f.stappen; if (!f.docent) delete f.docent; if (!f.klaar) delete f.klaar; } return f; });
  }

  // ---------- beeld ----------
  const GIT = { G: '320003', C: 'x32010', D: 'xx0232', Em: '022000', Am: 'x02210', E: '022100', A: 'x02220', Dm: 'xx0231', F: '133211', Bm: 'x24432', D7: 'xx0212', G7: '320001', A7: 'x02020', E7: '020100', C7: 'x32310', B7: 'x21202', Fm: '133111', Gm: '355333', Cm: 'x35543', Bb: 'x13331', Eb: 'x68886', Ab: '466544', Asus4: 'x02230', Dsus4: 'xx0233', Cadd9: 'x32033' };
  const NOTEN = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const NOOT = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };
  function akkoordTonen(naam) {
    const m = naam.match(/^([A-G][b#]?)(m(?!aj)|)(7|sus4|add9)?$/); if (!m) return [];
    let root = m[1]; root = NOOT[root] || root; const i = NOTEN.indexOf(root); if (i < 0) return [];
    const iv = m[3] === 'sus4' ? [0, 5, 7] : m[3] === 'add9' ? [0, 4, 7, 14] : [0, m[2] === 'm' ? 3 : 4, 7]; if (m[3] === '7') iv.push(10);
    return iv.map(x => NOTEN[(i + x) % 12]);
  }
  function akkoordSvg(naam) {
    const g = GIT[naam]; const tonen = akkoordTonen(naam).join(' · ');
    if (!g) return `<figure class="akk"><div class="geen">${esc(naam)}</div><figcaption>${esc(naam)}${tonen ? '<small>' + esc(tonen) + '</small>' : ''}</figcaption></figure>`;
    const fr = g.split('').map(c => c === 'x' ? -1 : +c); const max = Math.max(...fr); const base = max > 4 ? Math.min(...fr.filter(x => x > 0)) : 1;
    let s = `<svg viewBox="0 0 70 86" aria-label="${esc(naam)}">`;
    s += `<rect x="12" y="18" width="50" height="60" fill="none" stroke="currentColor" stroke-width="1.2"/>`;
    if (base === 1) s += `<rect x="11" y="15" width="52" height="3.5" fill="currentColor"/>`; else s += `<text x="4" y="30" font-size="8" fill="currentColor">${base}</text>`;
    for (let i = 1; i < 4; i++) s += `<line x1="12" y1="${18 + i * 15}" x2="62" y2="${18 + i * 15}" stroke="currentColor" stroke-width="1"/>`;
    for (let i = 1; i < 5; i++) s += `<line x1="${12 + i * 10}" y1="18" x2="${12 + i * 10}" y2="78" stroke="currentColor" stroke-width="1"/>`;
    fr.forEach((f, i) => { const x = 12 + i * 10;
      if (f < 0) s += `<text x="${x}" y="12" font-size="9" text-anchor="middle" fill="currentColor">×</text>`;
      else if (f === 0) s += `<circle cx="${x}" cy="9" r="3" fill="none" stroke="currentColor" stroke-width="1.2"/>`;
      else s += `<circle cx="${x}" cy="${18 + (f - base + .5) * 15}" r="4.2" fill="currentColor"/>`; });
    s += '</svg>';
    return `<figure class="akk">${s}<figcaption>${esc(naam)}<small>${esc(tonen)}</small></figcaption></figure>`;
  }
  const VORMKLEUR = { intro: '#94a3b8', couplet: '#60a5fa', refrein: '#f87171', pre: '#fbbf24', bridge: '#fbbf24', solo: '#a78bfa', outro: '#94a3b8', slot: '#94a3b8', break: '#34d399', tussenspel: '#34d399' };
  function vormSvg(items) {
    const tot = items.reduce((a, x) => a + (+x.m || 4), 0) || 1;
    return `<div class="vorm">${items.map(x => { const k = Object.keys(VORMKLEUR).find(k => (x.d || '').toLowerCase().startsWith(k)); return `<div style="flex:${+x.m || 4};background:${VORMKLEUR[k] || '#cbd5e1'}"><b>${esc(x.d)}</b>${x.m ? `<small>${x.m} maten</small>` : ''}${x.t ? `<em>${esc(x.t)}</em>` : ''}</div>`; }).join('')}<div class="maten">${tot} maten</div></div>`;
  }
  function opbouwSvg(items) { // dynamiek: [{d:'couplet',v:1..4}]
    const w = 100 / items.length;
    return `<div class="opbouw"><svg viewBox="0 0 100 40" preserveAspectRatio="none">${items.map((x, i) => `<rect x="${i * w + 1}" y="${40 - (x.v || 1) * 9}" width="${w - 2}" height="${(x.v || 1) * 9}" rx="1" fill="${VORMKLEUR[(x.d || '').toLowerCase().split(' ')[0]] || '#a78bfa'}"/>`).join('')}</svg><div class="labels">${items.map(x => `<span>${esc(x.d)}</span>`).join('')}</div></div>`;
  }
  function orkestSvg() {
    // naam, hoek (graden vanaf rechts), afstand tot de dirigent, kleur
    const P = [['1e violen', 160, 24, '#fde68a'], ['2e violen', 125, 24, '#fde68a'], ['Altviolen', 90, 23, '#fde68a'], ['Celli', 55, 24, '#fde68a'], ['Contrabassen', 20, 31, '#fcd34d'], ['Harp', 176, 36, '#a5b4fc'],
      ['Fluiten', 112, 37, '#bbf7d0'], ["Hobo's", 90, 36, '#bbf7d0'], ['Klarinetten', 128, 45, '#86efac'], ['Fagotten', 68, 37, '#86efac'],
      ['Hoorns', 146, 47, '#fdba74'], ['Trompetten', 102, 48, '#fdba74'], ['Trombones', 78, 48, '#fb923c'], ['Tuba', 58, 46, '#fb923c'],
      ['Pauken', 40, 47, '#c4b5fd'], ['Slagwerk', 118, 57, '#c4b5fd']];
    const el = P.map(([n, a, r, c]) => { const x = 50 + r * Math.cos(a * Math.PI / 180), y = 95 - r * Math.sin(a * Math.PI / 180) * .78; const rx = n.length > 8 ? 10 : 8;
      return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${rx}" ry="4.3" fill="${c}" opacity=".92"/><text x="${x.toFixed(1)}" y="${(y + 1.1).toFixed(1)}" font-size="2.9" text-anchor="middle" fill="#1b1b1b" font-family="Atkinson Hyperlegible Next,Segoe UI,sans-serif" font-weight="700">${esc(n)}</text>`; }).join('');
    return `<div class="orkest"><svg viewBox="0 0 100 100"><path d="M3 95 A47 47 0 0 1 97 95 Z" fill="#1e1b2e" stroke="#4c4466"/>${el}<ellipse cx="50" cy="92" rx="7" ry="3.6" fill="#f1f5f9"/><text x="50" y="93.1" font-size="2.9" text-anchor="middle" fill="#1b1b1b" font-family="Atkinson Hyperlegible Next,Segoe UI,sans-serif" font-weight="700">Dirigent</text><text x="50" y="99.2" font-size="3" text-anchor="middle" fill="#cbd5e1">publiek</text></svg><div class="legenda"><span style="--c:#fde68a">strijkers</span><span style="--c:#bbf7d0">houtblazers</span><span style="--c:#fdba74">koperblazers</span><span style="--c:#c4b5fd">slagwerk</span></div></div>`;
  }
  function beeldHtml(b) {
    if (!b) return '';
    if (typeof b === 'string') b = { soort: 'tekst', tekst: b };
    switch (b.soort) {
      case 'akkoorden': return `<div class="beeld akkoorden">${(b.items || []).map(akkoordSvg).join('')}</div>`;
      case 'vorm': return `<div class="beeld">${vormSvg(b.items || [])}</div>`;
      case 'opbouw': return `<div class="beeld">${opbouwSvg(b.items || [])}</div>`;
      case 'orkest': return `<div class="beeld">${orkestSvg()}</div>`;
      case 'kaarten': return `<div class="beeld kaarten">${(b.items || []).map(x => `<div class="kaartje"${x.kleur ? ` style="--c:${esc(x.kleur)}"` : ''}><b>${esc(x.k)}</b>${x.t ? `<span>${esc(x.t)}</span>` : ''}</div>`).join('')}</div>`;
      case 'tabel': return `<div class="beeld"><table class="btabel">${(b.rijen || []).map((r, i) => `<tr>${r.map(c => i === 0 && b.kop !== false ? `<th>${esc(c)}</th>` : `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table></div>`;
      case 'cijfer': return `<div class="beeld groot-cijfer"><b>${esc(b.waarde)}</b><span>${esc(b.tekst || '')}</span></div>`;
      case 'tekst': return `<div class="beeld citaat">${esc(b.tekst)}</div>`;
      default: return '';
    }
  }

  // ---------- slides ----------
  function agenda(fasen) {
    const fs = fasen.map(fase); const tot = fs.reduce((a, f) => a + (f.min || 0), 0) || 1;
    return `<div class="agenda"><div class="balk">${fs.map(f => `<div style="flex:${f.min || 1};background:${SOORT[f.soort].kleur}" title="${esc(f.kop)}"></div>`).join('')}</div><ol>${fs.map(f => `<li><i style="color:${SOORT[f.soort].zacht}">${ico(f.soort)}</i><span><b>${esc(SOORT[f.soort].naam)}</b> · ${f.min} min<br>${esc(f.kop)}</span></li>`).join('')}</ol><div class="tot">${tot} minuten</div></div>`;
  }
  function bouwSlides(l, ctx) {
    // ctx: {groep, lgNaam, lokaal, tijd, toets, thuis, vorige, benodigd, materiaalHtml}
    const S = [];
    const kop = `${esc(ctx.groep)} · ${esc(ctx.lgNaam)}${ctx.lokaal ? ' · ' + esc(ctx.lokaal) : ''}`;
    const fasen = (l.fasen || []).map(fase);
    S.push({ k: 'klaar', docent: true, h: `<p class="eyebrow">Jouw kaart · niet voor het bord</p><h2>${esc(l.titel || '')}</h2><div class="tweekol"><div><h3>Klaarzetten</h3><ul class="groot">${(ctx.benodigd || []).map(b => `<li>${esc(b)}</li>`).join('') || '<li>Niets bijzonders</li>'}</ul></div><div>${ctx.vorige ? `<h3>Vorige keer</h3><p class="detail">${esc(ctx.vorige)}</p>` : ''}${l.doel ? `<h3>Doel</h3><p class="detail">${esc(l.doel)}</p>` : ''}${fasen.length ? `<h3>Verloop</h3><p class="detail">${fasen.map(f => f.min + ' min ' + SOORT[f.soort].naam.toLowerCase()).join(' → ')}</p>` : ''}</div></div><p class="hint">Pijl rechts als het bord aanstaat · n = notities · t = timer · f = volledig scherm</p>` });
    S.push({ k: 'welkom', h: `<p class="eyebrow">${kop}</p><h1>${esc(l.titel || '')}</h1>${ctx.toets ? `<p class="detail">${esc(ctx.toets)}</p>` : ''}${l.vraag ? `<p class="vraag">${esc(l.vraag)}</p>` : ''}${fasen.length ? agenda(l.fasen) : l.detail ? `<p class="detail">${esc(l.detail)}</p>` : ''}` });
    if (l.doel || (l.criteria || []).length) S.push({ k: 'doel', h: `<p class="eyebrow">Aan het eind van deze les</p><h2>${esc(l.doel || '')}</h2>${(l.criteria || []).length ? `<ul class="crit">${l.criteria.map(c => `<li><button type="button" class="vink" data-vink="" aria-pressed="false"></button><span>${esc(c)}</span></li>`).join('')}</ul>` : ''}` });
    fasen.forEach((f, i) => {
      const s = SOORT[f.soort];
      S.push({ k: 'fase', soort: f.soort, min: f.min, docent: f.docent, kop: f.kop, h: `<div class="fasekop" style="--c:${s.kleur};--z:${s.zacht}"><i>${ico(f.soort)}</i><span>${esc(s.naam)} · fase ${i + 1} van ${fasen.length}</span></div><h2>${esc(f.kop)}</h2>${f.stappen && f.stappen.length ? `<ol class="stappen">${f.stappen.map(x => `<li>${esc(x)}</li>`).join('')}</ol>` : i === 0 && l.detail && !f.beeld ? `<p class="detail">${esc(l.detail)}</p>` : ''}${beeldHtml(f.beeld)}${f.klaar ? `<div class="klaarkaart"><b>Klaar?</b> ${esc(f.klaar)}</div>` : ''}` });
    });
    if (!fasen.length && l.detail) S.push({ k: 'fase', soort: 'doen', h: `<div class="fasekop" style="--c:#15803d;--z:#bbf7d0"><i>${ico('doen')}</i><span>Les</span></div><h2>${esc(l.detail)}</h2>` });
    if (l.formatief && (l.formatief.soort || l.formatief.tekst)) S.push({ k: 'check', soort: 'check', kop: l.formatief.soort || '', h: `<div class="fasekop" style="--c:#b45309;--z:#fde68a"><i>${ico('check')}</i><span>Check · ${esc(l.formatief.soort || '')}</span></div><h2>${esc(l.formatief.tekst || '')}</h2>` });
    if (l.identiteit) S.push({ k: 'id', h: `<p class="eyebrow">Rode draad</p><blockquote>${esc(l.identiteit)}</blockquote>` });
    const th = ctx.thuis || {};
    if (th.mb || th.learn || th.extra || th.info || (l.materiaal || []).length) S.push({ k: 'thuis', h: `<p class="eyebrow">Thuis en materiaal</p><div class="thuiskaarten">${th.mb ? `<a class="tk" href="https://digitaal.musicboxmethode.nl" target="_blank" rel="noopener"><b>Musicbox</b><span>${esc(th.mb)}</span></a>` : ''}${th.info ? `<div class="tk"><b>Lezen</b><span>${esc(th.info)}</span></div>` : ''}${th.learn ? `<div class="tk"><b>Leren</b><span>${esc(th.learn)}</span></div>` : ''}${th.extra ? `<div class="tk"><b>Opdracht</b><span>${esc(th.extra)}</span></div>` : ''}</div>${ctx.materiaalHtml || ''}` });
    S.push({ k: 'af', h: '' });
    return S;
  }
  function timerRing(sec, tot) {
    const r = 54, c = 2 * Math.PI * r; const p = tot ? Math.max(0, Math.min(1, sec / tot)) : 0;
    return `<div class="ring" id="ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="${r}" class="spoor"/><circle cx="60" cy="60" r="${r}" class="voort" style="stroke-dasharray:${c};stroke-dashoffset:${c * (1 - p)}"/></svg><b id="tl">${Math.floor(sec / 60)}:${(sec % 60 < 10 ? '0' : '') + sec % 60}</b><span id="tlab">${tot ? Math.round(tot / 60) + ' min' : ''}</span></div>`;
  }
  window.LESMODUS = { SOORT, fase, faseTekst, fasenNaarTekst, tekstNaarFasen, beeldHtml, bouwSlides, timerRing, ico };
})();
