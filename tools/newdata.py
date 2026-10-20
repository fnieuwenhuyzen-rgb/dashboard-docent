import json, datetime as dt

D = json.load(open('data.json'))
KAL = {w['w']: w for w in D['kalender']['weken']}

COMMON = {
    1: 'ma–di startdagen',
    7: 'wo 14 okt ontwikkeldag (lln vrij)',
    10: 'activiteitenweek A',
    11: 'ma 16 nov start periode 2',
    15: 'activiteitenweek B · vr 18 dec kerstviering',
    16: 'ma 4 jan studiedag (lln vrij)',
    17: 'vr 15 jan Sing-In · za 16 jan open dag',
    18: 'ma 18 jan ontwikkeldag secties (lln vrij)',
    20: 'activiteitenweek C',
    21: 'ma 8 feb start periode 3',
    22: 'wo 17 feb Sing-In · vr 19 feb extra vrije dag',
    23: 'do 4 mrt PMZingt!',
    24: 'vr 12 mrt ontwikkeldag teams (lln vrij)',
    26: 'activiteitenweek D · vr 26 mrt Goede Vrijdag',
    27: 'ma 29 mrt tweede paasdag',
    29: 'vr 16 apr Sing-In',
    31: 'activiteitenweek E · start periode 4',
    32: 'ma 17 mei tweede pinksterdag',
    34: 'di 1 jun ontwikkeldag secties (lln vrij)',
}

def leeg():
    return {'type': 'leeg', 'titel': 'Nog in te vullen'}

def blok(id, titel, weken, kleur, toets='', **kw):
    b = {'id': id, 'titel': titel, 'weken': weken, 'toets': toets, 'kleur': kleur,
         'doelen': [], 'routekaart': [], 'vragen': [], 'inzichten': [], 'kennen': '', 'kunnen': [],
         'identiteit': '', 'toetsing': ''}
    b.update(kw)
    return b

def toets(id, naam, soort, weging, week, waar, stof, blokid, herk=False, herkansing='', duur=45, domein=None):
    return {'id': id, 'naam': naam, 'soort': soort, 'weging': weging, 'week': week,
            'datum': KAL[week]['datum'], 'waar': waar, 'duur': duur, 'herkansbaar': herk,
            'herkansing': herkansing, 'domein': domein or ([] ), 'stof': stof, 'blok': blokid}

def klas(meta, blokken, toetsen, events={}, uitval={}, toetsweek={}, hd=None, n=1, laatste=38):
    weken = []
    for w in range(1, laatste + 1):
        b = next(x['id'] for x in blokken if x['weken'][0] <= w <= x['weken'][1])
        e = {'w': w, 'blok': b}
        ev = events.get(w, COMMON.get(w))
        if ev:
            e['event'] = ev
        t = next((t for t in toetsen if t['week'] == w), None)
        for li in range(1, n + 1):
            tt = t if li == 1 else None
            if w in toetsweek:
                code, titel = toetsweek[w]
                e['toetsweek'] = code
                e[f'l{li}'] = {'type': 'toets', 'toets': tt['id'], 'titel': f"{titel}: {tt['id']} {tt['naam']}"} if tt else {'type': 'toetsweek', 'titel': titel}
            elif tt:
                e[f'l{li}'] = {'type': 'toets', 'toets': tt['id'], 'titel': f"{tt['id']}: {tt['naam']}"}
            elif w in uitval:
                e[f'l{li}'] = {'type': 'uitval', 'titel': 'Valt uit: ' + uitval[w]}
            else:
                e[f'l{li}'] = leeg()
        weken.append(e)
    base = dict(meta)
    base.update({'schooljaar': '2026-2027', 'lessenPerWeek': n, 'lesdagen': None, 'lesduurMin': 45, 'syllabus': 'geen'})
    return {'meta': base, 'blokken': blokken, 'toetsen': toetsen, 'handelingsdelen': hd or [],
            'syllabusLaterJaren': [], 'kaarten': {}, 'kaartenNogTeMaken': [], 'messiah': [], 'weken': weken}

PTO_KOP = 'PTO 2026-2027 zoals ingevoerd in web.csgpm.nl: elke toets 45 minuten, weging 10, afgenomen in de les. Verplaats een toets naar een andere lesweek als de planning anders loopt.'
VWP = 'Vakwerkplan muziek 2026-2027 (3.3.4 leerlijnen onderbouw, bijlage B PTO), jaarplanning 2026-2027 (versie 10 okt).'

KLAS3_IDENT = 'In samenspel heeft iedereen een eigen partij en is iedereen nodig. Bij bands en orkesten zien leerlingen hoe samenwerking in de muziekwereld werkt (bouwsteen solidariteit, vakwerkplan 2.2).'
KLAS3_KENNEN = 'Samenspelen met de songboxen van dit jaar uit Musicbox, in bandbezetting. Wat in klas 1 en 2 is geleerd, komt hier in de praktijk.'
SPEEL = ('Je speelt voor de docent, niet voor de klas. Ook in een groep krijgt iedereen een eigen cijfer. '
         'Spelen telt dubbel (samenspel, ritme, toon, techniek), reflectie enkel (eigen reflectie, feedback op groepsgenoten): spelen is 80%. '
         'Niveaus: onvoldoende 4, voldoende 6, goed 8, uitstekend 10. Materiaal: infoblad, presentatie, reflectieformulier en scorelijst speelstuk.')
SONGBOX = 'Songboxen van dit jaar nog vastleggen.'

def klas3(niveau, code, p1naam, events, uitval, tw_titel, extra_kmu=False):
    bl = [
        blok('P1', 'Samenspelen in bandbezetting', [1, 10], 'band', kennen=KLAS3_KENNEN,
             kunnen=['Eigen partij spelen in een band', 'Samen een song van begin tot eind spelen'], identiteit=KLAS3_IDENT,
             toetsing=SONGBOX),
        blok('P2', 'Samenspelen: ' + p1naam.lower() + ' (P1)', [11, 20], 'speel', 'P1', kennen=KLAS3_KENNEN,
             kunnen=['Een lied of speelstuk in een groep uitvoeren', 'Reflecteren op eigen spel en feedback geven aan groepsgenoten'],
             identiteit=KLAS3_IDENT, toetsing='P1 ' + p1naam.lower() + ' (PTO periode 2, niet herkansbaar). ' + SPEEL),
        blok('P3', 'Instrumenten, bands en orkesten (T1)', [21, 30], 'orkest', 'T1',
             kennen='Theoriedeel klas 3: instrumenten, bands en orkesten. Afgesloten met een PTO-toets (vakwerkplan 3.3.4).',
             identiteit=KLAS3_IDENT,
             toetsing='T1 theorietoets (PTO periode 3, niet herkansbaar). Titel in het PTO 2026-2027: herhaling alle behandelde thema\'s; vanaf 2027-2028: instrumenten, bands en orkesten.'),
        blok('P4', 'Samenspelen, periode 4', [31, 38], 'band', kennen=KLAS3_KENNEN, identiteit=KLAS3_IDENT, toetsing=SONGBOX),
    ]
    ts = [
        toets('P1', p1naam, 'praktijk', 10, 19, 'in de les, periode 2 (week nog kiezen)', SPEEL, 'P2'),
        toets('T1', "Herhaling alle behandelde thema's", 'theorie', 10, 29, 'in de les, periode 3 (week nog kiezen)',
              'Instrumenten, bands en orkesten (theoriedeel klas 3).', 'P3'),
    ]
    meta = {'klas': niveau, 'klassen': code, 'concept': True,
            'bron': VWP + ' Er is nog geen studiewijzer: de blokken volgen de leerlijn klas 3, de lessen vul je zelf in.',
            'seAandeel': 'P1 en T1, elk weging 10', 'toetsKop': PTO_KOP, 'pto': True}
    return klas(meta, bl, ts, events, uitval, {38: ('TW', tw_titel)})

H3_EV = dict(COMMON)
H3_EV.update({10: 'activiteitenweek A: profielkeuzeweek di–vr · do avond voorlichting profielkeuze h3',
              14: 'di 8 dec herkansingen PTO',
              26: 'activiteitenweek D: ma–wo themamomenten Pasen · di herkansingen PTO · do burgerschapsdag h3 · vr Goede Vrijdag',
              30: 'di–vr burgerschapsweek h3',
              38: 'toetsweek havo 3 van di 29 jun t/m di 6 jul'})
H3_UIT = {10: 'activiteitenweek A (profielkeuzeweek)', 26: 'activiteitenweek D (Pasen, burgerschapsdag)', 30: 'burgerschapsweek h3'}

V3_EV = dict(COMMON)
V3_EV.update({10: 'activiteitenweek A: profielkeuzeweek di–vr · do gymnasiumdag v3',
              14: 'di 8 dec herkansingen PTO',
              15: 'activiteitenweek B · wo 16 dec profielkeuzedag v3 · vr kerstviering',
              19: 'wo 27 jan avond voorlichting profielkeuze v3',
              20: 'activiteitenweek C · di–wo profielkeuzedag v3 (snuffelstage)',
              26: 'activiteitenweek D · di herkansingen PTO · wo dagexcursie v3 · do paasviering · vr Goede Vrijdag',
              31: 'activiteitenweek E · di dagexcursie Limburg',
              38: 'toetsweek vwo 3 van di 29 jun t/m di 6 jul'})
V3_UIT = {10: 'activiteitenweek A (profielkeuzeweek)'}

