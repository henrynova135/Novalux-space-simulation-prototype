import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { integrateClohessyWiltshire } from "../src/physics/rendezvous.js";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const phase = readFileSync(new URL("../src/phase5-exploration.js", import.meta.url), "utf8");
const scene = readFileSync(new URL("../src/phase6-3d.js", import.meta.url), "utf8");

test("Phase 6 loads a dedicated WebGL scene for rover and docking", () => {
  assert.match(html, /id="p5-3d-canvas"/);
  assert.match(html, /src\/phase6-3d\.js/);
  assert.match(scene, /WebGLRenderer/);
  assert.match(scene, /samplePositions/);
  assert.match(scene, /station/);
});

test("rover has 3D position, steering, throttle, scan and obstacle handling", () => {
  assert.match(phase, /z:0,heading:0,v:0/);
  assert.match(phase, /keys\.has\("up"\)/);
  assert.match(phase, /keys\.has\("down"\)/);
  assert.match(phase, /obstacles\.some/);
  assert.match(phase, /s\.z/);
});

test("docking uses the Clohessy-Wiltshire relative-motion integrator", () => {
  assert.match(phase, /integrateClohessyWiltshire\(s,dt,ax,ay\)/);
  const s = { x: 100, y: 200, vx: 0, vy: 0 };
  const a = integrateClohessyWiltshire(s, 1, 0, 0, 0.001);
  assert.ok(Math.abs(a.ax - 0.0003) < 1e-12);
  assert.ok(Math.abs(a.ay) < 1e-12);
  assert.ok(s.x > 100);
  assert.equal(s.y, 200);
});

test("rendezvous integrator applies commanded translation acceleration", () => {
  const s = { x: 0, y: 0, vx: 0, vy: 0 };
  integrateClohessyWiltshire(s, 0.5, 0.2, -0.1, 0.001);
  assert.ok(s.vx > 0);
  assert.ok(s.vy < 0);
});

test("rover camera supports orbit, zoom, overhead view, and target guidance", () => {
  assert.match(scene, /pointermove/);
  assert.match(scene, /addEventListener\("wheel"/);
  assert.match(scene, /dblclick/);
  assert.match(scene, /roverCamera\.mode="OVERHEAD"/);
  assert.match(scene, /roverTargetCopy/);
  assert.match(phase, /double-click for overhead view/);
});

test("rover wheel contact and terrain use one consistent height function", () => {
  assert.match(scene, /function terrainHeight\(x,z\)/);
  assert.match(scene, /terrainHeight\(wx,wz\)-ground/);
  assert.match(scene, /rover\.position\.set\(x,ground-\.27,z\)/);
});
