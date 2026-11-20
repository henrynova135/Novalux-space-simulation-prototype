import { readLocalJSON, writeLocalJSON } from "./storage.js";
import { MISSION_PROFILES, SCIENCE_INSTRUMENTS } from "./mission-architecture.js";
import { SCENARIO_SETTINGS, DEFAULT_SCENARIO } from "./scenario-config.js";

const $ = id => document.getElementById(id);
const SIM_KEY = "novalux-mission-simulation-v1";
const REPORT_KEY = "novalux-science-report-v1";
const TEAM_KEY = "novalux-team-workspace-v1";
const TOTAL_HOURS = 96;

function activeScenarioId(){const id=readLocalJSON("novalux-mission-scenario-v1",DEFAULT_SCENARIO);return SCENARIO_SETTINGS[id]?id:"standard";}
function scenarioSettings(id){return SCENARIO_SETTINGS[id||sim?.scenarioMode||activeScenarioId()]||SCENARIO_SETTINGS.standard;}
const STAGES = [
  { id:"launch", label:"Launch", start:0, end:1 },
  { id:"cruise", label:"Cruise", start:1, end:18 },
  { id:"insertion", label:"Orbit insertion", start:18, end:20 },
  { id:"science", label:"Science ops", start:20, end:84 },
  { id:"downlink", label:"Downlink", start:84, end:96 },
  { id:"complete", label:"Complete", start:96, end:96 }
];
const ROLES = ["Mission Director", "Spacecraft Engineer", "Science Lead", "Flight & Communications"];
const REVIEW_ITEMS = ["Mission objective and success criteria reviewed", "Spacecraft configuration reviewed", "Launch and orbit assumptions reviewed", "Power and communications margins reviewed", "Science and data-return plan approved"];
const INSTRUMENT_DATA_MB_DAY = {"Multispectral camera":80,"High-resolution camera":300,"Scientific sensor suite":120,"Spectrometer":60,"Radar instrument":500};
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const clamp = (n,min,max) => Math.max(min,Math.min(max,n));
const fmt = (n,d=1) => Number.isFinite(Number(n)) ? Number(n).toFixed(d) : "—";

export function summarizeSpacecraft(design) {
  if (!design?.components || !design?.selections) return { complete:false, missing:["Spacecraft Designer unavailable"] };
  const categories = ["platform","propulsion","power","instrument","communication","launcher"];
  const selected = {};
  const missing = [];
  for (const category of categories) {
    const name = design.selections[category];
    const item = design.components[category]?.items?.[name];
    if (!item) missing.push(category);
    else selected[category] = { name, ...item };
  }
  if (missing.length) return { complete:false, missing };
  const s = selected;
  const dryMass = s.platform.mass + s.propulsion.mass + s.power.mass + s.instrument.mass + s.communication.mass;
  const powerDemand = (s.platform.powerDemand||0) + (s.propulsion.power||0) + (s.instrument.power||0) + (s.communication.power||0);
  const powerOutput = s.power.output||0;
  const budget = categories.reduce((sum,key)=>sum+(s[key].cost||0),0);
  return { complete:true, selected:s, dryMass, powerDemand, powerOutput, powerMargin:powerOutput-powerDemand, budget, capacity:s.launcher.capacity||0, massMargin:(s.launcher.capacity||0)-dryMass, science:s.instrument.science||0 };
}

