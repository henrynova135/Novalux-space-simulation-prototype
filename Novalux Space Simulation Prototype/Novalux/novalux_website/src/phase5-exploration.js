import { integrateClohessyWiltshire } from "./physics/rendezvous.js";
/* =========================================================
   NOVALUX PHASE 5/6 — INTEGRATED ADVANCED EXPLORATION
   Educational simplified models linked to the active designer.
   ========================================================= */

const canvas = document.getElementById("p5-canvas");
const ctx = canvas?.getContext("2d");
if (!canvas || !ctx) throw new Error("Phase 5 canvas is unavailable");

const $ = id => document.getElementById(id);
const ui = {
  title: $("p5-title"), kicker: $("p5-kicker"), description: $("p5-description"),
  overlay: $("p5-overlay"), overlayTitle: $("p5-overlay-title"), overlayCopy: $("p5-overlay-copy"),
  start: $("p5-start"), reset: $("p5-reset"), status: $("p5-global-status"),
  help: $("p5-controls-help"), controls: $("p5-controls"), log: $("p5-log"),
  timeScale: $("p5-time-scale"), timeValue: $("p5-time-value")
};
const metricIds = ["p5-metric-a", "p5-metric-b", "p5-metric-c", "p5-metric-d"];
const W = canvas.width, H = canvas.height;
const definitions = {
  reentry: {
    kicker: "ATMOSPHERIC FLIGHT", title: "Reusable spacecraft re-entry",
    description: "Guide a returning vehicle through the upper atmosphere, manage aerodynamic heating, and deploy its parachute before touchdown.",
    help: "Use A / D or BANK controls to steer. Deploy the parachute below 12 km. Keep heat below the vehicle limit.",
    controls: [{id:"left",text:"◀ BANK"},{id:"right",text:"BANK ▶"},{action:"parachute",text:"DEPLOY PARACHUTE"}]
  },
  docking: {
    kicker: "ORBITAL OPERATIONS", title: "Space-station rendezvous & docking",
    description: "Perform an orbital rendezvous in a local orbital frame. Clohessy–Wiltshire equations model the station-relative motion; match position and velocity for a soft capture.",
    help: "Use W / A / S / D for translation thrust. Dock within 20 m while relative speed is below 0.5 m/s.",
    controls: [{id:"left",text:"◀ THRUST"},{id:"right",text:"THRUST ▶"},{id:"up",text:"▲ THRUST"},{id:"down",text:"THRUST ▼"}]
  },
  rover: {
    kicker: "PLANETARY SURFACE", title: "Lunar & Martian rover operations",
    description: "Explore a three-dimensional planetary terrain with free steering, forward/reverse throttle, rocks, slopes and three science sample sites.",
    help: "W / S drive · A / D steer · SCIENCE SCAN near a beacon. Drag the 3D view to orbit, use the mouse wheel to zoom, double-click for overhead view, or press C to reset the follow camera. Target arrow points to the next sample. Avoid rocks and conserve battery.",
    controls: [{id:"left",text:"◀ STEER"},{id:"right",text:"STEER ▶"},{id:"up",text:"▲ DRIVE"},{id:"down",text:"▼ REVERSE"},{action:"scan",text:"SCIENCE SCAN"}]
  },
  crew: {
    kicker: "HABITAT OPERATIONS", title: "Crew life-support management",
    description: "Keep a four-person crew safe for a 72-hour orbital operations exercise by balancing oxygen, water, and electrical power.",
    help: "Toggle POWER SAVE to reduce consumption. Solar generation is simulated; complete 72 mission hours without exhausting a resource.",
    controls: [{action:"power",text:"TOGGLE POWER SAVE"},{action:"solar",text:"DEPLOY SOLAR ARRAY"}]
  }
};