havo3 = klas3('havo 3', 'h3a, h3b, h3c, h3d', 'Presentatie lied of speelstuk', H3_EV, H3_UIT, 'Toetsweek havo 3')
vwo3 = klas3('vwo 3', 'v3a, v3b', 'Groepspresentatie lied', V3_EV, V3_UIT, 'Toetsweek vwo 3')

# mavo 3: begin examenprogramma (PTA)
M3_EV = dict(COMMON)
M3_EV.update({10: 'activiteitenweek A: profielkeuzeweek di–vr · do PM Doedag m23',
              14: 'ma 7 dec avond voorlichting mbo',
              15: 'activiteitenweek B · di 15 dec herkansingen PTA · vr kerstviering',
              18: 'ma 18 jan ontwikkeldag secties (lln vrij) · di avond voorlichting vakkenpakket',
              19: 'di 26 jan avond voorlichting vakkenpakket',
              20: 'activiteitenweek C · di–wo stage m3',
              24: 'di 9 mrt herkansingen PTA · vr 12 mrt ontwikkeldag teams (lln vrij)',
              26: 'activiteitenweek D · di LOB kennismaken mbo · do dagexcursie Brussel en paasviering · vr Goede Vrijdag',
              28: 'toetsweek 3 (ma 5 t/m di 13 apr)',
              29: 'toetsweek 3 t/m di 13 apr · vr 16 apr Sing-In',
              31: 'activiteitenweek E: meerdaagse excursie m3 di–vr',
              32: 'ma 17 mei tweede pinksterdag · di herkansingen PTA',
              37: 'toetsweek 4 vanaf wo 23 jun',
              38: 'toetsweek 4 t/m vr 2 jul'})
M3_KENNEN = 'De basisbegrippen ritme, maat, tempo, toonhoogte, dynamiek en klankkleur, via Musicbox. Oriëntatie op muziek in het werkveld.'
M3_KUNNEN = ['Presenteren met zang', 'Presenteren met een akkoordinstrument', 'Presenteren met slagwerk']
m3bl = [
    blok('P1', 'Basisbegrippen en presentatie 1', [1, 10], 'leer', kennen=M3_KENNEN, kunnen=M3_KUNNEN),
    blok('P2', 'Basisbegrippen en presentatie 2', [11, 20], 'speel', kennen=M3_KENNEN, kunnen=M3_KUNNEN),
    blok('P3', 'Luistertoets begrippen (T1) en presentatie 3', [21, 30], 'orkest', 'T1', kennen=M3_KENNEN, kunnen=M3_KUNNEN,
         toetsing='T1 luistertoets begrippen in Musicbox, in toetsweek 3 (PTA, weging 15).'),
    blok('P4', 'Muziek in het werkveld en afronding P1', [31, 38], 'open', 'P1', kennen=M3_KENNEN,
         kunnen=['Presenteren hoe muziek een rol speelt in het werkveld dat je interesseert (loopbaanpresentatie)'],
         toetsing='P1 is het gemiddelde van minstens drie presentaties (PTA, weging 15, eind jaar). Handelingsdeel: loopbaanpresentatie.'),
]
m3ts = [
    toets('T1', 'Luistertoets begrippen', 'theorie', 15, 28, 'toetsweek 3 (5–13 apr), in Musicbox', M3_KENNEN, 'P1+P2+P3', herk=None, duur=None),
    toets('P1', 'Praktijk: gemiddelde van minstens drie presentaties', 'praktijk', 15, 36,
          'eind jaar, in de les (presentaties verspreid over het jaar)', 'Presentaties met zang, akkoordinstrument en slagwerk.', 'P1+P2+P3+P4', herk=None, duur=None),
]
mavo3 = klas({'klas': 'mavo 3', 'klassen': 'm3a, m3b, m3c', 'concept': True,
              'bron': 'Vakwerkplan muziek 2026-2027 (3.3.3 bovenbouw mavo, 5.3 PTA mavo), jaarplanning 2026-2027. In mavo 3 begint het examenprogramma. De verdeling over de blokken is een voorstel; de lessen vul je zelf in.',
              'seAandeel': 'P1 en T1, elk weging 15 (PTA mavo 3)', 'toetsKop': 'PTA mavo 3 volgens het vakwerkplan: P1 praktijk (gemiddelde van minstens drie presentaties, eind jaar) en T1 luistertoets begrippen in toetsweek 3. Duur en herkansing staan in het PTA.', 'pta': True},
             m3bl, m3ts, M3_EV, {10: 'activiteitenweek A (profielkeuzeweek)', 31: 'meerdaagse excursie m3'},
             {28: ('TW3', 'Toetsweek 3'), 29: ('TW3', 'Toetsweek 3'), 38: ('TW4', 'Toetsweek 4')},
             hd=[{'id': 'H1', 'naam': 'Loopbaanpresentatie: muziek in het werkveld dat je interesseert', 'datum': None, 'week': None, 'deadline': None}])

# BB1: leerlijn klas 1
B1_EV = dict(COMMON)
B1_EV.update({10: 'activiteitenweek A · vr dagexcursie Rotterdam h1',
              14: 'di 8 dec herkansingen PTO',
              26: 'activiteitenweek D: ma–wo themamomenten Pasen h123 · di herkansingen PTO · vr Goede Vrijdag'})
K1_IDENT = 'Bij de jaaropening leren leerlingen elk jaar een nieuw lied bij een Bijbeltekst (bouwstenen identiteit en solidariteit, vakwerkplan 2.2).'
b1bl = [
    blok('P1', 'Je instrument leren kennen', [1, 10], 'leer',
         kennen='Tutorials voor gitaar, piano, ukelele en percussie in Musicbox.', kunnen=['Basisgrepen en -ritmes op gitaar, piano, ukelele en percussie'], identiteit=K1_IDENT),
    blok('P2', 'Songs, toonhoogte en maat en ritme', [11, 20], 'speel', 'P1/T1',
         kennen='Boxen Toonhoogte en Maat en Ritme; de theorie meteen toepassen in de songs.', kunnen=['Een lied begeleiden op gitaar'], identiteit=K1_IDENT,
         toetsing='P1 liedpresentatie met gitaar en T1 maat, ritme, toonhoogte en onderdelen van de gitaar (beide periode 2). BB1 staat niet apart in het PTO: overgenomen van m1 en v1, nog bevestigen.'),
    blok('P3', 'Samen spelen: populaire songs', [21, 30], 'band',
         kennen='Memories (Maroon 5), Riptide (Vance Joy) en Birds of a Feather (Billie Eilish).', kunnen=['Samen een song spelen'], identiteit=K1_IDENT),
    blok('P4', 'Samen spelen, periode 4', [31, 38], 'band', identiteit=K1_IDENT),
]
b1ts = [
    toets('P1', 'Liedpresentatie met gitaar', 'praktijk', 10, 17, 'in de les, periode 2 (week nog kiezen)',
          'Een eenvoudig lied begeleiden met gitaartabs of met twee of drie akkoorden. BB1 staat niet apart in het PTO; overgenomen van m1 en v1.', 'P2', herk=True, herkansing='di 23 mrt (herkansing PTO)'),
    toets('T1', 'Maat, ritme, toonhoogte en onderdelen van de gitaar', 'theorie', 10, 19, 'in de les, periode 2 (week nog kiezen)',
          'Melodieën herkennen, maten en ritmes herkennen in fragmenten of bladmuziek, onderdelen van de gitaar benoemen. BB1 staat niet apart in het PTO; overgenomen van m1 en v1.', 'P2'),
]
bb1 = klas({'klas': 'BB1', 'klassen': 'BB1 (brede brugklas)', 'concept': True,
            'bron': 'Vakwerkplan muziek 2026-2027 (3.3.4 leerlijn klas 1), jaarplanning 2026-2027. BB1 staat niet in het PTO-overzicht: de toetsen zijn overgenomen van m1 en v1. De lessen vul je zelf in.',
            'seAandeel': 'P1 en T1, elk weging 10', 'toetsKop': PTO_KOP + ' BB1 staat niet apart in het PTO: P1 en T1 zijn overgenomen van m1 en v1. Bevestig dit nog.', 'pto': True},
           b1bl, b1ts, B1_EV, {10: 'activiteitenweek A'})

# keuzeuur havo 3: nog te ontwerpen
kbl = [blok(f'P{i}', f'Periode {i}', r, 'open') for i, r in enumerate([[1, 10], [11, 20], [21, 30], [31, 38]], 1)]
kmu3 = klas({'klas': 'keuzeuur muziek havo 3', 'klassen': 'keuzeuur h3 (kmu)', 'concept': True,
             'bron': 'Keuzeuur muziek havo 3, één uur per week. Het lesmateriaal moet nog ontworpen worden: alle lessen staan open, de blokken zijn alleen de periodes.',
             'seAandeel': 'nog geen toetsen', 'toetsKop': 'Voor het keuzeuur zijn nog geen toetsen vastgelegd.', 'pto': True},
            kbl, [], H3_EV, H3_UIT, {38: ('TW', 'Toetsweek havo 3')})