export function evaluateScienceMission({design, mission, hours=TOTAL_HOURS, scienceHours=64, generatedMB=0, downlinkedMB=0, eventPenalty=0}={}) {
  const resources = summarizeSpacecraft(design);
  if (!resources.complete) return { valid:false, reason:`Complete the spacecraft design first: ${resources.missing.join(", ")}.` };
  const objective = mission?.objective || design.objective || "Science investigation";
  const instrumentName = resources.selected.instrument.name;
  const instrumentInfo = SCIENCE_INSTRUMENTS[instrumentName];
  const objectiveFit = Boolean(instrumentInfo?.uses?.includes(objective));
  const powerRatio = resources.powerDemand > 0 ? resources.powerOutput/resources.powerDemand : 1;
  const powerScore = clamp(50 + (powerRatio-1)*45,0,100);
  const launchScore = resources.capacity > 0 ? clamp(100*resources.capacity/Math.max(1,resources.dryMass*1.15),0,100) : 0;
  const dataReturn = generatedMB > 0 ? clamp(100*downlinkedMB/generatedMB,0,100) : 0;
  const durationScore = clamp(100*scienceHours/64,0,100);
  const scienceBase = clamp(resources.science*7.5,0,100);
  const score = Math.round(clamp(scienceBase*(objectiveFit?1:.72)*.35 + powerScore*.15 + launchScore*.15 + dataReturn*.2 + durationScore*.15 - eventPenalty,0,100));
  const success = score >= 60 && resources.massMargin >= 0 && resources.powerMargin >= 0 && objectiveFit && dataReturn >= 50;
  return {valid:true,score,success,objective,instrumentName,objectiveFit,powerScore,launchScore,dataReturn,durationScore,scienceBase,generatedMB,downlinkedMB,resources,scienceHours,hours,eventPenalty};
}