let mode = "reentry", running = false, raf = 0, last = 0, keys = new Set();
let simulationSpeed = 1;
let state;
let activeDesign = null;
const progressKey = "novalux-phase5-progress-v1";
const progress = loadProgress();
const logs = [];

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(progressKey) || "{}");
    return { reentry: !!saved.reentry, docking: !!saved.docking, rover: !!saved.rover, crew: !!saved.crew };
  } catch { return { reentry:false, docking:false, rover:false, crew:false }; }
}
function saveProgress() {
  try { localStorage.setItem(progressKey, JSON.stringify(progress)); } catch (error) { console.warn("NOVALUX progress could not be saved", error); }
  renderProgress();
}
function getActiveDesign() {
  try {
    const design = window.NOVALUX?.getDesign?.();
    if (!design?.selections) return null;
    const selected = design.selections;
    const lookup = (category, key) => design.components?.[category]?.items?.[selected[key]] || {};
    const platform = lookup("platform", "platform");
    const propulsion = lookup("propulsion", "propulsion");
    const power = lookup("power", "power");
    const instrument = lookup("instrument", "instrument");
    return {
      mission: design.mission || "earth", selections: selected,
      platformMass: Number(platform.mass) || 45,
      propulsionMass: Number(propulsion.mass) || 18,
      powerMass: Number(power.mass) || 8,
      instrumentMass: Number(instrument.mass) || 10,
      propulsionCapability: Number(propulsion.capability) || 5,
      platform: selected.platform || "Spacecraft platform",
      propulsion: selected.propulsion || "Propulsion system",
      instrument: selected.instrument || "Science instrument",
      destination: ({earth:"Earth",moon:"Moon",mars:"Mars"})[design.mission] || "Earth"
    };
  } catch (error) { console.warn("Could not read active NOVALUX design", error); return null; }
}
function refreshDesign() {
  activeDesign = getActiveDesign();
  const name = $("p6-craft-name"), summary = $("p6-craft-summary");
  if (!name || !summary) return;
  if (!activeDesign) {
    name.textContent = "No active spacecraft design detected";
    summary.textContent = "Open the spacecraft designer, configure a vehicle, then refresh this panel.";
    return;
  }
  name.textContent = `${activeDesign.platform} · ${activeDesign.destination} mission`;
  summary.textContent = `${activeDesign.propulsion} · ${activeDesign.instrument}. The Phase 5 vehicle mass and maneuver budget now use your selected design components.`;
  if (state && mode === "docking") state.fuel = Math.min(100, Math.max(25, activeDesign.propulsionCapability * 10));
}
function renderProgress() {
  const count = Object.values(progress).filter(Boolean).length;
  const countEl = $("p6-progress-count"), fill = $("p6-progress-fill");
  if (countEl) countEl.textContent = `${count} / 4`;
  if (fill) fill.style.width = `${count / 4 * 100}%`;
}
function log(message) {
  logs.unshift(`${new Date().toLocaleTimeString()}  ${message}`);
  if (logs.length > 5) logs.pop();
  ui.log.textContent = logs.join("\n");
}
function defaults(which) {
  activeDesign = getActiveDesign();
  const designMass = activeDesign ? activeDesign.platformMass + activeDesign.propulsionMass + activeDesign.powerMass + activeDesign.instrumentMass : 81;
  if (which === "reentry") return {alt:120000, vx:7800, vy:-1450, heat:0, bank:0, chute:false, landed:false, failed:false, elapsed:0, mass:Math.max(500, designMass * 85)};
  if (which === "docking") return {x:360,y:1250,vx:0.15,vy:-1.6,fuel:activeDesign ? Math.min(100, Math.max(25, activeDesign.propulsionCapability * 10)) : 60,docked:false,failed:false,elapsed:0};
  if (which === "rover") return {x:0,z:0,heading:0,v:0,battery:activeDesign ? Math.min(100, Math.max(35, 100 - activeDesign.instrumentMass * .25)) : 85,samples:[false,false,false],scanReady:false,failed:false,elapsed:0};
  return {hours:0,oxygen:100,water:100,power:100,powerSave:false,solar:false,failed:false,complete:false};
}
function setMetric(i, value) { const el=$(metricIds[i]); if (el) el.textContent=value; }
function setStatus(value) { ui.status.textContent=value; setMetric(3,value.toUpperCase()); }
function configure(which) {
  mode=which;
  document.querySelector(".p5-stage")?.classList.toggle("phase6-3d", (which==="rover"||which==="docking") && !!window.NOVALUXPhase6Scene?.available); refreshDesign(); state=defaults(which); running=false; if(raf) cancelAnimationFrame(raf); raf=0;
  document.querySelectorAll("[data-p5-tab]").forEach(b=>b.classList.toggle("active",b.dataset.p5Tab===which));
  const d=definitions[which]; ui.kicker.textContent=d.kicker; ui.title.textContent=d.title; ui.description.textContent=d.description; ui.help.textContent=d.help;
  ui.controls.innerHTML=d.controls.map(c=>c.id?`<button type="button" data-p5-control="${c.id}">${c.text}</button>`:`<button type="button" data-p5-action="${c.action}">${c.text}</button>`).join("");
  ui.start.textContent="START SIMULATION"; ui.overlay.classList.remove("hidden");
  ui.overlayTitle.textContent=which==="reentry"?"Begin atmospheric entry":which==="docking"?"Begin station approach":which==="rover"?"Deploy the surface rover":"Begin crew operations";
  ui.overlayCopy.textContent=which==="reentry"?"Start at 120 km altitude and guide the vehicle safely to the landing zone.":which==="docking"?"A station is 1.25 km ahead. Use small controlled thrust inputs to close the range.":which==="rover"?"Drive to the marked sample sites and collect three scientific samples.":"Manage life support for 72 simulated hours. Resource levels update as mission time advances.";
  logs.length=0; log(`PHASE 5 ${which.toUpperCase()} SIMULATION READY`); setStatus("READY"); updateTelemetry(); draw();
}
function updateTelemetry() {
  if(mode==="reentry") {setMetric(0,`${(state.alt/1000).toFixed(1)} km`);setMetric(1,`${Math.hypot(state.vx,state.vy).toFixed(0)} m/s`);setMetric(2,`${state.heat.toFixed(0)}%`);}
  if(mode==="docking") {setMetric(0,`${Math.hypot(state.x,state.y).toFixed(1)} m range`);setMetric(1,`${Math.hypot(state.vx,state.vy).toFixed(2)} m/s`);setMetric(2,`${state.fuel.toFixed(0)}%`);}
  if(mode==="rover") {setMetric(0,`${state.x.toFixed(0)} m / ${state.z.toFixed(0)} m`);setMetric(1,`${state.v.toFixed(1)} m/s`);setMetric(2,`${state.battery.toFixed(0)}%`);}
  if(mode==="crew") {setMetric(0,`${state.hours.toFixed(1)} / 72 h`);setMetric(1,`${state.oxygen.toFixed(0)}% O₂`);setMetric(2,`${state.water.toFixed(0)}% H₂O`);setMetric(3,`${state.power.toFixed(0)}% POWER`);setStatus(state.complete?"COMPLETED":state.failed?"FAILED":running?"ACTIVE":"STANDBY");return;}
  const result=mode==="reentry"?(state.landed?"LANDED":state.failed?"VEHICLE LOST":running?"ENTRY ACTIVE":"STANDBY"):mode==="docking"?(state.docked?"DOCKED":state.failed?"APPROACH FAILED":running?"APPROACH ACTIVE":"STANDBY"):(state.samples.every(Boolean)?"SAMPLES COMPLETE":state.failed?"ROVER STOPPED":running?"SURFACE ACTIVE":"STANDBY");
  setMetric(3,result); setStatus(result);
}
function start() { if(running)return; if((state.landed||state.failed||state.docked||state.complete)) {state=defaults(mode);} running=true;last=performance.now();ui.overlay.classList.add("hidden");ui.start.textContent="PAUSE SIMULATION";setStatus("ACTIVE");log(`SIMULATION STARTED AT ${simulationSpeed.toFixed(1)}×`);raf=requestAnimationFrame(frame); }
function pause() {running=false;if(raf)cancelAnimationFrame(raf);raf=0;ui.start.textContent="RESUME SIMULATION";setStatus("PAUSED");}
function finish(success, title, copy) {running=false;if(raf)cancelAnimationFrame(raf);raf=0;ui.start.textContent="RUN AGAIN";ui.overlay.classList.remove("hidden");ui.overlayTitle.textContent=title;ui.overlayCopy.textContent=copy;if(success){progress[mode]=true;saveProgress();}log(success?"OBJECTIVE COMPLETE — MISSION PROGRESS SAVED":"MISSION ENDED");updateTelemetry();}
function frame(now) {
  if(!running)return;
  const real=Math.min(.05,(now-last)/1000||0); last=now;
  // Scale mission time, then integrate in bounded substeps to avoid large-step instability.
  let remaining=real*simulationSpeed;
  while(remaining>1e-9 && running) {
    const substep=Math.min(.01,remaining);
    step(substep);
    remaining-=substep;
  }
  draw();updateTelemetry();if(running)raf=requestAnimationFrame(frame);
}
function step(dt) {
  if(mode==="reentry") stepReentry(dt);
  if(mode==="docking") stepDocking(dt);
  if(mode==="rover") stepRover(dt);
  if(mode==="crew") stepCrew(dt);
}
function updateTimeScale(value, shouldLog=false) {
  simulationSpeed=Math.max(.5,Math.min(20,Number(value)||1));
  ui.timeScale.value=String(simulationSpeed);
  ui.timeValue.textContent=`${simulationSpeed.toFixed(1)}× ${simulationSpeed===1?"REAL TIME":simulationSpeed<1?"SLOW MOTION":"FASTER"}`;
  if(shouldLog) log(`SIMULATION SPEED SET TO ${simulationSpeed.toFixed(1)}×`);
}
function stepReentry(dt) {
  const s=state, simDt=dt*(s.chute?10:1), rho=1.225*Math.exp(-Math.max(0,s.alt)/8500), speed=Math.hypot(s.vx,s.vy), mass=s.mass || 9000, cdA=s.chute?170:22;
  s.elapsed+=simDt; s.bank=(keys.has("left")?-1:0)+(keys.has("right")?1:0); const drag=.5*rho*speed*speed*1.25*cdA/mass;
  const ax= -drag*(s.vx/(speed||1)) + s.bank*0.7;
  const ay= -9.81 - drag*(s.vy/(speed||1));
  s.vx+=ax*simDt;s.vy+=ay*simDt;s.alt+=s.vy*simDt;
  const heatRate=Math.sqrt(rho/1.225)*Math.pow(speed/7800,3)*40;
  s.heat=Math.max(0,Math.min(130,s.heat+heatRate*simDt));
  if(s.heat>100){s.failed=true;finish(false,"Thermal protection failure","The heat-load limit was exceeded. Try a shallower, more controlled entry profile.");return;}
  if(s.alt<12000&&!s.chute) { /* prompt only; player deploys manually */ }
  if(s.chute){s.vy=Math.max(s.vy,-14);s.vx*=Math.pow(.94,simDt*10);}
  if(s.alt<=0){s.alt=0;s.landed=true;const landing=Math.hypot(s.vx,s.vy);finish(landing<18,"Touchdown confirmed",landing<18?`Safe recovery. Touchdown speed ${landing.toFixed(1)} m/s.`:`Impact speed ${landing.toFixed(1)} m/s was too high. Deploy the parachute earlier.`);}
}
function stepDocking(dt) {
  const s=state, t=keys; let ax=0,ay=0; if(t.has("left"))ax=-.12;if(t.has("right"))ax=.12;if(t.has("up"))ay=.12;if(t.has("down"))ay=-.12;
  // Linearized Clohessy-Wiltshire equations in the local orbital frame (radial x, along-track y).
  integrateClohessyWiltshire(s,dt,ax,ay);
  s.fuel=Math.max(0,s.fuel-(Math.abs(ax)+Math.abs(ay))*dt*1.8);s.elapsed+=dt;
  const range=Math.hypot(s.x,s.y), speed=Math.hypot(s.vx,s.vy);
  if(range<20&&speed<.5){s.docked=true;finish(true,"Soft docking achieved",`Station capture confirmed at ${range.toFixed(1)} m and ${speed.toFixed(2)} m/s relative speed.`);}
  else if(range<12&&speed>=.5){s.failed=true;finish(false,"Docking contact too fast","Relative speed exceeded the soft-capture limit. Reset and use smaller thrust pulses.");}
  else if(s.fuel<=0){s.failed=true;finish(false,"RCS propellant depleted","The approach thrusters ran out of propellant before docking.");}
}
function stepRover(dt) {
  const s=state;let steer=0,throttle=0;if(keys.has("left"))steer=1;if(keys.has("right"))steer=-1;if(keys.has("up"))throttle=1;if(keys.has("down"))throttle=-.65;
  s.heading+=steer*1.15*dt;const terrainSlope=Math.sin(s.x*.025)*.22+Math.cos(s.z*.034)*.18;
  s.v+=(throttle*3.2-terrainSlope-s.v*.52)*dt;s.v=Math.max(-3.2,Math.min(7,s.v));
  const nx=s.x+Math.sin(s.heading)*s.v*dt,nz=s.z-Math.cos(s.heading)*s.v*dt;
  const obstacles=Array.from({length:44},(_,i)=>({x:((i*83)%820)-410,z:((i*137)%440)-220,r:2+(i%5)*1.4}));
  const hit=obstacles.some(o=>Math.hypot(nx-o.x,nz-o.z)<o.r+3.2);
  if(!hit){s.x=Math.max(-445,Math.min(445,nx));s.z=Math.max(-245,Math.min(245,nz));}else{s.v=0;if(!s.collisionLogged){log("ROCK CONTACT — STOPPED TO PREVENT WHEEL DAMAGE");s.collisionLogged=true;}}
  if(!hit)s.collisionLogged=false;
  s.battery=Math.max(0,s.battery-(.035+Math.abs(throttle)*.07+Math.abs(steer)*.025)*dt);
  const sites=[[90,-38],[260,58],[445,-48]];sites.forEach(([x,z],i)=>{if(Math.hypot(s.x-x,s.z-z)<14&&!s.samples[i]&&s.scanReady){s.samples[i]=true;s.scanReady=false;log(`SCIENCE SAMPLE ${i+1}/3 COLLECTED`);}});
  if(s.battery<=0){s.failed=true;finish(false,"Rover power depleted","The rover stopped before collecting all samples. Reset and use shorter driving bursts.");}
  if(s.samples.every(Boolean)){finish(true,"Surface survey complete","All three science samples were collected. Rover operations successful.");}
}
function stepCrew(dt) {
  const s=state, hours=dt*1.8; s.hours+=hours;
  const factor=s.powerSave?.58:1; s.oxygen=Math.max(0,s.oxygen-1.5*hours*factor);s.water=Math.max(0,s.water-1.15*hours*factor);
  const generation=s.solar?(.45*hours):(.08*hours);s.power=Math.max(0,Math.min(100,s.power+generation-.95*hours*factor));
  if(s.oxygen<=0||s.water<=0||s.power<=0){s.failed=true;finish(false,"Life-support emergency","A critical crew resource was exhausted. Enable power save and deploy the solar array earlier.");}
  else if(s.hours>=72){s.hours=72;s.complete=true;finish(true,"72-hour crew operations complete","The crew completed the orbital operations period with life-support reserves remaining.");}
}
function draw() {ctx.clearRect(0,0,W,H);if(mode==="reentry")drawReentry();if(mode==="docking")drawDocking();if(mode==="rover")drawRover();if(mode==="crew")drawCrew();if(window.NOVALUXPhase6Scene?.available&&(mode==="docking"||mode==="rover"))window.NOVALUXPhase6Scene.render(mode,state);}
function stars(){ctx.fillStyle="#d8efff";for(let i=0;i<75;i++){const x=(i*137)%W,y=(i*71)%H;ctx.globalAlpha=.25+(i%4)*.15;ctx.fillRect(x,y,2,2);}ctx.globalAlpha=1;}
function drawReentry(){const s=state;const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,"#030a18");g.addColorStop(.55,"#102b4b");g.addColorStop(1,"#b96e43");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);stars();ctx.fillStyle="rgba(55,151,224,.17)";ctx.fillRect(0,H*.67,W,H*.33);ctx.fillStyle="#152d3e";ctx.beginPath();ctx.ellipse(500,590,690,160,0,Math.PI,Math.PI*2);ctx.fill();
  const y=70+(1-Math.max(0,s.alt)/120000)*360;ctx.save();ctx.translate(500,y);ctx.rotate(s.bank*.16);ctx.fillStyle="#c9d9e5";ctx.beginPath();ctx.moveTo(-45,10);ctx.lineTo(0,-25);ctx.lineTo(45,10);ctx.lineTo(30,25);ctx.lineTo(-30,25);ctx.closePath();ctx.fill();ctx.fillStyle="#f28b46";ctx.beginPath();ctx.moveTo(-25,20);ctx.lineTo(0,70+Math.min(80,s.heat));ctx.lineTo(25,20);ctx.fill();if(s.chute){ctx.strokeStyle="#e8f4ff";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-12,-20);ctx.lineTo(-55,-85);ctx.moveTo(12,-20);ctx.lineTo(55,-85);ctx.stroke();ctx.fillStyle="#eaf4ff";ctx.beginPath();ctx.arc(0,-90,58,Math.PI,0);ctx.fill();}ctx.restore();
  ctx.fillStyle="#e9f6ff";ctx.font="bold 17px sans-serif";ctx.fillText("EARTH RETURN CORRIDOR",24,34);ctx.font="12px monospace";ctx.fillStyle="#a8c9df";ctx.fillText(`ALT ${Math.max(0,s.alt/1000).toFixed(1)} KM   HEAT ${s.heat.toFixed(0)}%   BANK ${s.bank.toFixed(1)}`,24,58);ctx.fillStyle="rgba(255,255,255,.12)";ctx.fillRect(24,76,180,7);ctx.fillStyle=s.heat>75?"#f26b54":"#43d9ef";ctx.fillRect(24,76,180*Math.min(1,s.heat/100),7);}
