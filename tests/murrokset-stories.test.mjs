import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const root=new URL('../',import.meta.url);
const guide=JSON.parse(await readFile(new URL('assets/murrokset1-guide.json',root)));
const content=JSON.parse(await readFile(new URL('stories/stories.json',root)));
test('all preview stories link to readable articles and a matching return location',async()=>{assert.equal(guide.chapters.length,4);for(const [i,chapter] of guide.chapters.entries()){assert.equal(chapter.preview_lines.length,3);assert.ok(chapter.preview_lines.every(line=>line.length<100));const file=new URL(chapter.article_url,root);await access(file);const html=await readFile(file,'utf8');assert.ok(html.includes(`../murrokset1.html?story=${i}`));assert.ok(html.includes('<article>'));assert.ok(html.includes('Lähteet ja tulkinnan rajat'));assert.ok(!html.includes('<script'));}});
test('article citations resolve to their own source list',()=>{assert.equal(content.stories.length,4);for(const story of content.stories){assert.ok(story.sections.length>=3);assert.ok(story.sources.length>=2);for(const [,paragraphs] of story.sections)for(const [text,refs] of paragraphs){assert.ok(text.trim());for(const ref of refs)assert.ok(Number.isInteger(ref)&&ref>0&&ref<=story.sources.length);}}});
test('browser bundle parses with the new preview and return behavior',async()=>{const input=await readFile(new URL('assets/murrokset1-guided.js',root),'utf8');const result=spawnSync(process.execPath,['--input-type=module','--check'],{input,encoding:'utf8'});assert.equal(result.status,0,result.stderr);});

test('right drawer fits the viewport and leaves room for its vertical close tab',async()=>{
 const source=await readFile(new URL('scripts/murrokset1-tour.txt',root),'utf8');
 const layout=new Function(source.slice(0,source.indexOf('function kn('))+';return articlePanelLayout;')();
 for(const [vw,vh] of [[320,568],[390,700],[768,1024],[1400,900]]){const p=layout(vw,vh);assert.equal(p.x+p.w,vw);assert.equal(p.y,0);assert.equal(p.h,vh);assert.ok(p.x>=40);assert.ok(p.w<=560);}
});

test('one edge handle opens the current animation article and changes to close',async()=>{
 const source=await readFile(new URL('scripts/murrokset1-tour.txt',root),'utf8');
 for(let index=0;index<4;index++){
  const states=[];let cursor=0;
  const S={useState(initial){const i=cursor++;if(!(i in states))states[i]=initial;return [states[i],value=>states[i]=value];},useRef(){return {current:null};},useEffect(){},useLayoutEffect(){}};
  const L={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
  const render=new Function('S','L','Tn','storyContent','On',source+';return kn;')(S,L,guide.chapters,content.stories,()=>{});
  const walk=node=>!node||typeof node!=='object'?[]:[node,...[node.props?.children].flat(Infinity).flatMap(walk)];
  const props={index,playing:true,onToggle(){},onIndex(){},onClose(){}};
  let tree=walk(render(props));const handle=tree.find(n=>n.props?.className==='murros-story-tab murros-story-tab-closed');assert.ok(handle);assert.equal(handle.props.children.props.children,'Lue artikkeli');assert.ok(!tree.some(n=>['narrator-read','narrator-read-always'].includes(n.props?.className)));
  handle.props.onClick({currentTarget:{focus(){}}});cursor=0;tree=walk(render({...props,playing:false}));
  assert.equal(tree.find(n=>n.props?.id==='murros-story-title').props.children,content.stories[index].title);
  assert.equal(tree.find(n=>n.props?.className==='murros-story-tab').props.children.props.children,'Sulje artikkeli');
  assert.equal(tree.find(n=>n.props?.className==='murros-story-tab murros-story-tab-closed').props.hidden,true);
 }
});

test('analysis compares all periods and separates evidence from future assumptions',async()=>{
 const source=await readFile(new URL('scripts/murrokset1-tour.txt',root),'utf8');const L={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
 const render=new Function('L','Tn',source+';return MurrosAnalysisContent;')(L,guide.chapters);
 const walk=n=>!n||typeof n!=='object'?[]:[n,...[n.props?.children].flat(Infinity).flatMap(walk)];
 for(let i=0;i<4;i++){let selected;const nodes=walk(render({index:i,onIndex:value=>selected=value}));const cells=nodes.filter(n=>n.type==='td');assert.equal(cells.length,12);assert.ok(nodes.some(n=>n.type==='dd'&&n.props.children===guide.chapters[i].analysis.alternative));assert.ok(nodes.some(n=>n.type==='dd'&&n.props.children===guide.chapters[i].analysis.evidence));const buttons=nodes.filter(n=>n.type==='button');assert.equal(buttons.length,4);buttons[3].props.onClick();assert.equal(selected,3);assert.ok(nodes.some(n=>n.props?.className==='analysis-limit'));}
 assert.ok(guide.chapters[3].analysis.evidence.includes('eivät todista'));
});

test('interpretation stays behind its edge handle until opened and pauses playback',async()=>{
 const source=await readFile(new URL('scripts/murrokset1-tour.txt',root),'utf8');let state=false,paused=false;
 const S={useState(){return [state,value=>state=value];},useRef(){return {current:null};},useLayoutEffect(){}};
 const L={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};const render=new Function('S','L',source+';return MurrosAnalysis;')(S,L);
 let tree=render({index:2,onIndex(){},onPause(){paused=true;}});const children=tree.props.children;assert.equal(children[1],false);assert.equal(children[0].props.children.props.children,'Lue tulkinta');children[0].props.onClick();assert.equal(paused,true);
 tree=render({index:2,onIndex(){},onPause(){}});assert.equal(tree.props.children[0].props.hidden,true);assert.equal(tree.props.children[1].type,'dialog');const content=tree.props.children[1].props.children.at(-1).props.children;assert.equal(content.props.index,2);
});

test('flow geometry stays finite and branches for group comparison',async()=>{
 const source=await readFile(new URL('scripts/murrokset1-explorer.txt',root),'utf8');const geometry=new Function(source+';return murrosFlowGeometry;')();
 for(const [w,h] of [[320,650],[1100,650],[1400,900]])for(const mode of ['response','trace','groups']){const g=geometry(w,h,{x:w*.8,y:h*.6},mode);assert.equal(g.paths.length,mode==='groups'?3:2);assert.equal(g.points.length,mode==='groups'?4:3);for(const p of g.points){assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));assert.ok(p.x>=0&&p.x<=w&&p.y>=0&&p.y<=h);}assert.ok(g.paths.every(p=>!p.includes('NaN')));}
});

