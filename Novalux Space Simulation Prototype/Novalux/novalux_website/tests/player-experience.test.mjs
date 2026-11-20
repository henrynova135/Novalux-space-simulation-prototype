import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const html=fs.readFileSync(new URL("../index.html",import.meta.url),"utf8");
const css=fs.readFileSync(new URL("../styles.css",import.meta.url),"utf8");
const app=fs.readFileSync(new URL("../app.js",import.meta.url),"utf8");
const audio=fs.readFileSync(new URL("../src/audio-system.js",import.meta.url),"utf8");
const rover=fs.readFileSync(new URL("../src/exploration-3d.js",import.meta.url),"utf8");
test("Guide and Settings are reachable from primary navigation",()=>{
  assert.match(html,/data-view="guide"/); assert.match(html,/id="guide-view"/);
  assert.match(html,/data-view="settings"/); assert.match(html,/id="settings-view"/);
  assert.match(app,/guide: "Game Guide"/); assert.match(app,/settings: "Settings"/);
});
test("mobile gameplay pad appears only during an active mission",()=>{
  assert.match(html,/id="game-touch-controls"/); assert.match(html,/data-game-touch="left"/);
  assert.match(app,/\$\("game-touch-controls"\)\?\.classList\.add\("active"\)/);
  assert.match(app,/\$\("game-touch-controls"\)\?\.classList\.remove\("active"\)/);
  assert.match(css,/pointer:coarse/);
});
test("desktop gameplay displays physical keyboard keycaps",()=>{
  assert.match(html,/class="game-keycaps"/); assert.match(html,/<kbd>W<\/kbd>/);
  assert.match(app,/setting-key-layout/);
});
test("audio settings are embedded in Settings and preferences persist",()=>{
  assert.match(html,/id="settings-audio-controls"/); assert.doesNotMatch(html,/class="novalux-audio"/);
  assert.match(audio,/novalux-audio-enabled/); assert.match(audio,/novalux-audio-ambience/);
});
test("3D rover model uses six wheels and articulated suspension",()=>{
  assert.match(rover,/for \(const x of \[-2\.25,0,2\.25\]\)/);
  assert.match(rover,/rocker-bogie suspension/);
});

const launch=fs.readFileSync(new URL("../src/launch-bootstrap.js",import.meta.url),"utf8");
const exploration=fs.readFileSync(new URL("../src/advanced-exploration.js",import.meta.url),"utf8");
test("rocket launch has mobile action controls, keyboard shortcuts and ascent meter",()=>{
  assert.match(launch,/launch-touch-actions/); assert.match(launch,/data-launch-action="separate"/);
  assert.match(launch,/Space/); assert.match(launch,/launch-altitude-fill/);
  assert.match(launch,/70 km/); assert.match(launch,/propellant/);
});
test("launch guidance explains exactly when to release the fairing and separate stages",()=>{
  assert.match(launch,/altitude >= 70_000/); assert.match(launch,/STAGE .*EMPTY/);
  assert.match(launch,/press SEPARATE STAGE now/i); assert.match(launch,/orbital insertion is checked automatically/i);
});
test("rover checkpoint can be confirmed with E or the touch scan button",()=>{
  assert.match(exploration,/e.*mode==="rover"/); assert.match(exploration,/CHECKPOINT .*CONFIRMED/);
  assert.match(exploration,/18 M OF SAMPLE/); assert.match(exploration,/E · SCAN \/ CHECKPOINT/);
});
test("mobile landscape guidance and compact gameplay viewports are present",()=>{
  assert.match(html,/rotate-phone-hint/); assert.match(css,/orientation:portrait/);
  assert.match(css,/orientation:landscape/); assert.match(css,/height:min\(42svh,340px\)/);
  assert.match(rover,/explorationPinchDistance/);
});
test("rover HUD exposes live speed, battery and checkpoint meters",()=>{
  assert.match(rover,/p6-rover-speed/); assert.match(rover,/p6-rover-battery/);
  assert.match(rover,/p6-rover-samples/);
});

test("launch stage separation relights the next stage after a manual cutoff",()=>{
  assert.match(launch,/sim\.setThrottle\(1\)/);
  assert.match(launch,/launch-throttle-label/);
  assert.match(launch,/flight direction/);
});

test("Mission Gameplay also recommends landscape mode on phones",()=>{
  assert.match(html,/Landscape gives the mission scene more room/);
  assert.match(css,/\.game-canvas-wrap \.rotate-phone-hint/);
});
