import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "..");
const audio = fs.readFileSync(path.join(root, "src/audio-system.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");

test("audio controls provide mute, volume, and optional ambience", () => {
  assert.match(html, /id="audio-toggle"/);
  assert.match(html, /id="audio-volume"/);
  assert.match(html, /id="audio-ambience"/);
  assert.match(css, /\.novalux-audio/);
});
test("audio system uses browser Web Audio and waits for user interaction", () => {
  assert.match(audio, /AudioContext \|\| window\.webkitAudioContext/);
  assert.match(audio, /pointerdown/);
  assert.match(audio, /keydown/);
  assert.match(audio, /novalux-audio-volume/);
});
test("launch and mission events have dedicated sound cues", () => {
  for (const id of ["launch-ignite", "launch-pause", "launch-fairing", "launch-cutoff", "launch-separate", "launch-reset", "launch-transfer"]) {
    assert.match(audio, new RegExp(id));
  }
  assert.match(audio, /novalux:launchcomplete/);
  assert.match(audio, /novalux:missioncomplete/);
  assert.match(audio, /MISSION FAILURE/);
});



test("Mission Gameplay triggers dedicated sounds for start, movement, collection, impact and results", () => {
  for (const event of ["start", "thruster", "collect", "impact", "success", "failure"]) {
    assert.match(audio, new RegExp(`novalux:game-${event}`));
  }
  for (const event of ["start", "thruster", "collect", "impact"]) {
    assert.ok(app.includes(`dispatchMissionGameSound("${event}")`));
  }
  assert.ok(app.includes('dispatchMissionGameSound(successful ? "success" : "failure")'));
});
