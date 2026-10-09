import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const data=JSON.parse(fs.readFileSync('assets/murrokset2-models.json','utf8')),bundle=fs.readFileSync('assets/murrokset2-models.js','utf8'),arc=fs.readFileSync('scripts/murrokset2-arc.txt','utf8');
const walk=n=>!n||typeof n!=='object'?[]:[n,...[n.props?.children].flat(Infinity).flatMap(walk)];
const jsx={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
function hooks(){const states=[];let cursor=0;return {reset(){cursor=0;},C:{useState(initial){const i=cursor++;if(!(i in states))states[i]=initial;return [states[i],value=>states[i]=typeof value==='function'?value(states[i]):value];},useRef(initial){return {current:initial};},useEffect(){},useLayoutEffect(){}}};}
test('all nine models are explicitly untested and contain competing, testable explanations',()=>{assert.equal(data.models.length,9);assert.equal(new Set(data.models.map(m=>m.id)).size,9);for(const m of data.models){assert.equal(m.status,'untested');assert.equal(m.geometry,'conceptual');assert.equal(m.evidence.length,0);assert.equal(m.steps.length,3);assert.equal(m.features.length,4);assert.ok(m.hypothesis&&m.alternative&&m.refutation);assert.ok(m.observe.length>=2&&m.assumptions.length>=2);}assert.ok(data.models.some(m=>m.id==='migration'));});
test('theme selection updates the overview heading, resets the stage and pauses playback',()=>{const fn=bundle.slice(bundle.indexOf('function Rn({index:'),bundle.indexOf('function zn(',bundle.indexOf('function Rn({index:')));const h=hooks();let pauses=0;const ctx={C:h.C,I:jsx,On:[],Pn(){},Fn(){},In(){},jn:10000,themeModels:data,L:'Button',Ln:'Arc',ie:'Previous',de:'Restart',E:'Pause',O:'Play',ae:'Next',k:'Close'};const render=new Function('ctx',`with(ctx){${fn};return Rn;}`)(ctx);const props={index:-1,playing:true,onIndex(){},onToggle(){pauses++;},onClose(){},onRead(){},onCase(){},availableIds:[]};let nodes=walk(render(props));assert.equal(nodes.find(n=>n.type==='h2').props.children,data.models[0].steps[0].title);nodes.find(n=>n.type==='button'&&n.props.children==='Muuttoliike').props.onClick();assert.equal(pauses,1);h.reset();nodes=walk(render({...props,playing:false}));assert.equal(nodes.find(n=>n.type==='h2').props.children,data.models[1].steps[0].title);assert.equal(nodes.find(n=>n.type==='Arc').props.modelId,'migration');assert.equal(nodes.find(n=>n.type==='Arc').props.step,0);});
test('each arc opens its own hypothesis, alternative and refutation in the research drawer',()=>{for(const m of data.models){const h=hooks();let paused=false;const render=new Function('C','I','themeModels',arc+';return Ln;')(h.C,jsx,data);const props={step:1,modelId:m.id,onStep(){},onPause(){paused=true;}};let nodes=walk(render(props));assert.ok(nodes.some(n=>n.props?.className==='impact-note'&&n.props.children.includes('eivät ole mittauksia')));assert.ok(!nodes.some(n=>n.type==='dialog'));nodes.find(n=>n.props?.className==='theme-probe').props.onClick();assert.equal(paused,true);h.reset();nodes=walk(render(props));assert.ok(nodes.some(n=>n.type==='dialog'));for(const text of [m.hypothesis,m.alternative,m.refutation])assert.ok(nodes.some(n=>n.props?.children===text));}});
test('future evidence requires scoped claims and a valid data structure',()=>{const validate=new Function(bundle.slice(0,bundle.indexOf('let themeModels='))+';return validateThemeModels;')();assert.equal(validate(data),true);const updated=structuredClone(data);updated.models[0].status='supported';assert.equal(validate(updated),false);updated.models[0].evidence=[{title:'Testilähde',url:'https://example.org/research',claim:'Rajattu yhteys määrätyssä ryhmässä.'}];assert.equal(validate(updated),true);updated.models[0].features.pop();assert.equal(validate(updated),false);});
test('compiled module parses and original anchor stories remain in the bundle',()=>{const r=spawnSync(process.execPath,['--input-type=module','--check'],{input:bundle,encoding:'utf8'});assert.equal(r.status,0,r.stderr);for(const name of ['Suuri muutto','Kriisin lasku','Työ joustaa'])assert.ok(bundle.includes(name));assert.ok(fs.readFileSync('murrokset2.html','utf8').includes('./assets/murrokset2-models.js'));});
test('replay dots restart a selected part and autoplay visits every theme before anchors',()=>{
 const fn=bundle.slice(bundle.indexOf('function Rn({index:'),bundle.indexOf('function zn(',bundle.indexOf('function Rn({index:'))),h=hooks(),effects=[];
 h.C.useEffect=effect=>effects.push(effect);let callback,plays=0,chapter;
 const ctx={C:h.C,I:jsx,On:[],Pn(){},Fn(){return {chapter:0,step:0};},In(){},jn:10000,themeModels:data,L:'Button',Ln:'Arc',ie:'Previous',de:'Restart',E:'Pause',O:'Play',ae:'Next',k:'Close',window:{setTimeout(fn){callback=fn;return 1;},clearTimeout(){}}};
 const render=new Function('ctx',`with(ctx){${fn};return Rn;}`)(ctx);
 const props={index:-1,playing:false,onIndex(value){chapter=value;},onToggle(){plays++;},onClose(){},onRead(){},onCase(){},availableIds:[]};
 function view(playing){h.reset();effects.length=0;return walk(render({...props,playing}));}
 let nodes=view(false);let dots=nodes.filter(n=>n.type==='button'&&n.props['aria-label']?.startsWith('Toista osa'));
 assert.equal(dots.length,3);dots[2].props.onClick();assert.equal(plays,1);nodes=view(true);assert.equal(nodes.find(n=>n.type==='Arc').props.step,2);
 for(const model of data.models){nodes=view(true);assert.equal(nodes.find(n=>n.type==='Arc').props.modelId,model.id);nodes.filter(n=>n.type==='button'&&n.props['aria-label']?.startsWith('Toista osa'))[2].props.onClick();nodes=view(true);effects.at(-1)();callback();}
 assert.equal(chapter,0);
});

test('the big picture shades calendar-proportional periods and the separate time bar is removed',()=>{
 const shade=new Function('I',arc+';return AtlasPeriodShade;')(jsx);
 assert.equal(shade({period:null}),null);
 for(const model of data.models){for(const stage of model.steps){
  const nodes=walk(shade({period:stage.period})),rect=nodes.find(n=>n.type==='rect');
  assert.equal(rect.props.x,60+(stage.period.start-1850)/200*880);
  assert.ok(Math.abs(rect.props.width-(stage.period.end-stage.period.start)/200*880)<1e-8);
  assert.equal(rect.props.height,520);
  assert.equal(nodes[0].props.className.includes('is-scenario'),stage.period.mode==='scenario');
 }}
 assert.ok(!arc.includes('personal-time-axis'));
 assert.ok(bundle.includes('period:f===-1?activePeriod:null'));
 assert.ok(bundle.includes('AtlasPeriodShade,{period:timePeriod}'));
});
test('theme and animation changes report the current interval to the big picture',()=>{
 const fn=bundle.slice(bundle.indexOf('function Rn({index:'),bundle.indexOf('function zn(',bundle.indexOf('function Rn({index:'))),h=hooks(),effects=[];h.C.useEffect=f=>effects.push(f);let period;
 const ctx={C:h.C,I:jsx,On:[],Pn(){},Fn(){},In(){},jn:10000,themeModels:data,L:'Button',Ln:'Arc',ie:'Previous',de:'Restart',E:'Pause',O:'Play',ae:'Next',k:'Close'};
 const render=new Function('ctx',`with(ctx){${fn};return Rn;}`)(ctx);
 const props={index:-1,playing:false,onIndex(){},onToggle(){},onClose(){},onRead(){},onCase(){},availableIds:[],onPeriod:p=>period=p};
 function view(){h.reset();effects.length=0;const nodes=walk(render(props));effects.find(f=>f.toString().includes('reportPeriod'))();return nodes;}
 let nodes=view();assert.deepEqual(period,data.models[0].steps[0].period);
 nodes.find(n=>n.type==='button'&&n.props.children==='Muuttoliike').props.onClick();nodes=view();assert.deepEqual(period,data.models[1].steps[0].period);
 nodes.filter(n=>n.type==='button'&&n.props['aria-label']?.startsWith('Toista osa'))[2].props.onClick();view();assert.deepEqual(period,data.models[1].steps[2].period);
});
test('the work arc preserves the original paths and other themes have distinct scene geometry',()=>{
 const original=fs.readFileSync('assets/index-yRr8yEkP.js','utf8');
 const start=original.indexOf('function Ln({step:'),end=original.indexOf('function Rn({index:',start);
 const restored=original.slice(start,end).replace('function Ln({','function WorkChangeArc({').replace('impact-arc impact-step-${e}','impact-arc restored-work-arc impact-step-${e}');
 assert.ok(arc.includes(restored));
 const render=new Function('I',arc+';return ThemeScene;')(jsx),signatures=new Set();
 for(const model of data.models.filter(m=>m.id!=='work')){
  const nodes=walk(render({model,step:2}));
  assert.ok(nodes.some(n=>n.props?.['data-scene']===model.id));
  assert.ok(nodes.some(n=>n.props?.className?.includes('scene-motion')));
  signatures.add(JSON.stringify(nodes.filter(n=>['path','circle','ellipse'].includes(n.type)).map(n=>n.props.d||[n.props.cx,n.props.cy,n.props.r,n.props.rx])));
 }
 assert.equal(signatures.size,8);
 const temporal=new Function('C','I',arc+';return TemporalTheme;')(hooks().C,jsx);
 assert.ok(walk(temporal({model:data.models[0],step:0,onStep(){}})).some(n=>typeof n.type==='function'&&n.type.name==='WorkChangeArc'));
});
test('dated context changes with the scene, links pause narration and scenarios are explicit',()=>{
 const render=new Function('C','I',arc+';return TemporalTheme;')(hooks().C,jsx);
 for(const model of data.models){for(let step=0;step<3;step++){
  let paused=false;const context=model.steps[step].context,nodes=walk(render({model,step,onPause(){paused=true;}}));
  assert.ok(nodes.some(n=>n.type==='strong'&&n.props.children===context.year));
  assert.ok(nodes.some(n=>n.props?.children===context.bridge));
  if(step<2){const link=nodes.find(n=>n.type==='a'&&n.props.href===context.source.url);assert.ok(link);link.props.onClick();assert.equal(paused,true);}else{assert.equal(context.kind,'scenario');assert.ok(context.era.includes('ei ennuste'));}
 }}
});
test('the scene reserves clearance below the atlas and measurement does not accumulate margins',()=>{
 const h=hooks(),effects=[];h.C.useLayoutEffect=effect=>effects.push(effect);let measure,margin=32;
 const atlas={getBoundingClientRect:()=>({bottom:280})},parent={};
 const node={closest:()=>({querySelector:()=>atlas}),parentElement:parent,getBoundingClientRect:()=>({top:180+margin})};
 const ctx={C:h.C,I:jsx,themeModels:data,window:{getComputedStyle:()=>({marginTop:String(margin)}),addEventListener(){},removeEventListener(){}},ResizeObserver:class{constructor(callback){measure=callback;}observe(){}disconnect(){}}};
 const render=new Function('ctx',`with(ctx){${arc};return Ln;}`)(ctx),props={modelId:'work',step:0,onPause(){}};
 let tree=render(props);tree.props.ref.current=node;const cleanup=effects[0]();h.reset();tree=render(props);margin=tree.props.style.marginTop;
 assert.equal(margin,138);assert.ok(180+margin>=280+38);
 measure();h.reset();tree=render(props);assert.equal(tree.props.style.marginTop,138);cleanup();
});
test('context validation rejects references outside the active historical period',()=>{
 const validate=new Function(bundle.slice(0,bundle.indexOf('let themeModels='))+';return validateThemeModels;')();
 const changed=structuredClone(data);changed.models[0].steps[0].context.year=2025;assert.equal(validate(changed),false);
});
