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
