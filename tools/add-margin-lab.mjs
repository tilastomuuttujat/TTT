import fs from 'node:fs';

const htmlFile = 'artikkeli.html';
let html = fs.readFileSync(htmlFile, 'utf8');

const cssMarker = '@media(max-width:600px){.compare-viz__grid';
if (!html.includes('.margin-lab__sliders')) {
  const css = `
/* Liikkumavaralaboratorio */
.margin-lab__layout{display:grid;grid-template-columns:minmax(0,1fr) 220px;gap:22px;align-items:start}.margin-lab__sliders{display:grid;gap:14px}.margin-control{padding:14px 16px;border:1px solid var(--line);background:rgba(255,253,248,.62)}.margin-control__head{display:flex;justify-content:space-between;gap:12px;align-items:baseline}.margin-control__name{font:800 10px/1 Inter,sans-serif;letter-spacing:.12em;text-transform:uppercase}.margin-control__value{font:700 18px/1 Fraunces,serif}.margin-control input{width:100%;margin:12px 0 4px;accent-color:var(--teal)}.margin-control__ends{display:flex;justify-content:space-between;color:rgba(20,38,49,.5);font:700 8px/1.2 Inter,sans-serif;letter-spacing:.08em;text-transform:uppercase}.margin-lab__orb{position:relative;display:grid;place-items:center;aspect-ratio:1;border:1px solid var(--line);background:radial-gradient(circle,rgba(31,111,113,.12),rgba(255,253,248,.7) 68%);overflow:hidden}.margin-lab__ring{position:absolute;border:1px solid rgba(20,38,49,.14);border-radius:50%;transition:.25s}.margin-lab__ring.r1{width:38%;height:38%}.margin-lab__ring.r2{width:62%;height:62%}.margin-lab__ring.r3{width:84%;height:84%}.margin-lab__core{position:relative;z-index:2;width:112px;height:112px;border-radius:50%;display:grid;place-items:center;padding:12px;text-align:center;background:var(--ink);color:var(--paper);font:800 10px/1.35 Inter,sans-serif;letter-spacing:.06em;transition:transform .25s,background .25s}.margin-lab__status{margin-top:16px;padding:18px;border-left:4px solid var(--teal);background:rgba(31,111,113,.08)}.margin-lab__status strong{display:block;margin-bottom:6px;font:700 19px/1.2 Fraunces,serif}.margin-lab__status p{margin:0!important;font:500 12px/1.55 Inter,sans-serif!important;color:rgba(20,38,49,.72)}.margin-lab__paradoxes{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.margin-flag{padding:10px 12px;border:1px solid var(--line);background:rgba(255,255,255,.5);font:700 10px/1.35 Inter,sans-serif;color:rgba(20,38,49,.55)}.margin-flag.active{border-color:var(--rust);background:rgba(181,76,42,.08);color:var(--ink)}.margin-lab__repair{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;margin-top:14px;padding:16px;background:var(--ink);color:var(--paper)}.margin-lab__repair p{margin:0!important;font:500 12px/1.5 Inter,sans-serif!important}.margin-lab__repair button{white-space:nowrap;border-color:var(--paper);color:var(--paper)}.margin-lab__repair button:hover{background:var(--paper);color:var(--ink)}
@media(max-width:700px){.margin-lab__layout{grid-template-columns:1fr}.margin-lab__orb{max-width:260px;width:100%;margin:auto}.margin-lab__paradoxes{grid-template-columns:1fr}.margin-lab__repair{grid-template-columns:1fr}}
`;
  if (!html.includes(cssMarker)) throw new Error('CSS marker not found');
  html = html.replace(cssMarker, css + '\n' + cssMarker);
}

