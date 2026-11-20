/* NOVALUX Expedition Command — integrated educational campaign layer. */
import { readLocalJSON, writeLocalJSON } from './storage.js';
const $ = (id) => document.getElementById(id);
const STORE = 'novalux.expedition.v1';
const defaults = () => ({
  xp: 0, credits: 1200, completed: [], discoveries: [],
  modules: ['command'], station: [], crew: [
    {name:'Ari Chen',role:'Commander',health:100,stress:12},
    {name:'Maya Okafor',role:'Flight Engineer',health:100,stress:18},
    {name:'Luca Moretti',role:'Mission Scientist',health:100,stress:8}
  ], shipParts: ['habitat','engine','solar','science'], destination:'moon', missionStep:0,
  emergency:null, lastReward:0
});
function load(){return {...defaults(),...readLocalJSON(STORE,{})}}
let state=load();
const save=()=>{const ok=writeLocalJSON(STORE,state);if(!ok)notify('Progress is active for this session, but browser storage is unavailable. It may not persist after closing the page.');return ok;};
const fmt=n=>Number(n).toLocaleString(undefined,{maximumFractionDigits:0});
const campaignMilestones=['mission-checkpoint-1','mission-checkpoint-3','mission-checkpoint-7','station-lab','station-dock','discovery-regolith','discovery-weather'];
const destinations={earth:{name:'Earth orbit',distance:0,transfer:0,departure:0,capture:0,landing:0},moon:{name:'Moon',distance:384400,transfer:4.5,departure:3150,capture:850,landing:1900},mars:{name:'Mars',distance:225000000,transfer:259,departure:5700,capture:2100,landing:1250}};
const parts={habitat:{name:'Crew habitat',mass:820,power:2,cost:180},engine:{name:'Transfer propulsion',mass:640,power:1,cost:260},solar:{name:'Solar array',mass:190,power:8,cost:150},science:{name:'Science payload',mass:120,power:2,cost:210},shield:{name:'Thermal protection',mass:260,power:0,cost:180},tank:{name:'Extended propellant tank',mass:410,power:0,cost:220},lander:{name:'Planetary lander',mass:560,power:1,cost:300},rover:{name:'Surface rover',mass:310,power:2,cost:240}};
const stationParts={lab:{name:'Research laboratory',cost:280,desc:'Adds experiment capacity.'},dock:{name:'Docking port',cost:180,desc:'Enables visiting vehicles.'},hab:{name:'Crew quarters',cost:240,desc:'Adds long-duration crew capacity.'},solar:{name:'Power truss',cost:220,desc:'Improves station power margin.'},greenhouse:{name:'Life-support greenhouse',cost:260,desc:'Supports closed-loop life-support research.'}};
const experiments=[{id:'regolith',name:'Regolith composition',body:'Moon',desc:'Analyse a simulated lunar soil sample.',reward:160},{id:'weather',name:'Atmospheric spectrometry',body:'Mars',desc:'Compare atmospheric absorption bands.',reward:210},{id:'micro',name:'Microgravity materials',body:'Station',desc:'Observe crystal growth in microgravity.',reward:140},{id:'bio',name:'Closed-loop plant growth',body:'Station',desc:'Evaluate water and nutrient recycling.',reward:180}];
function notify(msg){const el=$('ex-status');if(el)el.textContent=msg;}
function reward(id,amount){if(state.completed.includes(id))return false;state.completed.push(id);state.xp+=amount;state.credits+=Math.round(amount*.55);state.lastReward=amount;save();return true;}
function render(){
 const design=window.NOVALUX?.getDesign?.();
 $('ex-design-link').textContent=design?`Linked to designer: ${design.platform||design.platformName||'Active spacecraft'} · refreshes from current design`:'No live designer data detected — configure modules below';
 $('ex-xp').textContent=fmt(state.xp)+' XP';$('ex-credits').textContent=fmt(state.credits)+' CR';$('ex-rank').textContent=state.xp>=1800?'EXPLORER II':state.xp>=700?'EXPLORER I':'CADET';
 const milestoneCount=campaignMilestones.filter(id=>state.completed.includes(id)).length;$('ex-progress').style.width=(milestoneCount/7*100)+'%';$('ex-progress-label').textContent=`${milestoneCount} / 7 campaign milestones`;
 $('ex-parts').innerHTML=Object.entries(parts).map(([id,p])=>`<label class="ex-part"><input type="checkbox" data-part="${id}" ${state.shipParts.includes(id)?'checked':''}><span><b>${p.name}</b><small>${p.mass} kg · ${p.power} kW · ${p.cost} CR</small></span></label>`).join('');
 const total=state.shipParts.reduce((a,id)=>a+parts[id].mass,0),power=state.shipParts.reduce((a,id)=>a+parts[id].power,0);$('ex-ship-mass').textContent=fmt(total)+' kg';$('ex-ship-power').textContent=power+' kW';$('ex-ship-cost').textContent=fmt(state.shipParts.reduce((a,id)=>a+parts[id].cost,0))+' CR';
 const d=destinations[state.destination];$('ex-destination').value=state.destination;$('ex-transfer-days').textContent=d.transfer?d.transfer+' days':'—';$('ex-dv').textContent=fmt(d.departure+d.capture+d.landing)+' m/s';$('ex-distance').textContent=d.distance?fmt(d.distance)+' km':'Local orbit';
 const steps=['Mission concept & objectives','Spacecraft integration','Launch & parking orbit','Transfer injection','Cruise & navigation','Orbit capture','Landing / surface operations'];$('ex-mission-steps').innerHTML=steps.map((s,i)=>`<div class="ex-step ${i<state.missionStep?'done':i===state.missionStep?'current':''}"><i>${i<state.missionStep?'✓':i+1}</i>${s}</div>`).join('');
 $('ex-station-modules').innerHTML=Object.entries(stationParts).map(([id,p])=>`<div class="ex-module"><div><b>${p.name}</b><small>${p.desc}</small></div><button data-station="${id}" ${state.station.includes(id)?'disabled':''}>${state.station.includes(id)?'INSTALLED':p.cost+' CR'}</button></div>`).join('');
 $('ex-crew').innerHTML=state.crew.map((c,i)=>`<div class="ex-crew-card"><b>${c.name}</b><span>${c.role}</span><small>Health ${c.health}% · Stress ${c.stress}%</small><div class="ex-meter"><i style="width:${c.health}%"></i></div></div>`).join('');
 $('ex-emergency').textContent=state.emergency?`EMERGENCY: ${state.emergency}`:'No active emergency. Crew telemetry nominal.';$('ex-emergency').classList.toggle('alert',!!state.emergency);
 $('ex-experiments').innerHTML=experiments.map(e=>`<div class="ex-experiment"><div><b>${e.name}</b><small>${e.body} · ${e.desc}</small></div><button data-experiment="${e.id}" ${state.discoveries.includes(e.id)?'disabled':''}>${state.discoveries.includes(e.id)?'DISCOVERED': 'RUN'}</button></div>`).join('');
 $('ex-log').innerHTML=state.completed.length?state.completed.map(x=>`<li>${x.replaceAll('-',' ')} · completed</li>`).join(''):'<li>Campaign initialized. Complete mission activities to earn rewards.</li>';
}
function advance(){if(state.missionStep>=7){notify('Mission sequence already complete. Open flight operations for the detailed transfer and landing simulation.');return;}state.missionStep++;const xp=100+state.missionStep*35;state.xp+=xp;state.credits+=Math.round(xp*.5);const milestone=`mission-checkpoint-${state.missionStep}`;if(campaignMilestones.includes(milestone)&&!state.completed.includes(milestone))state.completed.push(milestone);if(state.missionStep===7)reward('first-expedition',350);save();render();notify(`Mission checkpoint recorded. +${xp} XP awarded. Use Flight Operations for modeled burns, cruise, capture and landing.`)}
function bind(){
 $('ex-parts').addEventListener('change',e=>{const id=e.target.dataset.part;if(!id)return;const p=parts[id];if(e.target.checked){if(state.credits<p.cost){e.target.checked=false;notify('Insufficient campaign credits.');return;}state.credits-=p.cost;state.shipParts.push(id)}else{state.shipParts=state.shipParts.filter(x=>x!==id);state.credits+=Math.round(p.cost*.5)}save();render()});
 $('ex-destination').addEventListener('change',e=>{state.destination=e.target.value;state.missionStep=0;save();render()});
 $('ex-next-step').addEventListener('click',advance);
 $('ex-configure-mission').addEventListener('click',()=>{document.querySelector(`.mission-link[data-mission="${state.destination}"]`)?.click();document.querySelector('.nav-item[data-view="designer"]')?.click();notify(`Designer opened for ${destinations[state.destination].name}. Configure and launch your vehicle to unlock detailed flight operations.`)});
 $('ex-open-flight').addEventListener('click',()=>{document.querySelector('.nav-item[data-view="simulation"]')?.click();notify('Mission Simulation opened. Complete verified launch and orbital insertion to unlock transfer, capture, and landing operations.')});
 $('ex-station-modules').addEventListener('click',e=>{const id=e.target.dataset.station;if(!id||state.station.includes(id))return;const p=stationParts[id];if(state.credits<p.cost){notify('Not enough credits to construct this station module.');return;}state.credits-=p.cost;state.station.push(id);state.xp+=65;if(id==='lab'||id==='dock')state.completed.push(`station-${id}`);save();render();notify(`${p.name} installed. +65 XP.`)});
 $('ex-trigger-emergency').addEventListener('click',()=>{if(state.emergency){notify('Resolve the current emergency first.');return;}const events=['Cabin pressure leak','Electrical bus overload','Cooling-loop pump failure','Crew medical alert'];state.emergency=events[Math.floor(Math.random()*events.length)];state.crew.forEach(c=>c.stress=Math.min(100,c.stress+12));save();render();notify('Emergency declared. Select a response.')});
 $('ex-resolve-emergency').addEventListener('click',()=>{if(!state.emergency){notify('No active emergency to resolve.');return;}state.emergency=null;state.crew.forEach(c=>{c.health=Math.min(100,c.health+2);c.stress=Math.max(0,c.stress-18)});state.xp+=90;state.credits+=45;save();render();notify('Emergency response completed. Crew stabilized. +90 XP, +45 CR.')});
 $('ex-experiments').addEventListener('click',e=>{const id=e.target.dataset.experiment;if(!id||state.discoveries.includes(id))return;const exp=experiments.find(x=>x.id===id);state.discoveries.push(id);state.xp+=exp.reward;state.credits+=Math.round(exp.reward*.6);if(id==='regolith'||id==='weather')state.completed.push(`discovery-${id}`);save();render();notify(`Discovery recorded: ${exp.name}. +${exp.reward} XP.`)});
 $('ex-reset-campaign').addEventListener('click',()=>{if(!confirm('Reset all NOVALUX expedition campaign progress? This cannot be undone.'))return;state=defaults();save();render();notify('Campaign progress reset.')});
}
if($('expedition-view')){bind();render();document.addEventListener('novalux:designchange',render);document.addEventListener('novalux:viewchange',()=>{if($('expedition-view').classList.contains('active'))render()});}
