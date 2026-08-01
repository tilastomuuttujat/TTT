const DATA_FILES = Object.freeze({
  murros: '../murrosatlas.json',
  selitys: '../selitysatlas.json',
  crosswalk: '../crosswalk.json'
});

const COLORS = Object.freeze({ murros:'#4ca8bd', K:'#ef5b70', R:'#58b97b', S:'#907ae8', edge:'#c39347' });
let cleanup = null;

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const yearOf = node => Number(node.y0 ?? node.y1 ?? 1900);

async function loadJson(path) {
  const response = await fetch(path, { cache:'no-store' });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
}

async function loadData() {
  const [murrosRaw, selitysRaw, crosswalkRaw] = await Promise.all([
    loadJson(DATA_FILES.murros), loadJson(DATA_FILES.selitys), loadJson(DATA_FILES.crosswalk)
  ]);
  const nodes = [];
  const byId = new Map();
  for (const item of murrosRaw.items ?? []) {
    const node = { id:item.id, label:item.title, kind:'murros', category:'murros', y0:item.year_start, y1:item.year_end,
      text:item.problem || item.mechanism || item.phase || '', type:item.type || 'murros', degree:0 };
    nodes.push(node); byId.set(node.id,node);
  }
  for (const item of selitysRaw.themes ?? []) {
    const node = { id:item.id, label:item.name, kind:'selitys', category:item.category || 'S',
      y0:item.period_start ?? item.period?.start, y1:item.period_end ?? item.period?.end,
      text:item.summary || '', type:item.category || 'S', degree:0 };
    nodes.push(node); byId.set(node.id,node);
  }
  const edges = (crosswalkRaw.links ?? []).map(link => ({
    source:byId.get(link.source), target:byId.get(link.target), confidence:Number(link.confidence ?? 0), tier:link.tier || ''
  })).filter(edge => edge.source && edge.target);
  for (const edge of edges) { edge.source.degree++; edge.target.degree++; }
  return { nodes, edges, byId };
}

function stylesheet() {
  return `<style data-atlas-crosswalk>
  .acw{--bg:#080b10;--panel:#10151d;--panel2:#171d27;--line:rgba(255,255,255,.10);--fg:#eee9df;--muted:#929aa6;--accent:#d7a34e;display:grid;grid-template-columns:250px 1fr 320px;width:100%;height:100%;min-height:0;background:var(--bg);color:var(--fg);font:14px/1.45 Inter,system-ui,sans-serif}
  [data-theme="light"] .acw{--bg:#f4f1ea;--panel:#fffdfa;--panel2:#eee9df;--line:rgba(34,43,52,.15);--fg:#1b242c;--muted:#66717c;--accent:#9b671c}
  .acw aside{overflow:auto;padding:16px;background:var(--panel)}.acw .left{border-right:1px solid var(--line)}.acw .right{border-left:1px solid var(--line)}
  .acw h2{margin:0 0 12px;font:600 11px/1.2 'JetBrains Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
  .acw .group{margin-bottom:18px}.acw input[type=search]{width:100%;padding:9px 10px;border:1px solid var(--line);border-radius:8px;background:var(--panel2);color:var(--fg)}
  .acw label{display:flex;gap:8px;align-items:center;margin:7px 0;color:var(--muted)}.acw input[type=range]{width:100%}.acw .value{float:right;color:var(--accent)}
  .acw main{position:relative;overflow:hidden;min-width:0}.acw svg{display:block;width:100%;height:100%;touch-action:none}.acw .edge{stroke:var(--accent);stroke-opacity:.28;fill:none}.acw .node{cursor:pointer}.acw .node circle{stroke:rgba(255,255,255,.65);stroke-width:.7}.acw .node text{font-size:10px;fill:var(--fg);paint-order:stroke;stroke:var(--bg);stroke-width:3px;stroke-linejoin:round;pointer-events:none}.acw .node.dim{opacity:.12}.acw .edge.dim{opacity:.05}.acw .node.selected circle{stroke:var(--accent);stroke-width:3}
  .acw .axis{stroke:var(--line)}.acw .axis-label{fill:var(--muted);font:10px 'JetBrains Mono',monospace}.acw .empty{position:absolute;inset:0;display:grid;place-items:center;color:var(--muted);pointer-events:none}
  .acw .badge{display:inline-block;margin:0 5px 5px 0;padding:4px 7px;border:1px solid var(--line);border-radius:999px;color:var(--muted);font:10px 'JetBrains Mono',monospace}.acw h3{font:500 23px/1.2 Fraunces,Georgia,serif;margin:7px 0 12px}.acw p{color:var(--muted)}
  .acw .legend{display:grid;gap:7px}.acw .legend span{display:flex;align-items:center;gap:8px}.acw .sw{width:9px;height:9px;border-radius:50%}
  @media(max-width:950px){.acw{grid-template-columns:210px 1fr}.acw .right{display:none}}@media(max-width:680px){.acw{grid-template-columns:1fr}.acw .left{display:none}}
  </style>`;
}

