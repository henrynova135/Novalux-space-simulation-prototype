import { readLocalJSON, writeLocalJSON } from "./storage.js";
import { MISSION_PROFILES, SCIENCE_INSTRUMENTS, calculateMissionResources, evaluateMissionRequirements } from "./mission-architecture.js";

const STORE = "novalux-mission-workspace-v1";
const $ = (id) => document.getElementById(id);
const PROFILES = MISSION_PROFILES;
const INSTRUMENTS = SCIENCE_INSTRUMENTS;
const DEFAULTS = {name:"Earth Observation Pathfinder", cml:1, duration:12, maxMass:250, maxBudget:150, reserve:10, priority:"balanced"};
let workspace = {...DEFAULTS, mission:"earth", objective:PROFILES.earth.defaultObjective};
let lastSignature = "";
let isDirty = false;
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt = (n, d=1) => Number.isFinite(n) ? n.toFixed(d) : "—";
function load() {
  const saved = readLocalJSON(STORE, null);
  if (!saved || saved.version !== 1 || !PROFILES[saved.mission]) return false;
  workspace = {...DEFAULTS, ...saved};
  if (!PROFILES[workspace.mission].objectives.includes(workspace.objective)) workspace.objective = PROFILES[workspace.mission].defaultObjective;
  return true;
}
function save(show=true) {
  const ok = writeLocalJSON(STORE, {version:1, ...workspace, updatedAt:new Date().toISOString()});
  if (show) status(ok ? "Mission concept saved in this browser." : "Browser storage is unavailable. Export the mission JSON to keep a copy.");
  return ok;
}
function status(message) { const el=$("mp-requirement-status"); if(el) el.textContent=message; }
function currentDesign() { return window.NOVALUX?.getDesign?.() || null; }
function calculate(design=currentDesign()) {
  return calculateMissionResources(design);
}
function checks(r) {
  return evaluateMissionRequirements(r, {
    maxMass: workspace.maxMass,
    maxBudget: workspace.maxBudget,
    powerReservePercent: workspace.reserve,
    objective: workspace.objective
  });
}
function renderBrief() {
  const profile=PROFILES[workspace.mission];
  $("mp-mission-code").textContent=profile.code;
  $("mp-brief").innerHTML=`<div class="mp-brief-title">${esc(profile.title)} · ${esc(workspace.objective)}</div><p>${esc(profile.description)}</p><small>${esc(profile.scienceNeed)}</small>`;
  $("mp-stage-tag").textContent=`CML ${workspace.cml} · ${["","CONCEPT","FEASIBILITY","TRADE STUDIES","POINT DESIGN"][workspace.cml]}`;
}
function renderRequirements(r) {
  const result=checks(r);
  const passed=result.filter(x=>x.ok).length;
  $("mp-requirement-status").innerHTML=result.length ? `<b>${passed}/${result.length} preliminary checks satisfied</b><ul>${result.map(x=>`<li class="${x.ok?"ok":"warn"}">${esc(x.label)}</li>`).join("")}</ul>` : "Select a mission and configure the spacecraft to evaluate requirements.";
}
function renderMetrics(r) {
  const rows=r?.complete ? [["DRY MASS",`${fmt(r.dryMass)} kg`],["LAUNCH CAPACITY",`${fmt(r.capacity)} kg`],["POWER",`${fmt(r.powerOutput)} / ${fmt(r.powerDemand)} W`],["BUDGET",`${fmt(r.budget)} MCr`],["SCIENCE VALUE",`${fmt(r.science)} / 10`],["POWER MARGIN",`${fmt(r.powerMargin)} W`]] : [["SPACECRAFT", "Incomplete"],["REQUIRED SYSTEMS", "6 categories"],["STATUS", "Awaiting configuration"]];
  $("mp-metrics").innerHTML=rows.map(([a,b])=>`<div class="mp-metric"><small>${a}</small><strong>${esc(b)}</strong></div>`).join("");
  const result=checks(r);
  $("mp-engineering-checks").innerHTML=result.map(x=>`<div class="mp-check ${x.ok?"ok":"warn"}"><span>${x.ok?"✓":"!"}</span>${esc(x.label)}</div>`).join("");
}
function renderInstruments(r) {
  const selected=r?.selected?.instrument?.name;
  const cards=Object.entries(INSTRUMENTS).map(([name,item])=>{
    const fit=item.uses.includes(workspace.objective);
    return `<article class="mp-instrument-card ${fit?"recommended":""} ${selected===name?"chosen":""}"><div class="mp-instrument-top"><b>${esc(name)}</b><span>${fit?"RELEVANT":"ALTERNATIVE"}</span></div><small>${esc(item.kind)} · ${esc(item.range)}</small><p>${esc(item.why)}</p><em>Consideration: ${esc(item.limit)}</em><button class="save-button" type="button" data-select-instrument="${esc(name)}">${selected===name?"CURRENTLY SELECTED":"SELECT THIS INSTRUMENT"}</button></article>`;
  }).join("");
  $("mp-instrument-grid").innerHTML=cards;
  $("mp-instrument-status").textContent=selected ? (INSTRUMENTS[selected]?.uses.includes(workspace.objective)?"OBJECTIVE MATCH":"REVIEW SELECTION") : "AWAITING DESIGN";
  $("mp-instrument-current").textContent=selected ? `Currently selected: ${selected}. Change it in Spacecraft Designer → Instruments.` : "No scientific instrument is selected yet.";
}
function renderMaturity(r) {
  const req=checks(r), hasObjective=Boolean(workspace.objective), hasProfile=Boolean(workspace.name.trim());
  const complete=[hasProfile&&hasObjective,hasProfile&&hasObjective&&workspace.duration>=1, r?.complete&&req.length>=4&&req.filter(x=>x.ok).length>=3, r?.complete&&req.every(x=>x.ok)];
  const labels=["Mission concept and scientific need defined","Initial feasibility and mission requirements reviewed","Spacecraft and instrument trade studies completed","Point design meets the selected educational constraints"];
  $("mp-completion").textContent=`${complete.filter(Boolean).length} / 4`;
  $("mp-maturity").innerHTML=labels.map((label,i)=>`<div class="mp-maturity-row ${complete[i]?"done":""}"><span>${complete[i]?"✓":i+1}</span><div><b>CML ${i+1}</b><small>${label}</small></div><em>${complete[i]?"READY":"IN PROGRESS"}</em></div>`).join("");
}
function render() {
  const d=currentDesign();
  const r=calculate(d);
  renderBrief(); renderRequirements(r); renderMetrics(r); renderInstruments(r); renderMaturity(r);
  lastSignature=JSON.stringify({mission:workspace.mission,objective:workspace.objective,selections:d?.selections});
}
function syncControls() {
  $("mp-name").value=workspace.name;
  $("mp-mission").value=workspace.mission;
  $("mp-duration").value=workspace.duration;
  $("mp-cml").value=String(workspace.cml);
  $("mp-max-mass").value=workspace.maxMass;
  $("mp-max-budget").value=workspace.maxBudget;
  $("mp-power-reserve").value=workspace.reserve;
  $("mp-priority").value=workspace.priority;
  updateObjectives(false);
}
function updateObjectives(applyDefault=true) {
  const profile=PROFILES[workspace.mission];
  const select=$("mp-objective");
  select.innerHTML=profile.objectives.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join("");
  if(!profile.objectives.includes(workspace.objective) && applyDefault) workspace.objective=profile.defaultObjective;
  select.value=workspace.objective;
}
function updateWorkspaceFromControls() {
  isDirty = true;
  workspace.name=$("mp-name").value.trim()||"Untitled Mission";
  workspace.mission=$("mp-mission").value;
  workspace.objective=$("mp-objective").value;
  workspace.duration=Math.max(1,Math.min(60,Number($("mp-duration").value)||1));
  workspace.cml=Math.max(1,Math.min(4,Number($("mp-cml").value)||1));
  workspace.maxMass=Math.max(10,Math.min(5000,Number($("mp-max-mass").value)||250));
  workspace.maxBudget=Math.max(10,Math.min(1000,Number($("mp-max-budget").value)||150));
  workspace.reserve=Math.max(0,Math.min(80,Number($("mp-power-reserve").value)||0));
  workspace.priority=$("mp-priority").value;
  render();
}
function applyToDesigner() {
  const api=window.NOVALUX;
  if(!api?.setMission) { status("Spacecraft Designer bridge is unavailable."); return; }
  isDirty = false;
  api.setMission(workspace.mission,workspace.objective);
  api.setDuration(workspace.duration);
  render();
  status("Mission concept and objective applied to the existing Spacecraft Designer.");
}
function exportMission() {
  const data={format:"NOVALUX-MISSION-CONCEPT",version:1,workspace,design:currentDesign(),exportedAt:new Date().toISOString()};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`${workspace.name.toLowerCase().replace(/[^a-z0-9]+/g,"-")}-mission-concept.json`;a.click();URL.revokeObjectURL(url);
}
function openView(view) { document.querySelector(`[data-view="${view}"]`)?.click(); }
function syncFromDesigner() {
  const d=currentDesign();
  if(!d || !PROFILES[d.mission]) return;
  workspace.mission=d.mission;
  workspace.objective=PROFILES[d.mission].objectives.includes(d.objective)?d.objective:PROFILES[d.mission].defaultObjective;
  workspace.duration=d.duration||workspace.duration;
  $("mp-mission").value=workspace.mission;
  $("mp-duration").value=workspace.duration;
  updateObjectives(false);
}
function init() {
  if(!$("mission-planner-view")) return;
  const hasSavedWorkspace=load();
  if(!hasSavedWorkspace) {
    const design=currentDesign();
    if(design && PROFILES[design.mission]) {
      workspace.mission=design.mission;
      workspace.objective=PROFILES[design.mission].objectives.includes(design.objective)?design.objective:PROFILES[design.mission].defaultObjective;
      workspace.duration=design.duration||DEFAULTS.duration;
    }
  }
  syncControls(); render();
  $("mp-mission").addEventListener("change",()=>{workspace.mission=$("mp-mission").value;workspace.objective=PROFILES[workspace.mission].defaultObjective;updateObjectives(false);updateWorkspaceFromControls();});
  ["mp-name","mp-objective","mp-duration","mp-cml","mp-max-mass","mp-max-budget","mp-power-reserve","mp-priority"].forEach(id=>$(id).addEventListener("input",updateWorkspaceFromControls));
  $("mp-objective").addEventListener("change",updateWorkspaceFromControls);
  $("mp-apply").addEventListener("click",applyToDesigner);
  $("mp-save").addEventListener("click",()=>save(true));
  $("mp-export").addEventListener("click",exportMission);
  $("mp-refresh").addEventListener("click",render);
  $("mp-instrument-grid").addEventListener("click",event=>{
    const button=event.target.closest("[data-select-instrument]");
    if(!button) return;
    const name=button.dataset.selectInstrument;
    if(window.NOVALUX?.selectComponent("instrument",name)) {
      render(); status(`${name} selected in the existing spacecraft design.`);
    }
  });
  $("mp-open-instruments").addEventListener("click",()=>{openView("designer");document.querySelector('[data-category="instrument"]')?.click();});
  $("mp-open-designer").addEventListener("click",()=>openView("designer"));
  $("mp-open-challenge").addEventListener("click",()=>openView("challenge"));
  document.addEventListener("novalux:designchange",()=>{
    if(!$("mission-planner-view")?.classList.contains("active")) return;
    if(!isDirty) syncFromDesigner();
    render(); save(false);
  });
  document.addEventListener("novalux:viewchange",()=>{
    if(!$("mission-planner-view")?.classList.contains("active")) return;
    if(!isDirty) syncFromDesigner();
    render();
  });
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init); else init();
