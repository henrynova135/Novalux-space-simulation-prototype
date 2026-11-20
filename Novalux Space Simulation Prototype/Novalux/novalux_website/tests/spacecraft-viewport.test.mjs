import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const js=readFileSync(new URL('../src/ship/spacecraft-engineering.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
test('engineering camera explicitly aims at the assembly and frames its bounds',()=>{
  assert.match(js,/function fitAssembly\(\)/);
  assert.match(js,/new THREE\.Box3\(\)\.setFromObject\(craft\)/);
  assert.match(js,/getBoundingSphere\(new THREE\.Sphere\(\)\)/);
  assert.match(js,/Math\.min\(vFov,hFov\)/);
  assert.match(js,/placeCameraOnAssembly\(\)/);
  assert.match(js,/camera\.lookAt\(target\)/);
});
test('engineering viewport resizes to its visible container',()=>{
  assert.match(js,/host\.getBoundingClientRect\(\)/);
  assert.match(js,/new ResizeObserver\(resize\)/);
  assert.match(js,/window\.addEventListener\('resize',resize\)/);
});
test('engineering layout and canvas are constrained to viewport width',()=>{
  assert.match(css,/#engineering-view,#engineering-bay,.eng-layout,.eng-main,.eng-side\{min-width:0;max-width:100%/);
  assert.match(css,/\.eng-viewport canvas\{[^}]*width:100%!important/);
  assert.match(css,/@media\(max-width:1100px\)/);
});

test('engineering viewport exposes a fit-entire-spacecraft control',()=>{
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/id=\"eng-fit\"/);
  assert.match(js,/getElementById\('eng-fit'\)/);
});
