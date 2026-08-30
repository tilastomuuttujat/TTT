import fs from 'node:fs';

const htmlFile='artikkeli.html';
let html=fs.readFileSync(htmlFile,'utf8');
const cssStart=html.indexOf('/* Liikkumavaralaboratorio */');
const cssEnd=html.indexOf('@media(max-width:600px)',cssStart);
if(cssStart<0||cssEnd<0) throw new Error('Old margin lab CSS block not found');
const css=`/* Liikkumavaran rajakartta */
.boundary-map__frame{position:relative;overflow:hidden;border:1px solid var(--line);background:rgba(255,253,248,.62);padding:22px}.boundary-map__scale{display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:center;margin-bottom:18px;font:800 9px/1.2 Inter,sans-serif;letter-spacing:.13em;text-transform:uppercase}.boundary-map__scale span:first-child{text-align:left;color:var(--blue)}.boundary-map__scale span:nth-child(2){color:rgba(20,38,49,.45)}.boundary-map__scale span:last-child{text-align:right;color:var(--teal)}.boundary-map__track{position:relative;min-height:460px;padding:8px 0 16px}.boundary-map__axis{position:absolute;left:50%;top:0;bottom:0;width:1px;background:var(--line)}.boundary-map__zone{position:absolute;left:0;right:0;pointer-events:none}.boundary-map__zone.system{top:0;background:linear-gradient(90deg,rgba(36,88,120,.10),transparent 68%)}.boundary-map__zone.person{bottom:0;background:linear-gradient(90deg,transparent 32%,rgba(31,111,113,.10))}.boundary-map__items{position:relative;z-index:2;display:grid;gap:8px}.boundary-item{display:grid;grid-template-columns:1fr 54px 1fr;gap:10px;align-items:center;min-height:43px}.boundary-item__label{grid-column:1;padding:9px 11px;border:1px solid rgba(36,88,120,.24);background:#f7f8f6;font:700 11px/1.25 Inter,sans-serif}.boundary-item.shared .boundary-item__label{grid-column:2 / 4;border-color:rgba(181,122,34,.28);background:#fffaf0}.boundary-item.person .boundary-item__label{grid-column:3;border-color:rgba(31,111,113,.25);background:#f4faf7}.boundary-map__line{position:absolute;z-index:4;left:0;right:0;height:4px;background:var(--rust);box-shadow:0 0 0 1px rgba(255,253,248,.9);cursor:ns-resize;touch-action:none}.boundary-map__line::before{content:'LIIKKUMAVARAN RAJA';position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);padding:7px 11px;background:var(--rust);color:#fff;font:800 8px/1 Inter,sans-serif;letter-spacing:.12em;white-space:nowrap}.boundary-map__handle{position:absolute;right:8px;top:50%;transform:translateY(-50%);width:25px;height:25px;border:2px solid #fff;border-radius:50%;background:var(--rust);box-shadow:0 1px 5px rgba(20,38,49,.18)}.boundary-map__readout{margin:16px 0 0!important;padding:15px 17px;border-left:4px solid var(--teal);background:rgba(31,111,113,.08);font:600 12px/1.55 Inter,sans-serif!important}.boundary-map__principle{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}.boundary-map__principle div{padding:12px;border:1px solid var(--line);text-align:center;font:800 9px/1.35 Inter,sans-serif;letter-spacing:.08em}.boundary-map__principle b{display:block;margin-bottom:5px;color:var(--rust);font-size:8px}.boundary-map__question{margin:18px 0 0!important;text-align:center;font:600 20px/1.3 Fraunces,serif!important;color:var(--blue)}
@media(max-width:600px){.boundary-map__frame{padding:15px}.boundary-map__track{min-height:500px}.boundary-item{grid-template-columns:1fr 34px 1fr;gap:6px}.boundary-item__label{font-size:10px}.boundary-map__principle{grid-template-columns:1fr}.boundary-map__line::before{left:12px;transform:translateY(-50%)}}

`;
html=html.slice(0,cssStart)+css+html.slice(cssEnd);
const fnStart=html.indexOf('function marginLab(config)');
const fnEnd=html.indexOf('function renderVisualization(config)',fnStart);
if(fnStart<0||fnEnd<0) throw new Error('marginLab function not found');
const fn=`function boundaryMap(config){
 const root=el('aside','story-viz boundary-map');
 root.append(el('div','story-viz__eyebrow',config.eyebrow||'Kenen pitää päättää?'),el('h3','',config.title||'Missä kulkee liikkumavaran raja?'));
 if(config.intro)root.append(el('p','story-viz__intro',config.intro));
 const frame=el('div','boundary-map__frame'),scale=el('div','boundary-map__scale');
 scale.append(el('span','',config.systemLabel||'Yhteiskunta päättää'),el('span','','↔'),el('span','',config.personLabel||'Ihminen päättää'));frame.append(scale);
 const track=el('div','boundary-map__track'),axis=el('div','boundary-map__axis'),sysZone=el('div','boundary-map__zone system'),personZone=el('div','boundary-map__zone person'),items=el('div','boundary-map__items'),line=el('div','boundary-map__line'),handle=el('span','boundary-map__handle');line.append(handle);track.append(sysZone,personZone,axis,items,line);frame.append(track);root.append(frame);
 const rows=config.items||[];rows.forEach(item=>{const row=el('div','boundary-item '+(item.owner||'shared'));row.append(el('div','boundary-item__label',item.label||''));items.append(row)});
 const readout=el('p','boundary-map__readout'),principles=el('div','boundary-map__principle');(config.principles||[]).forEach((p,i)=>{const d=el('div');d.append(el('b','',String(i+1).padStart(2,'0')),document.createTextNode(p));principles.append(d)});const question=el('p','boundary-map__question',config.question||'Kuinka paljon yhteiskunnan täytyy päättää, jotta sen ei tarvitse päättää kaikkea?');root.append(readout,principles,question);
 let pos=Number(config.value??48),drag=false;
 function update(){pos=Math.max(16,Math.min(84,pos));line.style.top=pos+'%';sysZone.style.height=pos+'%';personZone.style.top=pos+'%';const low=config.messages?.low||'Kun yhteiskunta määrittää lähes kaikki keinot, turva voi alkaa muuttua tarpeettomaksi menettelyohjaukseksi.';const mid=config.messages?.mid||'Yhteiskunta turvaa oikeudet ja reunaehdot, tavoite sovitaan yhdessä ja ihminen saa valita suuren osan reitistään.';const high=config.messages?.high||'Kun myös perusturva ja oikeudet siirtyvät yksilön vastuulle, liikkumavara alkaa muuttua riskinsiirroksi.';readout.textContent=pos<34?low:pos>66?high:mid}
 function setFrom(e){const r=track.getBoundingClientRect();const y=(e.touches?e.touches[0].clientY:e.clientY)-r.top;pos=y/r.height*100;update()}
 line.addEventListener('pointerdown',e=>{drag=true;line.setPointerCapture?.(e.pointerId);setFrom(e)});line.addEventListener('pointermove',e=>{if(drag)setFrom(e)});line.addEventListener('pointerup',()=>drag=false);line.addEventListener('pointercancel',()=>drag=false);track.addEventListener('click',e=>{if(e.target!==line&&e.target!==handle){setFrom(e)}});update();return root
}

`;
html=html.slice(0,fnStart)+fn+html.slice(fnEnd);
html=html.replace("case'margin-lab':return marginLab(config);","case'boundary-map':return boundaryMap(config);");
fs.writeFileSync(htmlFile,html);

