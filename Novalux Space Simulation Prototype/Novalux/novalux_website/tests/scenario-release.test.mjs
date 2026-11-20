import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SCENARIOS, RELEASE_ITEMS, evaluateReleaseReadiness, buildFinalDossier } from "../src/scenario-release.js";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const design = {
  mission:"earth", objective:"Climate monitoring",
  selections:{platform:"CubeSat",propulsion:"Chemical",power:"Solar",instrument:"Camera",communication:"X-band",launcher:"Medium"},
  components:Object.fromEntries(["platform","propulsion","power","instrument","communication","launcher"].map(k=>[k,{items:{[({platform:"CubeSat",propulsion:"Chemical",power:"Solar",instrument:"Camera",communication:"X-band",launcher:"Medium"})[k]]:{}}}]))
};
const team={members:[{name:"A"},{name:"B"}],tasks:[{title:"Review",done:true}],reviews:{0:true,1:true,2:true,3:true,4:true}};
const report={result:{valid:true,score:82}};

test("scenario and release workspaces are reachable from primary navigation",()=>{
  for(const id of ["scenarios-view","release-view"])assert.match(html,new RegExp(`id="${id}"`));
  for(const view of ["scenarios","release"])assert.match(app,new RegExp(`${view}:`));
  assert.match(html,/src\/scenario-release\.js/);
});

test("five distinct mission modes expose operational trade-offs",()=>{
  assert.equal(SCENARIOS.length,5);
  assert.deepEqual(SCENARIOS.map(s=>s.id),["guided","standard","anomaly","science","sandbox"]);
  assert.ok(SCENARIOS.some(s=>s.settings.eventMode==="none"));
  assert.ok(SCENARIOS.find(s=>s.id==="science").settings.scienceMultiplier>1);
});

test("release readiness reports missing evidence and passes when all checks are complete",()=>{
  const incomplete=evaluateReleaseReadiness({design:{},report:null,team:null,manualChecks:{}});
  assert.equal(incomplete.ready,false);
  assert.equal(incomplete.score,0);
  const manual=Object.fromEntries(RELEASE_ITEMS.map((_,i)=>[i,true]));
  const complete=evaluateReleaseReadiness({design,report,team,manualChecks:manual});
  assert.equal(complete.ready,true);
  assert.equal(complete.score,100);
});

test("final dossier is portable and states educational model limitations",()=>{
  const dossier=buildFinalDossier({design,mission:{name:"Earth Observation"},report,team,scenario:SCENARIOS[1],readiness:{ready:true,score:100}});
  assert.equal(dossier.format,"NOVALUX-FINAL-MISSION-DOSSIER");
  assert.equal(dossier.project.releaseState,"READY_FOR_REVIEW");
  assert.match(dossier.modelScope,/Educational simulation only/);
});
