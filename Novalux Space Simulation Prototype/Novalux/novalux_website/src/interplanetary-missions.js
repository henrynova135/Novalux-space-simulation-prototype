"use strict";

import { G0 } from "./ship/ship-data.js";

const AU = 149_597_870_700;
const MU_SUN = 1.32712440018e20;
const BODY = {
  moon: { name: "Moon", radius: 384_400_000, mu: 4.9048695e12, soi: 66_100_000, transferDays: 4.5, injection: 3150, capture: 850, landing: 1900, color: "#c8cbd0", orbit: 384_400_000 },
  mars: { name: "Mars", radius: 1.523679 * AU, mu: 4.282837e13, soi: 577_000_000, transferDays: 259, injection: 3600, capture: 2100, landing: 1250, color: "#d66a4d", orbit: 1.523679 * AU }
};
const $ = id => document.getElementById(id);
const fmt = (n, d=0) => Number(n).toLocaleString(undefined,{maximumFractionDigits:d,minimumFractionDigits:d});

export function transferDeltaV(target) {
  if (target === "moon") return BODY.moon.injection;
  // Earth departure hyperbolic excess velocity from a circular heliocentric Hohmann transfer.
  const r1 = AU, r2 = BODY.mars.orbit, a = (r1+r2)/2;
  const vEarth = Math.sqrt(MU_SUN/r1);
  const vTransfer = Math.sqrt(MU_SUN*(2/r1-1/a));
  const vinf = Math.abs(vTransfer-vEarth);
  const rLEO = 6_371_000 + 400_000;
  return Math.sqrt(vinf*vinf + 2*3.986004418e14/rLEO) - Math.sqrt(3.986004418e14/rLEO);
}

function mount() {
  if ($("novalux-stage4")) return;
  const panel = document.createElement("section");
  panel.id = "novalux-stage4";
  panel.className = "panel orbital-workspace";
  panel.style.cssText = "display:none;margin:24px 0;padding:24px;background:#081522;color:#e8f4ff;border:1px solid #24435b;border-radius:14px";
  panel.innerHTML = `
    <div class="orbital-heading"><div><div class="eyebrow">NOVALUX // PHASE 4</div><h2>Interplanetary Mission Operations</h2><p id="s4-subtitle">Awaiting verified Earth parking orbit</p></div><span id="s4-status" class="orbital-status">LOCKED</span></div>
    <div style="display:grid;grid-template-columns:minmax(0,1.5fr) minmax(260px,1fr);gap:18px;margin-top:18px">
      <div style="min-width:0"><canvas id="s4-canvas" width="1000" height="560" style="width:100%;height:auto;display:block;background:#020813;border-radius:10px;border:1px solid #1c344a"></canvas>
        <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:12px"><button id="s4-inject" class="primary-button">PERFORM INJECTION BURN</button><button id="s4-play" class="orbital-button" disabled>START CRUISE</button><button id="s4-capture" class="orbital-button" disabled>CAPTURE INTO ORBIT</button><button id="s4-land" class="orbital-button" disabled>BEGIN LANDING</button><button id="s4-reset" class="orbital-button">RESET MISSION</button></div>
      </div>
      <div style="display:grid;gap:12px;align-content:start">
        <div class="orbital-panel"><div class="orbital-panel-title">SPACECRAFT TELEMETRY</div><div class="orbital-metric"><span>SPACECRAFT</span><strong id="s4-ship">—</strong></div><div class="orbital-metric"><span>DRY / CURRENT MASS</span><strong id="s4-mass">—</strong></div><div class="orbital-metric"><span>PROPELLANT REMAINING</span><strong id="s4-fuel">—</strong></div><div class="orbital-metric"><span>AVAILABLE Δv</span><strong id="s4-dv">—</strong></div><div class="orbital-metric"><span>MISSION ELAPSED</span><strong id="s4-time">0.0 days</strong></div><div class="orbital-metric"><span>TRANSFER PROGRESS</span><strong id="s4-progress">0%</strong></div></div>
        <div class="orbital-panel"><div class="orbital-panel-title">MISSION FLIGHT PLAN</div><div id="s4-plan" style="display:grid;gap:9px;font-size:13px;line-height:1.5"></div><label class="orbital-speed-label" style="margin-top:14px">TIME ACCELERATION <strong id="s4-rate-label">1 day/s</strong></label><input id="s4-rate" type="range" min="1" max="30" value="10" step="1" style="width:100%"><p id="s4-guidance" class="orbital-hint">Complete a successful Earth parking-orbit insertion to begin.</p></div>
      </div>
    </div>
    <div id="s4-result" style="margin-top:16px;padding:14px;border:1px solid #24435b;border-radius:8px;font-size:13px">Mission systems standing by.</div>
    <p style="font-size:11px;opacity:.65;margin-top:12px">Physics note: heliocentric Hohmann transfer and patched-conic encounter estimates are simplified educational models. Planet positions are schematic, and launch vehicle ascent remains Stage 3. This is not flight-certified trajectory software.</p>`;
  const host = document.getElementById("simulation-view") || document.querySelector("main") || document.body;
  host.appendChild(panel);
}