function layoutNetwork(nodes, width, height) {
  const left = nodes.filter(n=>n.kind==='murros'), right = nodes.filter(n=>n.kind==='selitys');
  const place = (arr,cx) => arr.forEach((n,i)=>{ const a=i*Math.PI*(3-Math.sqrt(5)); const r=20+Math.sqrt(i)*18; n.x=cx+Math.cos(a)*r; n.y=height/2+Math.sin(a)*r; });
  place(left,width*.34); place(right,width*.67);
}
function layoutRadial(nodes,width,height) {
  const cx=width/2, cy=height/2;
  const groups=[nodes.filter(n=>n.kind==='murros'),nodes.filter(n=>n.category==='K'),nodes.filter(n=>n.category==='R'),nodes.filter(n=>n.category==='S')];
  const base=Math.min(width,height);
  const radii=[base*.20,base*.31,base*.40,base*.48];
  groups.forEach((arr,g)=>arr.forEach((n,i)=>{const a=-Math.PI/2+i/Math.max(1,arr.length)*Math.PI*2;n.x=cx+Math.cos(a)*radii[g];n.y=cy+Math.sin(a)*radii[g];}));
}
function layoutTimeline(nodes,width,height) {
  const years=nodes.map(yearOf), min=Math.min(...years), max=Math.max(...years); const lanes={murros:.25,K:.48,R:.66,S:.84};
  nodes.sort((a,b)=>yearOf(a)-yearOf(b)).forEach((n,i)=>{n.x=55+(yearOf(n)-min)/Math.max(1,max-min)*(width-110);n.y=height*lanes[n.category] + ((i%3)-1)*7;});
  return {min,max};
}

function detailHtml(node, edges) {
  if (!node) return `<h2>Tiedot</h2><p>Valitse solmu nähdäksesi sen kuvauksen ja kytkennät.</p>`;
  const linked=edges.filter(e=>e.source===node||e.target===node).sort((a,b)=>b.confidence-a.confidence).slice(0,12);
  return `<h2>${esc(node.id)}</h2><h3>${esc(node.label)}</h3><div><span class="badge">${esc(node.kind)}</span><span class="badge">${esc(node.type)}</span><span class="badge">${esc(node.y0 ?? '–')}–${esc(node.y1 ?? node.y0 ?? '–')}</span></div><p>${esc(node.text || 'Ei kuvausta.')}</p><h2>Kytkennät</h2>${linked.map(e=>{const o=e.source===node?e.target:e.source;return `<p><b>${esc(o.label)}</b><br><small>${e.confidence.toFixed(2)} · ${esc(e.tier)}</small></p>`}).join('')||'<p>Ei näkyviä kytkentöjä.</p>'}`;
}

