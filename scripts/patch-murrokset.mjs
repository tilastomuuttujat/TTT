// Preserve the supplied compiled UI; keep every product change below reproducible.
import fs from 'node:fs';
import crypto from 'node:crypto';
let source=fs.readFileSync('assets/index--gBIk-ew.js','utf8');
const core="import {loadPublication,caseEvidence,chartModel,validRelations,allRows,openingModel} from './murrokset-core.mjs';\nlet publicationMeta={};\n";
function replaceOnce(before,after){if(!source.includes(before)||source.indexOf(before)!==source.lastIndexOf(before))throw Error('Expected unique patch: '+before.slice(0,80));source=source.replace(before,after);}
function replaceBlock(start,end,replacement){const a=source.lastIndexOf(start),b=source.indexOf(end,a+start.length);if(a<0||b<0)throw Error('Patch boundary missing: '+start);source=source.slice(0,a)+replacement+source.slice(b);}
const components=fs.readFileSync('scripts/murrokset-components.txt','utf8')+'\n'+fs.readFileSync('scripts/murrokset-opening.txt','utf8');
replaceBlock('function Sf(', 'function wf()',components+'\n');
replaceBlock('function _n(e){','function vn(e)',`function _n(e){return {direction:e.data.direction??(e.kind==='future'?'branch':'adapt'),impact:typeof e.data.impact==='number'?Math.max(-3,Math.min(3,e.data.impact)):0};}`);
replaceBlock('function yn(e){','var bn=',`function yn(e){return caseEvidence(e);}`);
replaceOnce('adapt:`Sopeutus`','adapt:`Suunta arvioimatta`');
replaceOnce('measured:`Mitattu data`','measured:`Mitattu havainto`');
replaceOnce('m.impact>0?`+`:``,m.impact,` · `,e.data.direction?`Tutkijan arvio`:`Johdettu kuvauksesta – tarkistettava`','e.data.direction?`Tutkijan arvio: ${fn[m.direction]}`:`Suuntaa ei ole arvioitu`');
replaceOnce('async function k(){x(!0);',`async function k(live=false){x(!0);if(!live){try{const snapshot=await loadPublication();publicationMeta=snapshot;t(snapshot);r(id=>snapshot.cases.some(c=>c.id===id)?id:void 0);C('Julkaistu lukijaversio · '+new Date(snapshot.generated_at).toLocaleString('fi-FI'));}catch(error){C(error.message);d(!1);}finally{x(!1);}return;}`);
replaceOnce('te(t),k()','te(t),k(Boolean(t))');
replaceOnce('gf.auth.getSession().then(({data:e})=>te(e.session))','gf.auth.getSession().then(({data:e})=>{te(e.session);if(e.session?.user.app_metadata?.is_admin===true)void k(true);})');
replaceOnce('async function k(live=false){x(!0);','async function k(live=false){if(live&&!(w?.user.app_metadata?.is_admin===true)){return;}x(!0);');
// getSession can run before state commits: auth event refresh provides the authoritative session.
replaceOnce('te(t),k(Boolean(t))','te(t),k(t?.user.app_metadata?.is_admin===true,t)');
replaceOnce('async function k(live=false){if(live&&!(w?.user.app_metadata?.is_admin===true))','async function k(live=false,authSession=w){if(live&&!(authSession?.user.app_metadata?.is_admin===true))');
replaceOnce('void k(true);','void k(true,e.session);');
replaceOnce('await k()}async function _e()', 'await k(true)}async function _e()');
replaceOnce('async function _e(){let t=', 'async function _e(){if(!pe)return;let t=');
replaceOnce('values:e.values.filter(e=>n.series.includes(e.series_key))','values:e.values.filter(e=>n.series.includes(e.series_key)),relations:validRelations(t,publicationMeta.relations??[])');
replaceOnce('focus:f===void 0?void 0:Tn[f].range','focus:f===void 0?void 0:Tn[f].range,relations:publicationMeta.relations??[]');
// Read every linked value page and preserve observation/estimate metadata.
replaceOnce('u=(await gf.from(`indicator_values`).select(`series_key,year,group_key,group_label,value,value_text`).in(`series_key`,s.series).eq(`is_published`,!0).order(`year`)).data??[]', 'u=await allRows(()=>gf.from(`indicator_values`).select(`series_key,year,group_key,group_label,period,value,value_text,value_kind,validation_status`).in(`series_key`,s.series).eq(`is_published`,!0).order(`series_key`).order(`group_key`).order(`year`).order(`period`))');
replaceOnce('let[{data:e,error:n},{data:i},{data:a}]=await Promise.all([gf.from(`atlas_mechanism_cases`).select(`*`).order(`year_start`),gf.from(`items`).select(`id,title,year_start,year_end,type,domains,problem,mechanism,effects,long_effect,importance,sources`).eq(`unpublished`,!1),gf.from(`indicator_series`).select(`series_key,title,unit,source,source_url,interpretation`).eq(`published`,!0)])', 'let[e,i,a]=await Promise.all([allRows(()=>gf.from(`atlas_mechanism_cases`).select(`*`).order(`year_start`).order(`id`)),allRows(()=>gf.from(`items`).select(`id,title,year_start,year_end,type,domains,problem,mechanism,effects,long_effect,importance,sources`).eq(`unpublished`,!1).order(`id`)),allRows(()=>gf.from(`indicator_series`).select(`series_key,title,unit,source,source_url,interpretation`).eq(`published`,!0).order(`series_key`))])');
replaceOnce('if(n){C(`Aineistoa ei voitu avata juuri nyt.`),x(!1);return}', '');
replaceOnce('finally{x(!1);}return;}let[e,i,a]', 'finally{x(!1);}return;}try{let[e,i,a]');
replaceOnce('r(e=>o.some(t=>t.id===e)?e:void 0),x(!1)}(0,S.useEffect)', 'r(e=>o.some(t=>t.id===e)?e:void 0),x(!1)}catch(error){C(error.message||`Ylläpidon aineistohaku epäonnistui.`);x(!1)}}(0,S.useEffect)');
// Initial reader load never creates a Supabase client or asks for a session.
replaceOnce('(0,S.useEffect)(()=>{gf.auth.getSession()', '(0,S.useEffect)(()=>{if(!ne&&!w)return;gf.auth.getSession()');
replaceOnce('return k(),()=>e.subscription.unsubscribe()},[])', 'return()=>e.subscription.unsubscribe()},[ne])');
replaceOnce('async function k(live=false,authSession=w)', 'async function k(live=false,authSession=w)');
// Separate published load from optional maintenance authentication.
replaceOnce('(0,S.useEffect)(()=>{if(!ne&&!w)return;', '(0,S.useEffect)(()=>{void k();},[]),(0,S.useEffect)(()=>{if(!ne&&!w)return;');
const overviewFields=[['featured_order','Avauspainikkeen järjestys (tyhjä = muu ankkuri)'],['period','Avauspainikkeen ajanjakso'],['title','Avauspainikkeen otsikko'],['hypothesis','Tutkittava tulkinta'],['production','Tuotannon asetelma'],['livelihood','Toimeentulon asetelma'],['responsibility','Yhteisen vastuun asetelma'],['support','Tulkintaa tukeva näyttö'],['counter','Tulkinnan vastanäyttö'],['alternative','Vaihtoehtoinen selitys'],['question','Seuraava tutkimuskysymys'],['reviewed','Tulkinta tarkistettu (päivämäärä / versio)']];
replaceOnce('vf.map((e,t)=>',`L.jsxs('fieldset',{className:'opening-editor',children:[L.jsx('legend',{children:'Etunäkymän tutkittava asetelma'}),...${JSON.stringify(overviewFields)}.map(([key,label])=>L.jsxs(z,{children:[label,L.jsx(B,{value:D.data.overview?.[key]??'',onChange:event=>O({...D,data:{...D.data,overview:{...D.data.overview,[key]:key==='featured_order'?(event.target.value.trim()===''?undefined:Number(event.target.value)):event.target.value}}})})]},key)),L.jsxs(z,{children:['Asetelman käsitteellinen muoto',L.jsxs('select',{value:D.data.overview?.pattern??'unclear',onChange:event=>O({...D,data:{...D.data,overview:{...D.data.overview,pattern:event.target.value}}}),children:[L.jsx('option',{value:'unclear',children:'Suhde avoin'}),L.jsx('option',{value:'converging',children:'Tutkitaan yhteensovittumista'}),L.jsx('option',{value:'diverging',children:'Tutkitaan eriytymistä'})]})]})]}),vf.map((e,t)=>`);
// Tour is explicit: do not interrupt reading after seven seconds of inactivity.
replaceBlock('(0,S.useEffect)(()=>{if(u||b||g||f!==void 0||n)return;', 'function A(e,t)', 'void 0;');
// Source of insight remains a hypothesis, not fixed numeric radar scores.
replaceOnce('(0,L.jsx)(Dn,{values:a.radar})','(0,L.jsx)(`p`,{children:`Tutkittava tulkinta · kuvitteellisen mittaprofiilin sijaan tarkista ankkurien havaintoaineisto.`})');
replaceOnce('children:`Katkoviiva = tasapaino`','children:`Mekanismi tarvitsee rinnakkaista näyttöä.`');
replaceOnce('"aria-label":`Syy–seuraus-kehä`','"aria-label":`Tutkittava välitysketju`');
replaceOnce('title:`Tuottavuus ja hyvinvointi kasvavat yhdessä`','title:`Milloin tuotannon kasvu välittyi laajaksi osallistumiseksi?`');
replaceOnce('text:`Teollistuminen nostaa tuottavuutta, ja lähes koko työikäinen väestö pääsee mukaan. Verotulot kasvavat nopeammin kuin korjauskulut – syntyy hyvän kierre, joka rakentaa koulutuksen ja palvelut.`','text:`Tutkittava tulkinta: tuotannon, työn ja yhteisten palvelujen yhteensovittaminen voi vahvistaa osallistumista. Pitkä jakso sisältää myös kriisejä ja ryhmien eroja. Ankkureista etsitään näyttöä sekä onnistumisille että puutteille.`');
replaceOnce('text:`Automaatio ja osaamisvaatimukset tehostavat tuotantoa, mutta osallistumiskynnys nousee. Osa työpanoksesta jää käyttämättä, ja korjauskustannukset alkavat syödä tuottavuuden hyötyjä.`','text:`Tutkittava tulkinta: tuotannon tehostuminen ja ihmisten osallistumismahdollisuudet voivat eriytyä. Suhdanteet, koulutus, työn sijainti ja tulonjako ovat vaihtoehtoisia selityksiä, joita verrataan ankkurien aineistoon.`');
replaceOnce('text:`Menoja leikataan tasapainon palauttamiseksi. Jos käyttämätöntä toimintakykyä ei saada takaisin käyttöön, leikkaukset vain siirtävät kustannuksia eteenpäin.`','text:`Tutkittava kysymys: vahvistiko sopeutus toimintakykyä vai siirtyikö kustannuksia eteenpäin? Tarkastelu tarvitsee päätöksen tavoitteen, toteutuksen, ryhmittäiset vaikutukset ja vaihtoehtoiset selitykset.`');
replaceOnce('text:`Kestävä yhteiskunta ei maksimoi pelkkää tuottavuutta eikä pelkkää työllisyyttä. Se minimoi käyttämättömän toimintakyvyn menettämättä tuottavuushyötyjä – työtä räätälöidään ja kynnystä madalletaan.`','text:`Ehdollinen tulevaisuuspolku: työn räätälöinti ja osallistumisen kynnyksen madaltaminen voivat vahvistaa toimintakykyä. Vaikutukset, kustannukset ja toteutusedellytykset ovat tutkittavia; tämä ei ole ennuste.`');
source=source.replaceAll('children:`Päättele automaattisesti`','children:`Ei arvioitu`');
replaceOnce('[m,h]=(0,S.useState)(!0)',"[m,h]=(0,S.useState)(!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)");
// The optional full-screen tour uses the same maintained interpretation as the opening.
replaceOnce('let a=Tn[e],[o,s]', `let base=Tn[e],anchor=publicationMeta.cases?.find(c=>c.data?.overview?.featured_order===e+1),model=anchor?openingModel(anchor):null,a=model?{...base,era:model.period,title:model.hypothesis,text:model.question,loop:[model.production,model.livelihood,model.responsibility]}:base,[o,s]`);
replaceOnce('children:`Tutkittava tulkinta · kuvitteellisen mittaprofiilin sijaan tarkista ankkurien havaintoaineisto.`', `children:model?L.jsxs('span',{className:'era-vertical',children:[L.jsx('strong',{children:model.stateLabel}),...['production','livelihood','responsibility'].map(key=>L.jsx('span',{className:'arrangement-row row-'+key,children:model[key]},key))]}):'Asetelmaa ei ole vielä ylläpidetty.'`);
fs.writeFileSync('assets/murrokset-reader.js',core+source);
const html=fs.readFileSync('murrokset.html','utf8').replace('<link rel="stylesheet" href="./assets/murrokset-reader.css">\n','').replace('./assets/index--gBIk-ew.js','./assets/murrokset-reader.js').replace('<link rel="stylesheet" href="./assets/murrokset-opening.css">\n','').replace('</head>','<link rel="stylesheet" href="./assets/murrokset-reader.css">\n<link rel="stylesheet" href="./assets/murrokset-opening.css">\n</head>');fs.writeFileSync('murrokset.html',html);
console.log('Patched reader bundle built.');
