import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { summarizeSpacecraft, evaluateScienceMission } from "../src/mission-control.js";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const design = {
  mission: "earth", objective: "Climate monitoring",
  selections: { platform:"Small Satellite", propulsion:"Chemical propulsion", power:"High-efficiency solar array", instrument:"Multispectral camera", communication:"High-gain antenna", launcher:"Medium launch vehicle" },
  components: {
    platform:{items:{"Small Satellite":{mass:45,powerDemand:25,cost:12}}},
    propulsion:{items:{"Chemical propulsion":{mass:18,power:5,cost:8}}},
    power:{items:{"High-efficiency solar array":{mass:18,output:110,cost:13}}},
    instrument:{items:{"Multispectral camera":{mass:8,power:15,cost:8,science:8}}},
    communication:{items:{"High-gain antenna":{mass:7,power:8,cost:6}}},
    launcher:{items:{"Medium launch vehicle":{mass:0,capacity:1000,cost:20}}}
  }
};

test("existing subsystem views and module are integrated into the existing app navigation", () => {
  for (const id of ["mission-control-view", "science-results-view", "team-collab-view"]) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, /src\/mission-control\.js/);
  for (const view of ["mission-control", "science-results", "team-collab"]) assert.match(app, new RegExp(`"${view}"`));
});

test("spacecraft summary uses the selected components and reports missing categories", () => {
  const summary = summarizeSpacecraft(design);
  assert.equal(summary.complete, true);
  assert.equal(summary.dryMass, 96);
  assert.equal(summary.powerDemand, 53);
  assert.equal(summary.powerOutput, 110);
  assert.equal(summary.massMargin, 904);
  const incomplete = summarizeSpacecraft({selections:{},components:{}});
  assert.equal(incomplete.complete, false);
  assert.equal(incomplete.missing.length, 6);
});

test("existing subsystem science evaluation rewards objective relevance and data return", () => {
  const strong = evaluateScienceMission({design,mission:{objective:"Climate monitoring"},scienceHours:64,generatedMB:100,downlinkedMB:100});
  const weak = evaluateScienceMission({design,mission:{objective:"Water ice investigation"},scienceHours:20,generatedMB:100,downlinkedMB:10});
  assert.equal(strong.valid,true);
  assert.equal(strong.objectiveFit,true);
  assert.equal(weak.objectiveFit,false);
  assert.ok(strong.score > weak.score);
  assert.equal(strong.dataReturn,100);
});
