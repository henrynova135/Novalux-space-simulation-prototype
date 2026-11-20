import { readLocalJSON, writeLocalJSON } from './storage.js';
/* NOVALUX integrated Space Mission Design Challenge — educational game layer. */
const $ = (id) => document.getElementById(id);
const STORE = 'novalux-challenge-v1';
const roles = ['Mission Director', 'Spacecraft Engineer', 'Science Lead', 'Flight & Communications'];
const lessons = {
  mass: '<b>Mass & launch capacity</b><p>Every instrument and subsystem adds mass. The launch vehicle must carry the complete wet spacecraft into the selected trajectory with margin. A heavier launcher costs more, while removing payload can reduce scientific return.</p>',
  power: '<b>Power balance</b><p>Solar generation and battery capacity must cover the spacecraft bus and instruments. High-power instruments can exceed available generation, especially during eclipse or long operations.</p>',
  data: '<b>Data & communications</b><p>Instruments generate data. Antenna capability, ground-contact time and relay availability determine how much data can be returned. A science-rich mission can still fail to deliver its results.</p>',
  orbit: '<b>Orbit selection</b><p>Orbit affects coverage, lighting, communications geometry, transfer energy and mission operations. Choose an orbit that supports the science objective rather than selecting solely by altitude or prestige.</p>',
  lifetime: '<b>Mission lifetime & reliability</b><p>Longer missions increase opportunities for science but also increase operations cost and exposure to component wear and failures. Redundancy and conservative resource margins improve resilience.</p>',
  trade: '<b>Engineering trade-offs</b><p>There is rarely one perfect design. More capable instruments increase science value but also increase mass, power, cost and data volume. A balanced design is usually more robust than maximizing one metric.</p>'
};
const instrument = {
  camera: {name:'Multispectral camera',mass:85,power:110,data:18,cost:42,science:22},
  spectrometer: {name:'Imaging spectrometer',mass:145,power:180,data:42,cost:78,science:32},
  radar: {name:'Synthetic aperture radar',mass:260,power:520,data:65,cost:115,science:35},
  magnetometer: {name:'Magnetometer',mass:35,power:45,data:5,cost:24,science:13},
  drill: {name:'Sampling drill / payload',mass:190,power:260,data:12,cost:92,science:30}
};
const launchers = {light:{capacity:1500,cost:95},medium:{capacity:6000,cost:180},heavy:{capacity:18000,cost:360}};
const buses = {compact:{mass:420,power:280,cost:110},standard:{mass:780,power:620,cost:190},heavy:{mass:1450,power:1150,cost:310}};
const orbitCost = {leo:35,geo:80,polar:55,lunar:135,mars:260};
const destination = {earth:{name:'Earth observation',orbit:'polar',days:730},moon:{name:'Lunar science',orbit:'lunar',days:365},mars:{name:'Mars exploration',orbit:'mars',days:1095},deep:{name:'Deep-space astronomy',orbit:'mars',days:1825}};
const difficulty = {beginner:{budget:1200,margin:1.25,event:0.75},standard:{budget:1000,margin:1.10,event:1},expert:{budget:760,margin:1.02,event:1.35}};
let state = {event:null, signoffs:{}, lastResult:null, designer:null};
const money = n => `${Math.round(n)} MCr`;
const num = n => Number.isFinite(n) ? n : 0;
function readConfig(){
 const selected=[...document.querySelectorAll('#ch-instruments input:checked')].map(x=>x.value);
 return {
  name:$('ch-name').value.trim()||'Unnamed mission', objective:$('ch-objective').value, difficulty:$('ch-difficulty').value,
  lifetime:Math.max(.5,Math.min(20,Number($('ch-lifetime').value)||1)), teamSize:Number($('ch-team-size').value),
  team:[...document.querySelectorAll('.ch-member')].slice(0,Number($('ch-team-size').value)).map((el,i)=>({name:el.querySelector('input').value.trim()||`Participant ${i+1}`,role:el.querySelector('select').value})),
  launch:$('ch-launch').value, orbit:$('ch-orbit').value, bus:$('ch-bus').value, propulsion:$('ch-propulsion').value,
  instruments:selected, comms:$('ch-comms').value, contact:Number($('ch-contact').value)
 };
}
function calculate(c=readConfig()){
 const d=difficulty[c.difficulty], b=buses[c.bus], l=launchers[c.launch];
 const payload=c.instruments.reduce((a,k)=>{const x=instrument[k]; if(x){a.mass+=x.mass;a.power+=x.power;a.data+=x.data;a.cost+=x.cost;a.science+=x.science;} return a;},{mass:0,power:0,data:0,cost:0,science:0});
 const busPower=state.designer?state.designer.generation:b.power*(c.propulsion==='electric'?1.08:1);
 const powerNeed=state.designer?state.designer.demand+115:payload.power+115+(c.propulsion==='electric'?160:c.propulsion==='hybrid'?85:45);
 const mass=(state.designer?state.designer.mass:b.mass+payload.mass+(c.propulsion==='electric'?210:c.propulsion==='hybrid'?145:90))+180;
 const wetMass=mass+Math.round(mass*(c.objective==='mars'?0.62:c.objective==='moon'?0.38:0.18));
 const dataRate=c.comms==='basic'?22:c.comms==='high'?75:145;
 const dailyDownlink=dataRate*c.contact;
 const dailyData=payload.data*0.7+8;
 const budget= (state.designer?state.designer.cost:b.cost+payload.cost)+l.cost+orbitCost[c.orbit]+(c.comms==='basic'?25:c.comms==='high'?75:135)+c.lifetime*22;
 const reliability=Math.max(35,Math.min(99,97-c.lifetime*3.4-(c.difficulty==='expert'?8:c.difficulty==='standard'?3:0)+(c.bus==='heavy'?3:0)));
 const margin=d.margin;
 const checks={mass:wetMass*margin<=l.capacity,power:busPower>=powerNeed*margin,budget:budget<=d.budget,data:dailyDownlink>=dailyData*margin,orbit:(c.objective!=='mars'||['mars','lunar'].includes(c.orbit))&&(c.objective!=='moon'||['lunar','leo'].includes(c.orbit))};
 const total=Object.values(checks).filter(Boolean).length;
 return {...payload,busPower,powerNeed,mass,wetMass,capacity:l.capacity,launcherCost:l.cost,dailyDownlink,dailyData,budget,reliability,checks,margin,scoreScience:payload.science};
}
function renderTeam(){
 const n=Number($('ch-team-size').value); const host=$('ch-team');
 host.innerHTML=Array.from({length:n},(_,i)=>`<div class="ch-member"><input aria-label="Participant ${i+1} name" maxlength="32" value="${i===0?'Alex':`Participant ${i+1}`}"/><select aria-label="Participant ${i+1} role">${roles.map((r,j)=>`<option ${j===i?'selected':''}>${r}</option>`).join('')}</select></div>`).join('');
 renderSignoffs();
}
function renderSignoffs(){
 const n=Number($('ch-team-size').value), c=readConfig();
 const host=$('ch-signoffs');
 host.innerHTML=c.team.slice(0,n).map((m,i)=>`<label class="ch-signoff"><input type="checkbox" data-signoff="${i}" ${state.signoffs[i]?'checked':''}> <span><b>${escapeHtml(m.name)}</b><small>${escapeHtml(m.role)} · design review approval</small></span></label>`).join('');
 host.querySelectorAll('[data-signoff]').forEach(x=>x.addEventListener('change',()=>{state.signoffs[x.dataset.signoff]=x.checked;}));
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function render(){
 const c=readConfig(),r=calculate(c); $('ch-contact-value').textContent=`${c.contact} hours/day`;
 $('ch-resource-metrics').innerHTML=[['Wet mass',`${r.wetMass.toLocaleString()} / ${r.capacity.toLocaleString()} kg`,r.checks.mass],['Power',`${r.busPower} / ${r.powerNeed} W`,r.checks.power],['Budget',`${money(r.budget)} / ${money(difficulty[c.difficulty].budget)}`,r.checks.budget],['Science data',`${r.dailyData.toFixed(1)} / ${r.dailyDownlink.toFixed(1)} GB/day`,r.checks.data],['Reliability estimate',`${r.reliability}%`,r.reliability>=75],['Science value',`${r.science} points`,true]].map(([a,b,ok])=>`<div class="ch-metric"><span>${a}</span><b>${b}</b><i class="${ok?'ok':'bad'}">${ok?'WITHIN LIMIT':'OVER LIMIT'}</i></div>`).join('');
 $('ch-compatibility').innerHTML=`<b>${Object.values(r.checks).filter(Boolean).length}/5 core constraints satisfied</b><p>${Object.entries(r.checks).filter(([,v])=>!v).map(([k])=>({mass:'Payload exceeds launcher margin.',power:'Power demand exceeds available generation.',budget:'Estimated development/operations cost exceeds budget.',data:'Science data generation exceeds downlink capacity.',orbit:'Selected trajectory is poorly matched to the objective.'}[k])).join(' ')||'The current architecture passes the modeled core resource checks.'}</p>`;
 $('ch-data-status').innerHTML=`Daily data generation: <b>${r.dailyData.toFixed(1)} GB</b> · modeled downlink: <b>${r.dailyDownlink.toFixed(1)} GB</b> · ${r.checks.data?'data return capacity is sufficient':'data backlog will accumulate'}.`;
 renderSignoffs();
}
function save(){const c=readConfig();const saved=readLocalJSON(STORE,{});saved.designs=saved.designs||[];const r=calculate(c);const item={...c,metrics:r,savedAt:new Date().toISOString()};const idx=saved.designs.findIndex(x=>x.name===c.name);if(idx>=0)saved.designs[idx]=item;else saved.designs.push(item);saved.designs=saved.designs.slice(-20);if(!writeLocalJSON(STORE,saved)){$('ch-result').textContent='Browser storage is unavailable or full. This design could not be saved; export it as a JSON file instead.';return;}showLibrary();$('ch-result').textContent=`Saved “${c.name}” to this browser's mission design library.`;}
function showLibrary(){const db=readLocalJSON(STORE,{});const list=db.designs||[];$('ch-library').innerHTML=list.length?list.map((x,i)=>`<div class="ch-library-row"><span><b>${escapeHtml(x.name)}</b><small>${escapeHtml(x.objective)} · ${new Date(x.savedAt).toLocaleDateString()}</small></span><button data-load="${i}" class="save-button">LOAD</button></div>`).join(''):'No saved designs yet.';$('ch-library').querySelectorAll('[data-load]').forEach(b=>b.addEventListener('click',()=>loadDesign(list[Number(b.dataset.load)])));}
function loadDesign(c){if(!c)return;for(const id of ['name','objective','difficulty','lifetime','team-size','launch','orbit','bus','propulsion','comms','contact']){const el=$(`ch-${id}`);if(el&&c[id.replace(/-([a-z])/g,(_,x)=>x.toUpperCase())]!==undefined)el.value=c[id.replace(/-([a-z])/g,(_,x)=>x.toUpperCase())];}document.querySelectorAll('#ch-instruments input').forEach(x=>x.checked=c.instruments.includes(x.value));renderTeam();(c.team||[]).forEach((m,i)=>{const el=document.querySelectorAll('.ch-member')[i];if(el){el.querySelector('input').value=m.name;el.querySelector('select').value=m.role;}});state.signoffs={};render();}
function exportDesign(){const c=readConfig();const blob=new Blob([JSON.stringify({format:'NOVALUX-MISSION-DESIGN',version:1,design:c,metrics:calculate(c)},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`${c.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}-novalux.json`;a.click();URL.revokeObjectURL(url);}
function simulate(){const c=readConfig(),r=calculate(c),approved=Object.values(state.signoffs).filter(Boolean).length>=c.teamSize; if(!approved){$('ch-result').innerHTML='<b>Design review incomplete.</b><p>Every assigned team member must approve the shared design before mission execution.</p>';return;}const pass=Object.values(r.checks).filter(Boolean).length;const eventPenalty=state.event?.penalty||0;const score=Math.max(0,Math.min(100,Math.round(pass*12+Math.min(25,r.science*.25)+r.reliability*.15+(r.checks.mass&&r.checks.power?3:0)-eventPenalty)));const success=pass>=4&&r.reliability>=60;const result={name:c.name,score,success,pass,science:r.science,objective:c.objective,date:new Date().toISOString(),team:c.team.map(x=>x.name)};state.lastResult=result;$('ch-result').innerHTML=`<h4>${success?'MISSION DESIGN: VIABLE':'MISSION DESIGN: NEEDS REVISION'}</h4><div class="ch-score">${score}<small>/ 100</small></div><p>${pass}/5 constraints passed · reliability estimate ${r.reliability}% · science value ${r.science} points.</p><p>${success?'The educational model predicts a viable architecture. Review margins and operational risks before treating it as a final design.':'The architecture has significant constraint or reliability risks. Revise the design and simulate again.'}</p>`;const db=readLocalJSON(STORE,{});db.results=db.results||[];db.results.push(result);db.results=db.results.slice(-30);db.leaderboard=db.leaderboard||[];db.leaderboard.push(result);db.leaderboard.sort((a,b)=>b.score-a.score);db.leaderboard=db.leaderboard.slice(0,20);if(!writeLocalJSON(STORE,db))$('ch-result').insertAdjacentHTML('beforeend','<p>Result calculated, but browser storage is unavailable. Export or record this result before closing the page.</p>');showLibrary();}
const events=[{title:'Solar array degradation',text:'A dust or radiation event reduces modeled solar output by 18%. Consider reducing instrument duty cycle or choosing a power-saving response.',choices:[['Reduce instrument duty cycle',0],['Continue full operations',12]]},{title:'Unexpected data surge',text:'A target observation produces 30% more data than planned. Reprioritize observations or increase ground contacts.',choices:[['Prioritize high-value data',0],['Attempt to downlink everything',8]]},{title:'Propulsion performance margin',text:'A propulsion subsystem underperforms in the educational scenario. Re-plan the maneuver or accept a lower reserve.',choices:[['Re-plan and preserve reserve',0],['Proceed with reduced reserve',10]]},{title:'Extended mission operations',text:'A mission extension is proposed. It increases science opportunity but adds operations cost and reliability exposure.',choices:[['Decline extension',0],['Accept extension',14]]}];
function generateEvent(){const e=events[Math.floor(Math.random()*events.length)];state.event={...e,penalty:0};$('ch-event-panel').innerHTML=`<b>${e.title}</b><p>${e.text}</p>${e.choices.map((x,i)=>`<button class="save-button" data-choice="${i}">${x[0]}</button>`).join('')}<p id="ch-event-outcome"></p>`;$('ch-event-panel').querySelectorAll('[data-choice]').forEach(b=>b.addEventListener('click',()=>{state.event.penalty=e.choices[Number(b.dataset.choice)][1];$('ch-event-outcome').textContent=state.event.penalty?'Response accepted, but mission score risk increased.':'Response mitigates the modeled event.';$('ch-event-panel').querySelectorAll('button').forEach(x=>x.disabled=true);}));}
function importDesigner(){
 const d=window.NOVALUX?.getDesign?.(); if(!d?.selections||!d?.components){$('ch-result').textContent='The existing spacecraft designer is not available yet. Open Spacecraft Designer, make selections, then return here.';return;}
 let mass=0,demand=0,generation=0,cost=0;const used=[];
 for(const [category,name] of Object.entries(d.selections)){const item=d.components?.[category]?.items?.[name];if(!item)continue;mass+=Number(item.mass)||0;demand+=Number(item.powerDemand)||0;demand+=Number(item.power)||0;generation+=Number(item.output)||0;cost+=Number(item.cost)||0;used.push(`${category}: ${name}`);}
 if(!used.length){$('ch-result').textContent='No spacecraft components are selected in the designer.';return;}
 state.designer={mass,demand,generation,cost,used};
 const propulsion=d.selections.propulsion||'';if(/electric/i.test(propulsion))$('ch-propulsion').value='electric';else if(/chemical/i.test(propulsion))$('ch-propulsion').value='chemical';else $('ch-propulsion').value='hybrid';
 const platform=d.selections.platform||'';$('ch-bus').value=/cube/i.test(platform)?'compact':/explorer/i.test(platform)?'heavy':'standard';
 const comm=d.selections.communication||'';$('ch-comms').value=/deep/i.test(comm)?'relay':/high-gain/i.test(comm)?'high':'basic';
 $('ch-result').innerHTML=`<b>Designer configuration imported.</b><p>${used.map(escapeHtml).join(' · ')}</p><p>Imported component mass ${mass.toFixed(1)} kg, power generation ${generation.toFixed(1)} W, modeled power demand ${demand.toFixed(1)} W and component cost ${cost.toFixed(1)} MCr. These values now feed the challenge resource model.</p>`;
 state.signoffs={};render();
}
function init(){if(!$('challenge-view'))return;renderTeam();render();showLibrary();$('ch-lesson-content').innerHTML=lessons.mass;
 const ids=['name','objective','difficulty','lifetime','launch','orbit','bus','propulsion','comms','contact'];ids.forEach(id=>$(`ch-${id}`).addEventListener('input',()=>{state.signoffs={};render();}));$('ch-instruments').addEventListener('change',()=>{state.signoffs={};render();});$('ch-team-size').addEventListener('change',()=>{state.signoffs={};renderTeam();render();});$('ch-team').addEventListener('change',()=>{state.signoffs={};renderSignoffs();});$('ch-lesson').addEventListener('change',e=>$('ch-lesson-content').innerHTML=lessons[e.target.value]);$('ch-import-designer').addEventListener('click',importDesigner);$('ch-open-designer').addEventListener('click',()=>document.querySelector('[data-view=\"designer\"]')?.click());$('ch-open-flight').addEventListener('click',()=>document.querySelector('[data-view=\"simulation\"]')?.click());$('ch-run').addEventListener('click',simulate);$('ch-save').addEventListener('click',save);$('ch-export').addEventListener('click',exportDesign);$('ch-event').addEventListener('click',generateEvent);$('ch-compare').addEventListener('click',()=>{const db=readLocalJSON(STORE,{});const list=db.designs||[];$('ch-library').innerHTML=list.length?`<h4>Saved design comparison</h4><div class="ch-compare-grid">${list.map(x=>`<div><b>${escapeHtml(x.name)}</b><p>Score: ${x.metrics?.science||0} science pts</p><p>Wet mass: ${x.metrics?.wetMass||'—'} kg</p><p>Budget: ${money(x.metrics?.budget||0)}</p><p>Power: ${x.metrics?.busPower||0}/${x.metrics?.powerNeed||0} W</p></div>`).join('')}</div>`:'Save at least one design to compare.';});$('ch-leaderboard').addEventListener('click',()=>{const db=readLocalJSON(STORE,{});$('ch-leaderboard-panel').innerHTML='<h4>Local mission leaderboard</h4>'+((db.leaderboard||[]).map((x,i)=>`<div class="ch-library-row"><span><b>#${i+1} ${escapeHtml(x.name)}</b><small>${x.success?'Viable':'Needs revision'} · ${new Date(x.date).toLocaleDateString()}</small></span><strong>${x.score}/100</strong></div>`).join('')||'No completed simulations yet.');});$('ch-import-file').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{const data=JSON.parse(await file.text());if(data.format!=='NOVALUX-MISSION-DESIGN'||!data.design)throw Error('Not a NOVALUX mission design file');loadDesign(data.design);$('ch-result').textContent='Imported mission design. Review all values before running it.';}catch(err){$('ch-result').textContent=`Import failed: ${err.message}`;}e.target.value='';});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