export async function mountCrosswalk(root, { mode='network', title='Atlasverkko' }={}) {
  unmountCrosswalk(root);
  document.head.insertAdjacentHTML('beforeend', stylesheet());
  root.innerHTML=`<section class="acw"><aside class="left"><div class="group"><h2>${esc(title)}</h2><input id="acwSearch" type="search" placeholder="Hae nimellä tai tunnuksella"></div><div class="group"><h2>Luottamus <span id="acwConfValue" class="value">0.50</span></h2><input id="acwConf" type="range" min="0.5" max="0.95" step="0.05" value="0.5"></div><div class="group"><h2>Näytä</h2><label><input id="acwLinked" type="checkbox" checked> Vain kytketyt</label><label><input id="acwLabels" type="checkbox" checked> Nimilaput</label></div><div class="legend"><span><i class="sw" style="background:${COLORS.murros}"></i>Murrosatlas</span><span><i class="sw" style="background:${COLORS.K}"></i>Kriisi</span><span><i class="sw" style="background:${COLORS.R}"></i>Rakenne</span><span><i class="sw" style="background:${COLORS.S}"></i>Siirtymä</span></div></aside><main><svg id="acwSvg" role="img" aria-label="${esc(title)}"></svg><div id="acwEmpty" class="empty" hidden>Ei kohteita näillä suodattimilla.</div></main><aside class="right" id="acwDetail"></aside></section>`;
  const host=root.querySelector('.acw'), svg=host.querySelector('#acwSvg'), detail=host.querySelector('#acwDetail');
  const data=await loadData(); let selected=null; const state={q:'',conf:.5,linked:true,labels:true};
  const listeners=[]; const on=(el,type,fn)=>{el.addEventListener(type,fn);listeners.push(()=>el.removeEventListener(type,fn));};
  function render(){
    const width=Math.max(400,svg.clientWidth),height=Math.max(320,svg.clientHeight); svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
    const edgeSet=data.edges.filter(e=>e.confidence>=state.conf); const linkedIds=new Set(edgeSet.flatMap(e=>[e.source.id,e.target.id]));
    let nodes=data.nodes.filter(n=>(!state.linked||linkedIds.has(n.id))&&(!state.q||`${n.id} ${n.label} ${n.text}`.toLowerCase().includes(state.q)));
    const ids=new Set(nodes.map(n=>n.id)); const edges=edgeSet.filter(e=>ids.has(e.source.id)&&ids.has(e.target.id));
    let axis='';
    if(mode==='radial') layoutRadial(nodes,width,height);
    else if(mode==='timeline'){
      const years=layoutTimeline(nodes,width,height),ticks=8;
      axis=Array.from({length:ticks+1},(_,i)=>{const x=55+i/ticks*(width-110),y=height*.92,yr=Math.round(years.min+i/ticks*(years.max-years.min));return `<line class="axis" x1="${x}" y1="40" x2="${x}" y2="${y}"/><text class="axis-label" x="${x}" y="${y+18}" text-anchor="middle">${yr}</text>`}).join('');
    } else layoutNetwork(nodes,width,height);
    const edgeHtml=edges.map(e=>`<line class="edge" x1="${e.source.x}" y1="${e.source.y}" x2="${e.target.x}" y2="${e.target.y}" stroke-width="${.5+e.confidence*1.5}"/>`).join('');
    const nodeHtml=nodes.map(n=>{const r=4+Math.min(9,Math.sqrt(n.degree+1)*1.7),c=COLORS[n.category]||COLORS.murros;return `<g class="node${selected===n?' selected':''}" data-id="${esc(n.id)}" transform="translate(${n.x},${n.y})"><circle r="${r}" fill="${c}"/><title>${esc(n.label)}</title>${state.labels?`<text x="${r+4}" y="3">${esc(n.label.length>34?n.label.slice(0,32)+'…':n.label)}</text>`:''}</g>`}).join('');
    svg.innerHTML=axis+edgeHtml+nodeHtml; host.querySelector('#acwEmpty').hidden=nodes.length>0;
    svg.querySelectorAll('.node').forEach(el=>on(el,'click',()=>{selected=data.byId.get(el.dataset.id);detail.innerHTML=detailHtml(selected,edges);render();}));
    detail.innerHTML=detailHtml(selected,edges);
  }
  on(host.querySelector('#acwSearch'),'input',e=>{state.q=e.target.value.trim().toLowerCase();render();});
  on(host.querySelector('#acwConf'),'input',e=>{state.conf=Number(e.target.value);host.querySelector('#acwConfValue').textContent=state.conf.toFixed(2);render();});
  on(host.querySelector('#acwLinked'),'change',e=>{state.linked=e.target.checked;render();});
  on(host.querySelector('#acwLabels'),'change',e=>{state.labels=e.target.checked;render();});
  const ro=new ResizeObserver(render);ro.observe(svg);render();
  cleanup=()=>{ro.disconnect();listeners.splice(0).forEach(fn=>fn());document.head.querySelectorAll('style[data-atlas-crosswalk]').forEach(el=>el.remove());root.replaceChildren();};
}
export function unmountCrosswalk(root){cleanup?.();cleanup=null;if(root)root.replaceChildren();}