function currentDesign(){ return window.NOVALUX?.getDesign?.() || null; }
function currentMission(){
  const saved=readLocalJSON("novalux-mission-workspace-v1",{});
  const design=currentDesign()||{};
  const mission=design.mission||saved.mission||"earth";
  const profile=MISSION_PROFILES[mission]||MISSION_PROFILES.earth;
  return { name:saved.name||design.missionName||profile.title, destination:profile.destination, mission, objective:design.objective||saved.objective||profile.defaultObjective, duration:design.duration||saved.duration||12 };
}
function readGround(){
  const s=readLocalJSON("novalux-mission-operations-v1",{});
  const instrument=currentDesign()?.selections?.instrument;
  return { station:s.station||"deep34", bitrate:Number(s.bitrate)||10, contactMinutes:Number(s.contactMinutes)||120, dataMB:Number(document.getElementById("ground-data")?.value)||Number(s.dataOverride)||INSTRUMENT_DATA_MB_DAY[instrument]||100 };
}
function telemetryFor(state, resources, ground, deltaHours=1, modeId="standard"){
  const mode=SCENARIO_SETTINGS[modeId]||SCENARIO_SETTINGS.standard;
  const previousHour=state.hour-deltaHours;
  const hour=state.hour;
  const scienceDelta=Math.max(0,Math.min(hour,84)-Math.max(previousHour,20));
  const downlinkDelta=Math.max(0,Math.min(hour,96)-Math.max(previousHour,84));
  const inScience=scienceDelta>0;
  const powerFactor=state.events?.powerReduced?mode.powerFactor:1;
  const demandFactor=state.events?.powerSaving?0.72:1;
  const powerMargin=resources.powerOutput*powerFactor-resources.powerDemand*demandFactor;
  const drain=powerMargin<0?Math.abs(powerMargin)*.025*deltaHours:0.12*deltaHours;
  state.battery=clamp(state.battery-drain,0,100);
  const launchHours=Math.max(0,Math.min(hour,1)-Math.min(previousHour,1));
  const insertionHours=Math.max(0,Math.min(hour,20)-Math.max(previousHour,18));
  const cruiseHours=Math.max(0,Math.min(hour,18)-Math.max(previousHour,1));
  state.fuel=clamp(state.fuel-launchHours*4-insertionHours*6-cruiseHours*.015,0,100);
  if(inScience){
    const daily=ground.dataMB>0?ground.dataMB:Math.max(10,resources.selected.instrument.science*9);
    const scienceFactor=(state.events?.scienceFactor??1)*mode.scienceMultiplier;
    state.generatedMB += daily/24*scienceDelta*scienceFactor;
  }
  const downlinkActive=downlinkDelta>0;
  if(downlinkActive){
    const mbPerHour=ground.bitrate*1000*3600/8/1e6;
    const hourlyCapacity=mbPerHour*(ground.contactMinutes/1440);
    state.downlinkedMB=Math.min(state.generatedMB,state.downlinkedMB+hourlyCapacity*downlinkDelta);
  }
  const powerEventHour=mode.eventMode==="advanced"?24:mode.eventMode==="guided"?36:30;
  const dataEventHour=mode.eventMode==="advanced"?48:mode.eventMode==="guided"?68:58;
  if(mode.eventMode!=="none"&&previousHour<powerEventHour&&hour>=powerEventHour&&!state.events?.powerEventRaised){
    state.events.powerEventRaised=true;
    state.pendingEvent={id:"power",title:"Reduced solar generation",description:"The educational scenario reduces available power generation. Choose how the spacecraft should prioritize operations.",choices:[{label:"Protect essential systems and reduce instrument duty cycle",action:"save-power"},{label:"Continue full science operations",action:"continue"}]};
  }
  if(mode.eventMode!=="none"&&previousHour<dataEventHour&&hour>=dataEventHour&&!state.events?.dataEventRaised){
    state.events.dataEventRaised=true;
    state.pendingEvent={id:"data",title:"Science data backlog",description:"The observation campaign has generated more data than the initial plan anticipated.",choices:[{label:"Prioritize high-value observations for downlink",action:"prioritize"},{label:"Keep collecting all planned observations",action:"continue-data"}]};
  }
  return {powerMargin, powerFactor, inScience, downlinkActive};
}
function stageAt(hour){ return STAGES.find(s=>hour>=s.start&&hour<s.end)||STAGES[STAGES.length-1]; }
function createState(){return {status:"ready",hour:0,battery:100,fuel:100,generatedMB:0,downlinkedMB:0,scienceHours:0,eventPenalty:0,events:{},pendingEvent:null,scenarioMode:activeScenarioId(),log:[{hour:0,message:"Mission workspace initialized. Awaiting launch authorization."}],history:[]};}
let sim=readLocalJSON(SIM_KEY,readLocalJSON("novalux-phase8-simulation-v1",null));
if(!sim||sim.version!==1||!Number.isFinite(sim.hour))sim={version:1,...createState()};
let timer=null;
function log(message){sim.log.unshift({hour:sim.hour,message});sim.log=sim.log.slice(0,30);}
function persist(){writeLocalJSON(SIM_KEY,{version:1,...sim});}
function updateStatus(message){const el=$("mc-status");if(el)el.textContent=message;}
function renderSimulation(){
  const design=currentDesign(), mission=currentMission(), r=summarizeSpacecraft(design), ground=readGround();
  if($("mc-mission-name"))$("mc-mission-name").textContent=mission.name;
  if($("mc-design-summary"))$("mc-design-summary").textContent=r.complete?`${design.selections.platform} · ${design.selections.instrument} · ${design.selections.launcher}`:`Design incomplete: ${r.missing.join(", ")}`;
  const stage=stageAt(sim.hour), percent=100*sim.hour/TOTAL_HOURS;
  if($("mc-clock"))$("mc-clock").textContent=`T+ ${String(Math.floor(sim.hour)).padStart(2,"0")}:00:00`;
  if($("mc-stage"))$("mc-stage").textContent=stage.label.toUpperCase();
  if($("mc-progress-fill"))$("mc-progress-fill").style.width=`${percent}%`;
  if($("mc-stage-list"))$("mc-stage-list").innerHTML=STAGES.slice(0,5).map(s=>`<div class="mc-stage-chip ${sim.hour>=s.end?"done":stage.id===s.id?"active":""}">${esc(s.label)}</div>`).join("");
  const values=r.complete?[["SCENARIO",(sim.scenarioMode||activeScenarioId()).toUpperCase(),"Selected mission mode"],["SPACECRAFT MASS",`${fmt(r.dryMass)} kg`,`Margin ${fmt(r.massMargin)} kg`],["POWER GENERATION",`${fmt(r.powerOutput*(sim.events?.powerReduced?scenarioSettings(sim.scenarioMode).powerFactor:1))} W`,`Demand ${fmt(r.powerDemand)} W`],["BATTERY RESERVE",`${fmt(sim.battery,0)}%`,sim.battery<25?"LOW RESERVE":"Nominal model reserve"],["PROPELLANT RESERVE",`${fmt(sim.fuel,0)}%`,"Illustrative maneuver reserve"],["SCIENCE DATA",`${fmt(sim.generatedMB)} MB`,"Generated observations"],["DATA RETURNED",`${fmt(sim.downlinkedMB)} MB`,"Downlinked to ground"],["MISSION TIME",`${fmt(sim.hour,0)} h`,`${fmt(percent,0)}% complete`],["MISSION BUDGET",`${fmt(r.budget)} MCr`,"Modeled component cost"]]:[["SPACECRAFT","Incomplete","Complete the designer"],["POWER","—","Awaiting configuration"],["BATTERY","—","Awaiting configuration"],["PROPELLANT","—","Awaiting configuration"]];
  if($("mc-telemetry"))$("mc-telemetry").innerHTML=values.map(([a,b,c])=>`<div class="mc-telemetry"><small>${a}</small><strong>${esc(b)}</strong><em>${esc(c)}</em></div>`).join("");
  if($("mc-flight-state"))$("mc-flight-state").innerHTML=[["Mission phase",stage.label],["Destination",mission.destination],["Selected objective",mission.objective],["Instrument",r.complete?r.selected.instrument.name:"Not selected"],["Power margin",r.complete?`${fmt(r.powerMargin)} W`:"—"],["Downlink station",ground.station],["Simulation model","Deterministic educational model"]].map(([a,b])=>`<div class="mc-flight-row"><span>${esc(a)}</span><b>${esc(b)}</b></div>`).join("");
  if($("mc-resource-chart"))$("mc-resource-chart").innerHTML=(sim.history||[]).slice(-32).map(h=>`<span title="Hour ${h.hour}: ${fmt(h.battery,0)}% battery" style="height:${clamp(h.battery,2,100)}%"></span>`).join("");
  if($("mc-log"))$("mc-log").innerHTML=(sim.log||[]).slice(0,12).map(x=>`<p><b>T+${String(x.hour).padStart(2,"0")}h</b> ${esc(x.message)}</p>`).join("");
  const event=$("mc-event-panel");
  if(event){
    if(sim.pendingEvent){event.innerHTML=`<b>${esc(sim.pendingEvent.title)}</b><p>${esc(sim.pendingEvent.description)}</p>${sim.pendingEvent.choices.map((c,i)=>`<button class="save-button" type="button" data-mc-choice="${i}">${esc(c.label)}</button>`).join("")}`;}
    else event.textContent=sim.status==="complete"?"Mission completed. Review the science results.":"No active event. Monitor telemetry as the mission progresses.";
  }
  if($("mc-start"))$("mc-start").disabled=sim.status==="running"||sim.status==="complete";
  if($("mc-pause")){$("mc-pause").disabled=sim.status==="ready"||sim.status==="complete"||Boolean(sim.pendingEvent);$("mc-pause").textContent=sim.status==="paused"?"RESUME":"PAUSE";}
  updateStatus(sim.status.toUpperCase());
}
function finishMission(){
  sim.status="complete";sim.hour=TOTAL_HOURS;log("Mission timeline complete. Science return evaluation generated.");
  const design=currentDesign(),mission=currentMission(),ground=readGround();
  const result=evaluateScienceMission({design,mission,hours:sim.hour,scienceHours:sim.scienceHours,generatedMB:sim.generatedMB,downlinkedMB:sim.downlinkedMB,eventPenalty:sim.eventPenalty});
  const report={format:"NOVALUX-SCIENCE-REPORT",version:1,createdAt:new Date().toISOString(),scenario:sim.scenarioMode||activeScenarioId(),mission,design:{selections:design?.selections||{}},simulation:{...sim,log:sim.log.slice()},ground,result,modelScope:"Educational simulation only; not professional mission analysis or actual spacecraft telemetry."};
  writeLocalJSON(REPORT_KEY,report);renderScienceReport();persist();renderSimulation();
}
function tick(){
  if(sim.status!=="running"||sim.pendingEvent)return;
  const design=currentDesign(),resources=summarizeSpacecraft(design),ground=readGround();
  if(!resources.complete){pauseMission();updateStatus("DESIGN ERROR");return;}
  const previousHour=sim.hour;
  const deltaHours=Number($("mc-speed")?.value||1);
  sim.hour=Math.min(TOTAL_HOURS,sim.hour+deltaHours);
  const state=telemetryFor(sim,resources,ground,sim.hour-previousHour,sim.scenarioMode||activeScenarioId());
  sim.scienceHours+=Math.max(0,Math.min(sim.hour,84)-Math.max(previousHour,20));
  if(previousHour<1&&sim.hour>=1)log("Launch sequence completed. Spacecraft deployment confirmed in the educational model.");
  if(previousHour<18&&sim.hour>=18)log("Cruise phase complete. Beginning destination orbit-insertion sequence.");
  if(previousHour<20&&sim.hour>=20)log("Orbit insertion complete. Science operations are now available.");
  if(previousHour<84&&sim.hour>=84)log("Science campaign complete. Beginning scheduled ground data-return window.");
  if(sim.hour%4===0){sim.history.push({hour:sim.hour,battery:sim.battery});sim.history=sim.history.slice(-48);}
  if(sim.battery<=5&&!sim.events.lowBattery){sim.events.lowBattery=true;sim.eventPenalty+=8;log("Battery reserve reached a critical modeled threshold. Science duty cycle reduced.");}
  if(sim.hour>=TOTAL_HOURS){finishMission();return;}
  if(sim.pendingEvent){sim.status="paused";log(`Operational decision required: ${sim.pendingEvent.title}.`);}
  persist();renderSimulation();
}
function pauseMission(){if(timer){clearInterval(timer);timer=null;}if(sim.status==="running")sim.status="paused";persist();renderSimulation();}
function startMission(){
  const r=summarizeSpacecraft(currentDesign());
  if(!r.complete){updateStatus(`INCOMPLETE: ${r.missing.join(", ")}`);if($("mc-event-panel"))$("mc-event-panel").textContent=`Complete the spacecraft designer first: ${r.missing.join(", ")}.`;return;}
  if(sim.status==="complete")return;
  if(sim.hour===0)sim.scenarioMode=activeScenarioId();
  sim.status="running";log(sim.hour===0?"Mission execution started.":"Mission execution resumed.");
  if(timer)clearInterval(timer);timer=setInterval(tick,1000);renderSimulation();
}
function resetMission(){if(timer){clearInterval(timer);timer=null;}sim={version:1,...createState()};persist();renderSimulation();renderScienceReport();}
function handleDecision(index){const event=sim.pendingEvent;if(!event)return;const choice=event.choices[index];if(!choice)return;
  if(event.id==="power"&&choice.action==="save-power"){sim.events.powerReduced=true;sim.events.powerSaving=true;sim.events.scienceFactor=0.65;sim.eventPenalty+=2*scenarioSettings().difficulty;log("Power-saving mode selected. Non-essential loads and instrument duty cycle are reduced.");}
  else if(event.id==="power"){sim.eventPenalty+=10*scenarioSettings().difficulty;log("Full operations retained. The scenario applies additional power-risk penalty.");}
  else if(event.id==="data"&&choice.action==="prioritize"){sim.events.scienceFactor=Math.min(sim.events.scienceFactor??1,0.6);sim.eventPenalty+=1*scenarioSettings().difficulty;log("Observation queue prioritized. Lower-priority data collection is reduced to protect high-value observations.");}
  else log("Full observation plan retained; data backlog risk remains.");
  sim.pendingEvent=null;sim.status="running";persist();renderSimulation();if(!timer)timer=setInterval(tick,1000);
}
function exportJSON(filename,data){const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);}

