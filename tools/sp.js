// Maakt van een pad in de sectiemap (bijv. "02 Keuzevak muziek\VWO\VWO 4\Lessen 2026-2027\08.1 ....pptx")
// een SharePoint-adres dat het bestand in de browser opent (PowerPoint Online bij ?web=1).
// Adres van de bibliotheek komt uit de OneDrive-synchronisatie (DavUrlNamespace in %LOCALAPPDATA%\Microsoft\OneDrive\settings\Business1).
// Let op: de bibliotheeknaam heeft twee spaties ("Gedeelde  documenten"), zo staat hij in SharePoint.
const BIB = 'https://studentcsgpm.sharepoint.com/Sectie%20Muziek/Gedeelde%20%20documenten/';
function spUrl(pad) {
  if (!pad || /^https?:/i.test(pad)) return pad;
  const delen = String(pad).replace(/\\/g, '/').split('/').filter(Boolean).map(encodeURIComponent);
  const laatste = decodeURIComponent(delen[delen.length - 1] || '');
  return BIB + delen.join('/') + (/[.][a-z0-9]{2,5}$/i.test(laatste) ? '?web=1' : ''); // mappen zonder ?web=1
}
// Is dit een pad in de sectiemap? (begint met een genummerde hoofdmap, zoals "01 Onderbouw muziek")
function isSectiePad(u) { return !!u && !/^https?:/i.test(u) && /^\d\d [^\\/]+[\\/]/.test(u); }
module.exports = { spUrl, isSectiePad, BIB };