class Mission {
  constructor(data) { this.data=data; this.target=data.destination; this.body=BODY[this.target]; this.phase="READY"; this.days=0; this.fuel=data.propellant; this.mass=data.mass; this.dry=data.dryMass; this.deltaV=data.deltaV; this.rate=10; this.last=0; this.running=false; this.frame=0; this.inject=transferDeltaV(this.target); this.capture=this.body.capture; this.landing=this.body.landing; this.missionBudget=this.inject+this.capture+this.landing; }
  burn(dv) {
    const available=this.deltaV;
    if (available+1e-6<dv) return false;
    const massAfter=this.mass/Math.exp(dv/(this.data.isp*G0));
    const used=this.mass-massAfter;
    if (used>this.fuel+1e-6 || massAfter<this.dry) return false;
    this.mass=massAfter; this.fuel=Math.max(0,this.fuel-used); this.deltaV=this.data.isp*G0*Math.log(this.mass/this.dry); return true;
  }
  reset(){this.phase="READY";this.days=0;this.fuel=this.data.propellant;this.mass=this.data.mass;this.deltaV=this.data.deltaV;this.running=false;}
}
let mission=null, raf=0, previous=0, canvas=null, ctx=null;

function draw() {
  if(!ctx||!mission)return;
  const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);
  const bg=ctx.createRadialGradient(w*.5,h*.48,5,w*.5,h*.48,w*.72);bg.addColorStop(0,"#10263d");bg.addColorStop(1,"#020813");ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  for(let i=0;i<180;i++){const x=(i*193.7)%w,y=(i*97.3)%h;ctx.globalAlpha=.25+.65*Math.abs(Math.sin(i+mission.days*.2));ctx.fillStyle="#c9e8ff";ctx.fillRect(x,y, i%17===0?2:1,i%17===0?2:1);}ctx.globalAlpha=1;
  const cx=w*.5,cy=h*.53,earthR=48,scale=mission.target==="moon"?1:1;
  ctx.fillStyle="#ffcf7a";ctx.shadowColor="#ffb347";ctx.shadowBlur=30;ctx.beginPath();ctx.arc(cx,cy,17,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  ctx.strokeStyle="rgba(99,177,232,.5)";ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(cx,cy,earthR*2.3,earthR*1.08,-.22,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle="#2876aa";ctx.beginPath();ctx.arc(cx,cy,earthR,0,Math.PI*2);ctx.fill();ctx.fillStyle="#4c9b76";ctx.beginPath();ctx.ellipse(cx-13,cy-8,17,10,-.5,0,Math.PI*2);ctx.ellipse(cx+16,cy+13,14,8,.4,0,Math.PI*2);ctx.fill();
  const orbit=mission.target==="moon"?185:390;ctx.strokeStyle="rgba(255,255,255,.16)";ctx.setLineDash([5,7]);ctx.beginPath();ctx.ellipse(cx,cy,orbit,orbit*.46,-.22,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
  const progress=mission.phase==="READY"?0:mission.phase==="INJECTION"?0.02:mission.phase==="CRUISE"?Math.min(.98,mission.days/mission.body.transferDays):mission.phase==="ARRIVED"?.99:1;
  const theta=-.22+progress*Math.PI*2*.72;const sx=cx+Math.cos(theta)*orbit,sy=cy+Math.sin(theta)*orbit*.46;
  const tx=cx+Math.cos(-.22+Math.PI*1.25)*orbit,ty=cy+Math.sin(-.22+Math.PI*1.25)*orbit*.46;
  ctx.fillStyle=mission.body.color;ctx.shadowColor=mission.body.color;ctx.shadowBlur=22;ctx.beginPath();ctx.arc(tx,ty,mission.target==="moon"?14:25,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  ctx.fillStyle="#f1f7ff";ctx.beginPath();ctx.arc(sx,sy,5,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#7ce7ff";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(sx-9,sy);ctx.lineTo(sx-22,sy+4);ctx.stroke();
  ctx.fillStyle="#dceeff";ctx.font="bold 16px system-ui";ctx.fillText("SUN",cx-14,cy+5);ctx.font="13px system-ui";ctx.fillText("EARTH",cx-26,cy+earthR+22);ctx.fillText(mission.body.name.toUpperCase(),tx-35,ty-25);ctx.fillText("SPACECRAFT",sx+12,sy-12);
  ctx.fillStyle="rgba(215,235,255,.8)";ctx.font="12px system-ui";ctx.fillText(mission.phase==="CRUISE"?`TRANSFER: ${fmt(progress*100,1)}%`:mission.phase,20,28);
}

function update() {
  if(!mission)return;
  $("s4-status").textContent=mission.phase;$("s4-subtitle").textContent=`Earth → ${mission.body.name} · ${mission.data.shipName}`;
  $("s4-ship").textContent=mission.data.shipName;$("s4-mass").textContent=`${fmt(mission.dry,1)} / ${fmt(mission.mass,1)} kg`;
  $("s4-fuel").textContent=`${fmt(mission.fuel,2)} kg`;$("s4-dv").textContent=`${fmt(mission.deltaV,0)} m/s`;
  $("s4-time").textContent=`${fmt(mission.days,1)} days`;
  const progress=mission.phase==="CRUISE"?mission.days/mission.body.transferDays:(["ARRIVED","ORBIT","LANDED","COMPLETE"].includes(mission.phase)?1:0);
  $("s4-progress").textContent=`${fmt(Math.max(0,Math.min(1,progress))*100,1)}%`;
  const rows=[`<span>01 · Earth parking orbit <b style="float:right;color:#83d8a5">VERIFIED</b></span>`,`<span>02 · ${mission.target==="moon"?"Trans-lunar injection":"Interplanetary injection"} <b style="float:right">${mission.phase!=="READY"?"COMPLETE":"PENDING"}</b></span>`,`<span>03 · ${mission.body.name} transfer cruise <b style="float:right">${["ARRIVED","ORBIT","LANDED","COMPLETE"].includes(mission.phase)?"COMPLETE":mission.phase==="CRUISE"?"IN PROGRESS":"PENDING"}</b></span>`,`<span>04 · ${mission.body.name} orbit insertion <b style="float:right">${["ORBIT","LANDED","COMPLETE"].includes(mission.phase)?"COMPLETE":"PENDING"}</b></span>`,`<span>05 · Surface landing <b style="float:right">${["LANDED","COMPLETE"].includes(mission.phase)?"COMPLETE":"PENDING"}</b></span>`];$("s4-plan").innerHTML=rows.join("");
  $("s4-inject").disabled=mission.phase!=="READY";$("s4-play").disabled=mission.phase!=="CRUISE";$("s4-capture").disabled=mission.phase!=="ARRIVED";$("s4-land").disabled=mission.phase!=="ORBIT";
  $("s4-play").textContent=mission.running?"PAUSE CRUISE":"START / RESUME CRUISE";
  $("s4-guidance").textContent=mission.phase==="READY"?`Injection requires ${fmt(mission.inject)} m/s. Full mission budget (injection + capture + landing): ${fmt(mission.missionBudget)} m/s. Available: ${fmt(mission.deltaV)} m/s.`:mission.phase==="CRUISE"?"Cruise simulation is active. The spacecraft advances along the transfer arc; pause or adjust time acceleration.":mission.phase==="ARRIVED"?"Target sphere of influence reached. Perform orbit capture to establish a stable destination orbit.":mission.phase==="ORBIT"?"Orbit established. Begin the modeled powered landing sequence.":mission.phase==="LANDED"?"Surface contact confirmed. Mission objectives are now available.":"Mission complete.";
  draw();
}
function fail(msg){mission.phase="FAILED";mission.running=false;$("s4-result").textContent=`MISSION FAILURE — ${msg}`;update();}
function inject(){if(!mission||mission.phase!=="READY")return;if(mission.deltaV+1e-6<mission.inject){$("s4-result").textContent=`INJECTION NOT STARTED — this spacecraft has ${fmt(mission.deltaV)} m/s available, but ${fmt(mission.inject)} m/s is required. Increase propellant capacity or select a higher-Isp propulsion system, then relaunch. Your mission has not been failed.`;update();return;}if(!mission.burn(mission.inject)){ $("s4-result").textContent="INJECTION NOT STARTED — the spacecraft mass, dry-mass limit or propellant accounting prevents this burn. Your mission remains in Earth orbit.";update();return;}mission.phase="CRUISE";$("s4-result").textContent=`Injection burn complete. ${fmt(mission.inject)} m/s delivered; ${fmt(mission.fuel,2)} kg propellant remains.`;update();}
function tick(ts){if(!mission)return;if(!previous)previous=ts;const dt=Math.min(.1,(ts-previous)/1000);previous=ts;if(mission.running&&mission.phase==="CRUISE"){mission.days+=dt*Number($("s4-rate").value);if(mission.days>=mission.body.transferDays){mission.days=mission.body.transferDays;mission.running=false;mission.phase="ARRIVED";$("s4-result").textContent=`${mission.body.name} encounter! Transfer cruise completed in ${fmt(mission.days,1)} days. Perform orbit capture.`;}}update();raf=requestAnimationFrame(tick);}
function bind(){ $("s4-inject").addEventListener("click",inject);$("s4-play").addEventListener("click",()=>{mission.running=!mission.running;previous=0;update();});$("s4-capture").addEventListener("click",()=>{if(!mission.burn(mission.capture)){fail("Insufficient propellant for destination orbit insertion.");return;}mission.phase="ORBIT";$("s4-result").textContent=`${mission.body.name} orbit insertion successful. Stable destination orbit established.`;update();});$("s4-land").addEventListener("click",()=>{if(!mission.burn(mission.landing)){fail("Insufficient propellant for controlled landing. The spacecraft cannot safely complete descent.");return;}mission.phase="LANDED";$("s4-result").textContent=`SURFACE CONTACT CONFIRMED — ${mission.body.name} landing successful. Mission objectives unlocked.`;update();document.dispatchEvent(new CustomEvent("novalux:missioncomplete",{detail:{destination:mission.target,ship:mission.data.shipName,days:mission.days}}));});$("s4-reset").addEventListener("click",()=>{mission.reset();$("s4-result").textContent="Mission reset. The spacecraft remains in Earth parking orbit; perform injection when ready.";update();});$("s4-rate").addEventListener("input",e=>{$("s4-rate-label").textContent=`${e.target.value} days/s`;});}

mount();canvas=$("s4-canvas");ctx=canvas.getContext("2d");bind();
document.addEventListener("novalux:launchcomplete",e=>{
  const d=e.detail||{};const target=String(d.destination||"earth").toLowerCase();if(!BODY[target]){$("novalux-stage4").style.display="none";return;}
  mission=new Mission({destination:target,shipName:d.shipName||"Custom spacecraft",dryMass:Number(d.dryMass),mass:Number(d.totalMass),propellant:Number(d.propellantMass),isp:Number(d.isp),deltaV:Number(d.deltaV),});
  $("novalux-stage4").style.display="block";$("s4-result").textContent=mission.deltaV+1e-6>=mission.missionBudget?`Earth parking orbit verified. Propulsion check passed: ${fmt(mission.deltaV)} m/s available for a ${fmt(mission.missionBudget)} m/s modeled mission budget.`:`Earth parking orbit verified, but propulsion preflight is SHORT: ${fmt(mission.deltaV)} m/s available versus ${fmt(mission.missionBudget)} m/s modeled mission budget. Upgrade the spacecraft tank/engine before injection.`;update();if(!raf){previous=0;raf=requestAnimationFrame(tick);} document.querySelector('.nav-item[data-view="simulation"]')?.click();$("novalux-stage4").scrollIntoView({behavior:"smooth",block:"start"});
});
document.addEventListener("novalux:launchreset",()=>{mission=null;if(raf)cancelAnimationFrame(raf);raf=0;$("novalux-stage4").style.display="none";});
