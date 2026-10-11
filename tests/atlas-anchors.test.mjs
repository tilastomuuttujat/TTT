import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const data=JSON.parse(readFileSync(new URL('../suomen_rakennemuutosten_atlas-ankkurit.json',import.meta.url),'utf8'));
const themes=JSON.parse(readFileSync(new URL('../suomen_rakennemuutosten_atlas.json',import.meta.url),'utf8')).themes;
test('anchor paths have valid source, theme, mechanism and map references',()=>{
 const anchorIds=new Set(data.anchors.map(a=>a.id));assert.equal(anchorIds.size,data.anchors.length);
 for(const anchor of data.anchors){assert.ok(themes.some(t=>t.id===anchor.entry_theme_id));const sources=new Set(anchor.sources.map(s=>s.id));assert.equal(sources.size,anchor.sources.length);for(const source of anchor.sources)assert.equal(new URL(source.url).protocol,'https:');
  const mechanisms=new Set((anchor.mechanisms||[]).map(m=>m.id));
  for(const step of anchor.steps){assert.ok(step.years[0]<=step.years[1]);if(step.event_year!=null)assert.ok(step.event_year>=step.years[0]&&step.event_year<=step.years[1]);assert.ok(step.source_ids.length);for(const id of step.source_ids)assert.ok(sources.has(id));for(const id of step.theme_ids)assert.ok(themes.some(t=>t.id===id));assert.ok(step.theme_ids.includes(step.focus.theme_id));assert.ok(themes.find(t=>t.id===step.focus.theme_id).steps.some(s=>s.stage===step.focus.stage));if(step.mechanism_id)assert.ok(mechanisms.has(step.mechanism_id));if(step.related_anchor_id)assert.ok(anchorIds.has(step.related_anchor_id));
   for(const point of step.map_points){const theme=themes.find(t=>t.id===point.theme_id);assert.ok(theme);assert.ok(theme.steps.some(s=>s.stage===point.stage));}
  }
  for(const mechanism of anchor.mechanisms||[])for(const evidence of mechanism.evidence)for(const id of evidence.source_ids)assert.ok(sources.has(id));
 }
});
test('comprehensive school path covers decision, rollout, implementation limits and later evidence',()=>{
 const anchor=data.anchors.find(a=>a.id==='peruskoulu-uudistus');assert.ok(anchor);assert.equal(anchor.entry_theme_id,4);assert.equal(anchor.steps.length,6);assert.equal(anchor.steps[1].event_year,1968);assert.deepEqual(anchor.steps[2].years,[1972,1977]);assert.equal(anchor.steps[3].event_year,1985);assert.equal(anchor.steps[4].event_year,2009);assert.ok(anchor.steps[4].affected.includes('miehet'));assert.equal(anchor.steps.at(-1).years[1],2025);
});

test('1990s depression separates financial crisis, household responses and long-run evidence',()=>{
 const anchor=data.anchors.find(a=>a.id==='1990-luvun-lama');assert.ok(anchor);assert.equal(anchor.entry_theme_id,17);assert.equal(anchor.steps.length,6);assert.equal(anchor.steps[2].event_year,1992);assert.equal(anchor.steps[3].event_year,1993);assert.equal(anchor.steps[4].event_year,1996);assert.equal(anchor.steps.at(-1).event_year,2012);assert.equal(anchor.steps.at(-1).related_anchor_id,'peruskoulu-uudistus');assert.ok(anchor.steps[4].source_ids.includes('poverty-measures'));assert.ok(anchor.steps.at(-1).evidence_note.includes('tilastollisesti'));assert.ok(!anchor.statistics?.length);
});

test('population ageing separates age ratios, pension reforms, care needs and forecasts',()=>{
 const anchor=data.anchors.find(a=>a.id==='vaeston-ikaantyminen');assert.ok(anchor);assert.equal(anchor.entry_theme_id,30);assert.equal(anchor.steps.length,6);assert.equal(anchor.steps[2].event_year,2005);assert.equal(anchor.steps[3].event_year,2017);assert.ok(anchor.steps[1].source_ids.includes('ratios'));assert.ok(anchor.steps[4].source_ids.includes('rai'));assert.ok(anchor.steps[4].affected.includes('kaikki ikääntyneet eivät'));assert.deepEqual(anchor.steps.at(-1).years,[2024,2045]);assert.ok(anchor.steps.at(-1).explanation.includes('ennusteita, eivät havaintoja'));assert.ok(anchor.steps.at(-1).source_ids.includes('forecast2024'));assert.equal(anchor.steps.at(-1).related_anchor_id,'maaltamuutto');assert.ok(!anchor.statistics?.length);
});

