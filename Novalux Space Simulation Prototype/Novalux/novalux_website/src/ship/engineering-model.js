/* NOVALUX existing subsystem spacecraft engineering model.
 * Educational/game model only; component values are illustrative, not flight-certified.
 */
export const ENGINEERING_PARTS = Object.freeze({
  bus:{label:'Primary structure',mass:120,position:[0,0,0],slot:'core',kind:'structure'},
  engine:{label:'Chemical engine',mass:42,position:[0,0,-2.2],slot:'aft',kind:'engine',thrust:4200,isp:320},
  tank:{label:'Propellant tank',mass:36,position:[0,0,-1.1],slot:'tank',kind:'tank',fuel:240},
  solar:{label:'Deployable solar array',mass:28,position:[2.1,0,0],slot:'port',kind:'solar',power:180},
  rtg:{label:'Radioisotope power unit',mass:25,position:[-1.4,0,0],slot:'starboard',kind:'power',power:55},
  antenna:{label:'High-gain antenna',mass:12,position:[0,1.1,1.4],slot:'top',kind:'antenna'},
  instrument:{label:'Science instrument',mass:24,position:[0,0,1.7],slot:'forward',kind:'instrument'},
  radiator:{label:'Thermal radiator',mass:18,position:[-1.4,0,-.2],slot:'starboard',kind:'thermal'}
});
export const DEFAULT_ASSEMBLY = ['bus','engine','tank','solar','antenna','instrument'];
export function attachmentCompatible(part, assembly){
  if(!ENGINEERING_PARTS[part]) return false;
  if(part==='bus') return !assembly.some(x=>x.type==='bus');
  const occupied=new Set(assembly.map(x=>x.slot));
  return !occupied.has(ENGINEERING_PARTS[part].slot);
}
export function createPart(type,id){
  const p=ENGINEERING_PARTS[type]; if(!p) throw new Error(`Unknown part: ${type}`);
  return {id:id||`${type}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,type,...p,position:[...p.position],deployed:false,failed:false};
}
export function assemblyMetrics(assembly,fuelById={}){
  const live=assembly.filter(p=>!p.failed || p.kind==='structure');
  const dryMass=assembly.reduce((s,p)=>s+p.mass,0);
  const fuel=assembly.filter(p=>p.kind==='tank').reduce((s,p)=>s+Math.max(0,fuelById[p.id]??p.fuel??0),0);
  const totalMass=dryMass+fuel;
  const weighted=assembly.reduce((v,p)=>{const m=p.mass+(p.kind==='tank'?Math.max(0,fuelById[p.id]??p.fuel??0):0);p.position.forEach((x,i)=>v[i]+=x*m);return v;},[0,0,0]);
  const centerOfMass=totalMass?weighted.map(x=>x/totalMass):[0,0,0];
  const thrust=live.filter(p=>p.kind==='engine').reduce((s,p)=>s+(p.thrust||0),0);
  const power=live.filter(p=>(p.kind==='solar'&&p.deployed)||p.kind==='power').reduce((s,p)=>s+(p.power||0),0);
  return {dryMass,fuelMass:fuel,totalMass,centerOfMass,thrust,power,partCount:assembly.length,operationalParts:live.length};
}
export function simulateBurn(assembly,fuelById,seconds,throttle=1){
  const engines=assembly.filter(p=>p.kind==='engine'&&!p.failed);
  const tanks=assembly.filter(p=>p.kind==='tank'&&!p.failed);
  const fuelAvailable=tanks.reduce((s,p)=>s+Math.max(0,fuelById[p.id]??p.fuel??0),0);
  const thrust=engines.reduce((s,p)=>s+(p.thrust||0),0)*Math.max(0,Math.min(1,throttle));
  const isp=engines.length?engines.reduce((s,p)=>s+(p.isp||320),0)/engines.length:320;
  const requested=thrust*seconds/(isp*9.80665);
  let remaining=Math.min(fuelAvailable,requested);
  const used=remaining;
  const next={...fuelById};
  for(const tank of tanks){const amount=Math.max(0,next[tank.id]??tank.fuel??0);const take=Math.min(amount,remaining);next[tank.id]=amount-take;remaining-=take;}
  return {fuelById:next,fuelUsed:used,thrust:fuelAvailable>0?thrust:0,burnedOut:fuelAvailable<=0||used<requested-1e-9};
}
