import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const moduleSource = readFileSync(new URL('../src/advanced-exploration.js', import.meta.url), 'utf8');

test('Advanced Exploration is reachable from primary navigation and loads its module', () => {
  assert.match(html, /data-view="exploration"/);
  assert.match(html, /id="exploration-view"/);
  assert.match(html, /src="src\/advanced-exploration\.js"/);
});

test('Advanced Exploration exposes all four playable activities and their control surfaces', () => {
  for (const activity of ['reentry', 'docking', 'rover', 'crew']) {
    assert.match(html, new RegExp(`data-p5-tab="${activity}"`));
    assert.ok(moduleSource.includes(`${activity}: {`), `${activity} activity definition exists`);
  }
  for (const id of ['p5-canvas', 'p5-start', 'p5-reset', 'p5-controls', 'p5-log']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
});

test('Advanced Exploration contains objective checks for safe re-entry, soft docking, rover samples, and crew duration', () => {
  assert.match(moduleSource, /landing<18/);
  assert.match(moduleSource, /range<20&&speed<\.5/);
  assert.match(moduleSource, /s\.samples\.every\(Boolean\)/);
  assert.match(moduleSource, /s\.hours>=72/);
});


test('Advanced Exploration provides adjustable mission time and bounded physics substeps', () => {
  assert.match(html, /id="p5-time-scale"/);
  assert.match(html, /id="p5-time-value"/);
  assert.match(html, /min="0\.5" max="20" step="0\.5"/);
  assert.match(moduleSource, /real\*simulationSpeed/);
  assert.match(moduleSource, /Math\.min\(\.01,remaining\)/);
  assert.match(moduleSource, /updateTimeScale/);
});

test('Exploration design bridge reads the active designer and displays linked spacecraft identity', () => {
  assert.match(html, /id="p6-craft-name"/);
  assert.match(html, /id="p6-craft-summary"/);
  assert.match(html, /id="p6-refresh-design"/);
  assert.match(moduleSource, /window\.NOVALUX\?\.getDesign\?\.\(\)/);
  assert.match(moduleSource, /design\.components\?\.\[category\]\?\.items/);
  assert.match(moduleSource, /platformMass/);
  assert.match(moduleSource, /propulsionCapability/);
});

test('Exploration progress saves successful activity progression across reloads', () => {
  assert.match(html, /id="p6-progress-count"/);
  assert.match(html, /id="p6-progress-fill"/);
  assert.match(moduleSource, /novalux-phase5-progress-v1/);
  assert.match(moduleSource, /localStorage\.setItem\(progressKey/);
  assert.match(moduleSource, /progress\[mode\]=true/);
});