if (!html.includes('function marginLab(config)')) {
  const fnMarker = 'function renderVisualization(config)';
  const fn = `function marginLab(config){
 const root=el('aside','story-viz margin-lab');root.append(el('div','story-viz__eyebrow',config.eyebrow||'Kokeile järjestelmää'),el('h3','',config.title||'Liikkumavaralaboratorio'));
 if(config.intro)root.append(el('p','story-viz__intro',config.intro));
 const canvas=el('div','story-viz__canvas'),layout=el('div','margin-lab__layout'),sliders=el('div','margin-lab__sliders'),orb=el('div','margin-lab__orb');
 orb.append(el('div','margin-lab__ring r3'),el('div','margin-lab__ring r2'),el('div','margin-lab__ring r1'));const core=el('div','margin-lab__core','TASAPAINO');orb.append(core);layout.append(sliders,orb);canvas.append(layout);root.append(canvas);
 const defs=config.controls||[];const vals={};const valueEls={};
 defs.forEach(d=>{vals[d.key]=Number(d.value??50);const box=el('label','margin-control'),head=el('div','margin-control__head'),name=el('span','margin-control__name',d.label||d.key),v=el('span','margin-control__value',String(vals[d.key]));valueEls[d.key]=v;head.append(name,v);const input=document.createElement('input');input.type='range';input.min=0;input.max=100;input.step=1;input.value=vals[d.key];input.dataset.key=d.key;const ends=el('div','margin-control__ends');ends.append(el('span','',d.low||'Vähän'),el('span','',d.high||'Paljon'));box.append(head,input,ends);sliders.append(box);input.addEventListener('input',()=>{vals[d.key]=Number(input.value);v.textContent=input.value;update()})});
 const status=el('div','margin-lab__status'),st=el('strong'),sp=el('p');status.append(st,sp);root.append(status);const flags=el('div','margin-lab__paradoxes');const flagDefs=[['responsibility','Vastuu ilman toimintakykyä'],['freedom','Vapaus ilman turvaa'],['authority','Vastuu ilman päätösvaltaa'],['balanced','Vahva turva + suuri liikkumavara']];const flagEls={};flagDefs.forEach(([k,t])=>{const f=el('div','margin-flag',t);flagEls[k]=f;flags.append(f)});root.append(flags);
 const repair=el('div','margin-lab__repair'),rp=el('p'),rb=el('button','',config.repairLabel||'KORJAA PIENIMMÄLLÄ MUUTOKSELLA');rb.type='button';repair.append(rp,rb);root.append(repair);
 function classify(){const t=vals.security??50,v=vals.choice??50,r=vals.resources??50,w=vals.responsibility??50,c=vals.control??50;const paradox={responsibility:w-r>15,freedom:v-t>20,authority:w-v>20,balanced:t>=65&&v>=65&&r>=55};let title='Joustava mutta jännitteinen malli',text='Mikään yksittäinen säätö ei ratkaise kokonaisuutta. Ratkaisevaa on turvan, resurssien, vastuun ja päätösvallan suhde.';if(paradox.responsibility){title='Vastuu ilman toimintakykyä';text='Ihmiseltä odotetaan enemmän kuin hänen käytettävissään olevat resurssit mahdollistavat.'}else if(paradox.freedom&&r<50){title='Näennäinen vapaus';text='Valinnanvaraa on paljon, mutta turva ja resurssit eivät tee vaihtoehdoista aidosti saavutettavia.'}else if(c>=75&&v<=35){title='Holhoava turva';text='Turva voi olla vahva, mutta korkea kontrolli ja pieni valinnanvara kaventavat omaa toimijuutta.'}else if(paradox.balanced&&c<=65){title='Toimintakykyä vahvistava liikkumavara';text='Vahva turva ja todelliset resurssit yhdistyvät suureen valinnanvaraan. Vastuu ei irtoa toimintakyvystä.'}else if(t<40&&v>=65){title='Omavastuun varaan jäävä vapaus';text='Valintoja on, mutta riskien seuraukset jäävät pitkälti ihmiselle.'}return{title,text,paradox,t,v,r,w,c}}
 function repairHint(x){const gaps=[];if(x.w-x.r>15)gaps.push({amount:x.w-x.r-15,text:'Lisää resursseja '+Math.ceil(x.w-x.r-15)+' pistettä tai vähennä vastuuta saman verran.',key:'resources',delta:Math.ceil(x.w-x.r-15)});if(x.v-x.t>20)gaps.push({amount:x.v-x.t-20,text:'Vahvista turvaa '+Math.ceil(x.v-x.t-20)+' pistettä tai pienennä valinnanvaran mukana siirtyvää riskiä.',key:'security',delta:Math.ceil(x.v-x.t-20)});if(x.w-x.v>20)gaps.push({amount:x.w-x.v-20,text:'Lisää päätösvaltaa '+Math.ceil(x.w-x.v-20)+' pistettä tai kevennä vastuuta.',key:'choice',delta:Math.ceil(x.w-x.v-20)});if(!gaps.length)return{amount:0,text:'Selvää rakenteellista ristiriitaa ei juuri nyt löydy. Pienin muutos on säilyttää tasapaino.',key:null,delta:0};gaps.sort((a,b)=>a.amount-b.amount);return gaps[0]}
 function update(){const x=classify();st.textContent=x.title;sp.textContent=x.text;Object.entries(x.paradox).forEach(([k,v])=>flagEls[k]?.classList.toggle('active',!!v));const skew=Math.max(-10,Math.min(10,(x.v+x.r-x.c-x.w)/12));core.style.transform='translateX('+skew+'px) scale('+(0.9+Math.min(20,(x.t+x.r)/10)/100)+')';core.textContent=x.title.toUpperCase();rp.textContent=repairHint(x).text}
 rb.addEventListener('click',()=>{const x=classify(),h=repairHint(x);if(!h.key)return;vals[h.key]=Math.max(0,Math.min(100,vals[h.key]+h.delta));const input=sliders.querySelector('input[data-key="'+h.key+'"]');if(input){input.value=vals[h.key];valueEls[h.key].textContent=vals[h.key]}update()});
 update();return root}

`;
  if (!html.includes(fnMarker)) throw new Error('Function marker not found');
  html = html.replace(fnMarker, fn + fnMarker);
}