function renderScienceReport(){
  const report=readLocalJSON(REPORT_KEY,readLocalJSON("novalux-phase9-science-report-v1",null)),status=$("sr-status");
  if(!report?.result?.valid){if(status)status.textContent="AWAITING MISSION";if($("sr-score"))$("sr-score").textContent="—";if($("sr-verdict"))$("sr-verdict").textContent="Complete a mission simulation to generate scientific results.";if($("sr-metrics"))$("sr-metrics").innerHTML="";if($("sr-observations"))$("sr-observations").textContent="No observations recorded yet.";if($("sr-downlink"))$("sr-downlink").textContent="No downlink record available.";if($("sr-evaluation"))$("sr-evaluation").textContent="Mission evaluation will appear here after completion.";if($("sr-export"))$("sr-export").disabled=true;return;}
  const r=report.result;if(status)status.textContent=r.success?"MISSION OBJECTIVES MET":"REVIEW REQUIRED";
  $("sr-score").textContent=String(r.score);$("sr-ring-value").textContent=`${r.score}%`;$("sr-ring").style.borderColor=r.success?"var(--green)":"var(--orange)";
  $("sr-verdict").textContent=r.success?"The educational model indicates a successful science-return outcome.":"The mission produced a result, but one or more modeled success criteria need review.";
  $("sr-metrics").innerHTML=[["OBSERVATIONS GENERATED",`${fmt(report.simulation.generatedMB)} MB`],["DATA RETURNED",`${fmt(report.simulation.downlinkedMB)} MB`],["SCIENCE OPERATIONS",`${fmt(report.simulation.scienceHours,0)} h`],["OBJECTIVE MATCH",r.objectiveFit?"Relevant":"Review instrument"]].map(([a,b])=>`<div class="mc-telemetry"><small>${a}</small><strong>${esc(b)}</strong></div>`).join("");
  $("sr-observations").innerHTML=`<div class="sr-observation"><b>${esc(r.instrumentName)}</b><small>Selected instrument for ${esc(r.objective)}. ${r.objectiveFit?"The instrument is listed as relevant to this objective in the NOVALUX mission model.":"The selected instrument is not directly matched to this objective in the current model."}</small></div><div class="sr-observation"><b>Modeled science capability</b><small>${fmt(r.scienceBase,0)} / 100 before mission-performance factors</small></div><div class="sr-observation"><b>Observation duration</b><small>${fmt(r.scienceHours,0)} simulated hours</small></div>`;
  $("sr-downlink").innerHTML=[["Generated data",`${fmt(r.generatedMB)} MB`],["Returned data",`${fmt(r.downlinkedMB)} MB`],["Data return fraction",`${fmt(r.dataReturn,0)}%`],["Ground station class",report.ground.station]].map(([a,b])=>`<div class="sr-row"><span>${esc(a)}</span><b>${esc(b)}</b></div>`).join("");
  $("sr-evaluation").innerHTML=[["Objective relevance",r.objectiveFit],["Power model",r.resources.powerMargin>=0],["Launch mass margin",r.resources.massMargin>=0],["Science data returned",r.dataReturn>=50],["Mission score threshold",r.score>=60]].map(([a,ok])=>`<div class="sr-row"><span>${esc(a)}</span><b class="${ok?"mc-ok":"mc-warning"}">${ok?"PASS":"REVIEW"}</b></div>`).join("");
  $("sr-export").disabled=false;
}