const jsonFile='artikkeli-visualisoinnit.json';
const data=JSON.parse(fs.readFileSync(jsonFile,'utf8'));
const articles=Array.isArray(data)?data:data.articles;
const a=articles.find(x=>x&&(x.id==='liikkumavaran-hyvinvointivaltio'||x.slug==='liikkumavaran-hyvinvointivaltio'));
if(!a)throw new Error('Article visualization config not found');
const sid='miksi-tulevaisuuden-hyvinvointia';
const old=a.sections?.[sid];
const replacement={type:'boundary-map',eyebrow:'Kenen pitää päättää?',title:'Missä kulkee liikkumavaran raja?',intro:'Vedä rajaa ylös tai alas. Mitä yhteiskunnan on taattava kaikille – ja missä kohdassa ihmisen pitäisi saada valita oma reittinsä?',systemLabel:'Yhteiskunta päättää',personLabel:'Ihminen päättää',value:48,items:[{label:'Vähimmäisturva',owner:'system'},{label:'Oikeudet ja syrjimättömyys',owner:'system'},{label:'Turvallisuus ja vähimmäislaatu',owner:'system'},{label:'Tavoite ja käytettävä resurssi',owner:'shared'},{label:'Vaikutuksen arviointi',owner:'shared'},{label:'Oma reitti',owner:'person'},{label:'Palvelujen yhdistelmä',owner:'person'},{label:'Ajankäyttö ja oppimisen tapa',owner:'person'}],principles:['TURVAA MINIMI','MÄÄRITÄ TAVOITE','ANNA LIIKKUMAVARAA'],messages:{low:'Kun yhteiskunta määrittää lähes kaikki keinot, turva alkaa helposti muuttua menettelyohjaukseksi. Oikeus säilyy, mutta oma reitti kapenee.',mid:'Tasapaino: yhteiskunta turvaa oikeudet ja vähimmäistason, tavoite sovitaan yhdessä ja ihminen saa valita suuren osan reitistään.',high:'Kun myös perusturva, turvallisuus tai oikeudet siirtyvät yksilön vastuulle, liikkumavara alkaa muuttua riskinsiirroksi.'},question:'Kuinka paljon yhteiskunnan täytyy päättää, jotta sen ei tarvitse päättää kaikkea?'};
if(Array.isArray(old)){
 const kept=old.filter(x=>x&&x.type!=='margin-lab'&&x.type!=='boundary-map');
 a.sections[sid]=[...kept,replacement];
}else if(old&&old.type!=='margin-lab'&&old.type!=='boundary-map') a.sections[sid]=[old,replacement];
else a.sections[sid]=replacement;
fs.writeFileSync(jsonFile,JSON.stringify(data,null,2)+'\n');
console.log('Replaced margin lab with boundary map');
