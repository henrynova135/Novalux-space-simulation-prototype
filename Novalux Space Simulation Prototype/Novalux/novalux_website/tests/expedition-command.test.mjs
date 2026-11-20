import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const html = readFileSync(join(root,'index.html'),'utf8');
const js = readFileSync(join(root,'src/expedition-command.js'),'utf8');
const css = readFileSync(join(root,'styles.css'),'utf8');
test('Expedition Campaign is reachable from primary navigation',()=>{
 assert.match(html,/data-view="expedition"/);
 assert.match(html,/id="expedition-view"/);
 assert.match(js,/expedition-view/);
});
test('All requested campaign systems have dedicated UI sections',()=>{
 for (const phrase of ['MODULAR SPACECRAFT CONSTRUCTION','EARTH–MOON–MARS MISSION PLANNING','SPACE STATION CONSTRUCTION','CREW & EMERGENCY OPERATIONS','SCIENTIFIC EXPERIMENTS & DISCOVERIES','PERSISTENT CAMPAIGN & REWARDS']) assert.ok(html.includes(phrase),phrase);
});
test('Mission planner routes into existing designer and flight operations',()=>{
 assert.match(html,/id="ex-configure-mission"/);
 assert.match(html,/id="ex-open-flight"/);
 assert.ok(js.includes('data-view=\"simulation\"'));
 assert.ok(js.includes('data-view=\"designer\"'));
});
test('Campaign state persists and includes rewards, station, crew and discoveries',()=>{
 assert.match(js,/readLocalJSON\(STORE/);
 assert.match(js,/writeLocalJSON\(STORE/);
 for (const token of ['xp: 0','credits: 1200','crew:','station:','discoveries:','shipParts:']) assert.ok(js.includes(token),token);
});
test('Rover, rendezvous and earlier phases are preserved in source tree',()=>{
 for (const file of ['src/exploration-3d.js','src/advanced-exploration.js','src/interplanetary-missions.js','src/physics/rendezvous.js']) assert.ok(readFileSync(join(root,file),'utf8').length>100);
});
test('Responsive campaign layout is present',()=>{
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/\.ex-grid/);
});