if (!html.includes("case'margin-lab':return marginLab(config)")) {
  html = html.replace("case'intervention':return intervention(config);default:", "case'intervention':return intervention(config);case'margin-lab':return marginLab(config);default:");
}
fs.writeFileSync(htmlFile, html);

const vizFile = 'artikkeli-visualisoinnit.json';
const data = JSON.parse(fs.readFileSync(vizFile, 'utf8'));
const articles = Array.isArray(data) ? data : (data.articles ||= []);
const id = 'liikkumavaran-hyvinvointivaltio';
let article = articles.find(a => a && (a.id === id || a.slug === id));
if (!article) { article = { id, sections: {} }; articles.push(article); }
article.sections ||= {};
const sid = 'miksi-liikkumavara-on-tulevaisuuden-hyvinvointia';
const lab = {
  type:'margin-lab',
  eyebrow:'Liikkumavaralaboratorio',
  title:'Rakenna oma hyvinvointivaltiosi – ja katso missä se alkaa kiristää',
  intro:'Säädä viittä ulottuvuutta. Laboratorio ei etsi yhtä oikeaa pistettä, vaan tunnistaa tilanteet, joissa vastuu, resurssit, turva, valinnanvara ja kontrolli joutuvat ristiriitaan.',
  repairLabel:'KORJAA PIENIMMÄLLÄ MUUTOKSELLA',
  controls:[
    {key:'security',label:'Turva',value:78,low:'Ohut turva',high:'Vahva turva'},
    {key:'choice',label:'Valinnanvara',value:72,low:'Järjestelmä päättää',high:'Ihminen päättää'},
    {key:'resources',label:'Resurssit',value:68,low:'Niukat',high:'Riittävät'},
    {key:'responsibility',label:'Vastuu',value:58,low:'Vähän',high:'Paljon'},
    {key:'control',label:'Kontrolli',value:42,low:'Kevyt',high:'Tiukka'}
  ]
};
const existing = article.sections[sid];
if (!existing) article.sections[sid] = lab;
else if (Array.isArray(existing)) { if (!existing.some(x => x && x.type === 'margin-lab')) existing.push(lab); }
else if (existing.type !== 'margin-lab') article.sections[sid] = [existing, lab];
fs.writeFileSync(vizFile, JSON.stringify(data, null, 2) + '\n');
