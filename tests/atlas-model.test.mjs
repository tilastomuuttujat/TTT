import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../suomen_rakennemuutosten_atlas.html',import.meta.url),'utf8');
const snapshot=JSON.parse(readFileSync(new URL('../suomen_rakennemuutosten_atlas.json',import.meta.url),'utf8'));
const context=vm.createContext({});
vm.runInContext(html.slice(html.indexOf('function projectionDelta'),html.indexOf('function selectMapStage')),context);
const model=vm.runInContext('({projection,projectionDelta,curvePoints})',context);
test('every published historical trajectory reaches the scenario start without changing its last score',()=>{
 for(const theme of snapshot.themes){const points=model.curvePoints(theme),last=points.at(-1);assert.equal(last.year,2025);assert.equal(last.score,theme.scores[4]);assert.ok(points.every(p=>p.year<=2025));}
});
test('scenarios start at stage five and remain within the declared scale',()=>{
 for(const theme of snapshot.themes)for(const kind of ['no','learn','optimize']){assert.equal(model.projection(theme,kind,2025),theme.scores[4]);for(let year=2025;year<=2050;year++){const score=model.projection(theme,kind,year);assert.ok(Number.isFinite(score)&&score>=-1&&score<=1);}}
});
test('linear changes agree at intermediate years until the scale saturates',()=>{
 const theme={scores:[0,0,0,0,0,0]};for(const kind of ['no','learn','optimize'])assert.ok(Math.abs(model.projection(theme,kind,2037.5)-model.projection(theme,kind,2050)/2)<1e-12);
 const high={scores:[0,0,0,.8,.9,0]},delta=model.projectionDelta(high,'optimize'),year=2025+25*.1/delta;assert.ok(Math.abs(model.projection(high,'optimize',year)-1)<1e-12);assert.equal(model.projection(high,'optimize',2050),1);
});
