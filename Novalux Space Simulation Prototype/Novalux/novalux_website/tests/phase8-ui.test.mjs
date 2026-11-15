import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const module=readFileSync(new URL('../src/ship/spacecraft-engineering.js',import.meta.url),'utf8');
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
test('Spacecraft Engineering is reachable from primary navigation and loads its module',()=>{
 assert.match(html,/data-view="engineering"/);assert.match(html,/id="engineering-view"/);assert.match(html,/id="engineering-bay"/);assert.match(html,/src\/ship\/spacecraft-engineering\.js/);assert.match(app,/engineering: "Spacecraft Engineering"/);
});
test('Engineering workspace exposes component assembly, deployment, disassembly and failure controls',()=>{
 for(const id of ['eng-viewport','eng-parts','eng-sync','eng-reset','eng-burn','eng-throttle','eng-burn-seconds'])assert.ok(html.includes(`id="${id}"`),id);
 for(const part of ['bus','engine','tank','solar','antenna','instrument','radiator','rtg'])assert.ok(html.includes(`data-part="${part}"`),part);
 assert.match(module,/data-action="remove"/);assert.match(module,/data-action="toggle"/);assert.match(module,/data-action="fail"/);
});
test('Live mass properties, center of mass and propulsion operations are connected to the engineering model',()=>{
 for(const id of ['eng-mass','eng-dry','eng-fuel','eng-com','eng-thrust','eng-power','eng-accel'])assert.ok(html.includes(`id="${id}"`),id);
 assert.match(module,/assemblyMetrics\(assembly,fuel\)/);assert.match(module,/simulateBurn\(assembly,fuel/);assert.match(module,/novalux-engineering-save/);
});

test('engineering 3D model uses an aligned spacecraft body, detailed subsystems and GPU cleanup',()=>{
 assert.match(module,/CylinderGeometry\(\.59,\.59,2\.55,32\)/);
 assert.match(module,/TorusGeometry/);
 assert.match(module,/craft\.traverse\(o=>\{if\(o\.geometry\)o\.geometry\.dispose\(\)/);
 assert.match(module,/renderer\.setPixelRatio\(Math\.min\(window\.devicePixelRatio\|\|1,1\.5\)\)/);
});

test('orbital scene spacecraft is no longer represented by a plain cuboid',()=>{
 const scene=readFileSync(new URL('../src/visualization/scene.js',import.meta.url),'utf8');
 assert.match(scene,/CylinderGeometry\(0\.026, 0\.026, 0\.09, 16\)/);
 assert.match(scene,/TorusGeometry/);
 assert.match(scene,/solar wings with visible cell segmentation/i);
});