test('cockpit applies a question to the current period and returns to the canvas',async()=>{
 const source=await readFile(new URL('scripts/murrokset1-explorer.txt',root),'utf8');const states=[];let cursor=0,selected,paused=false;
 const S={useState(initial){const i=cursor++;if(!(i in states))states[i]=initial;return [states[i],value=>states[i]=typeof value==='function'?value(states[i]):value];},useRef(){return {current:null};},useLayoutEffect(){}};
 const L={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};const render=new Function('S','L','Tn','window','MurrosMatrix',source+';return MurrosExplorer;')(S,L,guide.chapters,{requestAnimationFrame(fn){fn();}},function MatrixStub(){});
 const walk=n=>!n||typeof n!=='object'?[]:[n,...[n.props?.children].flat(Infinity).flatMap(walk)];const props={index:1,onIndex(value){selected=value;},onPause(){paused=true;}};
 let nodes=walk(render(props));nodes.find(n=>n.props?.className==='murros-story-tab explorer-handle').props.onClick();cursor=0;nodes=walk(render(props));assert.ok(nodes.some(n=>n.type==='dialog'));
 nodes.find(n=>n.type==='button'&&n.props.children?.[0]?.props?.children==='Etsi pitkä jälki').props.onClick();assert.equal(selected,1);assert.equal(paused,true);cursor=0;nodes=walk(render(props));assert.ok(!nodes.some(n=>n.type==='dialog'));assert.ok(nodes.some(n=>n.props?.className?.startsWith('explorer-flow-layer')));assert.ok(nodes.some(n=>n.props?.question==='trace'&&n.props?.active===1));
});

test('each chapter provides maintained labels and limits for all flow questions',()=>{
 for(const chapter of guide.chapters)for(const key of ['response','trace','groups']){const f=chapter.flows[key];assert.equal(f.labels.length,key==='groups'?3:2);assert.ok(f.labels.every(label=>typeof label==='string'&&label.length<55));assert.ok(f.note.length>40);}
});

test('matrix relations resolve nodes and sources and distinguish unproven carry routes',async()=>{
 const data=JSON.parse(await readFile(new URL('assets/murrokset1-matrix.json',root),'utf8'));const ids=new Set(data.nodes.map(n=>n.id));assert.equal(ids.size,data.nodes.length);assert.equal(data.levels.length,4);assert.equal(data.columns.length,14);
 for(const edge of data.edges){assert.ok(ids.has(edge.source)&&ids.has(edge.target));assert.ok(['interpretation','question','scenario'].includes(edge.status));assert.ok(edge.mechanism&&edge.evidence);if(edge.kind!=='membership')assert.ok(edge.alternative&&edge.delay&&edge.transmission);for(const ref of edge.sources)assert.ok(content.stories[ref.story]?.sources[ref.ref-1]);if(edge.id.startsWith('carry')){assert.equal(edge.status,'question');assert.equal(edge.sources.length,0);}}
});