function drawDocking(){const s=state;ctx.fillStyle="#030b18";ctx.fillRect(0,0,W,H);stars();ctx.strokeStyle="rgba(69,185,225,.16)";for(let x=0;x<W;x+=50){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}for(let y=0;y<H;y+=50){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  const stationX=835,stationY=260,shipX=Math.max(70,stationX-s.x*.48),shipY=stationY+Math.max(-150,Math.min(150,s.y*.35));ctx.save();ctx.translate(stationX,stationY);ctx.fillStyle="#b9c9d6";ctx.fillRect(-65,-12,130,24);ctx.fillStyle="#438dff";ctx.fillRect(-160,-36,90,72);ctx.fillRect(70,-36,90,72);ctx.fillStyle="#dce8f0";ctx.fillRect(-20,-25,40,50);ctx.restore();
  ctx.save();ctx.translate(shipX,shipY);ctx.rotate(Math.atan2(s.vy,s.vx));ctx.fillStyle="#dcebf5";ctx.beginPath();ctx.moveTo(22,0);ctx.lineTo(-14,-12);ctx.lineTo(-8,0);ctx.lineTo(-14,12);ctx.closePath();ctx.fill();ctx.fillStyle="#4ed8f2";ctx.fillRect(-23,-5,8,10);ctx.restore();ctx.strokeStyle="#51d5ee";ctx.setLineDash([6,7]);ctx.beginPath();ctx.moveTo(shipX,shipY);ctx.lineTo(stationX,stationY);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle="#eaf7ff";ctx.font="bold 16px sans-serif";ctx.fillText("ORBITAL RENDEZVOUS",24,34);ctx.font="12px monospace";ctx.fillStyle="#9fc0d6";ctx.fillText(`RANGE ${Math.hypot(s.x,s.y).toFixed(1)} M   RELATIVE SPEED ${Math.hypot(s.vx,s.vy).toFixed(2)} M/S`,24,58);}
function drawRover(){const s=state;const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,"#442d27");g.addColorStop(.58,"#a85d3d");g.addColorStop(1,"#d08a55");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.fillStyle="rgba(40,27,25,.22)";for(let i=0;i<9;i++){ctx.beginPath();ctx.ellipse(i*135-30,360+(i%3)*22,100,60,0,Math.PI,Math.PI*2);ctx.fill();}ctx.fillStyle="#3a2a27";ctx.fillRect(0,390,W,130);ctx.fillStyle="#d9a06e";ctx.fillRect(0,390,W,4);
  const offset=Math.max(0,Math.min(300,s.x*.7));[90,260,445].forEach((x,i)=>{const sx=150+(x-s.x)*.7;ctx.fillStyle=s.samples[i]?"#54e0a6":"#ffe08a";ctx.beginPath();ctx.arc(sx,350,12,0,Math.PI*2);ctx.fill();ctx.fillStyle="#33241e";ctx.fillRect(sx-2,360,4,30);});const rx=150;ctx.fillStyle="#dce7e9";ctx.fillRect(rx-28,332,56,24);ctx.fillStyle="#243744";[-18,18].forEach(dx=>{ctx.beginPath();ctx.arc(rx+dx,360,10,0,Math.PI*2);ctx.fill();});ctx.fillStyle="#eaf7ff";ctx.font="bold 16px sans-serif";ctx.fillText("PLANETARY SURFACE SURVEY",24,34);ctx.font="12px monospace";ctx.fillStyle="#fff0dc";ctx.fillText(`POSITION ${s.x.toFixed(0)}, ${s.z.toFixed(0)} M   SAMPLES ${s.samples.filter(Boolean).length}/3   BATTERY ${s.battery.toFixed(0)}%`,24,58);}
