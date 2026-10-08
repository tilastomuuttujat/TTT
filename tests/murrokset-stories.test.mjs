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

test('reading panel stays beside the trigger when space exists and inside small viewports',async()=>{
 const source=await readFile(new URL('scripts/murrokset1-tour.txt',root),'utf8');
 const layout=new Function(source.slice(0,source.indexOf('function kn('))+';return articlePanelLayout;')();
 const right=layout({left:80,right:200,top:250,bottom:290},1400,900);assert.equal(right.x,214);
 const left=layout({left:1100,right:1220,top:250,bottom:290},1400,900);assert.equal(left.x+left.w,1086);
 for(const [vw,vh] of [[390,700],[768,1024],[1400,900]])for(const origin of [{left:20,right:140,top:20,bottom:60},{left:vw-140,right:vw-20,top:vh-80,bottom:vh-40}]){const p=layout(origin,vw,vh);assert.ok(p.x>=18&&p.y>=18);assert.ok(p.x+p.w<=vw-18&&p.y+p.h<=vh-18);assert.ok(p.ox>=0&&p.ox<=p.w&&p.oy>=0&&p.oy<=p.h);}
});
