/* Week afsluiten, twee lessen samenvoegen en lucht op Jaar (voorstel "Vier functies", keuzes van Frans 9-11-2026). Elke keuze is een benoemde instelling
   in KEUZES. Rekenregels staan hier zonder scherm, getest in tools/test-functies.js. Les-id's en de weekindeling blijven zoals ze zijn. */
(function (wortel, maak) { if (typeof module === 'object' && module.exports) module.exports = maak(); else wortel.FUNCTIES = maak(); })(this, () => {
  /* Benoemde keuzes uit het voorstel (nummers = vraagnummers). De waarden zijn wat Frans op 9-11-2026 koos. */
  const KEUZES = {
    week: {
      waar: 'laatste-werkdag',        // keuze 1. 'laatste-werkdag' = Dag afsluiten wordt vanzelf Week afsluiten; 'nooit' = alleen de losse stukken (aantal op de knop blijft)
      maandagRegel: true,             // keuze 3. Maandag een grijze regel met de toetsen van de week onder de zin op Nu
      maandagMaxToetsen: 3,           // keuze 3. Hoogstens zoveel toetsen in die regel
      zinnenTerug: true               // keuze 4. Alle zinnen "Wat ging goed" van de week bij Week afsluiten
    },
    samen: {
      omvang: 'twee-lessen',          // keuze 5. Alleen dit is gebouwd (de kleine variant en "niet bouwen" zijn een andere waarde die de optie verbergt: 'uit')
      eerste: 'laatste-twee-voor-toets', // keuze 6. Welke twee lessen eerst staan; je kunt altijd wisselen
      beginToetsles: 'vervalt',       // keuze 7. 'vervalt' = de optie "aan het begin van de toetsles" verdwijnt zodra samenvoegen aanstaat; 'blijft' = blijft erbij
      maxLessen: 2                    // geen keuze uit het voorstel: twee lessen
    },
    jaar: {
      lucht: 'groene-noten-en-regel', // keuze 8. 'groene-noten-en-regel' | 'niets'
      stand: 'alleen-krap'            // keuze 8. Een klas die goed zit krijgt geen label. 'alleen-krap' is gebouwd
    }
  };

  /* ---- Week afsluiten: kalenderweek ma t/m zo, zonder tijdzone-gedoe (datums zijn "jjjj-mm-dd") ---- */
  const naarDatum = s => { const [j, m, d] = String(s).split('-').map(Number); return new Date(j, m - 1, d, 12); };
  const naarTekst = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const plusDagen = (s, n) => { const d = naarDatum(s); d.setDate(d.getDate() + n); return naarTekst(d); };
  const maandagVan = s => { const d = naarDatum(s); return plusDagen(s, -((d.getDay() + 6) % 7)); };
  /* s is de laatste lesdag van zijn week als de volgende lesdag in een andere kalenderweek valt (ook voor een vakantie). volgende(s) geeft die lesdag. */
  const laatsteLesdagVanWeek = (s, volgende) => maandagVan(volgende(s)) !== maandagVan(s);
  const eersteLesdagVanWeek = (s, vorige) => maandagVan(vorige(s)) !== maandagVan(s);
  /* "praktijktoets vwo 4 (ma)": hoogstens max toetsen, op datum. T = [{g, soort, id, s, dag}] */
  function weekRegel(T, max) {
    const L = T.slice().sort((a, b) => a.s < b.s ? -1 : a.s > b.s ? 1 : a.g < b.g ? -1 : 1).slice(0, max);
    const woord = x => (x.soort === 'praktijk' || /^P/.test(x.id) ? 'praktijktoets' : 'toets') + ' ' + x.g + ' (' + x.dag + ')';
    return L.length ? 'Deze week: ' + (L.length < 2 ? woord(L[0]) : L.slice(0, -1).map(woord).join(', ') + ' en ' + woord(L[L.length - 1])) + '.' : '';
  }

  /* ---- Twee lessen samenvoegen: Frans kiest fasen, Lesdag telt tot de lesduur en schrapt zelf nooit iets ---- */
  const faseMinuten = f => f && typeof f === 'object' ? Math.max(0, +f.min || 0) : ((String(f || '').match(/^\s*(\d+)\s*min/i) || [])[1] | 0);
  const telMinuten = (fasen, gekozen) => (gekozen || []).reduce((som, i) => som + faseMinuten((fasen || [])[i]), 0);
  /* Past het? Ten minste één fase uit elke les (anders is het geen samenvoegen) en samen niet meer dan de lesduur. */
  function pastSamen(fA, fB, kA, kB, duur) {
    const som = telMinuten(fA, kA) + telMinuten(fB, kB);
    if (!kA.length || !kB.length) return { ok: false, som, reden: 'Kies uit beide lessen minstens één fase.' };
    if (som > duur) return { ok: false, som, reden: (som - duur) + ' minuten te veel. Haal eerst iets weg.' };
    return { ok: true, som, reden: som === duur ? 'Past precies.' : (duur - som) + ' minuten over.' };
  }
  /* De fasen van de nieuwe les: eerst de gekozen fasen van les A, dan die van les B, elk in hun eigen volgorde. */
  const samenFasen = (fA, fB, kA, kB) => [...new Set(kA)].sort((x, y) => x - y).map(i => fA[i]).concat([...new Set(kB)].sort((x, y) => x - y).map(i => fB[i]));
  /* Welke twee lessen eerst staan (keuze 6). ids = kandidaten in lesvolgorde. 'laatste-twee-voor-toets': de laatste twee; anders niets voorgekozen. */
  const kiesPaar = (ids, eerste) => eerste === 'laatste-twee-voor-toets' && ids.length >= 2 ? ids.slice(-2) : [];
  const unie = (a, b) => { const gezien = new Set(); return [...(a || []), ...(b || [])].filter(x => { const k = JSON.stringify(x); if (gezien.has(k)) return false; gezien.add(k); return true; }); };

  /* ---- Jaar: waar is nog lucht. De regel bij een klas die krap zit (keuze 8); een klas die goed zit krijgt niets ---- */
  const luchtRegel = (toets, aantal) => 'Krap voor ' + toets + '. ' + (aantal < 1 ? 'Geen les kan vervallen.' : aantal === 1 ? 'Eén les kan vervallen.' : aantal + ' lessen kunnen vervallen.');

  return { KEUZES, maandagVan, plusDagen, laatsteLesdagVanWeek, eersteLesdagVanWeek, weekRegel, luchtRegel, faseMinuten, telMinuten, pastSamen, samenFasen, kiesPaar, unie };
});
