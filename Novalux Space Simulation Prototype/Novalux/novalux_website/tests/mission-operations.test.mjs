import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { calculateCircularOrbit, evaluateSpacecraftDesign, calculateLinkBudget } from "../src/mission-operations.js";

const catalog = {
  platform: { items: { CubeSat: { mass: 15, powerDemand: 15, cost: 5 } } },
  propulsion: { items: { "Chemical propulsion": { mass: 18, power: 5, cost: 8 }, "Electric propulsion": { mass: 10, power: 35, cost: 12 } } },
  power: { items: { "Solar array": { mass: 12, output: 65, cost: 7 }, "High-efficiency solar array": { mass: 18, output: 110, cost: 13 } } },
  instrument: { items: { "Multispectral camera": { mass: 8, power: 15, cost: 8 } } },
  communication: { items: { "X-band communication": { mass: 7, power: 12, cost: 6 } } },
  launcher: { items: { "Small launch vehicle": { capacity: 80, cost: 12 }, "Medium launch vehicle": { capacity: 350, cost: 28 } } }
};
const design = { components: catalog, selections: { platform: "CubeSat", propulsion: "Chemical propulsion", power: "Solar array", instrument: "Multispectral camera", communication: "X-band communication", launcher: "Small launch vehicle" } };

test("Earth circular orbit returns expected LEO speed and period", () => {
  const orbit = calculateCircularOrbit("earth", 400_000, 51.6);
  assert.equal(orbit.valid, true);
  assert.ok(orbit.circularSpeed > 7_600 && orbit.circularSpeed < 7_800);
  assert.ok(orbit.periodMinutes > 90 && orbit.periodMinutes < 95);
  assert.ok(orbit.escapeSpeed > orbit.circularSpeed);
});

test("Moon and Mars orbit calculations use their own gravitational parameters", () => {
  const moon = calculateCircularOrbit("moon", 100_000, 30);
  const mars = calculateCircularOrbit("mars", 250_000, 25);
  assert.equal(moon.valid, true);
  assert.equal(mars.valid, true);
  assert.notEqual(moon.circularSpeed, mars.circularSpeed);
});

test("orbit planner rejects unsupported altitude and inclination values", () => {
  assert.equal(calculateCircularOrbit("earth", 10_000, 0).valid, false);
  assert.equal(calculateCircularOrbit("mars", 250_000, 181).valid, false);
  assert.equal(calculateCircularOrbit("pluto", 100_000, 0).valid, false);
});

test("Earth orbit altitude bands cover LEO, MEO and GEO planning range", () => {
  assert.equal(calculateCircularOrbit("earth", 400_000).valid, true);
  assert.equal(calculateCircularOrbit("earth", 12_000_000).valid, true);
  assert.equal(calculateCircularOrbit("earth", 35_786_000).valid, true);
});

test("spacecraft trade model sums mass, power, costs and launch margin", () => {
  const result = evaluateSpacecraftDesign(design);
  assert.equal(result.complete, true);
  assert.equal(result.dryMass, 60);
  assert.equal(result.powerDemand, 47);
  assert.equal(result.powerOutput, 65);
  assert.equal(result.componentCost, 34);
  assert.equal(result.totalCost, 46);
  assert.equal(result.massMargin, 20);
  assert.equal(result.compatible, true);
});

test("trade preview can compare a heavier or lighter launcher without mutating source design", () => {
  const preview = evaluateSpacecraftDesign(design, "Medium launch vehicle");
  assert.equal(preview.capacity, 350);
  assert.equal(design.selections.launcher, "Small launch vehicle");
});

test("incomplete spacecraft is reported explicitly", () => {
  const result = evaluateSpacecraftDesign({ components: catalog, selections: { platform: "CubeSat" } });
  assert.equal(result.complete, false);
  assert.ok(result.missing.includes("launcher"));
});

test("link budget calculates finite received power and positive link margin for reference case", () => {
  const link = calculateLinkBudget({ distanceKm: 384_400, frequencyGHz: 8.4, txPowerW: 100, txGainDbi: 35, stationDishM: 34, bitrateKbps: 10, noiseFigureDb: 1.2 });
  assert.equal(link.valid, true);
  assert.ok(Number.isFinite(link.receivedDbm));
  assert.ok(link.fspl > 200);
  assert.ok(link.linkMarginDb > 0);
});

test("free-space path loss rises and SNR falls as range increases", () => {
  const near = calculateLinkBudget({ distanceKm: 2_000, frequencyGHz: 8.4, txPowerW: 100, txGainDbi: 35, stationDishM: 34, bitrateKbps: 10 });
  const far = calculateLinkBudget({ distanceKm: 150_000_000, frequencyGHz: 8.4, txPowerW: 100, txGainDbi: 35, stationDishM: 34, bitrateKbps: 10 });
  assert.ok(far.fspl > near.fspl);
  assert.ok(far.snrDb < near.snrDb);
});

test("link budget rejects invalid radio inputs", () => {
  assert.equal(calculateLinkBudget({ distanceKm: 0, frequencyGHz: 8.4, txPowerW: 100, txGainDbi: 35, stationDishM: 34, bitrateKbps: 10 }).valid, false);
});

test("existing operations tools UI is integrated into Mission Planner and module is loaded", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /Launch Vehicle & Orbit Planner/);
  assert.match(html, /Mission Resource & Trade-off Explorer/);
  assert.match(html, /Ground Station Network & Data Downlink/);
  assert.match(html, /src\/mission-operations\.js/);
  for (const id of ["ops-launcher", "ops-altitude", "trade-apply", "ground-station", "ground-link-metrics", "ops-export"]) assert.match(html, new RegExp(`id="${id}"`));
});