# mavo 4: examenklas, twee lessen per week tot de meivakantie
M4_EV = dict(COMMON)
M4_EV.update({8: 'di 27 okt avond voorlichting ouders mavo 4',
              9: 'toetsweek 1 (ma 2 t/m di 10 nov)',
              10: 'toetsweek 1 t/m di 10 nov · activiteitenweek A',
              15: 'activiteitenweek B · di 15 dec herkansingen PTA · do dagexcursie Amsterdam m4 · vr kerstviering',
              18: 'toetsweek 2 (ma 18 t/m di 26 jan)',
              19: 'toetsweek 2 t/m di 26 jan',
              22: 'examenconcert vóór 1 maart · wo 17 feb Sing-In · do 18 feb De Doelen · vr 19 feb extra vrije dag',
              24: 'di 9 mrt herkansingen PTA · vr 12 mrt ontwikkeldag teams en Messiah Leiden',
              26: 'activiteitenweek D · do paasviering m1234 · vr Goede Vrijdag',
              27: 'ma 29 mrt tweede paasdag · vr 2 apr start toetsweek 3',
              28: 'toetsweek 3 (vr 2 t/m do 15 apr)',
              29: 'toetsweek 3 t/m do 15 apr',
              30: 'wo 21 apr examenuitje mavo · laatste lesweek; centraal examen vanaf vr 14 mei'})
M4_KENNEN = 'Examenvoorbereiding met de volledige begrippenlijst, instrumenten en klankkleur (vakwerkplan 3.3.3).'
m4bl = [
    blok('B1', 'Begrippen, instrumenten en klankkleur', [1, 10], 'leer', kennen=M4_KENNEN),
    blok('B2', 'Proefexamen (T3) en examenconcert (P2)', [11, 22], 'speel', 'T3/P2', kennen=M4_KENNEN,
         kunnen=['Het examenconcert voorbereiden en uitvoeren, inclusief de organisatie'],
         toetsing='T3 examengerichte luistertoets (proefexamen) in toetsweek 2, weging 20. P2 examenconcert vóór 1 maart, weging 40.'),
    blok('B3', 'Eindopdracht en examentraining', [23, 30], 'orkest', 'P3', kennen=M4_KENNEN,
         kunnen=['Eindopdracht over muziek in relatie tot een andere kunstvorm'],
         toetsing='P3 eindopdracht muziek en andere kunst in periode 3, weging 10. Daarna examentraining tot het centraal examen.'),
]
m4ts = [
    toets('T3', 'Examengerichte luistertoets (proefexamen)', 'theorie', 20, 18, 'toetsweek 2 (18–26 jan)', M4_KENNEN, 'B1+B2', herk=None, duur=None),
    toets('P2', 'Examenconcert', 'praktijk', 40, 22, 'vóór 1 maart (datum nog vastleggen)', 'Optreden voor publiek; leerlingen verzorgen ook de organisatie (vakwerkplan 5.3).', 'B2', herk=None, duur=None),
    toets('P3', 'Eindopdracht muziek en andere kunst', 'theorie', 10, 29, 'periode 3 (inleverdatum nog vastleggen)', 'Muziek in relatie tot een andere kunstvorm.', 'B3', herk=None, duur=None),
]
mavo4 = klas({'klas': 'mavo 4', 'klassen': 'm4 (keuzevak)', 'concept': True,
              'bron': 'Vakwerkplan muziek 2026-2027 (3.3.3 bovenbouw mavo, 5.3 PTA mavo), jaarplanning 2026-2027. Aanname: twee lessen per week tot de meivakantie. Er is nog geen studiewijzer in het dashboard: de lessen vul je zelf in.',
              'seAandeel': 'P2 40, P3 10, T3 20 (met mavo 3: P1 15, T1 15)',
              'toetsKop': 'PTA mavo 4 volgens het vakwerkplan: T3 proefexamen in toetsweek 2, P2 examenconcert vóór 1 maart, P3 eindopdracht in periode 3. Samen met P1 en T1 uit mavo 3 vormen ze het schoolexamen. Duur en herkansing staan in het PTA.', 'pta': True},
             m4bl, m4ts, M4_EV, {10: 'toetsweek 1 en activiteitenweek A'},
             {9: ('TW1', 'Toetsweek 1: geen muziektoets'), 18: ('TW2', 'Toetsweek 2'), 19: ('TW2', 'Toetsweek 2'), 28: ('TW3', 'Toetsweek 3: geen muziektoets'), 29: ('TW3', 'Toetsweek 3')},
             hd=[{'id': 'H1', 'naam': 'Messiah in Leiden', 'datum': '2027-03-12', 'week': 24, 'deadline': None},
                 {'id': 'H2', 'naam': 'Concertbezoek', 'datum': None, 'week': None, 'deadline': None}],
             n=2, laatste=30)

D['klassen'].update({'bb1': bb1, 'havo3': havo3, 'kmu3': kmu3, 'vwo3': vwo3, 'mavo3': mavo3, 'mavo4': mavo4})

# ---------- sectievoorzitter ----------
S = []
def it(id, d, titel, soort, tijd='', tot=None, info='', taak=False, bevestigen=False):
    x = {'id': id, 'd': d, 'titel': titel, 'soort': soort}
    if tijd: x['tijd'] = tijd
    if tot: x['tot'] = tot
    if info: x['info'] = info
    if taak: x['taak'] = True
    if bevestigen: x['bevestigen'] = True
    S.append(x)

def add(d, n):
    return (dt.date.fromisoformat(d) + dt.timedelta(days=n)).isoformat()

def kort(d):
    m = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec']
    x = dt.date.fromisoformat(d)
    return f'{x.day} {m[x.month-1]}'

SV = [
    ('sv1', '2026-09-15', 'Start schooljaar'),
    ('sv2', '2026-10-13', 'Vakwerkplan, lokalenvoorstel, begroting, tutorials, nulmeting taal, burgerschap, PTA-punten'),
    ('sv3', '2027-01-12', 'Concept leerlijn onderbouw met vaktaal en bouwstenen · tussenevaluatie bovenbouw · resultaten toetsweek 1 · urentabel, verdeling actiepunten en onverdeelde lesuren'),
    ('sv4', '2027-02-16', 'Tussenstand budget · good practice taal · examenvoorbereiding mavo 4 · resultaten toetsweek 2 · stand lokalenvoorstel'),
    ('sv5', '2027-04-06', 'Leerlijn onderbouw vaststellen, met taal en burgerschap'),
    ('sv6', '2027-05-25', 'Voorstel PTO 2027-2028 met taalcontrole · materiaal tutorials · resultaten toetsweek 3'),
    ('sv7', '2027-06-22', 'Evaluatie actieplan · vooruitblik 2027-2028 · jaarverslag'),
]
for id, d, inf in SV:
    it(id, d, 'Sectievergadering', 'sectie', '15:00–16:30', info=inf)
    if d > '2026-10-20':
        it(id + '-ag', add(d, -7), f'Agenda sectievergadering {kort(d)} versturen', 'taak', taak=True,
           info='Vast begin: besluiten- en actielijst (5 min) en taal (10 min).')
        it(id + '-vs', add(d, 2), f'Verslag en besluitenlijst van {kort(d)} delen in Teams', 'taak', taak=True)
for i, d in enumerate(['2026-12-01', '2027-03-02', '2027-06-01'], 1):
    it(f'slo{i}', d, 'Sectieleidersoverleg', 'overleg', '13:45–16:30')
    it(f'slo{i}-tk', add(d, 2), f'Terugkoppeling sectieleidersoverleg {kort(d)}: drie regels voor de volgende sectievergadering', 'taak', taak=True)
it('sd1', '2027-01-04', 'Jaaropening en studiedag personeel (lln vrij)', 'overleg', '08:30–16:30')
it('od2', '2027-01-18', 'Ontwikkeldag 2: secties (lln vrij)', 'overleg', info='Een dag voor de sectie.')
it('od2-pr', '2027-01-11', 'Programma ontwikkeldag 18 jan afspreken met Van Heemst en Roodnat', 'taak', taak=True)
it('od3', '2027-03-12', 'Ontwikkeldag 3: teams (lln vrij)', 'overleg')
it('od4', '2027-06-01', 'Ontwikkeldag 4: secties (lln vrij)', 'overleg', info='Valt samen met het sectieleidersoverleg.')
it('od4-pr', '2027-05-25', 'Programma ontwikkeldag 1 jun afspreken (in de sectievergadering)', 'taak', taak=True)
it('ws1', '2026-10-27', 'Workshop basisvaardigheden: formuleren', 'overleg', '13:45–15:30', info='Sluit aan bij het taaldoel formuleren in het vakwerkplan.')
for i, (d, tijd) in enumerate([('2026-11-10', '15:00–16:30'), ('2027-04-13', '15:00–16:30'), ('2027-06-29', '13:45–15:00')], 1):
    it(f'bbv{i}', d, 'Vergadering docenten brede brugklas', 'overleg', tijd, info='Voor BB1.')
for i, d in enumerate(['2026-11-17', '2027-01-05', '2027-02-09', '2027-03-30', '2027-05-18', '2027-06-15'], 1):
    it(f'llb{i}', d, 'Mentorenoverleg en leerlingbespreking', 'overleg', '15:00–16:30')
it('rv1', '2026-11-24', 'Rapportvergaderingen rapport 1', 'rapport', '13:45–15:00')
it('rv2', '2027-03-09', 'Rapportvergaderingen rapport 2', 'rapport', '13:45–16:30')
it('ca1', '2026-11-30', 'Contactavond rapport 1', 'rapport', '18:30–22:00')
it('ca2', '2026-12-02', 'Contactavond rapport 1 (online)', 'rapport', '18:30–22:00')
it('ca3', '2027-03-16', 'Contactavond rapport 2', 'rapport', '18:30–22:00')
it('ca4', '2027-03-18', 'Contactavond rapport 2 (online)', 'rapport', '18:30–22:00')
it('ov1', '2027-07-09', 'Overgangsvergaderingen', 'rapport', tot='2027-07-13')
it('ci1', '2026-11-17', 'Cijfers rapport 1 ingevoerd in Magister', 'cijfers', taak=True, bevestigen=True,
   info='Datum is een aanname: een week vóór de rapportvergadering van 24 nov. Zet de echte deadline hier zodra je die hebt.')
