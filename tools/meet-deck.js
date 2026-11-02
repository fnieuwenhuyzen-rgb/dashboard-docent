// Meet een lespresentatie: per foto bijsnijding en zichtbare beeldverhouding tegenover het kader, en de lengte van de notities per dia.
// Gebruik: node tools/meet-deck.js deck.pptx [...]   V=1 toont elke foto, N=1 de lengtes, N=2 ook de tekst van de notities.
const fs = require('fs'), path = require('path');
const NM = path.join(process.env.LOCALAPPDATA, 'Temp', 'claude', 'pptx-tools', 'node_modules');
const JSZip = require(path.join(NM, 'jszip')); const { imageSize } = require(path.join(NM, 'image-size'));
const nr = k => +k.match(/(\d+)\.xml$/)[1];
function crop(pic) { const m = pic.match(/<a:srcRect\b([^>]*)>/); const c = m ? m[1] : ''; const g = k => { const r = c.match(new RegExp('\\b' + k + '="(-?\\d+)"')); return r ? +r[1] / 100000 : 0; }; return { l: g('l'), r: g('r'), t: g('t'), b: g('b') }; }
(async () => {
  let fout = 0, totaal = 0;
  for (const f of process.argv.slice(2)) {
    const z = await JSZip.loadAsync(fs.readFileSync(f)); let slecht = 0, n = 0; const rij = [];
    for (const sl of Object.keys(z.files).filter(k => /ppt\/slides\/slide\d+\.xml$/.test(k)).sort((a, b) => nr(a) - nr(b))) {
      const x = await z.file(sl).async('string'); const rels = await z.file(sl.replace('slides/', 'slides/_rels/') + '.rels').async('string');
      for (const m of x.matchAll(/<p:pic>[\s\S]*?<\/p:pic>/g)) {
        const rid = m[0].match(/r:embed="(rId\d+)"/)[1]; const t = rels.match(new RegExp('Id="' + rid + '"[^>]*Target="([^"]+)"')) || rels.match(new RegExp('Target="([^"]+)"[^>]*Id="' + rid + '"'));
        const d = imageSize(await z.file('ppt/' + t[1].replace('../', '')).async('nodebuffer')); const c = crop(m[0]); const e = m[0].match(/<a:ext cx="(\d+)" cy="(\d+)"/);
        const zicht = d.width * (1 - c.l - c.r) / (d.height * (1 - c.t - c.b)), kader = +e[1] / +e[2], af = Math.abs(zicht / kader - 1); n++; if (af > 0.01) slecht++;
        rij.push(`${path.basename(sl, '.xml')} bron ${d.width}x${d.height} (${(d.width / d.height).toFixed(3)}) crop l${c.l.toFixed(3)} r${c.r.toFixed(3)} t${c.t.toFixed(3)} b${c.b.toFixed(3)} kader ${kader.toFixed(3)} zichtbaar ${zicht.toFixed(3)} afwijking ${(af * 100).toFixed(2)}%`);
      }
    }
    fout += slecht; totaal += n;
    const ns = Object.keys(z.files).filter(k => /notesSlides\/notesSlide\d+\.xml$/.test(k)).sort((a, b) => nr(a) - nr(b)); const len = [];
    for (const k of ns) { const x = await z.file(k).async('string'); const body = x.split('type="sldNum"')[0]; const ps = [...body.matchAll(/<a:p>[\s\S]*?<\/a:p>/g)].map(p => [...p[0].matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)].map(t => t[1]).join('')); const tekst = ps.join('\n').trim(); len.push(tekst.length); if (process.env.N === '2') console.log(`--- ${path.basename(k, '.xml')}\n${tekst}`); }
    console.log(`${path.basename(f)}: ${n} foto's, ${slecht} vervormd; notities tekens per dia: ${len.join(' ')}`);
    if (process.env.V) rij.forEach(r => console.log('  ' + r));
  }
  console.log(`Totaal ${totaal} foto's, ${fout} vervormd (meer dan 1%)`);
})().catch(e => { console.error(e); process.exit(1); });