test('wellbeing services reform separates decisions, transfer, exceptions and later evaluation',()=>{
 const anchor=data.anchors.find(a=>a.id==='hyvinvointialueuudistus');assert.ok(anchor);assert.equal(anchor.entry_theme_id,7);assert.equal(anchor.steps.length,6);assert.equal(anchor.steps[0].event_year,2021);assert.equal(anchor.steps[1].event_year,2022);assert.equal(anchor.steps[2].event_year,2023);assert.ok(anchor.steps[1].explanation.includes('Ahvenanmaa'));assert.ok(anchor.steps[2].explanation.includes('Helsinki'));assert.ok(anchor.steps[2].explanation.includes('HUS'));assert.ok(anchor.steps[2].explanation.includes('pelastustoimen'));assert.equal(anchor.steps[3].related_anchor_id,'vaeston-ikaantyminen');assert.ok(anchor.steps[4].source_ids.includes('integration'));assert.equal(anchor.steps.at(-1).event_year,2026);assert.ok(anchor.steps.at(-1).evidence_note.includes('toimintavuosi 2025'));assert.ok(!anchor.statistics?.length);
});

test('daycare path separates the 1973 law, staged rights and later research scope',()=>{
 const a=data.anchors.find(a=>a.id==='paivahoito-ja-naisten-palkkatyo');assert.ok(a);assert.equal(a.entry_theme_id,6);assert.equal(a.steps.length,6);assert.equal(a.steps[1].event_year,1973);assert.equal(a.steps[2].event_year,1990);assert.equal(a.steps[3].event_year,1996);assert.equal(a.steps[4].event_year,2020);assert.ok(a.steps[1].explanation.includes('ei vielä'));assert.equal(a.steps[3].related_anchor_id,'1990-luvun-lama');assert.ok(a.steps[5].source_ids.includes('private-study'));assert.ok(a.steps[5].explanation.includes('äitien työllisyysvaikutusta ei havaittu'));assert.ok(a.steps[5].evidence_note.includes('yksityisen hoidon tuen'));assert.ok(!a.statistics?.length);
});

test('EU accession separates EEA, referendum, membership and later euro changeover',()=>{
 const a=data.anchors.find(a=>a.id==='suomen-eu-jasenyys-1995');assert.ok(a);assert.equal(a.entry_theme_id,13);assert.equal(a.steps.length,6);assert.equal(a.steps[0].event_year,1994);assert.ok(a.steps[0].explanation.includes('Euroopan talousalueessa'));assert.ok(a.steps[1].explanation.includes('neuvoa-antava'));assert.equal(a.steps[2].event_year,1995);assert.ok(a.steps[2].explanation.includes('1. tammikuuta 1995'));assert.ok(a.steps[3].source_ids.includes('regions'));assert.equal(a.steps[4].event_year,1999);assert.ok(a.steps[4].explanation.includes('2002'));assert.ok(a.steps[4].source_ids.includes('cash'));assert.equal(a.steps.at(-1).event_year,2025);assert.ok(a.steps.at(-1).evidence_note.includes('ei tuoteta kausaalista'));assert.ok(!a.statistics?.length);
});

test('energy crisis separates import routes, prices, pre-existing investments and remaining dependence',()=>{
 const a=data.anchors.find(a=>a.id==='energiakriisi-ja-venaja-riippuvuuden-purkaminen');assert.ok(a);assert.equal(a.entry_theme_id,9);assert.equal(a.steps.length,6);
 assert.ok(a.steps[0].explanation.includes('ei tuonnin euroarvoa'));
 assert.ok(a.steps[1].explanation.includes('14.5.2022'));assert.ok(a.steps[1].explanation.includes('21.5.2022'));
 assert.ok(a.steps[2].evidence_note.includes('ei mittaa yksittäisen kotitalouden laskua'));
 assert.ok(a.steps[3].explanation.includes('16.1.2023'));assert.ok(a.steps[3].explanation.includes('ei yksin määritä'));
 assert.ok(a.steps[4].explanation.includes('16.4.2023'));assert.ok(a.steps[4].explanation.includes('kauan ennen'));
 assert.ok(a.steps[5].explanation.includes('LNG:tä ja ydinpolttoainetta'));assert.ok(a.steps[5].evidence_note.includes('eivät vuoden 2025'));
 assert.ok(a.steps.every(s=>s.evidence_note.includes('eivät tämän tapauksen mittaustuloksia')));
 assert.equal(a.mechanisms.length,2);assert.ok(!a.statistics?.length);
});