it('ci2', '2027-03-02', 'Cijfers rapport 2 ingevoerd in Magister', 'cijfers', taak=True, bevestigen=True,
   info='Datum is een aanname: een week vóór de rapportvergadering van 9 mrt.')
it('ci3', '2027-07-07', 'Eindcijfers ingevoerd in Magister', 'cijfers', taak=True, bevestigen=True,
   info='Datum is een aanname: vóór de overgangsvergaderingen van 9 juli. De toetsweek van havo 3 en vwo 3 loopt tot en met 6 juli.')
it('tw1', '2026-11-02', 'Toetsweek 1 (h4, h5, v4, v5, m4)', 'toets', tot='2026-11-10')
it('tw2', '2027-01-18', 'Toetsweek 2 (h4, h5, v4, v5, m4)', 'toets', tot='2027-01-29')
it('tw3', '2027-04-01', 'Toetsweek 3 (h4, h5, v4, v5, m3, m4)', 'toets', tot='2027-04-15')
it('tw4', '2027-06-23', 'Toetsweek 4 (h4, v4, v5, m3)', 'toets', tot='2027-07-02')
it('tw5', '2027-06-29', 'Toetsweek havo 3 en vwo 3', 'toets', tot='2027-07-06')
it('hpto1', '2026-12-08', 'Herkansingen PTO', 'toets', '12:50–13:35')
it('hpto2', '2027-03-23', 'Herkansingen PTO', 'toets', '12:50–13:35')
it('hpta1', '2026-12-15', 'Herkansingen PTA', 'toets')
it('hpta2', '2027-03-09', 'Herkansingen PTA', 'toets')
it('hpta3', '2027-05-18', 'Herkansingen PTA', 'toets')
it('per2', '2026-11-16', 'Start periode 2', 'toets')
it('per3', '2027-02-08', 'Start periode 3', 'toets')
it('per4', '2027-04-26', 'Start periode 4', 'toets')
it('res1', '2027-01-05', 'Resultaten toetsweek 1 klaarzetten: gemiddelde, onvoldoendes, opvallende vragen', 'taak', taak=True)
it('res2', '2027-02-09', 'Resultaten toetsweek 2 klaarzetten', 'taak', taak=True)
it('res3', '2027-05-18', 'Resultaten toetsweek 3 klaarzetten', 'taak', taak=True)
it('pk1', '2026-11-10', 'Profielkeuzeweek mavo 3, havo 3 en vwo 3', 'keuze', tot='2026-11-13', info='Het moment om muziek als keuzevak zichtbaar te maken.')
it('pk1-t', '2026-11-09', 'Muziek als keuzevak presenteren in de profielkeuzeweek', 'taak', taak=True)
it('vh3', '2026-11-12', 'Online voorlichting profielkeuze havo 3', 'keuze', '19:30–21:30')
it('pkv1', '2026-12-16', 'Profielkeuzedag vwo 3', 'keuze')
it('od', '2027-01-16', 'Open dag', 'keuze', '10:00–15:00')
it('od-t', '2027-01-08', 'Muziek op de open dag regelen (koor, bovenbouwleerlingen)', 'taak', taak=True)
it('vm1', '2027-01-19', 'Voorlichting vakkenpakket mavo 3 (online)', 'keuze', '19:30–21:30')
it('vm2', '2027-01-26', 'Voorlichting vakkenpakket mavo 2 en 3 (online)', 'keuze', '19:30–21:30')
it('vv3', '2027-01-27', 'Online voorlichting profielkeuze vwo 3', 'keuze', '19:30–20:15')
it('pkv2', '2027-02-02', 'Profielkeuzedag vwo 3 (snuffelstage)', 'keuze')
it('kv', '2026-12-18', 'Kerstvieringen', 'muziek')
it('si1', '2027-01-15', 'Sing-In (aula, in de pauzes)', 'muziek')
it('si2', '2027-02-17', 'Sing-In (aula, in de pauzes)', 'muziek')
it('si3', '2027-04-16', 'Sing-In (aula, in de pauzes)', 'muziek')
it('doe', '2027-02-18', 'Concertbezoek De Doelen', 'muziek', '18:00–23:00')
it('pmz', '2027-03-04', 'PMZingt!', 'muziek', '19:30–21:30')
it('mes', '2027-03-12', 'Messiah-uitvoering Leiden', 'muziek')
it('bud', '2027-02-09', 'Budgettussenstand op één A4: budget, besteed, nog gepland', 'taak', taak=True)
it('ll1', '2027-01-05', 'Concept leerlijn onderbouw met vaktaal en bouwstenen klaar', 'taak', taak=True)
it('ll2', '2027-03-30', 'Leerlijn onderbouw klaar voor vaststelling op 6 apr', 'taak', taak=True)
it('pto1', '2027-05-18', 'Voorstel PTO 2027-2028 met taalcontrole klaar', 'taak', taak=True)
it('pto2', '2027-07-09', 'PTO 2027-2028 ingevoerd in web.csgpm.nl (vóór de zomervakantie)', 'taak', taak=True,
   info='Docenten vullen vóór de zomervakantie in; de sectieleider controleert in de eerste week na de vakantie.')
it('jv', '2027-06-15', 'Jaarverslag van één A4: wat is gelukt, wat niet, wat volgend jaar', 'taak', taak=True)
for id, t in [('st1', 'Lokalenvoorstel: ingediende versie in de map zetten, of een nieuwe datum afspreken met de schoolleiding'),
              ('st2', 'Mappenstructuur 00 Sectie doorvoeren'),
              ('st3', 'Besluiten- en actielijst 2026-2027 aanmaken en vullen met de besluiten tot nu toe'),
              ('st4', 'Verslag van 13 oktober (en kort van 15 september) in de map zetten en delen in Teams')]:
    it(id, '2026-10-26', t, 'taak', taak=True, info='Eerste stap uit Werkwijze sectievoorzitter muziek.')
it('st5', '2027-01-05', 'Urentabel, verdeling actiepunten en de vijf onverdeelde lesuren op de agenda van 12 jan', 'taak', taak=True)

