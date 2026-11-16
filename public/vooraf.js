/* Gegevens meteen ophalen, naast de scripts; app.js pakt ze op (laadJson). Eigen bestand in plaats van inline, voor de CSP (script-src 'self'). */
window.VOORAF = {}; ['basis', 'beoordeling', 'reclame'].forEach(function (n) { var p = fetch('data/' + n + '.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }); p.catch(function () {}); window.VOORAF[n] = p; });