test('coronavirus path separates emergency periods, unequal remote access and evidence limits',()=>{
 const a=data.anchors.find(a=>a.id==='koronapandemia');assert.ok(a);assert.equal(a.entry_theme_id,7);assert.equal(a.steps.length,6);
 assert.ok(a.steps[0].explanation.includes('16.3.2020'));assert.ok(a.steps[0].explanation.includes('16.6.2020'));
 assert.ok(a.steps[1].explanation.includes('Kaikkia töitä ei voinut'));
 assert.equal(a.steps[2].related_anchor_id,'peruskoulu-uudistus');
 assert.ok(a.steps[3].source_ids.includes('emergency2021'));assert.ok(a.steps[3].evidence_note.includes('ei nykyisestä rokotusohjeesta'));
 assert.ok(a.steps[4].evidence_note.includes('ei mitata'));
 assert.equal(a.steps[5].event_year,2023);assert.ok(a.steps[5].explanation.includes('ei tarkoittanut pandemian tai taudin päättymistä'));
 assert.ok(a.steps[5].evidence_note.includes('ei osoitettu pandemian päättymisvuosi'));
 assert.ok(a.steps.every(s=>s.evidence_note.includes('eivät tämän tapauksen mittaustuloksia')));
 assert.equal(a.mechanisms.length,2);assert.ok(!a.statistics?.length);
});

test('immigration path separates population definitions, laws, labour-market evidence and reform goals',()=>{
 const a=data.anchors.find(a=>a.id==='maahanmuutto-ja-kotoutuminen');assert.ok(a);assert.equal(a.entry_theme_id,1);assert.equal(a.steps.length,6);
 assert.ok(a.steps[0].explanation.includes('Kansalaisuus, kieli ja syntyperä'));
 assert.equal(a.steps[1].event_year,1999);assert.equal(a.steps[2].event_year,2011);
 assert.ok(a.steps[3].evidence_note.includes('ei kaikkien havaintojen vuosi'));
 assert.equal(a.steps[4].event_year,2024);assert.ok(a.steps[4].explanation.includes('vaikka työllisten määrä kasvoi'));
 assert.equal(a.steps[5].event_year,2025);assert.ok(a.steps[5].evidence_note.includes('vaikutuksia ei ole osoitettu'));
 assert.ok(a.steps[5].evidence_note.includes('myöhempiä lakimuutoksia'));
 assert.ok(a.steps.every(s=>s.evidence_note.includes('eivät tämän tapauksen mittaustuloksia')));
 assert.equal(a.mechanisms.length,2);assert.ok(!a.statistics?.length);
});

test('Nokia path separates growth, platform decision, sale and later worker outcomes',()=>{
 const a=data.anchors.find(a=>a.id==='nokian-nousu-ja-matkapuhelinmurros');assert.ok(a);assert.equal(a.entry_theme_id,16);assert.equal(a.steps.length,6);assert.equal(a.steps[0].event_year,1991);assert.equal(a.steps[1].event_year,1998);assert.equal(a.steps[3].event_year,2011);assert.deepEqual(a.steps[4].years,[2013,2014]);assert.equal(a.steps[4].event_year,2014);assert.ok(a.steps[4].explanation.includes('ei koko Nokia-yhtiötä'));assert.ok(a.steps[4].source_ids.includes('sale2013'));assert.ok(a.steps[4].source_ids.includes('close2014'));assert.equal(a.steps.at(-1).event_year,2025);assert.ok(a.steps.at(-1).source_ids.includes('careers2021'));assert.ok(a.steps.at(-1).source_ids.includes('startups2025'));assert.ok(a.steps.at(-1).evidence_note.includes('kasvun ja selviytymisen'));assert.ok(!a.statistics?.length);
});

test('extended compulsory education separates 2021 rollout, TUVA and later evidence',()=>{
 const a=data.anchors.find(a=>a.id==='oppivelvollisuuden-laajentaminen-2021');assert.ok(a);assert.equal(a.entry_theme_id,4);assert.equal(a.steps.length,6);assert.equal(a.steps[0].event_year,2020);assert.ok(a.steps[1].event_label.includes('1.1.2021'));assert.ok(a.steps[2].event_label.includes('1.8.2021'));assert.ok(a.steps[1].explanation.includes('vuonna 2005'));assert.ok(a.steps[2].evidence_note.includes('eri asioita'));assert.equal(a.steps[3].event_year,2022);assert.ok(a.steps[3].source_ids.includes('tuva'));assert.equal(a.steps[4].event_year,2024);assert.equal(a.steps[5].event_year,2025);assert.ok(a.steps[5].source_ids.includes('effects2025'));assert.ok(a.steps[5].evidence_note.includes('kuvailevasta'));assert.equal(a.steps[0].related_anchor_id,'peruskoulu-uudistus');assert.ok(!a.statistics?.length);
});