S.sort(key=lambda x: (x['d'], x.get('tijd', '')))
D['sectie'] = S
json.dump(D, open('data2.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(S), 'sectie-items;', {k: len(v['weken']) for k, v in D['klassen'].items()})

# ---------- mavo 4: invulling op lesniveau (syllabus CE vmbo, PTA, Musicbox) ----------
SYL_M = {'a': 'ritme', 'b': 'maat', 'c': 'tempo', 'd': 'toonhoogte', 'e': 'toonsoort', 'f': 'dynamiek', 'g': 'samenklank',
         'h': 'uitvoeringspraktijk', 'i': 'klankkleur', 'j': 'melodische relaties', 'l': 'variatie',
         'o': 'homofone en polyfone structuren', 'p': 'opera en musical', 'q': 'vorm',
         's': 'muziek en maatschappij (K8)', 't': 'muziek en andere kunsten (K9)'}
m4 = D['klassen']['mavo4']
m4['meta']['syllabus'] = SYL_M
m4['meta']['syllabusNaam'] = 'Syllabus centraal examen muziek vmbo gl/tl (CvTE): de begrippen van K3, beluisteren (K7), muziek en maatschappij (K8) en muziek en andere kunsten (K9). Letters k, m, n en r komen in de vmbo-syllabus niet voor.'
m4['meta']['bron'] = ('Lesplan op basis van de syllabus centraal examen muziek vmbo gl/tl, het PTA mavo 4 uit het vakwerkplan en de Musicbox-boxen '
                      'die ook in de studiewijzers bovenbouw staan. Les 1 is theorie en luisteren, les 2 is praktijk: examenconcert en daarna de eindopdracht. '
                      'Aanname: twee lessen per week tot de meivakantie. Controleer de boxnamen in Musicbox op het mavo-niveau.')
for t in m4['toetsen']:
    if t['id'] == 'T3':
        t['syllabus'] = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'l', 'o', 'p', 'q']
        t['stof'] = 'Alle begrippen uit de syllabus (K3) en beluisteren (K7), in de vorm van het centraal examen: luisteren met koptelefoon, vragen in Facet-stijl, notatie in een uitwerkbijlage.'
    if t['id'] == 'P3':
        t['week'] = 27; t['datum'] = KAL[27]['datum']; t['waar'] = 'periode 3, inleveren in lesweek 27 (vóór toetsweek 3)'

def L(type, titel, detail='', syll=None, mb='', learn='', doel='', fs='', ft=''):
    l = {'type': type, 'titel': titel}
    if detail: l['detail'] = detail
    if syll: l['syll'] = syll
    if doel: l['doel'] = doel
    if fs or ft: l['formatief'] = {'soort': fs, 'tekst': ft}
    l['_mb'] = mb; l['_learn'] = learn
    return l

T, P = 'theorie', 'praktijk'
PLAN = {
 1: (L(T, 'Wat komt er op het examen?', 'Centraal examen muziek in Facet: luisteren met koptelefoon, vragen op de computer, notatie in een uitwerkbijlage. Schoolexamen: T3, P2 en P3 (met P1 en T1 uit mavo 3). Een vraag uit een oud examen samen maken.',
       doel='Je weet uit welke delen je examen bestaat en wanneer elk deel komt.', fs='exit ticket', ft='Noem de drie SE-onderdelen van dit jaar en de maand waarin ze komen.'),
     L(P, 'Examenconcert: opdracht en taken', 'Wat is het examenconcert, wanneer (vóór 1 maart), wie doet wat: planning, begroting, publiciteit, techniek. Eerste ideeën voor repertoire en bezetting.')),
 2: (L(T, 'Ritme: notenwaarden en ritmische figuren', 'Hele tot zestiende noten en rusten, punt, verbindingsboog, achtstentriool. Syncope, break, fill, ritmisch ostinato, swing.', ['a'], 'Ritmische figuren: triolen en syncope', 'notenwaarden, rusten, punt, boog, triool, syncope, break, fill, ostinato',
       fs='luisterdictee', ft='Vier ritmes klappen en noteren; samen nakijken.'),
     L(P, 'Repertoire en bezetting kiezen', 'Groepen maken, stukken kiezen, wie speelt wat. Elke leerling heeft een eigen partij.')),
 3: (L(T, 'Maat: maatsoorten en opmaat', 'Maatsoorten 2/4, 3/4, 4/4, C, 6/8 en 3/8; maataccenten, maatstreep, opmaat, maatwisseling; beat en afterbeat.', ['b'], 'Trainerz: maat en ritme', 'maatsoorten, opmaat, maatwisseling, beat, afterbeat'),
     L(P, 'Repetitie 1: partijen leren', 'Partijen verdelen en per instrument oefenen.')),
 4: (L(T, 'Tempo en dynamiek', 'Adagio, andante, allegro; slow, medium, uptempo; accelerando en ritenuto. ff tot pp, crescendo, decrescendo, fade out, overgangs- en terrassendynamiek.', ['c', 'f'], 'Trainerz: tempo en dynamiek', 'tempoaanduidingen klassiek en pop, accelerando, ritenuto, dynamiektekens, fade out, terrassendynamiek'),
     L(P, 'Repetitie 2: samen beginnen en eindigen', 'Inzet, tempo vasthouden, afsluiting.')),
 5: (L(T, 'Toonhoogte en toonsoort', 'Notennamen, g-sleutel, f-sleutel herkennen, voortekens (kruis, mol, herstellingsteken). Majeur en mineur op gehoor onderscheiden.', ['d', 'e'], 'Toonsoorten: mollen en kruizen', 'notennamen, g-sleutel, voortekens, majeur, mineur'),
     L(P, 'Repetitie 3 en organisatie verdelen', 'Taken voor het concert verdelen: publiciteit, techniek, planning, begroting.')),
 6: (L(T, 'Klankkleur: instrumenten', 'Slag-, blaas-, snaar- en elektronische instrumenten herkennen op gehoor en beeld.', ['i'], 'Instrumenten en speeltechnieken', 'instrumentfamilies, instrumentnamen uit de begrippenlijst',
       fs='instrumentenbingo', ft='Bij vijf fragmenten het instrument en de familie noteren.'),
     L(P, 'Repetitie 4: dynamiek in het samenspel', 'Hard en zacht samen, wie heeft de melodie.')),
 7: (L(T, 'Klankkleur: stemmen en ensembles', 'Sopraan, alt, tenor, bas; vocale en instrumentale ensembles: koor, band, combo, orkest.', ['i'], 'Het orkest: orkestvormen en bezettingen · Koor en meerstemmigheid', 'stemsoorten, ensembles, orkestvormen'),
     L(P, 'Tussenstand: voorspelen met feedback', 'Elke groep speelt voor; feedback op samenspel, ritme en presentatie.', fs='voorspelen met feedback', ft='Twee tips en één top per groep.')),
 8: (L(T, 'Uitvoeringspraktijk', 'Legato, staccato; speeltechnieken zoals pizzicato, strijken, glissando, slappen, scratchen; a capella, akoestisch, elektronisch, tutti en solo, rappen.', ['h'], 'Uitvoering: articulatie en speeltechnieken', 'articulatie, speeltechnieken, uitvoeringswijzen'),
     L(P, 'Repetitie 5 en programma opzetten', 'Volgorde van het concert, presentatie tussen de nummers.')),
 11: (L(T, 'Samenklank', 'Eenstemmig, tweestemmig, meerstemmig; unisono; homofonie en polyfonie; spanning en ontspanning; akkoord en akkoordenschema.', ['g'], 'Samenklank: akkoorden en intervallen', 'eenstemmig, tweestemmig, unisono, homofonie, polyfonie, spanning en ontspanning'),
      L(P, 'Repetitie 6: podiumpresentatie', 'Opkomst, opstelling, contact met publiek.')),
 12: (L(T, 'Homofone en polyfone structuren', 'Parallelle beweging, tegenbeweging, imitatie, tegenmelodie, canon.', ['o', 'g'], 'Koor en meerstemmigheid: canon', 'parallel, tegenbeweging, imitatie, canon, tegenmelodie',
        fs='hand omhoog', ft='Hand omhoog bij elke nieuwe inzet in de canon.'),
      L(P, 'Organisatie: affiche, programma, begroting', 'Publiciteit en begroting in concept; techniek inventariseren.')),
 13: (L(T, 'Melodische relaties en variatie', 'Motief, thema, riff, ostinato, voorzin en nazin, sequens; improvisatie en variatie op melodie of ritme.', ['j', 'l'], 'Vorm en analyse: sequens, muzikale zinnen, melodievoering', 'motief, thema, riff, ostinato, voorzin, nazin, improvisatie, variatie'),
      L(P, 'Repetitie 7', 'Moeilijke passages apart oefenen.')),
 14: (L(T, 'Vorm', 'Letterschema; couplet en refrein, bridge, intro, tussenspel, coda. Een popnummer in kaart brengen.', ['q'], "Vorm en analyse: vormschema's, ostinato", 'vormschema, couplet, refrein, bridge, intro, tussenspel, coda',
        fs='blokkenschema', ft='Teken het vormschema van een nummer; vergelijk met je buur.'),
      L(P, 'Doorloop 1 met feedback', 'Het hele programma achter elkaar.')),
 15: (L(T, 'Opera en musical', 'Opera en musical herkennen; aria en song in de vraagstelling.', ['p', 'i'], 'Muziek en andere kunsten: theater en film', 'opera, musical, aria, song'),
      L(P, 'Repetitie 8', 'Activiteitenweek B: lessen kunnen uitvallen.')),
 16: (L(T, 'Herhaling begrippen K3', 'Alle begrippen met Trainerz; per leerling een lijst met eigen zwakke punten.', ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'q'], 'Trainerz: alle begrippen', 'begrippenlijst K3 herhalen'),
      L(P, 'Repetitie 9 en draaiboek', 'Draaiboek concert: tijden, techniek, wie doet wat.')),
 17: (L(T, 'Oefenexamen in Facet-stijl', 'Een deel van een oud centraal examen maken met koptelefoon; nabespreken per begrip.', ['a', 'b', 'f', 'g', 'i', 'q'], 'oefenexamen vmbo gl/tl (Facet-oefenomgeving)', 'fouten uit het oefenexamen',
        fs='oefenexamen', ft='Nakijken met correctiemodel; elke leerling noteert drie begrippen om te herhalen voor T3.'),
      L(P, 'Doorloop 2 met feedback', 'Programma met presentatie tussen de nummers.')),
 20: (L(T, 'Muziek en maatschappij: functies', 'Dansmuziek, filmmuziek, achtergrondmuziek, religieuze en wereldlijke muziek. Functie verbinden aan muzikale kenmerken, niet aan associaties.', ['s'], 'Muziek en maatschappij: filmmuziek', 'functies van muziek, kenmerken per functie'),
      L(P, 'Generale repetitie 1 met techniek', 'Opbouw, geluid, licht.')),
 21: (L(T, 'Muziek en maatschappij: handelswaar en meningen', 'Muziek als handelswaar, reclame, concert, arbeid, therapie. Meningen van anderen uit recensies en interviews.', ['s'], 'Muziek en maatschappij', 'handelswaar, recensie, functie en kenmerk'),
      L(P, 'Generale repetitie 2', 'Laatste doorloop vóór het examenconcert.')),
 22: (None,
      L(T, 'Terugblik examenconcert', 'Wat ging goed, wat leer je ervan; zelfreflectie.')),
 23: (L(T, 'Muziek en andere kunsten', 'Dans, drama, film, literatuur en beeldende kunst in een muziekproductie; functies verhalend, decoratief, ontspannend.', ['t'], 'Muziek en andere kunsten: theater en film', 'kunstvormen, functies verhalend, decoratief, ontspannend'),
      L(T, 'Eindopdracht: opdracht en kunstvorm kiezen', 'Muziek in relatie tot een andere kunstvorm (P3). Kunstvorm en voorbeeld kiezen.', ['t'])),
 24: (L(T, 'Musical en film: kunsten die samenkomen', 'Hoe muziek, dans, drama en beeld samenwerken in musical en film.', ['p', 't'], 'Muziek en andere kunsten: theater en film', 'musical, filmmuziek, functies'),
      L(T, 'Eindopdracht: onderzoek', 'Bronnen zoeken, fragmenten kiezen, aantekeningen.', ['t'])),
 25: (L(T, 'Luisteren: alle begrippen door elkaar', 'Fragmenten uit verschillende stijlen beschrijven met de begrippen.', ['a', 'c', 'f', 'g', 'h', 'i', 'j', 'q'], 'Trainerz: alle begrippen', 'begrippen door elkaar'),
      L(T, 'Eindopdracht: uitwerken', 'Werk in de les; feedback op de opzet.', ['t'], fs='peerfeedback', ft='Lees elkaars opzet; één vraag en één tip.')),
 26: (L(T, 'Oefenexamen 2', 'Een volledig oud examen in Facet-stijl; nakijken met correctiemodel.', ['a', 'b', 'c', 'f', 'g', 'i', 'q', 's', 't'], 'oefenexamen vmbo gl/tl', 'eigen foutenlijst'),
      L(T, 'Eindopdracht: afronden', 'Laatste aanpassingen; inleveren volgende week.', ['t'])),
 27: (None,
      L(T, 'Foutenanalyse oefenexamen 2', 'Per begrip kijken waar punten verloren gaan; herhaalplan voor de laatste weken.', fs='zelf vragen maken', ft='Maak twee examenvragen over je zwakste begrip.')),
 30: (L(T, 'Laatste examentraining', 'Examenvragen door elkaar; tips voor Facet: koptelefoon, volume, uitwerkbijlage.', ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'l', 'o', 'p', 'q', 's', 't'], 'oefenexamens vmbo gl/tl', 'alle begrippen'),
      L(P, 'Afsluiting en vooruitblik op het centraal examen', 'Wat moet je nog doen tot 14 mei; laatste vragen.')),
}
for w in m4['weken']:
    p = PLAN.get(w['w'])
    if not p: continue
    mbs, learns = [], []
    for i, l in enumerate(p, 1):
        if l is None: continue
        if w[f'l{i}']['type'] in ('toets', 'toetsweek', 'uitval'): continue
        mb, ln = l.pop('_mb'), l.pop('_learn')
        if mb: mbs.append(mb)
        if ln: learns.append(ln)
        w[f'l{i}'] = l
    th = {}
    if mbs: th['mb'] = ' · '.join(mbs)
    if learns: th['learn'] = ' · '.join(learns)
    if th: w['thuis'] = th
