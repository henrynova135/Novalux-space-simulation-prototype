import test from 'node:test';
import assert from 'node:assert/strict';
import {ENGINEERING_PARTS,DEFAULT_ASSEMBLY,createPart,assemblyMetrics,attachmentCompatible,simulateBurn} from '../src/ship/engineering-model.js';

test('reference assembly includes the core engineering subsystems',()=>{
 assert.deepEqual(DEFAULT_ASSEMBLY,['bus','engine','tank','solar','antenna','instrument']);
 assert.ok(DEFAULT_ASSEMBLY.every(k=>ENGINEERING_PARTS[k]));
});
test('attachment points prevent duplicate hardware while allowing tank and engine',()=>{
 const a=[createPart('bus'),createPart('engine')];
 assert.equal(attachmentCompatible('engine',a),false);
 assert.equal(attachmentCompatible('tank',a),true);
 assert.equal(attachmentCompatible('bus',a),false);
});
test('mass and center of mass update from installed components and fuel',()=>{
 const a=[createPart('bus'),createPart('tank')]; const f={[a[1].id]:100};
 const m=assemblyMetrics(a,f);
 assert.equal(m.dryMass,156); assert.equal(m.fuelMass,100); assert.equal(m.totalMass,256);
 assert.ok(Number.isFinite(m.centerOfMass[2]));
});
test('solar power is available only when deployed and operational',()=>{
 const s=createPart('solar'); assert.equal(assemblyMetrics([s]).power,0);
 s.deployed=true; assert.equal(assemblyMetrics([s]).power,180);
 s.failed=true; assert.equal(assemblyMetrics([s]).power,0);
});
test('engine failure removes available thrust',()=>{
 const e=createPart('engine'); assert.equal(assemblyMetrics([e]).thrust,4200);
 e.failed=true; assert.equal(assemblyMetrics([e]).thrust,0);
});
test('engine burn consumes fuel according to thrust, ISP and duration',()=>{
 const e=createPart('engine'),t=createPart('tank'); const out=simulateBurn([e,t],{[t.id]:240},10,1);
 assert.ok(out.fuelUsed>0); assert.ok(out.fuelById[t.id]<240); assert.equal(out.thrust,4200);
});
test('burn cannot consume more propellant than the tank contains',()=>{
 const e=createPart('engine'),t=createPart('tank'); const out=simulateBurn([e,t],{[t.id]:.01},1000,1);
 assert.equal(out.fuelUsed,.01); assert.equal(out.fuelById[t.id],0); assert.equal(out.burnedOut,true);
});