test('famine path preserves population coverage, annual timing and aid evidence limits',()=>{
 const a=data.anchors.find(a=>a.id==='nalkavuodet-1866-1868');assert.ok(a);assert.equal(a.entry_theme_id,10);assert.equal(a.steps.length,6);
 assert.deepEqual(a.steps[0].years,[1866,1866]);assert.ok(a.steps[0].explanation.includes('ei ole varmennettu normaaliksi'));
 assert.equal(a.steps[1].event_year,1867);assert.ok(a.steps[1].explanation.includes('Viljalajit pidetään erillään'));
 assert.ok(a.steps[2].evidence_note.includes('ei todettu'));
 assert.equal(a.steps[3].event_year,1868);assert.ok(a.steps[3].explanation.includes('luterilaista seurakuntaväestöä'));assert.ok(a.steps[3].explanation.includes('ei ole nälkään kuolleiden osuus'));
 assert.ok(a.steps[3].evidence_note.includes('oikaistua lukua'));
 assert.ok(a.steps[4].explanation.includes('kauran alkuperää'));assert.ok(a.steps[4].evidence_note.includes('Paikallista vastaanottoa'));
 assert.ok(a.steps[5].explanation.includes('eikä siemenavun osoitetuksi vaikutukseksi'));
 assert.ok(a.steps.every(s=>s.evidence_note.includes('alkuperäisten sivukuvien tarkistusta ei uusittu')));
 assert.equal(a.mechanisms.length,2);assert.ok(!a.statistics?.length);
});

test('settlement path separates formation, buildings, recording dates and household outcomes',()=>{
 const a=data.anchors.find(a=>a.id==='asuttaminen-ja-jalleenrakennus-1945-1955');assert.ok(a);assert.equal(a.entry_theme_id,2);assert.equal(a.steps.length,6);
 assert.deepEqual(a.steps[0].years,[1945,1955]);assert.ok(a.steps[0].affected.includes('sotainvalidit'));
 assert.equal(a.steps[1].event_year,1946);assert.equal(a.steps[2].event_year,1948);assert.ok(a.steps[2].explanation.includes('lisäaluetta tai yhteismetsää'));
 assert.ok(a.steps[3].explanation.includes('rakennuksista, ei kotitalouksien määrästä'));
 assert.ok(a.steps[3].explanation.includes('1945–1947'));assert.ok(a.steps[3].evidence_note.includes('Koko jakson vuosihuippua ei nimetä'));
 assert.equal(a.steps[4].event_year,1952);assert.ok(a.steps[4].explanation.includes('Kirjaamisvuosi ja toiminnan vuosi'));
 assert.ok(a.steps[5].evidence_note.includes('kotitalousseuranta ovat avoimia'));assert.equal(a.steps[5].related_anchor_id,'maaltamuutto');
 assert.ok(a.steps.every(s=>s.evidence_note.includes('alkuperäisten sivukuvien tarkistusta ei uusittu')));
 assert.equal(a.mechanisms.length,2);assert.ok(!a.statistics?.length);
});

test('Sweden family path keeps memoir, municipal comparison, proposal and later cohort separate',()=>{
 const a=data.anchors.find(a=>a.id==='ruotsiin-muutto-ja-perheiden-arki');assert.ok(a);assert.equal(a.entry_theme_id,1);assert.equal(a.steps.length,6);
 assert.equal(a.steps[0].event_year,1969);assert.equal(a.steps[0].related_anchor_id,'maaltamuutto');
 assert.ok(a.steps[1].explanation.includes('tarkkoja vuosia ei ole varmennettu'));
 assert.ok(a.steps[2].explanation.includes('eri kunta'));assert.ok(a.steps[2].evidence_note.includes('Alkuperäisiä kirjeitä'));
 assert.equal(a.steps[3].event_year,1974);assert.ok(a.steps[3].explanation.includes('hoitajan löytyminen'));
 assert.equal(a.steps[4].event_year,1976);assert.ok(a.steps[4].evidence_note.includes('ei toteutuneen paikallisen palvelun'));
 assert.ok(a.steps[5].explanation.includes('ei ole Aron lasten seurannasta'));
 assert.ok(a.steps[5].evidence_note.includes('ei eristä paluun vaikutusta'));
 assert.ok(a.steps.every(s=>s.evidence_note.includes('alkuperäislähteiden tarkistusta ei uusittu')));
 assert.equal(a.mechanisms.length,2);assert.ok(!a.statistics?.length);
});
