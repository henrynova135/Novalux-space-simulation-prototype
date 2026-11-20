import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "..");
const scene = fs.readFileSync(path.join(root, "src/launch-3d.js"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");

test("existing subsystem sky transitions from blue atmosphere to deep space with altitude", () => {
  assert.match(scene, /new THREE\.SphereGeometry\(180/);
  assert.match(scene, /ShaderMaterial/);
  assert.match(scene, /uAltitude/);
  assert.match(scene, /smoothstep\(42000\.0, 165000\.0, uAltitude\)/);
  assert.match(scene, /stars\.material\.opacity = THREE\.MathUtils\.smoothstep\(altitude, 65000, 165000\)/);
});
test("launch scene keeps Earth and the launch pad but omits surface terrain and rocks", () => {
  assert.match(scene, /earthRadius = 34/);
  assert.match(scene, /earth\.position\.set\(0,-34\.73,0\)/);
  assert.match(scene, /const pad = new THREE\.Group\(\)/);
  assert.match(scene, /pad\.position\.set\(0,-\.25,0\)/);
  assert.match(scene, /launchBaseY = -\.46 - y/);
  assert.doesNotMatch(scene, /terrainRings|terrainSegments|terrainInnerRadius|terrainOuterRadius/);
  assert.doesNotMatch(scene, /rockGroup|DodecahedronGeometry/);
});
test("launch vehicle base is calculated from the selected stage stack", () => {
  assert.match(scene, /rocket\.position\.set\([\s\S]*launchBaseY\+ascentHeight/);
});
test("launch camera restores its original composition and supports interactive orbit and zoom", () => {
  assert.match(scene, /camera\.position\.set\(7, 4, 18\)/);
  assert.match(scene, /PerspectiveCamera\(52, 1, \.1, 650\)/);
  assert.match(scene, /orbitViewBlend = THREE\.MathUtils\.smoothstep\(altitude, 65000, 400000\)/);
  assert.match(scene, /rocket\.position\.y \+ THREE\.MathUtils\.lerp\(0\.25, 0\.55, orbitViewBlend\)/);
  assert.match(scene, /baseDistance = THREE\.MathUtils\.lerp\(Math\.hypot\(7, 3\.2, 18\), Math\.hypot\(4, 2\.4, 13\.5\), orbitViewBlend\)/);
  assert.match(scene, /canvas\.addEventListener\("pointermove"/);
  assert.match(scene, /canvas\.addEventListener\("wheel"/);
  assert.match(scene, /camera\.lookAt\(target\)/);
});
test("existing subsystem 3D launch viewport has a stable responsive height", () => {
  assert.match(css, /#launch-3d-canvas\s*\{[^}]*height:clamp\(320px, 42vw, 520px\)/);
});

test("a blocking prototype alert appears before visitors can enter the website", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(html, /role="alertdialog" aria-modal="true"/);
  assert.match(html, /This website is only a prototype/);
  assert.match(html, /prototype-enter-button/);
  assert.match(html, /gate\.classList\.add\("is-dismissed"\)/);
  assert.match(css, /\.prototype-alert\s*\{/);
  assert.doesNotMatch(html, /class="prototype-notice"/);
});

test("launch environment contains no green terrain mesh or decorative rock meshes", () => {
  assert.doesNotMatch(scene, /Build the launch-site terrain as a curved spherical annulus/);
  assert.doesNotMatch(scene, /terrainInnerRadius|terrainOuterRadius/);
  assert.doesNotMatch(scene, /const rockGroup = new THREE\.Group/);
  assert.doesNotMatch(scene, /DodecahedronGeometry/);
  assert.match(scene, /const pad = new THREE\.Group\(\)/);
  assert.match(scene, /const rocket = new THREE\.Group\(\)/);
});
