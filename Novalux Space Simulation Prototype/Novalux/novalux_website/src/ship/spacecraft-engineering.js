import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.181.0/build/three.module.js';
import { ENGINEERING_PARTS, DEFAULT_ASSEMBLY, createPart, assemblyMetrics, attachmentCompatible, simulateBurn } from './engineering-model.js';

const root=document.getElementById('engineering-bay');
if(root){
 let assembly=[],fuel={},renderer,scene,camera,craft,raf=0,burnTimer=null,selectedId=null,cameraDistance=12,assemblyCenter=new THREE.Vector3(),cameraDirection=new THREE.Vector3(1,.72,1.35).normalize(),assemblyRadius=2;
 const status=(s)=>{const e=document.getElementById('eng-status');if(e)e.textContent=s;};
 const saved=()=>{try{localStorage.setItem('novalux-engineering-save',JSON.stringify({assembly,fuel}));}catch{}};
 function load(){try{const x=JSON.parse(localStorage.getItem('novalux-engineering-save')||'null');if(x&&Array.isArray(x.assembly)){assembly=x.assembly;fuel=x.fuel||{};return true;}}catch{}return false;}
 function add(type){if(!attachmentCompatible(type,assembly)){status(type==='bus'?'Only one primary structure is allowed.':'That attachment point is occupied. Remove the installed component first.');return;}const p=createPart(type);assembly.push(p);if(p.kind==='tank')fuel[p.id]=p.fuel;saved();render();status(`${p.label} attached at ${p.slot}.`);}
 function remove(id){const p=assembly.find(x=>x.id===id);if(!p)return;assembly=assembly.filter(x=>x.id!==id);delete fuel[id];saved();render();status(`${p.label} disassembled.`);}
 function toggle(id){const p=assembly.find(x=>x.id===id);if(!p)return;p.deployed=!p.deployed;saved();render();status(`${p.label} ${p.deployed?'deployed':'stowed'}.`);}
 function fail(id){const p=assembly.find(x=>x.id===id);if(!p||p.kind==='structure')return;p.failed=!p.failed;saved();render();status(`${p.label}: ${p.failed?'FAILURE SIMULATED':'returned to service after repair'}.`);}
 function syncDesigner(){const d=window.NOVALUX?.getDesign?.();if(!d)return;const chosen=[];const map={platform:'bus',propulsion:'engine',instrument:'instrument',communication:'antenna'};for(const [cat,type] of Object.entries(map)){const name=d.selections?.[cat];const item=d.components?.[cat]?.items?.[name];if(item)chosen.push({type,name,item,mass:Number(item.mass)||ENGINEERING_PARTS[type].mass});}const powerName=d.selections?.power;const powerItem=d.components?.power?.items?.[powerName];if(powerItem){const type=powerName==='Radioisotope power'?'rtg':'solar';chosen.push({type,name:powerName,item:powerItem,mass:Number(powerItem.mass)||ENGINEERING_PARTS[type].mass});}if(!chosen.length){status('Choose components in the Spacecraft Designer first.');return;}assembly=[];fuel={};for(const x of chosen){const p=createPart(x.type);p.mass=x.mass;p.designerSelection=x.name;if(p.kind==='engine'){const cap=Number(x.item.capability)||8;p.thrust=cap*525;p.isp=x.name==='Electric propulsion'?3000:x.name==='Cold gas propulsion'?70:x.name==='Advanced propulsion'?1200:310;}if(p.kind==='solar'||p.kind==='power')p.power=Number(x.item.output)||p.power;assembly.push(p);if(p.kind==='tank')fuel[p.id]=p.fuel;}if(!assembly.some(p=>p.kind==='tank')){const p=createPart('tank');assembly.push(p);fuel[p.id]=p.fuel;}saved();render();status('Imported designer configuration, including selected propulsion and power characteristics. Add or rearrange hardware below.');}
 function setup3d(){const host=document.getElementById('eng-viewport');if(!host||renderer)return;scene=new THREE.Scene();scene.background=new THREE.Color(0x071321);scene.fog=new THREE.Fog(0x071321,18,55);camera=new THREE.PerspectiveCamera(42,1,.1,250);camera.position.set(7,5,9);camera.lookAt(0,0,0);renderer=new THREE.WebGLRenderer({antialias:true, powerPreference:'high-performance', alpha:false});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.domElement.style.display='block';renderer.domElement.style.width='100%';renderer.domElement.style.height='100%';renderer.domElement.style.maxWidth='100%';host.appendChild(renderer.domElement);scene.add(new THREE.HemisphereLight(0xa8d5ff,0x182033,2));const key=new THREE.DirectionalLight(0xffffff,2.5);key.position.set(5,8,6);scene.add(key);const grid=new THREE.GridHelper(18,18,0x23516d,0x173044);grid.position.y=-2.8;scene.add(grid);craft=new THREE.Group();scene.add(craft);const controls={drag:false,x:0,y:0,rx:-.35,ry:.6};renderer.domElement.addEventListener('pointerdown',e=>{controls.drag=true;controls.x=e.clientX;controls.y=e.clientY;renderer.domElement.setPointerCapture(e.pointerId);});renderer.domElement.addEventListener('pointerup',()=>controls.drag=false);renderer.domElement.addEventListener('pointermove',e=>{if(!controls.drag)return;controls.ry+=(e.clientX-controls.x)*.008;controls.rx=Math.max(-1.3,Math.min(1.3,controls.rx+(e.clientY-controls.y)*.008));controls.x=e.clientX;controls.y=e.clientY;});renderer.domElement.addEventListener('wheel',e=>{cameraDistance=THREE.MathUtils.clamp(cameraDistance*(e.deltaY>0?1.12:.89),Math.max(3,assemblyRadius*1.15),Math.max(80,assemblyRadius*12));placeCameraOnAssembly();});const resize=()=>{const rect=host.getBoundingClientRect();const w=Math.max(1,Math.floor(rect.width||host.clientWidth||600));const h=Math.max(1,Math.floor(rect.height||host.clientHeight||360));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();fitAssembly();};if('ResizeObserver' in window)new ResizeObserver(resize).observe(host);window.addEventListener('resize',resize);resize();let lastRender=0;const tick=(now=0)=>{if(document.hidden){raf=0;return;}raf=requestAnimationFrame(tick);if(now-lastRender<40)return;lastRender=now;craft.rotation.set(controls.rx,controls.ry,0);placeCameraOnAssembly();renderer.render(scene,camera);};document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!raf)raf=requestAnimationFrame(tick);});tick();}
 function rebuild3d(){
  if(!craft)return;
  // Dispose replaced meshes so repeated assembly edits do not leak GPU resources.
  craft.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){for(const m of (Array.isArray(o.material)?o.material:[o.material]))m.dispose();}});
  craft.clear();
  const materials={
   bus:new THREE.MeshStandardMaterial({color:0xb9c9d8,metalness:.72,roughness:.28}),
   bright:new THREE.MeshStandardMaterial({color:0xe1e9ef,metalness:.78,roughness:.22}),
   blue:new THREE.MeshStandardMaterial({color:0x174f88,metalness:.52,roughness:.34}),
   blueCell:new THREE.MeshStandardMaterial({color:0x287fc0,metalness:.38,roughness:.3}),
   gold:new THREE.MeshStandardMaterial({color:0xc58a32,metalness:.7,roughness:.3}),
   dark:new THREE.MeshStandardMaterial({color:0x26394b,metalness:.68,roughness:.32}),
   glass:new THREE.MeshStandardMaterial({color:0x42b9d4,metalness:.55,roughness:.16}),
   failed:new THREE.MeshStandardMaterial({color:0x9b3030,metalness:.35,roughness:.48})
  };
  const occupied=new Set(assembly.map(p=>p.slot));
  const mounts=[['core',[0,0,0]],['aft',[0,0,-2.15]],['tank',[.9,0,-.35]],['port',[2.05,0,0]],['top',[0,1.05,1.15]],['forward',[0,0,1.72]],['starboard',[-1.45,0,-.25]]];
  // Subtle attachment sockets remain visible without looking like floating beads.
  const socketMat=new THREE.MeshStandardMaterial({color:0x52758c,metalness:.55,roughness:.45});
  for(const [slot,pos] of mounts){const socket=new THREE.Mesh(new THREE.CylinderGeometry(.105,.105,.11,16),socketMat);socket.position.set(...pos);socket.rotation.x=Math.PI/2;socket.material=occupied.has(slot)?materials.blueCell:socketMat;craft.add(socket);}
  const cylinderZ=(radiusTop,radiusBottom,length,segments=32)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(radiusTop,radiusBottom,length,segments),materials.bus);m.rotation.x=Math.PI/2;return m;};
  const addRing=(group,z,r=.66,t=.055,material=materials.bright)=>{const ring=new THREE.Mesh(new THREE.TorusGeometry(r,t,8,36),material);ring.position.z=z;group.add(ring);};
  for(const p of assembly){
   const g=new THREE.Group();g.position.set(...p.position);g.userData.id=p.id;
   const m=p.failed?materials.failed:(p.kind==='solar'?materials.blue:p.kind==='tank'?materials.gold:p.kind==='antenna'?materials.bright:p.kind==='instrument'?materials.glass:p.kind==='engine'?materials.dark:p.kind==='power'?materials.gold:materials.bus);
   const add=(geo,material=m,pos=[0,0,0],rot=[0,0,0])=>{const mesh=new THREE.Mesh(geo,material);mesh.position.set(...pos);mesh.rotation.set(...rot);g.add(mesh);return mesh;};
   if(p.kind==='structure'){
    // Main pressure vessel: long axis follows spacecraft Z, with end collars and access panels.
    add(new THREE.CylinderGeometry(.59,.59,2.55,32),materials.bus,[0,0,0],[Math.PI/2,0,0]);
    addRing(g,1.18,.59,.065);addRing(g,-1.18,.59,.065);
    add(new THREE.CylinderGeometry(.48,.48,.10,32),materials.bright,[0,0,1.28],[Math.PI/2,0,0]);
    add(new THREE.CylinderGeometry(.48,.48,.10,32),materials.dark,[0,0,-1.28],[Math.PI/2,0,0]);
    for(let i=0;i<4;i++){const a=i*Math.PI/2;const panel=add(new THREE.BoxGeometry(.13,.55,.035),materials.dark,[Math.cos(a)*.595,Math.sin(a)*.595,.05],[0,0,a]);}
    // Forward docking collar and aft equipment interface.
    add(new THREE.TorusGeometry(.34,.055,8,28),materials.bright,[0,0,1.36]);
   }else if(p.kind==='engine'){
    const nozzle=add(new THREE.CylinderGeometry(.24,.52,.92,24,1,true),materials.dark,[0,0,-.2],[Math.PI/2,0,0]);
    add(new THREE.CylinderGeometry(.19,.23,.28,24,1,true),materials.bright,[0,0,.32],[Math.PI/2,0,0]);
    add(new THREE.TorusGeometry(.49,.045,8,24),materials.bright,[0,0,-.66]);
    add(new THREE.CylinderGeometry(.17,.17,.18,20),materials.gold,[0,0,.53],[Math.PI/2,0,0]);
   }else if(p.kind==='tank'){
    add(new THREE.CylinderGeometry(.34,.34,1.18,24),materials.gold,[0,0,0],[Math.PI/2,0,0]);
    add(new THREE.SphereGeometry(.34,20,12,0,Math.PI*2,0,Math.PI/2),materials.bright,[0,0,.59]);
    add(new THREE.SphereGeometry(.34,20,12,0,Math.PI*2,0,Math.PI/2),materials.gold,[0,0,-.59],[Math.PI,0,0]);
    for(const z of [-.38,.38])add(new THREE.TorusGeometry(.345,.025,6,24),materials.bright,[0,0,z]);
    // Mounting struts tie the tank to the bus.
    for(const z of [-.38,.38]){const strut=add(new THREE.CylinderGeometry(.035,.035,.43,8),materials.dark,[ -.48,0,z]);strut.rotation.z=Math.PI/2;}
   }else if(p.kind==='solar'){
    const deployed=!!p.deployed;
    const boom=add(new THREE.CylinderGeometry(.045,.045,deployed?2.1:.72,10),materials.bright,[deployed?-.95:-.48,0,0]);boom.rotation.z=Math.PI/2;
    if(deployed){for(const side of [-1,1]){const panel=add(new THREE.BoxGeometry(1.55,.055,.9),materials.blueCell,[side*1.72,0,0]);const cellLines=new THREE.Group();for(let x=-.58;x<=.59;x+=.29){const line=new THREE.Mesh(new THREE.BoxGeometry(.018,.012,.86),materials.bright);line.position.x=x;cellLines.add(line);}for(let z=-.28;z<=.29;z+=.29){const line=new THREE.Mesh(new THREE.BoxGeometry(1.5,.012,.018),materials.bright);line.position.z=z;cellLines.add(line);}cellLines.position.set(side*1.72,.035,0);g.add(cellLines);}}
    else add(new THREE.BoxGeometry(.82,.14,.62),materials.blue,[0,0,0]);
   }else if(p.kind==='antenna'){
    const mast=add(new THREE.CylinderGeometry(.045,.07,.55,12),materials.bright,[0,-.28,0]);
    const dish=add(new THREE.SphereGeometry(.48,28,16,0,Math.PI*2,0,Math.PI/2),materials.bright,[0,0,0],[Math.PI/2,0,0]);
    dish.scale.set(1,1,.28);
    add(new THREE.SphereGeometry(.065,12,8),materials.glass,[0,.03,.04]);
    const feed=add(new THREE.CylinderGeometry(.025,.025,.22,8),materials.gold,[0,.18,.08]);
   }else if(p.kind==='instrument'){
    add(new THREE.CylinderGeometry(.27,.32,.82,24),materials.dark,[0,0,.12],[Math.PI/2,0,0]);
    add(new THREE.TorusGeometry(.29,.045,8,24),materials.bright,[0,0,.56]);
    add(new THREE.CircleGeometry(.235,24),materials.glass,[0,0,.565]);
    for(let x of [-.22,.22])add(new THREE.BoxGeometry(.07,.55,.08),materials.gold,[x,0,-.12]);
   }else if(p.kind==='power'){
    add(new THREE.CylinderGeometry(.28,.28,.72,20),materials.gold,[0,0,0],[Math.PI/2,0,0]);
    add(new THREE.SphereGeometry(.28,16,10),materials.bright,[0,0,.36]);
    add(new THREE.BoxGeometry(.48,.12,.18),materials.dark,[0,.36,0]);
   }else{
    add(new THREE.BoxGeometry(1.05,.12,.72),materials.bright);
    add(new THREE.BoxGeometry(.72,.035,.5),materials.dark,[0,.08,0]);
   }
   // Failed components get a clear visual warning marker.
   if(p.failed){const warning=new THREE.Mesh(new THREE.SphereGeometry(.13,12,8),materials.failed);warning.position.set(.48,.48,.42);g.add(warning);}
   craft.add(g);
  }
  fitAssembly();
 }
 function fitAssembly(){if(!craft||!camera)return;const rotation=craft.rotation.clone();craft.rotation.set(0,0,0);craft.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(craft);if(bounds.isEmpty()){craft.rotation.copy(rotation);return;}const sphere=bounds.getBoundingSphere(new THREE.Sphere());assemblyCenter.copy(sphere.center);assemblyRadius=Math.max(sphere.radius,1.25);craft.rotation.copy(rotation);craft.updateMatrixWorld(true);const vFov=THREE.MathUtils.degToRad(camera.fov);const hFov=2*Math.atan(Math.tan(vFov/2)*Math.max(camera.aspect,.1));const limitingFov=Math.max(.1,Math.min(vFov,hFov));cameraDistance=THREE.MathUtils.clamp((assemblyRadius/Math.sin(limitingFov/2))*1.62,6,90);camera.near=Math.max(.02,cameraDistance/200);camera.far=Math.max(500,cameraDistance*12);camera.updateProjectionMatrix();placeCameraOnAssembly();}
 function placeCameraOnAssembly(){if(!craft||!camera)return;craft.updateMatrixWorld(true);const target=craft.localToWorld(assemblyCenter.clone());camera.position.copy(target).addScaledVector(cameraDirection,cameraDistance);camera.lookAt(target);camera.updateMatrixWorld();}
 function metrics(){const m=assemblyMetrics(assembly,fuel);for(const [id,v] of Object.entries({'eng-mass':`${m.totalMass.toFixed(1)} kg`,'eng-dry':`${m.dryMass.toFixed(1)} kg`,'eng-fuel':`${m.fuelMass.toFixed(1)} kg`,'eng-com':m.centerOfMass.map(x=>x.toFixed(2)).join(', ')+' m','eng-thrust':`${m.thrust.toFixed(0)} N`,'eng-power':`${m.power.toFixed(0)} W`,'eng-count':`${m.partCount} components`})){const e=document.getElementById(id);if(e)e.textContent=v;}const ratio=m.totalMass?m.thrust/m.totalMass:0;const e=document.getElementById('eng-accel');if(e)e.textContent=`${ratio.toFixed(2)} m/s² (ideal, full thrust)`;}
 function render(){const list=document.getElementById('eng-parts');if(list)list.innerHTML=assembly.map(p=>`<article class="eng-part ${p.failed?'failed':''}"><div><b>${p.label}</b><small>${p.mass} kg · ${p.slot} mount ${p.failed?'· FAILED':''}${p.deployed?' · DEPLOYED':''}</small></div><div class="eng-actions">${['solar','antenna'].includes(p.kind)?`<button data-action="toggle" data-id="${p.id}">${p.deployed?'Stow':'Deploy'}</button>`:''}${p.kind!=='structure'?`<button data-action="fail" data-id="${p.id}">${p.failed?'Repair':'Simulate failure'}</button>`:''}<button data-action="remove" data-id="${p.id}">Remove</button></div></article>`).join('')||'<p>No components installed. Add the primary structure to begin.</p>';const tank=assembly.find(p=>p.kind==='tank');const fe=document.getElementById('eng-fuel-level');if(fe)fe.textContent=tank?`${(fuel[tank.id]??tank.fuel).toFixed(1)} / ${tank.fuel} kg`:'No tank installed';metrics();rebuild3d();}
 root.addEventListener('click',e=>{const b=e.target.closest('button[data-action],button[data-part]');if(!b)return;if(b.dataset.part)add(b.dataset.part);else if(b.dataset.action==='remove')remove(b.dataset.id);else if(b.dataset.action==='toggle')toggle(b.dataset.id);else if(b.dataset.action==='fail')fail(b.dataset.id);});
 document.getElementById('eng-sync')?.addEventListener('click',syncDesigner);
 document.getElementById('eng-fit')?.addEventListener('click',()=>{fitAssembly();status('Entire spacecraft fitted in the assembly viewport.');});
 document.getElementById('eng-burn')?.addEventListener('click',()=>{const seconds=Math.max(1,Number(document.getElementById('eng-burn-seconds')?.value)||10);const result=simulateBurn(assembly,fuel,seconds,Number(document.getElementById('eng-throttle')?.value||1));fuel=result.fuelById;saved();render();status(result.fuelUsed>0?`Burn complete: ${result.fuelUsed.toFixed(2)} kg propellant consumed at ${result.thrust.toFixed(0)} N.`:'No burn: check engine, tank, and propellant.');});
 document.getElementById('eng-reset')?.addEventListener('click',()=>{assembly=[];fuel={};for(const t of DEFAULT_ASSEMBLY){const p=createPart(t);assembly.push(p);if(p.kind==='tank')fuel[p.id]=p.fuel;}saved();render();status('Reference spacecraft assembly restored.');});
 if(!load()){for(const t of DEFAULT_ASSEMBLY){const p=createPart(t);assembly.push(p);if(p.kind==='tank')fuel[p.id]=p.fuel;}}setup3d();render();
}
