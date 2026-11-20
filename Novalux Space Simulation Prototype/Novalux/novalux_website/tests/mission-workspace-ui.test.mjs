import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const module=fs.readFileSync(new URL('../src/mission-workspace.js',import.meta.url),'utf8');

test('Mission Planner is reachable and loads the integrated workspace module',()=>{
  assert.match(html,/data-view="mission-planner"/);
  assert.match(html,/id="mission-planner-view"/);
  assert.match(html,/src="src\/mission-workspace\.js"/);
});

test('Mission Planner exposes concept, requirements, engineering review and instrument lab',()=>{
  for(const id of ['mp-name','mp-mission','mp-objective','mp-duration','mp-cml','mp-max-mass','mp-max-budget','mp-power-reserve','mp-metrics','mp-engineering-checks','mp-instrument-grid','mp-maturity']) assert.match(html,new RegExp(`id="${id}"`));
});

test('Mission Planner bridges into the existing spacecraft designer',()=>{
  assert.match(app,/setMission\(key, objective\)/);
  assert.match(app,/setDuration\(months\)/);
  assert.match(app,/selectComponent\(category, name\)/);
  assert.match(module,/api\.setMission\(workspace\.mission,workspace\.objective\)/);
  assert.match(module,/data-select-instrument/);
});