let team=readLocalJSON(TEAM_KEY,readLocalJSON("novalux-phase10-team-v1",null));
if(!team||team.version!==1)team={version:1,name:"NOVALUX Mission Team",members:[{name:"Member 1",role:ROLES[0]},{name:"Member 2",role:ROLES[1]}],tasks:[],reviews:{},importedSnapshot:null,updatedAt:null};
function saveTeam(){team.updatedAt=new Date().toISOString();writeLocalJSON(TEAM_KEY,team);}
function renderTeam(){
  const members=$("tc-members");if(!members)return;
  members.innerHTML=team.members.map((m,i)=>`<div class="tc-member-row" data-member="${i}"><input aria-label="Member ${i+1} name" maxlength="40" value="${esc(m.name)}" data-member-name="${i}"><select aria-label="Member ${i+1} role" data-member-role="${i}">${ROLES.map(r=>`<option ${m.role===r?"selected":""}>${esc(r)}</option>`).join("")}</select><button type="button" class="tc-remove" data-remove-member="${i}" aria-label="Remove member ${i+1}" ${team.members.length<=1?"disabled":""}>×</button></div>`).join("");
  $("tc-add-member").disabled=team.members.length>=4;
  $("tc-task-owner").innerHTML=team.members.map((m,i)=>`<option value="${i}">${esc(m.name||`Member ${i+1}`)}</option>`).join("");
  const mission=currentMission(),design=currentDesign(),r=summarizeSpacecraft(design);
  const imported=team.importedSnapshot;
  $("tc-project-summary").innerHTML=`<div><b>${esc(team.name)}</b></div><div>Mission: ${esc(mission.name)}</div><div>Destination: ${esc(mission.destination)}</div><div>Objective: ${esc(mission.objective)}</div><div>Spacecraft: ${r.complete?`${esc(design.selections.platform)} · ${esc(design.selections.instrument)}`:"Design incomplete"}</div><div>Team size: ${team.members.length} / 4</div>${imported?`<div class="mc-ok">Imported project available: ${esc(imported.mission?.name||"Mission snapshot")}</div>`:""}<div>Last updated: ${team.updatedAt?new Date(team.updatedAt).toLocaleString():"Not yet saved"}</div>`;
  $("tc-apply-imported").hidden=!Boolean(imported?.design?.selections);
  const open=team.tasks.filter(t=>!t.done).length;$("tc-task-count").textContent=`${open} OPEN`;
  $("tc-task-list").innerHTML=team.tasks.length?team.tasks.map((t,i)=>`<div class="tc-task-row ${t.done?"done":""}"><label><input type="checkbox" data-task-done="${i}" ${t.done?"checked":""}><span><b>${esc(t.title)}</b><br><small>${esc(team.members[t.owner]?.name||"Unassigned")} · ${esc(t.priority)} priority</small></span></label><span class="tc-priority ${esc(t.priority)}">${t.done?"COMPLETE":"OPEN"}</span><button class="tc-remove" type="button" data-task-delete="${i}" aria-label="Delete task">×</button></div>`).join(""):`<p class="mc-note">No tasks yet. Add a work package for the team.</p>`;
  $("tc-review-list").innerHTML=REVIEW_ITEMS.map((label,i)=>`<div class="tc-review-row"><label><input type="checkbox" data-review="${i}" ${team.reviews[i]?"checked":""}>${esc(label)}</label><small>${team.reviews[i]?"REVIEWED":"PENDING"}</small></div>`).join("");
}
function exportTeam(){const report=readLocalJSON(REPORT_KEY,null);const payload={format:"NOVALUX-TEAM-PROJECT",version:1,exportedAt:new Date().toISOString(),team,mission:currentMission(),design:currentDesign(),simulation:sim,scienceReport:report,modelScope:"Portable team project for local collaboration. It does not establish a remote multiplayer session."};exportJSON("novalux-team-project.json",payload);}
function importTeam(data){if(data?.format!=="NOVALUX-TEAM-PROJECT"||data.version!==1||!data.team||!Array.isArray(data.team.members)||!Array.isArray(data.team.tasks))throw new Error("Unsupported NOVALUX team project file.");if(data.team.members.length<1||data.team.members.length>4)throw new Error("A team project must contain between one and four members.");const importedSelections=data.design?.selections&&typeof data.design.selections==="object"?Object.fromEntries(["platform","propulsion","power","instrument","communication","launcher"].filter(k=>typeof data.design.selections[k]==="string").map(k=>[k,data.design.selections[k]])):null;team={version:1,name:String(data.team.name||"Imported NOVALUX Team").slice(0,80),members:data.team.members.slice(0,4).map(m=>({name:String(m.name||"Member").slice(0,40),role:ROLES.includes(m.role)?m.role:ROLES[0]})),tasks:data.team.tasks.slice(0,200).map(t=>({title:String(t.title||"Task").slice(0,100),owner:clamp(Number(t.owner)||0,0,data.team.members.length-1),priority:["normal","high","critical"].includes(t.priority)?t.priority:"normal",done:Boolean(t.done)})),reviews:data.team.reviews&&typeof data.team.reviews==="object"?data.team.reviews:{},importedSnapshot:{mission:data.mission?{name:String(data.mission.name||"Imported mission"),mission:String(data.mission.mission||"earth"),objective:String(data.mission.objective||"")}:null,design:importedSelections?{selections:importedSelections}:null,scienceScore:Number.isFinite(data.scienceReport?.result?.score)?data.scienceReport.result.score:null},updatedAt:new Date().toISOString()};saveTeam();renderTeam();}