function drawCrew(){const s=state;ctx.fillStyle="#071523";ctx.fillRect(0,0,W,H);stars();ctx.strokeStyle="#2e5d76";ctx.lineWidth=7;ctx.beginPath();ctx.arc(500,260,155,0,Math.PI*2);ctx.stroke();ctx.fillStyle="#122d42";ctx.beginPath();ctx.arc(500,260,145,0,Math.PI*2);ctx.fill();ctx.fillStyle="#9eb6c9";for(let i=0;i<4;i++){const a=i*Math.PI/2+.5,x=500+Math.cos(a)*85,y=260+Math.sin(a)*85;ctx.beginPath();ctx.arc(x,y,17,0,Math.PI*2);ctx.fill();ctx.fillStyle="#e9f6ff";ctx.fillRect(x-12,y+18,24,24);ctx.fillStyle="#9eb6c9";}ctx.fillStyle="#eaf7ff";ctx.font="bold 17px sans-serif";ctx.fillText("HABITAT LIFE-SUPPORT MONITOR",24,34);ctx.font="12px monospace";ctx.fillStyle="#a9c7da";ctx.fillText(`MISSION ELAPSED ${s.hours.toFixed(1)} / 72 HOURS`,24,58);const rows=[["OXYGEN",s.oxygen],["WATER",s.water],["ELECTRICAL POWER",s.power]];rows.forEach((r,i)=>{const y=390+i*35;ctx.fillStyle="#355066";ctx.fillRect(260,y,480,12);ctx.fillStyle=r[1]<25?"#f07869":"#42d5b5";ctx.fillRect(260,y,480*r[1]/100,12);ctx.fillStyle="#d8eaf5";ctx.font="11px sans-serif";ctx.fillText(r[0],150,y+11);});ctx.fillStyle=s.powerSave?"#4be0a0":"#ffbd68";ctx.fillText(s.powerSave?"POWER SAVE: ON":"POWER SAVE: OFF",800,60);ctx.fillStyle=s.solar?"#4be0a0":"#ffbd68";ctx.fillText(s.solar?"SOLAR ARRAY: DEPLOYED":"SOLAR ARRAY: STOWED",800,80);}