# P3 nu in lesweek 27
for w in m4['weken']:
    if w['w'] == 29 and w['l1'].get('toets') == 'P3':
        w['l1'] = {'type': 'toetsweek', 'titel': 'Toetsweek 3'}
    if w['w'] == 27:
        w['l1'] = {'type': 'toets', 'toets': 'P3', 'titel': 'P3: Eindopdracht muziek en andere kunst (inleveren)'}
json.dump(D, open('data2.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print('mavo4 gevuld', sum(1 for w in m4['weken'] for k in ('l1','l2') if w[k]['type'] in ('theorie','praktijk')), 'lessen')

ID_BB = 'Leerlingen bezoeken concerten, zingen met honderden jongeren de Messiah en organiseren zelf een concert voor publiek (bouwstenen solidariteit, christelijk wereldburgerschap en democratie, vakwerkplan 2.2).'
VR = {'B1': ['Welke woorden heb je nodig om te beschrijven wat je hoort?', 'Hoe hoor je het verschil tussen instrumenten, stemmen en speelwijzen?'],
      'B2': ['Wat heb je nodig om samen een concert voor publiek neer te zetten?', 'Hoe laat je op het examen zien dat je muziek echt hoort en niet alleen herkent?'],
      'B3': ['Waarvoor gebruiken mensen muziek, en hoe hoor je dat aan de muziek zelf?', 'Wat voegt muziek toe aan dans, film, theater en beeld?']}
for b in m4['blokken']:
    b['identiteit'] = ID_BB; b['vragen'] = VR[b['id']]
IDL = {7: (0, 'Stemmen en koren: in het schoolkoor en straks in de Messiah zing je samen met anderen. Wat maakt een koor tot één klank?'), 20: (0, 'Religieuze en wereldlijke muziek: waaraan hoor je het verschil, en wat doet muziek in een kerkdienst?'),
       21: (1, 'Samen iets maken voor anderen: wat geef je het publiek met dit concert?'),
       24: (0, 'Vr 12 mrt Messiah in Leiden: honderden jongeren zingen samen de Bijbelteksten van Händel. Wat doet dat met je?'),
       12: (0, 'Canon en meerstemmigheid: iedereen een eigen stem, samen één geheel.')}
for w in m4['weken']:
    if w['w'] in IDL:
        i, t = IDL[w['w']]
        l = w[f'l{i+1}']
        if l['type'] in ('theorie', 'praktijk'): l['identiteit'] = t
json.dump(D, open('data2.json', 'w'), ensure_ascii=False, separators=(',', ':'))

# ---------- mavo 3: invulling op lesniveau ----------
m3 = D['klassen']['mavo3']
m3['meta']['syllabus'] = SYL_M
m3['syllabusLaterJaren'] = ['e', 'g', 'h', 'j', 'l', 'o', 'p', 'q', 's', 't']
m3['meta']['syllabusNaam'] = 'Syllabus centraal examen muziek vmbo gl/tl (CvTE). In mavo 3 komen volgens het vakwerkplan ritme, maat, tempo, toonhoogte, dynamiek en klankkleur aan bod; de overige begrippen staan gepland voor mavo 4.'
m3['meta']['bron'] = ('Lesplan op basis van het PTA mavo 3 en de leerlijn bovenbouw mavo uit het vakwerkplan, de syllabus centraal examen muziek vmbo gl/tl en Musicbox. '
                      'Eén les per week, afwisselend theorie en praktijk. De drie presentaties (zang, akkoordinstrument, slagwerk) vormen samen P1. Controleer de boxnamen in Musicbox op het mavo-niveau.')
for b in m3['blokken']:
    pass
NB = {'P1': ('Ritme, maat en presentatie zang', ['Hoe lees en speel je een ritme?', 'Wat heb je nodig om met je stem voor een groep te staan?']),
      'P2': ('Toonhoogte, tempo en presentatie akkoordinstrument', ['Hoe vind je de juiste noot en het juiste akkoord?', 'Hoe begeleid je een lied zo dat anderen erop kunnen zingen?']),
      'P3': ('Dynamiek, klankkleur en luistertoets (T1)', ['Welke woorden heb je nodig om te beschrijven wat je hoort?', 'Waar werken mensen met muziek, en wat doen ze daar?']),
      'P4': ('Slagwerk, werkveld en afronding P1', ['Hoe houd je samen een groove vol?', 'Welke rol kan muziek spelen in het werk dat jou interesseert?'])}
ID3 = 'In samenspel heeft iedereen een eigen partij en is iedereen nodig. Leerlingen ontdekken waar muziek in het werkveld en in de samenleving een rol speelt (bouwsteen solidariteit, vakwerkplan 2.2).'
for b in m3['blokken']:
    b['titel'], b['vragen'] = NB[b['id']]
    b['identiteit'] = ID3
m3['blokken'][0]['toetsing'] = 'Presentatie 1 (zang) in lesweek 8, telt mee in P1.'
m3['blokken'][1]['toetsing'] = 'Presentatie 2 (akkoordinstrument) in lesweek 19, telt mee in P1.'
m3['blokken'][3]['toetsing'] = 'Presentatie 3 (slagwerk) in lesweek 35. P1 is het gemiddelde van de drie presentaties (PTA, weging 15). Handelingsdeel: loopbaanpresentatie.'
m3['handelingsdelen'][0]['week'] = 37
M3PLAN = {
 1: L(T, 'Muziek als examenvak', 'Wat ga je doen in mavo 3 en 4: drie presentaties (P1), luistertoets T1, loopbaanpresentatie, en in mavo 4 het examenconcert en het centraal examen.', doel='Je weet uit welke onderdelen het schoolexamen muziek bestaat.', fs='exit ticket', ft='Noem de drie presentaties van dit jaar.'),
 2: L(P, 'Zingen: stem, houding en ademhaling', 'Inzingen, samen een lied zingen, een lied kiezen voor presentatie 1.', mb='songbox naar keuze'),
 3: L(T, 'Ritme: notenwaarden en rusten', 'Hele tot zestiende noten en rusten, punt, verbindingsboog. Ritmes klappen en noteren.', ['a'], 'Maat en Ritme', 'notenwaarden, rusten, punt, boog', fs='luisterdictee', ft='Drie ritmes klappen en noteren; samen nakijken.'),
 4: L(P, 'Zingen: oefenen in groepjes', 'Het lied voor presentatie 1 oefenen; let op ritme en inzet.', ['a']),
 5: L(T, 'Maat: maatsoorten, opmaat, beat en afterbeat', 'Maatsoorten 2/4, 3/4, 4/4 en 6/8; maatstreep, opmaat; beat en afterbeat.', ['b'], 'Maat en Ritme · Trainerz', 'maatsoorten, opmaat, beat, afterbeat'),
 6: L(P, 'Zingen: voorspelen met feedback', 'Elke groep zingt voor; tips op toon, ritme en presentatie.', fs='voorspelen met feedback', ft='Twee tips en één top per groep.'),
 7: L(T, 'Ritmische figuren: syncope, break en fill', 'Syncope, achtstentriool, break, fill, ritmisch ostinato herkennen in fragmenten.', ['a'], 'Ritmische figuren: triolen en syncope', 'syncope, triool, break, fill, ostinato'),
 8: L(P, 'Presentatie 1: zang', 'Telt mee in P1 (gemiddelde van drie presentaties).'),
 9: L(T, 'Terugblik presentatie 1 · herhaling ritme en maat', 'Wat ging goed, wat kan beter. Ritme en maat herhalen met Trainerz.', ['a', 'b'], 'Trainerz: ritme en maat', 'ritme en maat herhalen'),
 11: L(T, 'Toonhoogte: notennamen en g-sleutel', 'Notennamen, g-sleutel, voortekens (kruis, mol, herstellingsteken).', ['d'], 'Toonhoogte', 'notennamen, g-sleutel, voortekens'),
 12: L(P, 'Akkoordinstrument: eerste grepen', 'C, G, Am en F op gitaar, ukelele of keyboard.', mb='Spelen op de gitaar'),
 13: L(T, 'Toonhoogte: melodie volgen en lezen', 'Hoog en laag, stijgend en dalend, een melodie in notenschrift volgen.', ['d'], 'Toonhoogte', 'melodie lezen, hoog en laag'),
 14: L(P, 'Akkoordinstrument: begeleidingspatroon', 'Een slag- of begeleidingspatroon; lied kiezen voor presentatie 2.'),
 15: L(T, 'Tempo', 'Langzaam, rustig, snel; adagio, andante, allegro; slow, medium, uptempo; accelerando en ritenuto.', ['c'], 'Reggae riddim', 'tempoaanduidingen klassiek en pop, accelerando, ritenuto'),
 16: L(P, "Akkoordinstrument: oefenen in duo's", 'Lied met begeleiding; akkoordwisselingen in tempo.'),
 17: L(P, 'Akkoordinstrument: voorspelen met feedback', 'Tussenstand voor presentatie 2.', fs='voorspelen met feedback', ft='Feedback op akkoordwisselingen en tempo.'),
 18: L(T, 'Herhaling toonhoogte en tempo', 'Trainerz en luisterfragmenten.', ['c', 'd'], 'Trainerz: toonhoogte en tempo', 'toonhoogte en tempo herhalen'),
 19: L(P, 'Presentatie 2: akkoordinstrument', 'Telt mee in P1.'),
 20: L(T, 'Muziek in het werkveld', 'Welke beroepen hebben met muziek te maken? Van musicus en geluidstechnicus tot muziektherapeut en docent. Koppeling aan de stage van mavo 3 (di–wo).', doel='Je noemt vijf beroepen waarin muziek een rol speelt.'),
 21: L(T, 'Dynamiek', 'ff, f, mf, p, pp; crescendo en decrescendo; fade out, overgangs- en terrassendynamiek.', ['f'], 'Reggae riddim', 'dynamiektekens, crescendo, decrescendo, fade out'),
 22: L(T, 'Klankkleur: instrumenten', 'Slag-, blaas-, snaar- en elektronische instrumenten herkennen.', ['i'], 'Instrumenten en speeltechnieken', 'instrumentfamilies en instrumentnamen', fs='instrumentenbingo', ft='Bij vijf fragmenten het instrument en de familie noteren.'),
 23: L(T, 'Klankkleur: stemmen en ensembles', 'Sopraan, alt, tenor, bas; koor, band, orkest.', ['i'], 'Het orkest: orkestvormen en bezettingen', 'stemsoorten en ensembles'),
 24: L(T, 'Luisteren: begrippen in fragmenten', 'Fragmenten beschrijven met de begrippen van dit jaar; oefentoets in Musicbox.', ['a', 'b', 'c', 'd', 'f', 'i'], 'oefentoets in Musicbox', 'alle begrippen van dit jaar', fs='oefentoets', ft='Oefentoets in Musicbox; elke leerling noteert drie begrippen om te herhalen.'),
 25: L(T, 'Herhaling voor T1', 'Eigen zwakke begrippen herhalen met Trainerz.', ['a', 'b', 'c', 'd', 'f', 'i'], 'Trainerz: alle begrippen', 'begrippen herhalen'),
 26: L(T, 'Oefentoets T1', 'Een tweede oefentoets in de vorm van T1. Activiteitenweek D: les kan uitvallen.', ['a', 'b', 'c', 'd', 'f', 'i'], 'oefentoets in Musicbox', 'foutenlijst'),
 27: L(T, 'Laatste vragen voor T1', 'Foutenanalyse van de oefentoets.', ['a', 'b', 'c', 'd', 'f', 'i']),
 30: L(P, 'Slagwerk: basisgroove', 'Basisgroove op drums, cajon en handpercussie.'),
 32: L(P, 'Slagwerk: ritme in lagen', 'Groove in lagen met break en fill; lied of groove kiezen voor presentatie 3.', ['a']),
 33: L(T, 'Loopbaanpresentatie: opzet', 'Kies een werkveld dat jou interesseert en zoek uit welke rol muziek daar speelt (handelingsdeel).'),
 34: L(P, 'Slagwerk: voorspelen met feedback', 'Tussenstand voor presentatie 3.', fs='voorspelen met feedback', ft='Feedback op timing en samenspel.'),
 35: L(P, 'Presentatie 3: slagwerk', 'Telt mee in P1.'),
 37: L(T, 'Loopbaanpresentaties', 'Leerlingen presenteren hun werkveld (handelingsdeel H1). Toetsweek 4 begint woensdag.'),
}
ID3L = {2: 'Samen zingen: welk lied kies je, en wat wil je ermee zeggen?', 20: 'Muziek in de kerk, op school, in de zorg en op het podium: waar zou jij met muziek iets voor anderen willen betekenen?', 23: 'In een koor heeft iedereen een eigen stem, en samen klinkt het als één geheel.', 32: 'In een groove is iedereen nodig: valt er één weg, dan hoor je het meteen.'}
for w in m3['weken']:
    l = M3PLAN.get(w['w'])
    if not l or w['l1']['type'] in ('toets', 'toetsweek', 'uitval'): continue
    mb, ln = l.pop('_mb'), l.pop('_learn')
    if w['w'] in ID3L: l['identiteit'] = ID3L[w['w']]
    w['l1'] = l
    th = {}
    if mb: th['mb'] = mb
    if ln: th['learn'] = ln
    if th: w['thuis'] = th
for t in m3['toetsen']:
    if t['id'] == 'T1': t['syllabus'] = ['a', 'b', 'c', 'd', 'f', 'i']
    if t['id'] == 'P1': t['naam'] = 'Praktijk: gemiddelde van drie presentaties'
for w in m3['weken']:
    if w['w'] == 36: w['l1'] = {'type': 'toets', 'toets': 'P1', 'titel': 'P1: praktijkcijfer vaststellen (gemiddelde van presentatie 1 tot en met 3) · inhaalpresentaties'}
json.dump(D, open('data2.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print('mavo3 gevuld', sum(1 for w in m3['weken'] if w['l1']['type'] in ('theorie', 'praktijk')))

# ---------- havo 3 en vwo 3: invulling op lesniveau ----------
WM = 'Way Maker (Sinach)'
def K3(niveau_p1, kort):
    A = [  # periode 1: songbox 1 uit Musicbox
        L(P, 'De band in het lokaal', 'Instrumenten verdelen: zang, gitaar, keyboard, bas, drums. Een songbox uit Musicbox kiezen voor periode 1.', mb='songbox naar keuze (Musicbox)',
          doel='Je weet welk instrument je speelt en wat jouw rol in de band is.'),
        L(P, 'Songbox 1: akkoorden en ritme', 'Akkoorden en het basisritme van de song leren met de tutorials.', mb='songbox 1: tutorials per instrument'),
        L(P, 'Songbox 1: partijen per instrument', 'Per instrument oefenen; wie vastloopt, gebruikt het lagere niveau van de box.'),
        L(P, 'Songbox 1: samen beginnen en eindigen', 'Inzet aftellen, tempo vasthouden, samen stoppen.'),
        L(T, 'Hoe zit een song in elkaar?', 'Intro, couplet, refrein, bridge, outro: het vormschema van de song tekenen en volgen.', fs='blokkenschema', ft='Teken het vormschema en speel het daarna na.'),
        L(P, 'Songbox 1: dynamiek en samenspel', 'Zacht in het couplet, vol in het refrein; naar elkaar luisteren.'),
        L(P, 'Songbox 1: doorspelen', 'De song van begin tot eind; rollen wisselen voor wie dat wil.'),
        L(P, 'Songbox 1: opnemen en terugluisteren', 'Elke groep neemt op; samen terugluisteren met de vragen: wat hoor je, wat kan beter?', fs='opname terugluisteren', ft='Elke groep noemt één ding dat goed ging en één verbeterpunt.'),
        L(T, 'Kiezen voor muziek in de bovenbouw', 'Wat doe je bij muziek in havo 4 en 5 of vwo 4 tot 6: luisteren, spelen, maken, concerten, de Messiah. Voor de profielkeuzeweek.' if kort != 'm' else ''),
    ]
    B = [  # periode 2: eigen songbox Way Maker, P1
        L(T, f'Nieuwe songbox: {WM}', 'Het lied leren kennen: luisteren, de tekst en de betekenis, waar het vandaan komt. Vorm in kaart brengen.', mb='eigen songbox Way Maker',
          doel='Je kent de vorm van het lied en weet waar het over gaat.'),
        L(P, 'Way Maker: akkoorden en begeleiding', 'De vier akkoorden van het lied (in G: G, D, Em, C) op gitaar, keyboard en ukelele; slagpatroon.'),
        L(P, 'Way Maker: partijen voor zang, bas en drums', 'Melodie zingen; baslijn op de grondtonen; drumgroove met opbouw.'),
        L(P, 'Groepen maken en de beoordeling bespreken', f'Groepen voor P1 ({niveau_p1.lower()}). Je speelt voor de docent, iedereen krijgt een eigen cijfer. Criteria: samenspel, ritme, toon en techniek, eigen reflectie en feedback op groepsgenoten.'),
        L(P, 'Way Maker: oefenen in groepen', 'Partijen samenvoegen; activiteitenweek B, les kan uitvallen.'),
        L(P, 'Way Maker: opbouw en dynamiek', 'Het lied bouwt op: van rustig naar vol. Samen beslissen waar je opbouwt en terugvalt.'),
        L(P, 'Tussenstand: voorspelen met feedback', 'Formatieve ronde vóór de PTO-toets: elke groep speelt voor en krijgt feedback op de vier speelcriteria.', fs='formatieve toets', ft='Voorspelen met het beoordelingsformulier, zonder cijfer. Elke leerling noteert twee werkpunten.'),
        L(P, 'Laatste repetitie en eigen reflectie', 'Werkpunten uit de tussenstand oefenen; reflectieformulier voorbereiden.'),
        None,  # P1 in lesweek 19
        L(T, 'Terugblik P1 en peerfeedback afronden', 'Reflectieformulier en feedback op groepsgenoten afronden. Activiteitenweek C.'),
    ]
    C = [  # periode 3: instrumenten, bands en orkesten, T1
        L(T, 'Instrumenten: snaarinstrumenten', 'Strijkinstrumenten en tokkelinstrumenten; hoe ontstaat de klank?', mb='Instrumenten en speeltechnieken', learn='viool, altviool, cello, contrabas, gitaar, harp; strijken en tokkelen'),
        L(T, 'Instrumenten: houtblazers en koperblazers', 'Fluit, klarinet, hobo, fagot, saxofoon; trompet, hoorn, trombone, tuba. Herkennen op gehoor.', mb='Instrumenten en speeltechnieken', learn='houtblazers en koperblazers',
          fs='instrumentenbingo', ft='Bij vijf fragmenten het instrument en de familie noteren.'),
        L(T, 'Instrumenten: slagwerk, toetsen en elektronica', 'Pauken, drumstel, percussie; piano, orgel, synthesizer; elektrische gitaar en basgitaar.', mb='Instrumenten en speeltechnieken', learn='slagwerk, toetsinstrumenten, elektronische instrumenten'),
        L(T, 'Het symfonieorkest', 'Instrumentgroepen en opstelling; de rol van de dirigent.', mb='Het orkest: instrumentgroepen', learn='instrumentgroepen, opstelling, dirigent'),
        L(T, 'Bands en ensembles', 'Popband, bigband, jazzcombo, strijkkwartet, koor: wie speelt er en wat doet elke groep?', mb='Het orkest: orkestvormen en bezettingen', learn='popband, bigband, combo, strijkkwartet, koor'),
        L(P, 'Rollen in een band en orkest', 'Ritmesectie, melodie, harmonie: wie doet wat? Daarna in de eigen band Way Maker spelen en per rol uitleggen wat je doet.'),
        L(T, 'Oefentoets instrumenten, bands en orkesten', 'Formatieve toets vóór T1, in Musicbox.', mb='oefentoets in Musicbox', learn='alle begrippen van periode 3',
          fs='formatieve toets', ft='Oefentoets zonder cijfer; samen nakijken, elke leerling maakt een eigen herhaallijst.'),
        L(T, 'Herhaling en vragen voor T1', 'Eigen herhaallijst afwerken met Trainerz.'),
        None,  # T1 in lesweek 29
        L(P, 'Songbox 2 kiezen', 'Terugblik T1; leerlingen kiezen samen een songbox uit Musicbox voor periode 4.'),
    ]
    D4 = [  # periode 4: songbox 2
        L(P, 'Songbox 2: partijen leren', 'Tutorials per instrument; rollen kiezen die je nog niet speelde.', mb='songbox 2 (keuze klas)'),
        L(P, 'Songbox 2: samenspel', 'Samen beginnen, tempo, dynamiek.'),
        L(P, 'Songbox 2: eigen arrangement', 'Zelf een intro, break en slot bedenken.'),
        L(P, 'Songbox 2: doorspelen', 'Het arrangement van begin tot eind.'),
        L(P, 'Slotoptreden in de klas', 'Elke groep speelt; opname terugluisteren.'),
        L(T, 'Terugblik op het jaar', 'Wat heb je geleerd in samenspel en theorie? Vooruitblik op muziek in de bovenbouw.'),
        L(P, 'Vrij samenspel', 'Laatste les voor de toetsweek.'),
    ]
    return [A, B, C, D4]

IDK3 = {'De band in het lokaal': 'In een band heeft iedereen een eigen partij en is iedereen nodig. Wie helpt wie dit jaar?', f'{WM}': 'Way Maker komt uit Nigeria en wordt nu wereldwijd gezongen, in kerken en op scholen. Wat betekent het dat christenen over de hele wereld hetzelfde lied zingen? (bouwsteen christelijk wereldburgerschap)',
        'Groepen maken en de beoordeling bespreken': 'In een band heeft iedereen een eigen partij en is iedereen nodig, ook wie het minder makkelijk vindt.',
        'Rollen in een band en orkest': 'In een orkest speelt niemand voor zichzelf: honderd mensen luisteren naar elkaar en naar één dirigent.',
        'Slotoptreden in de klas': 'Samen iets laten horen aan anderen: wat geef je je publiek?'}

def vul3(k, p1naam, kort):
    kl = D['klassen'][k]
    blocks = K3(p1naam, kort)
    for bi, blok_ in enumerate(kl['blokken']):
        items = [x for x in blocks[bi] if x is not None or True]
        weeks = [w for w in kl['weken'] if blok_['weken'][0] <= w['w'] <= blok_['weken'][1]]
        free = [w for w in weeks if w['l1']['type'] == 'leeg']
        lessons = [x for x in items if x is not None]
        # te weinig vrije lessen: voeg de laatste lessen vóór een toets samen
        if len(lessons) > len(free) and lessons[-1]['titel'] == 'Songbox 2 kiezen':
            lessons.pop(); blocks[bi + 1][0]['titel'] = 'Songbox 2 kiezen en partijen leren'
        while len(lessons) > len(free):
            a = lessons[-2]; b = lessons.pop()
            if a and b and b['titel'] not in a['titel']:
                a['titel'] = a['titel'] + ' · ' + b['titel']
                a['detail'] = (a.get('detail', '') + ' ' + b.get('detail', '')).strip()
        # vóór en na de toets apart vullen
        toetsw = next((w['w'] for w in weeks if w['l1']['type'] == 'toets'), None)
        voor = [x for x in lessons]
        for w, l in zip(free, lessons):
            l = json.loads(json.dumps(l))
            mb, ln = l.pop('_mb'), l.pop('_learn')
            if not l['titel']:
                continue
            if l['titel'] in IDK3: l['identiteit'] = IDK3[l['titel']]
            w['l1'] = l
            th = {}
            if mb: th['mb'] = mb
            if ln: th['learn'] = ln
            if th: w['thuis'] = th
    kl['meta']['bron'] = ('Lesplan op basis van de leerlijn klas 3 en het PTO in het vakwerkplan, de PTO-richtlijnen 2026-2027 en Musicbox. '
                          'Periode 1 en 4: songboxen uit Musicbox (nog kiezen). Periode 2: eigen songbox Way Maker (Sinach) als basis voor P1. '
                          'Periode 3: instrumenten, bands en orkesten, afgesloten met T1. Vóór elke PTO-toets staat een formatieve toets, zoals de PTO-richtlijnen vragen.')
    b2 = kl['blokken'][1]
    b2['titel'] = f'Eigen songbox Way Maker ({p1naam.lower()}, P1)'
    b2['kennen'] = 'Way Maker van Sinach: vorm, akkoorden, opbouw en betekenis van de tekst.'
    b2['vragen'] = ['Hoe bouw je samen een lied op van rustig naar vol?', 'Wat betekent een lied dat over de hele wereld gezongen wordt?']
    kl['blokken'][0]['vragen'] = ['Wat is jouw rol in de band?', 'Hoe zorg je dat de band samen klinkt?']
    kl['blokken'][2]['vragen'] = ['Hoe ontstaat de klank van een instrument?', 'Waarom werken orkesten en bands met vaste groepen en rollen?']
    kl['blokken'][3]['vragen'] = ['Hoe maak je van een song je eigen arrangement?']
    kl['blokken'][0]['toetsing'] = 'Songbox 1 uit Musicbox nog kiezen. Formatief: opname terugluisteren.'
    kl['blokken'][3]['toetsing'] = 'Songbox 2 kiest de klas in lesweek 30. Afsluiting: slotoptreden in de klas.'
    for t in kl['toetsen']:
        if t['id'] == 'P1': t['stof'] = f'{WM}, eigen songbox. ' + SPEEL
        if t['id'] == 'T1': t['stof'] = 'Instrumenten, bands en orkesten: instrumentfamilies, symfonieorkest, bands en ensembles, rollen in een band.'

vul3('havo3', 'Presentatie lied of speelstuk', 'h')
vul3('vwo3', 'Groepspresentatie lied', 'v')
it('wm', '2026-11-09', 'Songbox Way Maker klaar: akkoorden, partijen per instrument, oefentracks', 'taak', taak=True,
   info='Nodig vanaf lesweek 11 in havo 3 en vwo 3 (basis voor P1).')
D['sectie'] = sorted(S, key=lambda x: (x['d'], x.get('tijd', '')))
json.dump(D, open('data2.json', 'w'), ensure_ascii=False, separators=(',', ':'))
for k in ('havo3', 'vwo3'):
    print(k, [(w['w'], w['l1']['titel'][:38]) for w in D['klassen'][k]['weken']])
