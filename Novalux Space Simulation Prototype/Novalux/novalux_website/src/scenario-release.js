import { readLocalJSON, writeLocalJSON } from "./storage.js";

export const SCENARIO_KEY = "novalux-mission-scenario-v1";
export const RELEASE_KEY = "novalux-release-checklist-v1";

export { SCENARIOS } from "./scenario-config.js";
import { SCENARIOS, DEFAULT_SCENARIO } from "./scenario-config.js";

export const RELEASE_ITEMS = Object.freeze([
  "Mission objectives and success criteria reviewed",
  "Spacecraft configuration and component choices reviewed",
  "Launch, orbit, and communications assumptions reviewed",
  "Power, mass, and resource margins reviewed",
  "Science results and data-return evaluation reviewed",
  "Team responsibilities and task board reviewed",
  "Educational model limitations acknowledged"
]);

export function evaluateReleaseReadiness({ design, report, team, manualChecks = {} } = {}) {
  const categories = ["platform","propulsion","power","instrument","communication","launcher"];
  const selections = design?.selections || {};
  const components = design?.components || {};
  const spacecraftComplete = categories.every(k => selections[k] && components[k]?.items?.[selections[k]]);
  const checks = [
    { id:"spacecraft", label:"Complete spacecraft configuration", passed:spacecraftComplete, detail:spacecraftComplete?"All six spacecraft categories have valid selections.":"One or more spacecraft categories are incomplete." },
    { id:"mission", label:"Mission objective selected", passed:Boolean(design?.objective), detail:design?.objective || "Select a mission objective in the designer." },
    { id:"science", label:"Science evaluation available", passed:Boolean(report?.result?.valid), detail:report?.result?.valid?`Science score: ${report.result.score}/100.`:"Complete a mission simulation to generate a science report." },
    { id:"team", label:"Team workspace configured", passed:Boolean(team?.members?.length && team.members.length <= 4), detail:team?.members?.length?`${team.members.length} team member(s) configured.`:"Add at least one team member." },
    { id:"tasks", label:"Team work packages reviewed", passed:Boolean(team?.tasks?.length && team.tasks.every(t => t.done)), detail:team?.tasks?.length?`${team.tasks.filter(t=>t.done).length}/${team.tasks.length} tasks complete.`:"No team tasks have been added." },
    { id:"signoffs", label:"Team review sign-offs complete", passed:Boolean(team?.reviews && Object.values(team.reviews).filter(Boolean).length >= 5), detail:`${Object.values(team?.reviews || {}).filter(Boolean).length}/5 sign-offs recorded.` },
    { id:"manual", label:"Manual release checklist complete", passed:RELEASE_ITEMS.every((_,i)=>Boolean(manualChecks[i])), detail:`${RELEASE_ITEMS.filter((_,i)=>Boolean(manualChecks[i])).length}/${RELEASE_ITEMS.length} manual checks complete.` }
  ];
  const passed = checks.filter(c=>c.passed).length;
  return { checks, passed, total:checks.length, score:Math.round(passed/checks.length*100), ready:passed===checks.length };
}

export function buildFinalDossier({ design, mission, report, team, scenario, readiness } = {}) {
  return {
    format:"NOVALUX-FINAL-MISSION-DOSSIER", version:1, exportedAt:new Date().toISOString(),
    project:{name:"NOVALUX", type:"Educational space mission design and operations game", releaseState:readiness?.ready?"READY_FOR_REVIEW":"REVIEW_INCOMPLETE"},
    mission:mission || null, spacecraft:design || null, scenario:scenario || SCENARIOS.find(s=>s.id===DEFAULT_SCENARIO),
    scienceReport:report || null, team:team || null, readiness:readiness || null,
    modelScope:"Educational simulation only. Not a spacecraft certification, professional mission analysis, real telemetry, validated science product, or flight operations system. Team collaboration is local-browser and portable-file based unless separately connected to a real backend."
  };
}

