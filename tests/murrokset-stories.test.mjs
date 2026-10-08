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