test('matrix follows successive levels and cross-period carry paths without inventing amounts',async()=>{
 const source=await readFile(new URL('scripts/murrokset1-matrix.txt',root),'utf8'),data=JSON.parse(await readFile(new URL('assets/murrokset1-matrix.json',root),'utf8'));const [route,layout]=new Function(source+';return [murrosMatrixRoute,murrosMatrixLayout];')();
 const trace=route(data,'trace','c0n0');assert.ok(trace.nodes.has('c0n3'));assert.ok(trace.nodes.has('c2n2'));assert.ok(trace.nodes.has('c3n3'));const response=route(data,'response','c0n0');assert.ok(response.nodes.has('c0n2'));assert.ok(!response.nodes.has('c2n2'));const groups=route(data,'groups','c1n0');assert.ok(groups.nodes.has('c1g0')&&groups.nodes.has('c1g1'));
 const positions=layout(data);for(const edge of data.edges)assert.ok(!positions.path(edge).includes('NaN'));assert.ok(data.edges.every(e=>e.amount===undefined));
});

test('flower hierarchy exposes mechanisms locally and preserves exact edges under projection',async()=>{
 const source=await readFile(new URL('scripts/murrokset1-matrix.txt',root),'utf8'),data=JSON.parse(await readFile(new URL('assets/murrokset1-matrix.json',root),'utf8'));const [layout,project]=new Function(source+';return [murrosMatrixLayout,murrosProjectEdges];')();const compact=layout(data);assert.equal([...compact.visible].length,78);
 assert.equal(data.nodes.filter(n=>n.kind==='anchor').length,14);assert.equal(data.nodes.filter(n=>n.kind==='petal').length,64);assert.ok(data.nodes.filter(n=>n.kind==='mechanism').length>=48);
 const expanded=layout(data,new Set(['c0phousing']));assert.ok(expanded.visible.has('c0mhousing1'));assert.ok(!expanded.visible.has('c1meducation0'));assert.deepEqual(expanded.positions.get('c0phousing'),compact.positions.get('c0phousing'));
 const edges=project(data,data.edges,compact.visible);assert.ok(edges.every(e=>e.kind!=='membership'));assert.ok(edges.every(e=>compact.visible.has(e.source)&&compact.visible.has(e.target)));assert.ok(edges.some(e=>e.members.some(m=>m.id==='mechanism-link-1')));const precise=project(data,data.edges,expanded.visible);assert.ok(precise.some(e=>e.source==='c0mhousing1'));
});

test('petal activation reveals mechanism controls while other petals remain compact',async()=>{
 const source=await readFile(new URL('scripts/murrokset1-matrix.txt',root),'utf8'),data=JSON.parse(await readFile(new URL('assets/murrokset1-matrix.json',root),'utf8'));const states=[];let cursor=0;
 const S={useState(initial){const i=cursor++;if(!(i in states))states[i]=initial;return [states[i],value=>states[i]=typeof value==='function'?value(states[i]):value];},useRef(){return {current:null};},useEffect(){},useLayoutEffect(){}};
 const L={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};const render=new Function('S','L','matrixContent','murrosQuestions','storyContent',source+';return MurrosMatrix;')(S,L,data,[{key:'trace',prompt:'Mikä jatkui?'}],content.stories);const walk=n=>!n||typeof n!=='object'?[]:[n,...[n.props?.children].flat(Infinity).flatMap(walk)];const props={active:0,question:'trace',running:true,onRunning(){},onReset(){}};
 let nodes=walk(render(props));assert.equal(nodes.filter(n=>n.props?.className?.includes('flower-mechanism')).length,0);nodes.find(n=>n.props?.['aria-label']==='Avaa mekanismit: Lähiörakentaminen').props.onClick();cursor=0;nodes=walk(render(props));assert.ok(nodes.some(n=>n.props?.['aria-label']==='Seuraa reittiä: Asunnon sijainti'));assert.ok(!nodes.some(n=>n.props?.['aria-label']==='Seuraa reittiä: Valmistumisajankohta'));assert.ok(nodes.some(n=>n.props?.['aria-label']==='Sulje mekanismit: Lähiörakentaminen'));assert.ok(nodes.filter(n=>n.props?.className?.startsWith('matrix-edge ')).every(n=>n.props.className.includes('route-active')));
});

