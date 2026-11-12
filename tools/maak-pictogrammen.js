// Maakt de pictogrammen van Lesdag (monogram: witte L met gele nu-punt op paars) zonder extra pakketten.
// Gebruik: node tools/maak-pictogrammen.js   → schrijft public/icons/icon.svg en de PNG's.
// Vormen in een vlak van 512: wie het logo wijzigt, past alleen VORMEN aan en draait dit opnieuw.
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const UIT = path.join(__dirname, '..', 'public', 'icons');
const PAARS = [0x5B, 0x24, 0x7F], WIT = [255, 255, 255], GEEL = [0xFF, 0xC2, 0x4B];
const HOEK = 112; // ronde hoek van het vlak; maskable en apple krijgen een vol vlak
const VORMEN = [
  { soort: 'rr', x: 142, y: 104, w: 84, h: 304, r: 16, kleur: WIT },
  { soort: 'rr', x: 142, y: 324, w: 238, h: 84, r: 16, kleur: WIT },
  { soort: 'c', cx: 338, cy: 176, r: 58, kleur: GEEL },
];
const hex = k => '#' + k.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();

function svg() {
  const v = VORMEN.map(s => s.soort === 'rr'
    ? `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="${s.r}" fill="${hex(s.kleur)}"/>`
    : `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}" fill="${hex(s.kleur)}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="${HOEK}" fill="${hex(PAARS)}"/>${v}</svg>\n`;
}

// binnen de vorm? (afgeronde rechthoek of cirkel)
function in_rr(px, py, x, y, w, h, r) {
  const dx = Math.max(x + r - px, 0, px - (x + w - r)), dy = Math.max(y + r - py, 0, py - (y + h - r));
  return px >= x && px <= x + w && py >= y && py <= y + h && dx * dx + dy * dy <= r * r;
}
function raak(s, px, py) {
  return s.soort === 'rr' ? in_rr(px, py, s.x, s.y, s.w, s.h, s.r) : (px - s.cx) ** 2 + (py - s.cy) ** 2 <= s.r * s.r;
}

// maat in pixels; hoek 0 = vol vlak; schaal verkleint het beeld rond het midden (veilige zone)
function teken(maat, hoek, schaal) {
  const N = 4, buf = Buffer.alloc(maat * (maat * 4 + 1));
  for (let y = 0; y < maat; y++) {
    const rij = y * (maat * 4 + 1); buf[rij] = 0;
    for (let x = 0; x < maat; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < N; sy++) for (let sx = 0; sx < N; sx++) {
        const px = (x + (sx + .5) / N) * 512 / maat, py = (y + (sy + .5) / N) * 512 / maat;
        if (!in_rr(px, py, 0, 0, 512, 512, hoek)) continue;
        const qx = 256 + (px - 256) / schaal, qy = 256 + (py - 256) / schaal;
        let k = PAARS;
        for (const s of VORMEN) if (raak(s, qx, qy)) k = s.kleur;
        r += k[0]; g += k[1]; b += k[2]; a++;
      }
      const o = rij + 1 + x * 4;
      if (a) { buf[o] = Math.round(r / a); buf[o + 1] = Math.round(g / a); buf[o + 2] = Math.round(b / a); }
      buf[o + 3] = Math.round(255 * a / (N * N));
    }
  }
  return png(maat, buf);
}

const TAB = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
function crc(b) { let c = 0xFFFFFFFF; for (const v of b) c = TAB[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function blok(naam, data) {
  const kop = Buffer.concat([Buffer.from(naam), data]), len = Buffer.alloc(4), som = Buffer.alloc(4);
  len.writeUInt32BE(data.length); som.writeUInt32BE(crc(kop));
  return Buffer.concat([len, kop, som]);
}
function png(maat, ruw) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(maat, 0); ihdr.writeUInt32BE(maat, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), blok('IHDR', ihdr), blok('IDAT', zlib.deflateSync(ruw, { level: 9 })), blok('IEND', Buffer.alloc(0))]);
}

fs.writeFileSync(path.join(UIT, 'icon.svg'), svg());
fs.writeFileSync(path.join(UIT, 'icon-192.png'), teken(192, HOEK, 1));
fs.writeFileSync(path.join(UIT, 'icon-512.png'), teken(512, HOEK, 1));
fs.writeFileSync(path.join(UIT, 'icon-maskable-512.png'), teken(512, 0, .88)); // Android snijdt zelf bij
fs.writeFileSync(path.join(UIT, 'icon-apple-180.png'), teken(180, 0, 1));      // iOS rondt zelf af
console.log('Pictogrammen geschreven in public/icons');
