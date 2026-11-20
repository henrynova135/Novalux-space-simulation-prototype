import test from 'node:test';
import assert from 'node:assert/strict';
import { MISSION_PROFILES, SCIENCE_INSTRUMENTS, calculateMissionResources, evaluateMissionRequirements } from '../src/mission-architecture.js';

const components = {
  platform:{items:{'CubeSat':{mass:15,powerDemand:15,cost:5}}},
  propulsion:{items:{'Cold gas propulsion':{mass:5,power:2,cost:3}}},
  power:{items:{'Solar array':{mass:12,output:65,cost:7}}},
  instrument:{items:{'Multispectral camera':{mass:8,power:15,cost:8,science:8}}},
  communication:{items:{'X-band communication':{mass:7,power:12,cost:6}}},
  launcher:{items:{'Medium launch vehicle':{capacity:350,cost:28}}}
};
const design={mission:'earth',selections:{platform:'CubeSat',propulsion:'Cold gas propulsion',power:'Solar array',instrument:'Multispectral camera',communication:'X-band communication',launcher:'Medium launch vehicle'},components};

test('mission profiles provide objectives for the three integrated destinations',()=>{
  assert.deepEqual(Object.keys(MISSION_PROFILES),['earth','moon','mars']);
  for(const profile of Object.values(MISSION_PROFILES)) assert.ok(profile.objectives.includes(profile.defaultObjective));
});

test('science instrument catalogue maps instruments to mission objectives',()=>{
  assert.ok(SCIENCE_INSTRUMENTS['Multispectral camera'].uses.includes('Climate monitoring'));
  assert.ok(SCIENCE_INSTRUMENTS['Spectrometer'].uses.includes('Mineral composition study'));
  assert.ok(SCIENCE_INSTRUMENTS['Radar instrument'].uses.includes('Water ice investigation'));
});

test('mission resource model sums spacecraft mass, power, budget and launcher margin',()=>{
  const result=calculateMissionResources(design);
  assert.equal(result.complete,true);
  assert.equal(result.dryMass,47);
  assert.equal(result.powerDemand,44);
  assert.equal(result.powerOutput,65);
  assert.equal(result.budget,57);
  assert.equal(result.massMargin,303);
});

test('mission requirements evaluate mass, launcher, power, budget and science fit',()=>{
  const result=calculateMissionResources(design);
  const checks=evaluateMissionRequirements(result,{maxMass:60,maxBudget:70,powerReservePercent:10,objective:'Climate monitoring'});
  assert.equal(checks.length,5);
  assert.ok(checks.every(x=>x.ok));
  const failed=evaluateMissionRequirements(result,{maxMass:40,maxBudget:50,powerReservePercent:60,objective:'Water ice investigation'});
  assert.equal(failed.filter(x=>!x.ok).length,4);
});

test('incomplete spacecraft designs are reported instead of producing misleading totals',()=>{
  const partial={...design,selections:{...design.selections,instrument:''}};
  const result=calculateMissionResources(partial);
  assert.equal(result.complete,false);
  assert.equal(evaluateMissionRequirements(result,{}).length,1);
});