test('phenomenon partners are found from both ends and preserve anchor provenance',async()=>{
 const data=JSON.parse(await readFile(new URL('assets/murrokset1-matrix.json',root),'utf8')),source=await readFile(new URL('scripts/murrokset1-matrix.txt',root),'utf8');const [partners,layout]=new Function(source+';return [murrosFlowerPartners,murrosMatrixLayout];')();
 const e=data.edges.find(e=>e.id==='anchor-pair-3');assert.ok(partners(data,e.source,'trace').some(p=>p.node.id===e.target));assert.ok(partners(data,e.target,'trace').some(p=>p.node.id===e.source));assert.equal(e.provenance.length,2);assert.equal(e.status,'question');
 const atlas=JSON.parse(await readFile(new URL('murrosatlas-data.json',root),'utf8')),ids=new Set(atlas.cases.map(c=>c.id));assert.ok(data.nodes.filter(n=>n.kind==='anchor').every(n=>ids.has(n.case_id)));const positions=layout(data);for(const p of positions.positions.values())assert.ok(p.x>=0&&p.x<positions.width&&Number.isFinite(p.y));
 const labels=data.nodes.filter(n=>n.kind==='petal').map(n=>n.label);assert.ok(!labels.includes('Työ')&&!labels.includes('Asuminen'));
});

test('compact flower rows keep all positions inside a bounded canvas',async()=>{
 const data=JSON.parse(await readFile(new URL('assets/murrokset1-matrix.json',root),'utf8')),source=await readFile(new URL('scripts/murrokset1-matrix.txt',root),'utf8'),layout=new Function(source+';return murrosMatrixLayout;')()(data);assert.ok(layout.width<=1800);
 for(const p of layout.positions.values())assert.ok(p.x>=0&&p.x<layout.width&&p.y>=0&&p.y<layout.height);
 const anchors=data.nodes.filter(n=>n.kind==='anchor').sort((a,b)=>a.rank-b.rank);assert.equal(layout.positions.get(anchors[0].id).y,layout.positions.get(anchors[3].id).y);assert.ok(layout.positions.get(anchors[4].id).y>layout.positions.get(anchors[3].id).y);
});

test('zoom preserves the diagram point at the viewport center',async()=>{
 const source=await readFile(new URL('scripts/murrokset1-matrix.txt',root),'utf8'),offset=new Function(source+';return murrosZoomOffset;')();
 const next=offset(300,600,1,1.2);assert.equal(next,420);assert.equal(offset(next,600,1.2,1),300);assert.equal(offset(0,600,1,.45),0);
});

test('mouse drag pans after a threshold and suppresses the resulting click',async()=>{
 const source=await readFile(new URL('scripts/murrokset1-matrix.txt',root),'utf8'),data=JSON.parse(await readFile(new URL('assets/murrokset1-matrix.json',root),'utf8'));const S={useState(initial){return [initial,()=>{}];},useRef(){return {current:null};},useEffect(){},useLayoutEffect(){}};const L={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};const render=new Function('S','L','matrixContent','murrosQuestions','storyContent',source+';return MurrosMatrix;')(S,L,data,[{key:'trace',prompt:'Mikä jatkui?'}],content.stories);const walk=n=>!n||typeof n!=='object'?[]:[n,...[n.props?.children].flat(Infinity).flatMap(walk)];const nodes=walk(render({active:0,question:'trace',running:true,onRunning(){},onReset(){}})),props=nodes.find(n=>n.props?.className==='matrix-canvas').props;let captured=false,prevented=false,stopped=false;const target={scrollLeft:200,scrollTop:100,classList:{add(){},remove(){}},setPointerCapture(){captured=true;},hasPointerCapture(){return true;},releasePointerCapture(){}};
 props.onPointerDown({pointerType:'mouse',button:0,pointerId:1,clientX:100,clientY:100,currentTarget:target});props.onPointerMove({pointerId:1,clientX:103,clientY:100,currentTarget:target,preventDefault(){}});assert.equal(target.scrollLeft,200);props.onPointerMove({pointerId:1,clientX:130,clientY:120,currentTarget:target,preventDefault(){}});assert.equal(target.scrollLeft,170);assert.equal(target.scrollTop,80);assert.equal(captured,true);props.onPointerUp({pointerId:1,currentTarget:target});props.onClickCapture({detail:1,preventDefault(){prevented=true;},stopPropagation(){stopped=true;}});assert.ok(prevented&&stopped);assert.equal(nodes.filter(n=>n.type==='button'&&['Loitonna näkymää','Lähennä näkymää'].includes(n.props?.['aria-label'])).length,2);
});
