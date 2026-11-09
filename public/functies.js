/* Proeffuncties van Lesdag (voorstel "Vier functies", 8-11-2026). Alles staat standaard uit, achter een schakelaar bij Instellingen.
   De schakelaars staan per apparaat in AP.functies (niet in de gesynchroniseerde staat). Elke keuze van Frans is een benoemde instelling
   in KEUZES: een andere keuze is een waarde hier wijzigen, geen herbouw. Rekenregels staan hier zonder scherm, getest in tools/test-functies.js.
   Les-id's en de weekindeling blijven zoals ze zijn. */
(function (wortel, maak) { if (typeof module === 'object' && module.exports) module.exports = maak(); else wortel.FUNCTIES = maak(); })(this, () => {
  /* De schakelaars en hun uitleg voor Instellingen. Volgorde = volgorde op het scherm. */
  const LIJST = [
    { sleutel: 'weekAfsluiten', naam: 'Week afsluiten', uitleg: 'Op je laatste werkdag van de week wordt Dag afsluiten Week afsluiten: de goede zinnen van de week, wat anders ging dan de studiewijzer en wat er volgende week vaststaat.' },
    { sleutel: 'samenvoegen', naam: 'Twee lessen samenvoegen', uitleg: 'Bij Krap voor de toets een extra optie: twee lessen naast elkaar, jij kiest de fasen, Lesdag telt tot de lesduur. Lesdag schrapt zelf nooit iets.' },
    { sleutel: 'jaarLucht', naam: 'Jaar: waar is nog lucht', uitleg: 'Op Jaar een groene noot voor lessen die kunnen vervallen, en een korte regel bij een klas die krap zit.' }
  ];

  /* Benoemde keuzes uit het voorstel (nummers = vraagnummers). De waarden zijn het advies. */
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

  const aan = (ap, sleutel) => !!(ap && ap[sleutel]); // ap = AP.functies
  const zet = (ap, sleutel, waarde) => { if (waarde) ap[sleutel] = true; else delete ap[sleutel]; return ap; };

  return { LIJST, KEUZES, aan, zet };
});