const $ = id => document.getElementById(id);
const esc = value => String(value ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const getDesign = () => window.NOVALUX?.getDesign?.() || null;
const getMission = () => readLocalJSON("novalux-mission-workspace-v1",{});
const getReport = () => readLocalJSON("novalux-science-report-v1",readLocalJSON("novalux-phase9-science-report-v1",null));
const getTeam = () => readLocalJSON("novalux-team-workspace-v1",readLocalJSON("novalux-phase10-team-v1",null));
let selected = readLocalJSON(SCENARIO_KEY, DEFAULT_SCENARIO);
if (!SCENARIOS.some(s=>s.id===selected)) selected="standard";
let manual = readLocalJSON(RELEASE_KEY, {});
function activeScenario(){return SCENARIOS.find(s=>s.id===selected)||SCENARIOS[1];}
function renderScenarios(){
  const grid=$("scenario-grid"); if(!grid)return;
  grid.innerHTML=SCENARIOS.map(s=>`<article class="scenario-card ${s.id===selected?"selected":""}"><div class="scenario-card-top"><span class="scenario-level">${esc(s.level)}</span>${s.id===selected?'<span class="scenario-selected">ACTIVE</span>':''}</div><h3>${esc(s.name)}</h3><p>${esc(s.description)}</p><ul>${s.metrics.map(m=>`<li>${esc(m)}</li>`).join("")}</ul><button class="${s.id===selected?"primary-button":"save-button"}" type="button" data-scenario="${s.id}">${s.id===selected?"SELECTED":"SELECT SCENARIO"}</button></article>`).join("");
  const s=activeScenario();$("scenario-active-title").textContent=s.name;$("scenario-active-description").textContent=s.description;$("scenario-active-tags").innerHTML=s.tags.map(t=>`<span>${esc(t)}</span>`).join("");$("scenario-status").textContent=`${s.level} MODE`;$ ("scenario-challenge-title").textContent=s.challenge;$("scenario-challenge-description").textContent=s.description;$("scenario-challenge-metrics").innerHTML=s.metrics.map(m=>`<span>${esc(m)}</span>`).join("");
}
function renderRelease(){
  const readiness=evaluateReleaseReadiness({design:getDesign(),report:getReport(),team:getTeam(),manualChecks:manual});
  if($("release-score"))$("release-score").textContent=`${readiness.score}%`;
  if($("release-ring-value"))$("release-ring-value").textContent=`${readiness.score}%`;
  if($("release-verdict"))$("release-verdict").textContent=readiness.ready?"All readiness checks passed. Your mission dossier is ready for review.":`${readiness.passed} of ${readiness.total} automated and manual checks passed. Resolve the remaining items before release.`;
  if($("release-status"))$("release-status").textContent=readiness.ready?"READY FOR REVIEW":"REVIEW REQUIRED";
  if($("release-checks"))$("release-checks").innerHTML=readiness.checks.slice(0,6).map(c=>`<div class="release-check ${c.passed?"passed":"pending"}"><span>${c.passed?"✓":"!"}</span><div><b>${esc(c.label)}</b><small>${esc(c.detail)}</small></div><strong>${c.passed?"PASS":"PENDING"}</strong></div>`).join("");
  if($("release-manual-checks"))$("release-manual-checks").innerHTML=RELEASE_ITEMS.map((label,i)=>`<label class="release-manual-item"><input type="checkbox" data-release-check="${i}" ${manual[i]?"checked":""}><span>${esc(label)}</span></label>`).join("");
  return readiness;
}
function downloadJSON(filename,data){const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function init(){
  if(!$("scenarios-view"))return;
  $("scenario-grid").addEventListener("click",e=>{const b=e.target.closest("[data-scenario]");if(!b)return;selected=b.dataset.scenario;writeLocalJSON(SCENARIO_KEY,selected);renderScenarios();document.dispatchEvent(new Event("novalux:scenariochange"));});
  $("scenario-open-control").addEventListener("click",()=>document.querySelector('[data-view="mission-control"]')?.click());
  $("release-refresh").addEventListener("click",renderRelease);
  $("release-manual-checks").addEventListener("change",e=>{const box=e.target.closest("[data-release-check]");if(!box)return;manual[box.dataset.releaseCheck]=box.checked;writeLocalJSON(RELEASE_KEY,manual);renderRelease();});
  $("release-export").addEventListener("click",()=>{const readiness=renderRelease();const dossier=buildFinalDossier({design:getDesign(),mission:getMission(),report:getReport(),team:getTeam(),scenario:activeScenario(),readiness});downloadJSON("NOVALUX-Final-Mission-Dossier.json",dossier);$("release-dossier-status").textContent=readiness.ready?"EXPORTED · READY":"EXPORTED · REVIEW ITEMS OPEN";});
  $("release-print").addEventListener("click",()=>window.print());
  document.addEventListener("novalux:viewchange",()=>{renderScenarios();renderRelease();});
  document.addEventListener("novalux:designchange",renderRelease);
  document.addEventListener("novalux:missionreport",renderRelease);
  renderScenarios();renderRelease();
}
if(typeof document!=="undefined"){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();}