function init(){
  if(!$("mission-control-view"))return;
  $("mc-start").addEventListener("click",startMission);
  $("mc-pause").addEventListener("click",()=>{if(sim.status==="paused")startMission();else pauseMission();});
  $("mc-reset").addEventListener("click",resetMission);
  $("mc-event-panel").addEventListener("click",e=>{const b=e.target.closest("[data-mc-choice]");if(b)handleDecision(Number(b.dataset.mcChoice));});
  $("sr-export").addEventListener("click",()=>{const report=readLocalJSON(REPORT_KEY,null);if(report)exportJSON("novalux-science-report.json",report);});
  $("tc-add-member").addEventListener("click",()=>{if(team.members.length>=4)return;team.members.push({name:`Member ${team.members.length+1}`,role:ROLES[team.members.length]||ROLES[0]});saveTeam();renderTeam();});
  $("tc-members").addEventListener("input",e=>{const name=e.target.closest("[data-member-name]");if(name){team.members[Number(name.dataset.memberName)].name=name.value.slice(0,40);saveTeam();$("tc-task-owner").options[Number(name.dataset.memberName)].text=name.value||`Member ${Number(name.dataset.memberName)+1}`;}});
  $("tc-members").addEventListener("change",e=>{const role=e.target.closest("[data-member-role]");if(role){team.members[Number(role.dataset.memberRole)].role=role.value;saveTeam();}});
  $("tc-members").addEventListener("click",e=>{const b=e.target.closest("[data-remove-member]");if(!b||team.members.length<=1)return;const index=Number(b.dataset.removeMember);team.members.splice(index,1);team.tasks=team.tasks.map(t=>({...t,owner:t.owner===index?0:(t.owner>index?t.owner-1:t.owner)}));saveTeam();renderTeam();});
  $("tc-task-form").addEventListener("submit",e=>{e.preventDefault();const title=$("tc-task-title").value.trim();if(!title)return;team.tasks.push({title,owner:Number($("tc-task-owner").value)||0,priority:$("tc-task-priority").value,done:false});$("tc-task-title").value="";saveTeam();renderTeam();});
  $("tc-task-list").addEventListener("change",e=>{const b=e.target.closest("[data-task-done]");if(!b)return;team.tasks[Number(b.dataset.taskDone)].done=b.checked;saveTeam();renderTeam();});
  $("tc-task-list").addEventListener("click",e=>{const b=e.target.closest("[data-task-delete]");if(!b)return;team.tasks.splice(Number(b.dataset.taskDelete),1);saveTeam();renderTeam();});
  $("tc-review-list").addEventListener("change",e=>{const b=e.target.closest("[data-review]");if(!b)return;team.reviews[b.dataset.review]=b.checked;saveTeam();renderTeam();});
  $("tc-import-design").addEventListener("click",()=>{renderTeam();$("tc-status").textContent="DESIGN REFRESHED";});
  $("tc-export").addEventListener("click",exportTeam);
  $("tc-apply-imported").addEventListener("click",()=>{const snapshot=team.importedSnapshot;if(!snapshot?.design?.selections){$("tc-status").textContent="NO IMPORTED DESIGN";return;}const api=window.NOVALUX;let applied=0;if(snapshot.mission?.mission&&api?.setMission)api.setMission(snapshot.mission.mission,snapshot.mission.objective);for(const category of ["platform","propulsion","power","instrument","communication","launcher"]){const name=snapshot.design.selections[category];if(name&&api?.selectComponent?.(category,name))applied++;}renderSimulation();renderTeam();$("tc-status").textContent=applied===6?"IMPORTED DESIGN APPLIED":`PARTIAL DESIGN · ${applied}/6 COMPONENTS`;});
  $("tc-import-file").addEventListener("change",async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>2_000_000)throw new Error("File exceeds the 2 MB import limit.");importTeam(JSON.parse(await file.text()));$("tc-status").textContent="PROJECT IMPORTED";}catch(err){$("tc-status").textContent=`IMPORT ERROR: ${err.message}`;}e.target.value="";});
  document.addEventListener("novalux:designchange",()=>{if(sim.status==="running")pauseMission();renderSimulation();renderTeam();});
  document.addEventListener("novalux:scenariochange",()=>{if(sim.status==="running")pauseMission();if(sim.hour===0)sim.scenarioMode=activeScenarioId();persist();renderSimulation();});
  document.addEventListener("novalux:viewchange",()=>{renderSimulation();renderScienceReport();renderTeam();});
  renderSimulation();renderScienceReport();renderTeam();
  if(sim.status==="running")sim.status="paused";
  persist();renderSimulation();
}
if(typeof document!=="undefined"){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();}
