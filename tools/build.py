import json, re
h = open('orig.html').read()
D = json.load(open('data2.json'))
sect = open('sectie.js').read()

def rep(old, new, count=1):
    global h
    n = h.count(old)
    if n != count:
        raise SystemExit(f'expected {count}x, found {n}: {old[:90]}')
    h = h.replace(old, new)

# data
m = re.search(r'(<script id="data" type="application/json">)(.*?)(</script>)', h, re.S)
h = h[:m.start(2)] + '\n' + json.dumps(D, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/') + '\n' + h[m.end(2):]

# titel
rep('<title>Leergang bovenbouw muziek</title>', '<title>Leergang muziek</title>')
rep('<h1>Leergang bovenbouw muziek</h1>', '<h1>Leergang muziek</h1>')
rep('document.title=`Leergang bovenbouw muziek`;', 'document.title=`Leergang muziek`;')

# css
rep('.b-jazz{background:var(--jazz)}', '.b-band{background:#7a4a9c}.b-speel{background:#b23a52}.b-orkest{background:#2f7d6d}.b-leer{background:#8a6d3b}.b-open{background:#6f7887}\n.b-jazz{background:var(--jazz)}')
rep('.msg{font-size:.85rem;color:var(--warn);min-height:1.2rem}', '''.msg{font-size:.85rem;color:var(--warn);min-height:1.2rem}
/* sectie */
.klas .sep{width:1px;background:var(--line);margin:0 .2rem}
.shead{margin-bottom:.8rem}.shead .lead{margin:.3rem 0 0}
.scard h3,.sadd h3{margin-bottom:.4rem}
.sper{font-size:.75rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin:1.2rem 0 .4rem}
.slist{padding:.2rem .8rem}
.srow{display:grid;grid-template-columns:8.5rem 7rem 8.5rem minmax(0,1fr) auto;gap:.3rem .8rem;align-items:baseline;padding:.45rem 0;border-top:1px solid var(--line);font-size:.88rem}
.srow:first-child{border-top:0}
.scard .srow{grid-template-columns:8.5rem 8.5rem minmax(0,1fr) auto}
.srow>.chip{justify-self:start}
.srow .sd{font-family:var(--mono);font-size:.75rem;font-variant-numeric:tabular-nums}
.srow .swk{font-size:.75rem;color:var(--muted)}
.srow .st{min-width:0}.srow .si{font-size:.8rem;color:var(--muted);margin-top:.15rem}
.srow .tijd{font-family:var(--mono);font-size:.72rem;color:var(--muted)}
.srow .note{margin-top:.3rem}
.srow.past{opacity:.55}.srow.done .chk span{text-decoration:line-through;color:var(--muted)}
.srow.late .sd{color:var(--toets-fg);font-weight:600}
.chk{display:inline-flex;gap:.4rem;align-items:baseline;cursor:pointer}.chk input{margin:0;accent-color:var(--accent)}
.chip.s-sectie{background:var(--tw);color:var(--tw-fg)}.chip.s-overleg{background:var(--uitval);color:var(--uitval-fg)}
.chip.s-rapport,.chip.s-cijfers{background:var(--toets);color:var(--toets-fg)}.chip.s-toets{background:var(--theorie);color:var(--theorie-fg)}
.chip.s-keuze{background:var(--slow);color:var(--slow-fg)}.chip.s-muziek{background:var(--praktijk);color:var(--praktijk-fg)}
.chip.s-taak{background:var(--info-bg);color:var(--accent)}.chip.s-late{background:var(--toets);color:var(--toets-fg)}.chip.s-twijfel{background:var(--warn-bg);color:var(--warn)}
.sfilt .btn{font-size:.8rem}
.saddrow{display:flex;flex-wrap:wrap;gap:.6rem;align-items:end}.saddrow label{display:grid;gap:.15rem;font-size:.78rem;color:var(--muted)}.saddrow label:first-child{flex:1 1 16rem}.saddrow label.chk{display:inline-flex}
.allgrid td.sec{min-width:150px}
.allgrid .sc{display:block;border-radius:3px;padding:0 .25rem;margin-bottom:2px;line-height:1.35}
.allgrid .sc.s-sectie{background:var(--tw);color:var(--tw-fg)}.allgrid .sc.s-rapport,.allgrid .sc.s-cijfers{background:var(--toets);color:var(--toets-fg)}.allgrid .sc.s-toets{background:var(--theorie);color:var(--theorie-fg)}.allgrid .sc.s-keuze{background:var(--slow);color:var(--slow-fg)}.allgrid .sc.s-muziek{background:var(--praktijk);color:var(--praktijk-fg)}.allgrid .sc.s-overleg{background:var(--uitval);color:var(--uitval-fg)}
@media (max-width:760px){.srow,.scard .srow{grid-template-columns:1fr auto}.srow .sd{grid-column:1}.srow .swk{display:none}.srow .chip{justify-self:start;grid-column:1}.srow .st{grid-column:1/-1}.srow .btn{grid-column:2;grid-row:1}}''')
rep('<section class="view" id="v-alle" role="tabpanel" hidden></section>', '<section class="view" id="v-alle" role="tabpanel" hidden></section>\n  <section class="view" id="v-sectie" role="tabpanel" hidden></section>')

# klassen
rep("const KLASSEN=['havo4','havo5','vwo4','vwo5','vwo6'];", "const KLASSEN=['bb1','havo3','kmu3','vwo3','mavo3','mavo4','havo4','havo5','vwo4','vwo5','vwo6'];")
rep("const KLASNAAM={havo4:'havo 4',havo5:'havo 5',vwo4:'vwo 4',vwo5:'vwo 5',vwo6:'vwo 6'};", "const KLASNAAM={bb1:'BB1',havo3:'havo 3',kmu3:'keuzeuur h3',vwo3:'vwo 3',mavo3:'mavo 3',mavo4:'mavo 4',havo4:'havo 4',havo5:'havo 5',vwo4:'vwo 4',vwo5:'vwo 5',vwo6:'vwo 6'};")
rep("if(!b.syllabus)b.syllabus=b.meta.syllabus==='havo'?kal.syllabusHavo:kal.syllabusVwo;", "if(!b.syllabus)b.syllabus=typeof b.meta.syllabus==='object'&&b.meta.syllabus?b.meta.syllabus:b.meta.syllabus==='geen'?{}:b.meta.syllabus==='havo'?kal.syllabusHavo:kal.syllabusVwo;")

# signalen
rep("for(const b of BASE.blokken){const c=stats(b.id);if(c.praktijk===0)", "for(const b of BASE.blokken){const c=stats(b.id);if(!c.theorie&&!c.praktijk){out.push({lvl:'info',txt:`${b.titel}: nog geen lessen ingevuld.`,tab:'lessen'});continue;}if(c.praktijk===0)")
rep("if(leeg.length)out.push({lvl:'info',txt:`Vrije les(sen) zonder inhoud: ${leeg.join(', ')}.`,tab:'lessen'});",
    "if(leeg.length)out.push({lvl:'info',txt:leeg.length>8?`${leeg.length} lessen zonder inhoud (lesweek ${leeg[0].split('.')[0]} tot en met ${leeg[leeg.length-1].split('.')[0]}).`:`Vrije les(sen) zonder inhoud: ${leeg.join(', ')}.`,tab:'lessen'});")

# tabs en render
rep("const TABS=[['alle','Alle klassen'],", "const TABS=[['alle','Alle klassen'],['sectie','Sectie'],")
rep("$('#klas').innerHTML=KLASSEN.map(k=>`<button", "$('#klas').innerHTML=KLASSEN.map(k=>`${k==='mavo4'?'<span class=\"sep\" aria-hidden=\"true\"></span>':''}<button")
rep("const c=sig.filter(s=>s.tab===id);", "const c=id==='sectie'?sSig():sig.filter(s=>s.tab===id);")
rep("const sg=$('#sig');sg.hidden=tab==='alle';", "const sg=$('#sig');sg.hidden=tab==='alle'||tab==='sectie';const cb2=$('#concept');if(tab==='sectie'||tab==='alle')cb2.hidden=true;")
rep("({alle:renderAlle,jaar:renderJaar,", "({alle:renderAlle,sectie:renderSectie,jaar:renderJaar,")
rep("t.hidden=!S.tray.length||tab==='alle';", "t.hidden=!S.tray.length||tab==='alle'||tab==='sectie';")

# alle klassen
rep("let h=`<h2 style=\"margin-bottom:.5rem\">${cur.vak?esc(cur.vak)+' · straks lesweek':'Deze week · lesweek'} ${cw} · ${fmtD(new Date(kw.datum+'T12:00'))}</h2><div class=\"weekgrid\">`;",
    "let h=`<h2 style=\"margin-bottom:.5rem\">${cur.vak?esc(cur.vak)+' · straks lesweek':'Deze week · lesweek'} ${cw} · ${fmtD(new Date(kw.datum+'T12:00'))}</h2>${sectieStrip(cw)}<div class=\"weekgrid\">`;")
rep("${b.meta.lessenPerWeek} lessen${nt?", "${b.meta.lessenPerWeek} ${b.meta.lessenPerWeek===1?'les':'lessen'}${nt?")
rep("<tr><th>wk</th>${kl.map(k=>`<th>${KLASNAAM[k]}</th>`).join('')}</tr>`;", "<tr><th>wk</th>${kl.map(k=>`<th>${KLASNAAM[k]}</th>`).join('')}<th>Sectie</th></tr>`;")
rep("if(v)h+=`<tr class=\"vak\"><td colspan=\"${kl.length+1}\">", "if(v)h+=`<tr class=\"vak\"><td colspan=\"${kl.length+2}\">")
rep("${w.event?' <span class=\"ag\" title=\"'+esc(w.event)+'\">●</span>':''}</div></td>`;}\n    h+=`</tr>`;}",
    "${w.event?' <span class=\"ag\" title=\"'+esc(w.event)+'\">●</span>':''}</div></td>`;}\n    h+=`<td class=\"sec\">${sectieCel(kw2.w)}</td></tr>`;}")
rep("Klik op een cel om die week te openen.</p>", "Klik op een cel om die week te openen. De laatste kolom toont wat er die week voor de sectie speelt.</p>")

# lessen / blok
rep("<span class=\"meta\">lesweek ${b.weken[0]}–${b.weken[1]} · stijllijn ${b.stijllijn} ·", "<span class=\"meta\">lesweek ${b.weken[0]}–${b.weken[1]}${b.stijllijn?' · stijllijn '+b.stijllijn:''} ·")
rep("<h3>3 · Leerroute</h3><p>${b.routekaart.join(' → ')}</p>", "<h3>3 · Leerroute</h3><p>${(b.routekaart||[]).join(' → ')||'<span class=\"lead\">nog in te vullen</span>'}</p>")
rep("value=\"${esc(b.routekaart.join(', '))}\"", "value=\"${esc((b.routekaart||[]).join(', '))}\"")

# toetsen
rep("let h=`<p class=\"lead\">Uit het PTA ${BASE.meta.klas}: ${esc(BASE.meta.seAandeel)}. Elke toets laat zien of de eindtermen uit de syllabus ervóór aan bod komen en hoeveel lessen de voorbereiding telt.</p><div class=\"grid2\" style=\"margin-top:1rem\">`;",
    "let h=`<p class=\"lead\">${BASE.meta.toetsKop?esc(BASE.meta.toetsKop):`Uit het PTA ${BASE.meta.klas}: ${esc(BASE.meta.seAandeel)}. Elke toets laat zien of de eindtermen uit de syllabus ervóór aan bod komen en hoeveel lessen de voorbereiding telt.`}</p><div class=\"grid2\" style=\"margin-top:1rem\">`;")
rep("<span class=\"chip\">${t.weging}% SE</span>", "<span class=\"chip\">${BASE.meta.pto||BASE.meta.pta?'weging '+t.weging:t.weging+'% SE'}</span>")
rep("<dt>Duur</dt><dd>${t.duur} min</dd><dt>Domein</dt><dd>${t.domein.join(', ')}</dd><dt>Herkansbaar</dt><dd>${t.herkansbaar?'ja, '+esc(t.herkansing):'nee'}</dd>",
    "<dt>Duur</dt><dd>${t.duur?t.duur+' min':'zie PTA'}</dd>${(t.domein||[]).length?`<dt>Domein</dt><dd>${t.domein.join(', ')}</dd>`:''}<dt>Herkansbaar</dt><dd>${t.herkansbaar==null?'zie PTA':t.herkansbaar?'ja, '+esc(t.herkansing):'nee'}</dd>")
rep("h+=`</div><h2 style=\"margin:1.4rem 0 .5rem\">Handelingsdelen (0%, voldaan/niet voldaan)</h2><div class=\"card\"><div class=\"tabwrap\"><table><tr><th>Code</th><th>Activiteit</th><th>Datum</th><th>Lesweek</th><th>Verslag inleveren vóór</th></tr>${BASE.handelingsdelen.map(x=>`<tr><td>${x.id}</td><td>${esc(x.naam)}</td><td>${fmtD(new Date(x.datum+'T12:00'))} ${x.datum.slice(0,4)}</td><td class=\"n\">${x.week}</td><td>${fmtD(new Date(x.deadline+'T12:00'))} ${x.deadline.slice(0,4)}</td></tr>`).join('')}</table></div></div><div class=\"msg\" id=\"msg\"></div>`;",
    "const dd=s=>s?fmtD(new Date(s+'T12:00'))+' '+s.slice(0,4):'<span class=\"lead\">nog plannen</span>';\n  if(!S.toetsen.length)h+=`<p class=\"lead\">Nog geen toetsen.</p>`;\n  h+=`</div>${BASE.handelingsdelen.length?`<h2 style=\"margin:1.4rem 0 .5rem\">Handelingsdelen (voldaan/niet voldaan)</h2><div class=\"card\"><div class=\"tabwrap\"><table><tr><th>Code</th><th>Activiteit</th><th>Datum</th><th>Lesweek</th><th>Verslag inleveren vóór</th></tr>${BASE.handelingsdelen.map(x=>`<tr><td>${x.id}</td><td>${esc(x.naam)}</td><td>${dd(x.datum)}</td><td class=\"n\">${x.week||'–'}</td><td>${dd(x.deadline)}</td></tr>`).join('')}</table></div></div>`:''}<div class=\"msg\" id=\"msg\"></div>`;")

# jaar kpi
rep("<small>PTA-toetsen · ${S.toetsen.reduce((a,t)=>a+t.weging,0)}% SE</small>", "<small>${BASE.meta.pto?'PTO-toetsen':BASE.meta.pta?'PTA-toetsen':'PTA-toetsen · '+S.toetsen.reduce((a,t)=>a+t.weging,0)+'% SE'}</small>")

# dekking
rep("function renderDekking(){\n  const cov=coverage();", "function renderDekking(){\n  const cov=coverage();\n  if(!Object.keys(BASE.syllabus).length){$('#v-dekking').innerHTML=`<p class=\"lead\">${BASE.meta.klas} heeft geen examensyllabus. ${BASE.meta.pta?'Het examenprogramma mavo (kennis 1 tot en met 9, vaardigheden 1 tot en met 3) staat in het vakwerkplan, 3.3.3.':'De leerlijn staat in het vakwerkplan, 3.3.4.'} Didactische kaarten die je in de lessen invult, verschijnen hieronder.</p>`+(()=>{const all={};S.weken.forEach(w=>w.lessen.forEach(l=>(l.kaart||[]).forEach(k=>{(all[k]=all[k]||[]).push(w.w);})));const ks=Object.keys(all);return ks.length?`<div class=\"card\" style=\"margin-top:1rem\"><div class=\"tabwrap\"><table><tr><th>Kaart</th><th>Lesweken</th></tr>${ks.map(k=>`<tr><td><span class=\"chip kaart\">${esc(k)}</span></td><td style=\"font-family:var(--mono);font-size:.75rem\">${all[k].join(', ')}</td></tr>`).join('')}</table></div></div>`:'';})();return;}")

# balans
rep("const tot=stats();const doel=BASE.meta.balansUitStudiewijzer;", "const tot=stats();const doel=BASE.meta.balansUitStudiewijzer||null;")
rep("const n=tot.theorie+tot.praktijk;\n  let h=`<div class=\"kpi\"><div><b>${tot.theorie}</b><small>theorie (studiewijzer: ${doel.theorie})</small></div><div><b>${tot.praktijk}</b><small>praktijk (studiewijzer: ${doel.praktijk})</small></div>",
    "const n=tot.theorie+tot.praktijk||1;\n  let h=`<div class=\"kpi\"><div><b>${tot.theorie}</b><small>theorie${doel?` (studiewijzer: ${doel.theorie})`:''}</small></div><div><b>${tot.praktijk}</b><small>praktijk${doel?` (studiewijzer: ${doel.praktijk})`:''}</small></div>")

# sectie-code invoegen
rep("/* ---------- lesmodus (digibord) ---------- */", sect + "\n/* ---------- lesmodus (digibord) ---------- */")

# events
rep("  if(b.dataset.klas){setKlas(b.dataset.klas);return;}", "  if(b.dataset.klas){setKlas(b.dataset.klas);return;}\n  if(b.dataset.sedit){openSectie(b.dataset.sedit);return;}\n  if(b.dataset.sfilt!=null){sFilt=b.dataset.sfilt;renderSectie();return;}")
rep("  if(t.dataset.mv){moveToets(t.dataset.mv,+t.value);}", "  if(t.dataset.mv){moveToets(t.dataset.mv,+t.value);}\n  if(t.dataset.sdone){if(t.checked)SS.done[t.dataset.sdone]=true;else delete SS.done[t.dataset.sdone];sCommit();}\n  if(t.id==='sKlaar'){sKlaar=t.checked;renderSectie();}")
rep("$('#scrim').onclick=closeDrawer;", "$('#scrim').onclick=closeDrawer;\ndocument.addEventListener('submit',e=>{if(e.target.id!=='sAdd')return;e.preventDefault();const ti=$('#sNt').value.trim(),d=$('#sNd').value;if(!ti||!d)return;\n  SS.extra.push({id:'x'+Date.now().toString(36),d,titel:ti,soort:$('#sNs').value,taak:$('#sNtaak').checked||undefined});sCommit();});")
rep("render();\ninitStore();\n})();", "render();\ninitStore();\ninitSectie();\n})();")

rep("KEY=k;BASE=baseFor(k);N=BASE.meta.lessenPerWeek;", "BASE=baseFor(k);KEY=k;N=BASE.meta.lessenPerWeek;")
rep("k==='havo5'||k==='vwo6'?'examenperiode'", "k==='havo5'||k==='vwo6'||k==='mavo4'?'examenperiode'")
rep("let h=`<p class=\"lead\">Syllabus muziek vwo (CE 2027), bijlage 2: aspecten a–r.", "let h=`<p class=\"lead\">${BASE.meta.syllabusNaam?esc(BASE.meta.syllabusNaam)+' ':'Syllabus muziek vwo (CE 2027), bijlage 2: aspecten a–r. '}")
rep("replace(/[^a-r]/g,' ')", "replace(/[^a-t]/g,' ')")
rep("<label>Syllabus-aspecten (letters a–r)", "<label>Syllabus-aspecten (letters)")
open('leergang.html', 'w').write(h)
print('ok', len(h))
