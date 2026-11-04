/* Lesklok: hoeveel tijd de les nog heeft, in elk scherm, en het opruimsignaal 4 minuten voor het einde van het rooster.
   De tijd komt uit het rooster, niet uit de fasen: het signaal komt ook als de les uitloopt. Aansluitende uren van dezelfde groep tellen als één blok.
   Een schriftelijke toets krijgt geen geluid en geen "Opruimen". Een les met zelfbeoordelingsstrookje geeft 7 minuten voor het einde een stil seintje, alleen op het docentscherm. */
(function (root) {
  const OPRUIM_SEC = 240, STROOKJE_SEC = 420, GROOT_SEC = 15, GELUID_SEC = 60;
  // De vaste opruimstappen van lokaal 009 komen hier; zolang de lijst leeg is, staat er alleen "Opruimen" en de klok.
  const OPRUIM_STAPPEN = [];

  // ---------- rekenen (getest in tools/test-lesklok.js) ----------
  function blokken(uren) { // uren: [{van, tot, groep, uitval, stil, strookje}], van en tot in minuten
    const out = [];
    uren.filter(u => !u.uitval).sort((a, b) => a.van - b.van).forEach(u => {
      const b = out[out.length - 1];
      if (b && b.groep === u.groep && b.tot === u.van) { b.tot = u.tot; b.stil = b.stil || !!u.stil; b.strookje = b.strookje || !!u.strookje; }
      else out.push({ groep: u.groep, van: u.van, tot: u.tot, stil: !!u.stil, strookje: !!u.strookje });
    });
    return out;
  }
  const blokNu = (bl, nuSec) => bl.find(b => b.van * 60 <= nuSec && nuSec < b.tot * 60) || null;
  function stand(rest, b) {
    if (rest <= OPRUIM_SEC) return b.stil ? 'toets' : 'opruimen';
    if (b.strookje && rest <= STROOKJE_SEC) return 'strookje';
    return 'loopt';
  }
  const klokTekst = sec => { const m = Math.floor(sec / 60), s = sec % 60; return m + ':' + (s < 10 ? '0' : '') + s; };
  const hmTekst = min => Math.floor(min / 60) + ':' + ('0' + min % 60).slice(-2);
  const R = { blokken, blokNu, stand, klokTekst, OPRUIM_SEC, STROOKJE_SEC };
  if (typeof document === 'undefined') { root.LESKLOK = R; return; }

  // ---------- rooster van vandaag ----------
  let A = null; // wat app.js doorgeeft: uren, vandaag, esc, lesOpen, route, klaar, waak
  let cache = null, cacheTot = 0;
  function blokkenNu(ms) { // het rooster kan veranderen: elke 15 seconden opnieuw
    if (cache && ms < cacheTot) return cache;
    try { cache = blokken(A.uren()); } catch (e) { console.error(e); cache = cache || []; }
    cacheTot = ms + 15000; return cache;
  }

  // ---------- geluid: twee keer ding-dong, gemaakt in de browser ----------
  let ctx = null, geluidTeller = 0;
  function maakCtx() {
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return;
    if (!ctx) ctx = new A();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  }
  const geluidKan = () => !!ctx && ctx.state === 'running';
  ['pointerdown', 'keydown'].forEach(n => window.addEventListener(n, () => { try { maakCtx(); } catch (e) {} }, { capture: true, passive: true }));
  function slag(t, f, uit) {
    [[1, 1, 2.2], [2, .5, 1.5], [2.76, .35, 1], [5.4, .15, .5]].forEach(([k, g, d]) => {
      const o = ctx.createOscillator(), e = ctx.createGain();
      o.frequency.value = f * k;
      e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(g, t + .005); e.gain.exponentialRampToValueAtTime(.0005, t + d);
      o.connect(e); e.connect(uit); o.start(t); o.stop(t + d + .05);
    });
  }
  function speel() {
    const c = ctx.createDynamicsCompressor(), m = ctx.createGain(); m.gain.value = .9; c.connect(m); m.connect(ctx.destination);
    const t = ctx.currentTime + .03;
    [[0, 659], [.7, 523], [1.4, 659], [2.1, 523]].forEach(([d, f]) => slag(t + d, f, c));
    geluidTeller++;
  }
  function eenmalig(naam, key) { // over alle vensters heen één keer
    try { if (localStorage.getItem('lesdag-lesklok-' + naam) === key) return false; localStorage.setItem('lesdag-lesklok-' + naam, key); } catch (e) {}
    return true;
  }
  const trilNu = p => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} };

  // ---------- proef vanuit Instellingen: het grote beeld, het geluid en de balk ----------
  let proef = null, weg = '';
  function proefStart() {
    try { maakCtx(); } catch (e) {}
    proef = { eind: Date.now() + OPRUIM_SEC * 1000, stop: Date.now() + 30000 }; weg = '';
    if (ctx) ctx.resume().then(() => { if (proef) speel(); }).catch(() => {});
    tik();
  }

  // ---------- tonen ----------
  const heeft = k => document.body.classList.contains(k);
  const inLes = () => A.lesOpen();
  function huidig() {
    const ms = Date.now();
    if (proef && ms >= proef.stop) proef = null;
    if (proef) return { groep: 'Proef', tot: null, rest: Math.ceil((proef.eind - ms) / 1000), stand: 'opruimen', key: 'proef', proef: true };
    const d = new Date(ms); const nu = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
    const b = blokNu(blokkenNu(ms), nu); if (!b) return null;
    const rest = b.tot * 60 - nu;
    return { groep: b.groep, tot: b.tot, rest, stand: stand(rest, b), key: A.vandaag() + '|' + b.groep + '|' + b.van };
  }
  function balkHtml(st) {
    const groep = A.esc(st.groep); const tot = st.tot != null ? 'tot ' + hmTekst(st.tot) : '';
    const sub = `<span class="lk-sub">${groep}${tot ? ' · ' + tot : ''}</span>`;
    const knop = !geluidKan() && !heeft('bordvenster') && !heeft('kompasvenster') && !heeft('bm-concert') && st.stand !== 'toets' && !st.proef
      ? '<button type="button" class="lk-geluid" data-lkgeluid="">Geluid aan</button>' : '';
    if (st.stand === 'opruimen') return `<b class="lk-wat">Opruimen</b><b class="lk-tijd">${klokTekst(st.rest)}</b>${sub}${knop}`;
    if (st.stand === 'toets') return `<b class="lk-wat">Toets: laatste minuten</b><b class="lk-tijd">${klokTekst(st.rest)}</b>${sub}`;
    if (st.stand === 'strookje') return `<b class="lk-wat">Tijd voor het strookje</b><b class="lk-tijd">${klokTekst(st.rest)}</b>${sub}${knop}`;
    return `<b class="lk-wat">${groep}</b><b class="lk-tijd">nog ${Math.ceil(st.rest / 60)} min</b><span class="lk-sub">${tot}</span>${knop}`;
  }
  let balkLaatst = null;
  function toonBalk(st) {
    const el = document.getElementById('lesklok'); if (!el) return;
    const html = st ? balkHtml(st) : ''; const kl = st ? 'lk lk-' + st.stand : 'lk';
    if (html !== balkLaatst) { el.innerHTML = html; balkLaatst = html; }
    if (el.className !== kl) el.className = kl;
    const aan = !!st && !inLes(); if (el.hidden === aan) el.hidden = !aan;
    const h = aan ? Math.round(el.getBoundingClientRect().height) + 'px' : '0px';
    if (document.documentElement.style.getPropertyValue('--lk-h') !== h) document.documentElement.style.setProperty('--lk-h', h);
  }
  function toonBord(st) { // het bord en de les op dit scherm: resttijd in de kopregel, bij het signaal groot en daarna een band
    const les = document.getElementById('les'); const opLes = inLes();
    const rest = document.getElementById('lkRest');
    if (rest) { const t = st && !st.proef && st.stand !== 'opruimen' && st.stand !== 'toets' ? `nog ${Math.ceil(st.rest / 60)} min` : ''; if (rest.textContent !== t) rest.textContent = t; }
    const sluit = st && (st.stand === 'opruimen' || st.stand === 'toets');
    const groot = !!sluit && st.stand === 'opruimen' && st.rest > OPRUIM_SEC - GROOT_SEC && weg !== st.key;
    let el = document.getElementById('lsBord');
    if (!sluit || !(opLes || (st.proef && groot))) {
      if (el) el.remove();
      if (les) { les.classList.remove('ls-sein'); les.style.removeProperty('--ls-h'); }
      return;
    }
    const ouder = opLes ? les : document.body;
    if (!el || el.parentNode !== ouder) { if (el) el.remove(); el = document.createElement('div'); el.id = 'lsBord'; el.setAttribute('role', 'status'); ouder.appendChild(el); }
    const kl = (groot ? 'ls-groot' : 'ls-band') + (st.stand === 'toets' ? ' ls-toets' : '');
    if (el.className !== kl) el.className = kl;
    const stappen = st.stand === 'opruimen' && OPRUIM_STAPPEN.length ? `<ol class="ls-stappen">${OPRUIM_STAPPEN.map(x => `<li>${A.esc(x)}</li>`).join('')}</ol>` : '';
    const html = `<b class="ls-wat">${st.stand === 'toets' ? 'Nog' : 'Opruimen'}</b><b class="ls-tijd">${klokTekst(st.rest)}</b>${stappen}`;
    if (el.innerHTML !== html) el.innerHTML = html;
    if (opLes) { les.classList.toggle('ls-sein', !groot); les.style.setProperty('--ls-h', groot ? '0px' : el.getBoundingClientRect().height + 'px'); }
  }
  let titelLaatst = '';
  function toonTitel(st) {
    const t = !st ? 'Lesdag' : st.stand === 'opruimen' ? `Opruimen ${klokTekst(st.rest)} · Lesdag` : st.stand === 'toets' ? `Nog ${klokTekst(st.rest)} · Lesdag` : `${Math.ceil(st.rest / 60)} min · Lesdag`;
    if (t !== titelLaatst) { document.title = t; titelLaatst = t; }
  }
  function seinen(st) {
    if (!st || st.proef || heeft('bm-concert')) return;
    const bord = heeft('bordvenster');
    if (st.stand === 'strookje' && st.rest > STROOKJE_SEC - GELUID_SEC && !bord && navigator.vibrate && eenmalig('tril-s', st.key)) trilNu([90, 70, 90]);
    if ((st.stand !== 'opruimen' && st.stand !== 'toets') || st.rest <= OPRUIM_SEC - GELUID_SEC) return;
    if (!bord && navigator.vibrate && eenmalig('tril', st.key)) trilNu([400, 150, 400, 150, 400]);
    if (st.stand !== 'opruimen') return;
    if (!ctx) { try { maakCtx(); } catch (e) {} }
    if (geluidKan() && eenmalig('geluid', st.key)) speel(); // kan dit venster geen geluid maken, dan neemt het andere het over
  }
  let waakte = false;
  function waakZorg(st) { // tablet: scherm aan zolang een les loopt
    const loopt = !!st && !st.proef;
    if (loopt && !document.hidden) { A.waak(true); waakte = true; }
    else if (!loopt && waakte) { waakte = false; if (!inLes() && A.route() !== 'regie' && !heeft('bm-concert')) A.waak(false); }
  }
  function tik() {
    if (!A) return; try { if (!A.klaar()) return; } catch (e) { return; } // app.js is nog aan het opstarten
    const st = huidig();
    toonBalk(st); toonBord(st); toonTitel(st); seinen(st); waakZorg(st);
  }
  document.addEventListener('click', e => {
    if (e.target.closest('[data-lkproef]')) { proefStart(); return; }
    if (e.target.closest('[data-lkgeluid]')) { setTimeout(tik, 100); return; }
    if (e.target.closest('#lsBord.ls-groot')) { const st = huidig(); if (st) { weg = st.key; if (st.proef) proef = null; tik(); } }
  });
  document.addEventListener('visibilitychange', tik);
  function start(app) { A = app; setInterval(tik, 1000); tik(); }
  root.LESKLOK = Object.assign(R, { start, tik, loopt: () => { if (!A) return false; const st = huidig(); return !!st && !st.proef; }, proefStart, geluidTeller: () => geluidTeller, geluidKan });
})(typeof window !== 'undefined' ? window : globalThis);