function applyControl(control, pressed) { if(pressed)keys.add(control);else keys.delete(control); }
function action(name) {
  if(name==="parachute"&&mode==="reentry"){if(state.alt<=12000&&!state.chute){state.chute=true;log("PARACHUTE DEPLOYED");}else log("PARACHUTE DEPLOYMENT WINDOW: BELOW 12 KM");}
  if(name==="scan"&&mode==="rover"){state.scanReady=true;log("SCIENCE SCAN ACTIVE — MOVE WITHIN 14 M OF A MARKED SITE");}
  if(name==="power"&&mode==="crew"){state.powerSave=!state.powerSave;log(`POWER SAVE ${state.powerSave?"ENABLED":"DISABLED"}`);}
  if(name==="solar"&&mode==="crew"){state.solar=true;log("SOLAR ARRAY DEPLOYED — GENERATION INCREASED");}
  draw();updateTelemetry();
}
ui.start.addEventListener("click",()=>running?pause():start());ui.reset.addEventListener("click",()=>configure(mode));
$("p6-refresh-design")?.addEventListener("click",()=>{refreshDesign();log("ACTIVE SPACECRAFT DESIGN SYNCHRONIZED");});
ui.timeScale.addEventListener("input",()=>updateTimeScale(ui.timeScale.value));
ui.timeScale.addEventListener("change",()=>updateTimeScale(ui.timeScale.value,true));
document.querySelectorAll("[data-p5-tab]").forEach(b=>b.addEventListener("click",()=>configure(b.dataset.p5Tab)));
ui.controls.addEventListener("pointerdown",e=>{const b=e.target.closest("[data-p5-control]");if(b){e.preventDefault();applyControl(b.dataset.p5Control,true);}});
["pointerup","pointerleave","pointercancel"].forEach(type=>ui.controls.addEventListener(type,()=>keys.clear()));
ui.controls.addEventListener("click",e=>{const b=e.target.closest("[data-p5-action]");if(b)action(b.dataset.p5Action);});
window.addEventListener("keydown",e=>{if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","a","d","w","s","A","D","W","S"].includes(e.key)){if(document.getElementById("phase5-view")?.classList.contains("active")){e.preventDefault();const map={ArrowLeft:"left",a:"left",A:"left",ArrowRight:"right",d:"right",D:"right",ArrowUp:"up",w:"up",W:"up",ArrowDown:"down",s:"down",S:"down"};applyControl(map[e.key],true);}}});
window.addEventListener("keyup",e=>{const map={ArrowLeft:"left",a:"left",A:"left",ArrowRight:"right",d:"right",D:"right",ArrowUp:"up",w:"up",W:"up",ArrowDown:"down",s:"down",S:"down"};if(map[e.key])applyControl(map[e.key],false);});
window.addEventListener("blur",()=>keys.clear());
window.addEventListener("novalux-phase6-3d-ready",()=>{document.querySelector(".p5-stage")?.classList.toggle("phase6-3d",mode==="rover"||mode==="docking");draw();});
updateTimeScale(ui.timeScale.value);
renderProgress();
refreshDesign();
configure("reentry");
