import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.181.0/build/three.module.js";

const canvas = document.getElementById("p5-3d-canvas");
if (!canvas) throw new Error("Exploration 3D canvas missing");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
renderer.setSize(1000, 520, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x120d18);
const camera = new THREE.PerspectiveCamera(48, 1000 / 520, 0.1, 5000);
const hemi = new THREE.HemisphereLight(0xb9d8ff, 0x4d3024, 2.1); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe0bd, 3.1); sun.position.set(-90, 140, 80); sun.castShadow = true; scene.add(sun);
const fill = new THREE.PointLight(0x62cfff, 900, 800); fill.position.set(100, 90, -100); scene.add(fill);
const roverGroup = new THREE.Group(); scene.add(roverGroup);
const dockingGroup = new THREE.Group(); scene.add(dockingGroup);
const mat = (color, roughness=.8, metalness=.05) => new THREE.MeshStandardMaterial({color, roughness, metalness});
const rockMat = mat(0x6c554b), groundMat = mat(0x8a604c), darkMat = mat(0x172532,.55,.5), bodyMat = mat(0xd7e0e5,.45,.35), goldMat = mat(0xc79b54,.4,.65), panelMat = new THREE.MeshStandardMaterial({color:0x173d68,roughness:.35,metalness:.45,emissive:0x061a32});
const sphereGeo = new THREE.SphereGeometry(1, 16, 12);
const rover = new THREE.Group(); roverGroup.add(rover);
const chassis = new THREE.Mesh(new THREE.BoxGeometry(5.2,1.2,3.4), bodyMat); chassis.position.y=2.5; chassis.castShadow=true; rover.add(chassis);
const deck = new THREE.Mesh(new THREE.BoxGeometry(3.4,.28,2.8), goldMat); deck.position.set(0,3.22,0); rover.add(deck);
const mast = new THREE.Mesh(new THREE.CylinderGeometry(.13,.18,2.2,12), darkMat); mast.position.set(0,4.2,-.6); rover.add(mast);
const camHead = new THREE.Mesh(new THREE.BoxGeometry(.9,.55,.65), goldMat); camHead.position.set(0,5.25,-.6); rover.add(camHead);
const wheels=[], wheelHubs=[];
for (const x of [-2.25,0,2.25]) for (const z of [-2.0,2.0]) {
  const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.88,.88,.58,24),darkMat); wheel.rotation.z=Math.PI/2; wheel.position.set(x,1.15,z); wheel.castShadow=true; wheel.receiveShadow=true; rover.add(wheel); wheels.push(wheel);
  const hub=new THREE.Mesh(new THREE.CylinderGeometry(.35,.35,.62,20),goldMat); hub.rotation.z=Math.PI/2; hub.position.copy(wheel.position); rover.add(hub); wheelHubs.push(hub);
  const hubCap=new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,.66,16),bodyMat);hubCap.rotation.z=Math.PI/2;hubCap.position.copy(wheel.position);rover.add(hubCap);
}
// Six-wheel rocker-bogie suspension gives the rover a more recognizable planetary chassis.
for(const side of [-1,1]){
  const z=side*1.68;
  const rocker=new THREE.Mesh(new THREE.CylinderGeometry(.13,.13,5.0,10),goldMat);rocker.rotation.z=Math.PI/2;rocker.position.set(0,1.85,z);rocker.castShadow=true;rover.add(rocker);
  const bogie=new THREE.Mesh(new THREE.CylinderGeometry(.10,.10,2.2,10),darkMat);bogie.rotation.z=Math.PI/2;bogie.position.set(side*.0,1.55,z);rover.add(bogie);
  for(const x of [-2.25,2.25]){const strut=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,1.0,8),bodyMat);strut.position.set(x,1.55,z);strut.rotation.z=x<0?-.38:.38;rover.add(strut);}
}
// Instrument mast details and visible front sensor cluster.
const mastBrace=new THREE.Mesh(new THREE.BoxGeometry(.16,1.2,.16),goldMat);mastBrace.position.set(0,3.95,-.6);mastBrace.rotation.z=-.35;rover.add(mastBrace);
const lens=new THREE.Mesh(new THREE.CylinderGeometry(.23,.23,.12,20),mat(0x3c9ac8,.2,.7));lens.rotation.x=Math.PI/2;lens.position.set(0,5.25,-.96);rover.add(lens);
for (const side of [-1,1]) { const panel=new THREE.Mesh(new THREE.BoxGeometry(3.5,.12,1.55),panelMat); panel.position.set(side*4.8,2.7,0); rover.add(panel); }
// Keep terrain generation and rover contact sampling on the same world-space height function.
function terrainHeight(x,z){return Math.sin(x*.025)*2.3+Math.cos(z*.034)*1.8+Math.sin((x-z)*.012)*2.5;}
const terrainGeo = new THREE.PlaneGeometry(900, 520, 100, 60);
const pos=terrainGeo.attributes.position;
for(let i=0;i<pos.count;i++){const x=pos.getX(i),localZ=pos.getY(i);pos.setZ(i,terrainHeight(x,-localZ));}
terrainGeo.computeVertexNormals(); const terrain=new THREE.Mesh(terrainGeo,groundMat); terrain.rotation.x=-Math.PI/2; terrain.position.y=-.2; terrain.receiveShadow=true; roverGroup.add(terrain);
const grid=new THREE.GridHelper(900,90,0xc48d68,0x8c6858); grid.position.y=.04; roverGroup.add(grid);
const rocks=[];
for(let i=0;i<44;i++){const x=((i*83)%820)-410,z=((i*137)%440)-220,r=2+(i%5)*1.4;const rock=new THREE.Mesh(sphereGeo,rockMat);rock.position.set(x,terrainHeight(x,z)+r*.48,z);rock.scale.set(r,r*.7,r*.8);rock.castShadow=true;rock.receiveShadow=true;roverGroup.add(rock);rocks.push({x,z,r,mesh:rock});}
const samplePositions=[[90,-38],[260,58],[445,-48]]; const sampleMeshes=[];
for(let i=0;i<samplePositions.length;i++){const [x,z]=samplePositions[i];const beacon=new THREE.Group();const stem=new THREE.Mesh(new THREE.CylinderGeometry(.18,.22,5,8),goldMat);stem.position.y=2.5;beacon.add(stem);const orb=new THREE.Mesh(new THREE.OctahedronGeometry(2.3),new THREE.MeshStandardMaterial({color:0xffd66e,emissive:0x8b5410,emissiveIntensity:1.3}));orb.position.y=5.7;beacon.add(orb);beacon.position.set(x,terrainHeight(x,z),z);roverGroup.add(beacon);sampleMeshes.push({group:beacon,orb});}
const sky=new THREE.Mesh(new THREE.SphereGeometry(1800,32,20),new THREE.MeshBasicMaterial({color:0x211722,side:THREE.BackSide}));roverGroup.add(sky);

// Docking scene: a low-Earth-orbit station and a vehicle in a local orbital frame.
const starGeo=new THREE.BufferGeometry(), starPts=[]; for(let i=0;i<900;i++)starPts.push((Math.random()-.5)*2600,(Math.random()-.5)*1800,(Math.random()-.5)*2600);starGeo.setAttribute('position',new THREE.Float32BufferAttribute(starPts,3));
const starField=new THREE.Points(starGeo,new THREE.PointsMaterial({color:0xd5eaff,size:2}));dockingGroup.add(starField);
// Live docking view: replace the featureless blue sphere with a recognizable
// rotating Earth, including procedural continents, cloud bands and atmosphere.
function makeEarthMap(){
 const c=document.createElement("canvas");c.width=1024;c.height=512;const g=c.getContext("2d");
 const ocean=g.createLinearGradient(0,0,0,512);ocean.addColorStop(0,"#14517f");ocean.addColorStop(.5,"#1476a0");ocean.addColorStop(1,"#082d58");g.fillStyle=ocean;g.fillRect(0,0,1024,512);
 const landShapes=[
 [[70,100],[110,55],[170,70],[205,115],[185,165],[215,205],[180,260],[145,245],[125,300],[90,260],[78,190],[48,150]],
 [[250,35],[335,28],[390,70],[455,62],[515,105],[570,95],[625,140],[600,190],[540,205],[505,255],[455,235],[415,285],[360,250],[315,205],[270,150]],
 [[455,250],[505,270],[525,330],[500,395],[475,465],[435,425],[440,350],[415,300]],
 [[700,190],[760,155],[820,180],[855,235],[825,290],[780,305],[745,260]],
 [[790,350],[850,340],[900,380],[875,440],[825,455],[785,405]],
 [[585,280],[625,260],[665,285],[650,330],[610,345],[575,315]]
 ];
 landShapes.forEach((poly,i)=>{g.beginPath();poly.forEach(([x,y],j)=>j?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fillStyle=["#397d59","#4c895b","#397653","#4c8054","#5a8b5d","#36704e"][i];g.fill();g.strokeStyle="rgba(16,67,58,.45)";g.lineWidth=5;g.stroke();});
 g.globalAlpha=.12;g.fillStyle="#e4f5ff";for(let i=0;i<170;i++){const x=(i*83)%1024,y=(i*137)%512;g.beginPath();g.ellipse(x,y,20+(i%7)*15,4+(i%4)*3,Math.sin(i)*.3,0,Math.PI*2);g.fill();}g.globalAlpha=1;
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return tex;
}
function makeCloudMap(){
 const c=document.createElement("canvas");c.width=1024;c.height=512;const g=c.getContext("2d");
 for(let i=0;i<320;i++){const x=(i*197)%1024,y=(i*311)%512;g.fillStyle=`rgba(240,250,255,${.035+(i%5)*.018})`;g.beginPath();g.ellipse(x,y,16+(i%8)*13,3+(i%4)*3,Math.sin(i)*.25,0,Math.PI*2);g.fill();}
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return tex;
}
const earth=new THREE.Mesh(new THREE.SphereGeometry(360,96,64),new THREE.MeshStandardMaterial({map:makeEarthMap(),roughness:1,emissive:0x061d39,emissiveIntensity:.18}));earth.position.set(0,-560,-800);dockingGroup.add(earth);
const earthClouds=new THREE.Mesh(new THREE.SphereGeometry(364,80,56),new THREE.MeshStandardMaterial({map:makeCloudMap(),transparent:true,opacity:.52,depthWrite:false,roughness:1}));earthClouds.position.copy(earth.position);dockingGroup.add(earthClouds);
const earthAtmosphere=new THREE.Mesh(new THREE.SphereGeometry(371,80,56),new THREE.MeshBasicMaterial({color:0x48aaff,transparent:true,opacity:.16,side:THREE.BackSide,depthWrite:false}));earthAtmosphere.position.copy(earth.position);dockingGroup.add(earthAtmosphere);
const station=new THREE.Group();dockingGroup.add(station);
const core=new THREE.Mesh(new THREE.CylinderGeometry(8,8,52,20),bodyMat);core.rotation.z=Math.PI/2;station.add(core);
const node=new THREE.Mesh(new THREE.SphereGeometry(13,20,16),goldMat);station.add(node);
for(const side of [-1,1]){const truss=new THREE.Mesh(new THREE.BoxGeometry(5,4,145),bodyMat);truss.position.set(0,0,side*82);station.add(truss);const panel=new THREE.Mesh(new THREE.BoxGeometry(2,92,130),panelMat);panel.position.set(0,0,side*145);station.add(panel);}
const port=new THREE.Mesh(new THREE.CylinderGeometry(5,5,14,16),goldMat);port.rotation.z=Math.PI/2;port.position.x=33;station.add(port);
const craft=new THREE.Group();dockingGroup.add(craft);const hull=new THREE.Mesh(new THREE.ConeGeometry(8,38,8),bodyMat);hull.rotation.z=-Math.PI/2;craft.add(hull);const module=new THREE.Mesh(new THREE.CylinderGeometry(6,6,18,12),goldMat);module.rotation.z=Math.PI/2;module.position.x=-17;craft.add(module);for(const side of [-1,1]){const panel=new THREE.Mesh(new THREE.BoxGeometry(2,34,62),panelMat);panel.position.set(-14,0,side*42);craft.add(panel);}
const approachLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0),new THREE.Vector3(0,0,0)]),new THREE.LineDashedMaterial({color:0x4bdcf5,dashSize:8,gapSize:6}));dockingGroup.add(approachLine);

let currentMode="reentry", lastState=null;
const roverCamera={yaw:0,pitch:.42,distance:64,mode:"follow",dragging:false,lastX:0,lastY:0};
// Independent docking orbit camera, initialized to the original fixed view.
const dockingCamera={yaw:0,pitch:Math.atan2(245,610),distance:Math.hypot(245,610),dragging:false,lastX:0,lastY:0};
canvas.style.touchAction="none";
const explorationPointers=new Map();let explorationPinchDistance=0;
canvas.addEventListener("pointerdown",e=>{explorationPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(explorationPointers.size===2){const pts=[...explorationPointers.values()];explorationPinchDistance=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);roverCamera.dragging=false;dockingCamera.dragging=false;}});
canvas.addEventListener("pointermove",e=>{if(!explorationPointers.has(e.pointerId))return;explorationPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(explorationPointers.size<2)return;const pts=[...explorationPointers.values()],distance=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);if(explorationPinchDistance>0){const ratio=explorationPinchDistance/Math.max(1,distance);if(currentMode==="rover")roverCamera.distance=THREE.MathUtils.clamp(roverCamera.distance*ratio,18,150);if(currentMode==="docking")dockingCamera.distance=THREE.MathUtils.clamp(dockingCamera.distance*ratio,180,1100);}explorationPinchDistance=distance;roverCamera.dragging=false;dockingCamera.dragging=false;});
for(const type of ["pointerup","pointercancel","lostpointercapture"])canvas.addEventListener(type,e=>{explorationPointers.delete(e.pointerId);if(explorationPointers.size<2)explorationPinchDistance=0;});
canvas.addEventListener("pointerdown",e=>{if(currentMode!=="docking")return;dockingCamera.dragging=true;dockingCamera.lastX=e.clientX;dockingCamera.lastY=e.clientY;canvas.setPointerCapture?.(e.pointerId);});
canvas.addEventListener("pointermove",e=>{if(!dockingCamera.dragging||currentMode!=="docking"||explorationPointers.size>1)return;const dx=e.clientX-dockingCamera.lastX,dy=e.clientY-dockingCamera.lastY;dockingCamera.lastX=e.clientX;dockingCamera.lastY=e.clientY;dockingCamera.yaw-=dx*.008;dockingCamera.pitch=THREE.MathUtils.clamp(dockingCamera.pitch+dy*.006,-1.25,1.25);});
for(const type of ["pointerup","pointercancel","lostpointercapture"])canvas.addEventListener(type,()=>{dockingCamera.dragging=false;});
canvas.addEventListener("wheel",e=>{if(currentMode!=="docking")return;e.preventDefault();dockingCamera.distance=THREE.MathUtils.clamp(dockingCamera.distance*Math.exp(e.deltaY*.001),180,1100);},{passive:false});
canvas.addEventListener("dblclick",()=>{if(currentMode!=="docking")return;dockingCamera.yaw=0;dockingCamera.pitch=Math.atan2(245,610);dockingCamera.distance=Math.hypot(245,610);});
const roverHud=document.createElement("div");
roverHud.className="p6-rover-hud";
roverHud.setAttribute("aria-live","polite");
roverHud.innerHTML='<div class="p6-rover-hud-top"><strong>ROVER NAVIGATION</strong><span class="p6-rover-camera-mode">FOLLOW CAMERA</span></div><div class="p6-rover-target"><span class="p6-rover-arrow">➤</span><span class="p6-rover-target-copy">NEXT SAMPLE · 90 m</span></div><div class="p6-rover-meters"><span>SPEED <b class="p6-rover-speed">0.0 m/s</b></span><span>BATTERY <b class="p6-rover-battery">85%</b></span><span>CHECKPOINTS <b class="p6-rover-samples">0 / 3</b></span></div><div class="p6-rover-hud-help">DRIVE: W / S · STEER: A / D · SCAN CHECKPOINT: E · DRAG: ORBIT · C: RESET CAMERA</div>';
canvas.parentElement?.appendChild(roverHud);
const roverArrow=roverHud.querySelector(".p6-rover-arrow"),roverTargetCopy=roverHud.querySelector(".p6-rover-target-copy"),roverCameraMode=roverHud.querySelector(".p6-rover-camera-mode"),roverSpeed=roverHud.querySelector(".p6-rover-speed"),roverBattery=roverHud.querySelector(".p6-rover-battery"),roverSamples=roverHud.querySelector(".p6-rover-samples");
canvas.addEventListener("pointerdown",e=>{if(currentMode!=="rover")return;roverCamera.dragging=true;roverCamera.lastX=e.clientX;roverCamera.lastY=e.clientY;canvas.setPointerCapture?.(e.pointerId);});
canvas.addEventListener("pointermove",e=>{if(!roverCamera.dragging||currentMode!=="rover"||explorationPointers.size>1)return;const dx=e.clientX-roverCamera.lastX,dy=e.clientY-roverCamera.lastY;roverCamera.lastX=e.clientX;roverCamera.lastY=e.clientY;roverCamera.yaw-=dx*.008;roverCamera.pitch=Math.max(.14,Math.min(1.38,roverCamera.pitch+dy*.006));roverCamera.mode="ORBIT";});
for(const type of ["pointerup","pointercancel","lostpointercapture"])canvas.addEventListener(type,()=>{roverCamera.dragging=false;});
canvas.addEventListener("wheel",e=>{if(currentMode!=="rover")return;e.preventDefault();roverCamera.distance=Math.max(18,Math.min(150,roverCamera.distance*Math.exp(e.deltaY*.001)));},{passive:false});
canvas.addEventListener("dblclick",()=>{if(currentMode!=="rover")return;if(roverCamera.mode==="OVERHEAD"){roverCamera.mode="FOLLOW";roverCamera.pitch=.42;roverCamera.distance=64;}else{roverCamera.mode="OVERHEAD";roverCamera.pitch=1.32;roverCamera.distance=92;}});
window.addEventListener("keydown",e=>{if((e.key==="c"||e.key==="C")&&currentMode==="rover"){roverCamera.mode="FOLLOW";roverCamera.yaw=0;roverCamera.pitch=.42;roverCamera.distance=64;}});
function resize(){const w=canvas.clientWidth||1000,h=canvas.clientHeight||520;renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,window.innerWidth<700?1.25:1.75));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
if("ResizeObserver" in window)new ResizeObserver(resize).observe(canvas);else window.addEventListener("resize",resize,{passive:true});resize();
function render(mode,state){currentMode=mode;lastState=state;roverGroup.visible=mode==="rover";dockingGroup.visible=mode==="docking";roverHud.style.display=mode==="rover"?"block":"none";if(mode==="rover"){const x=state.x||0,z=state.z||0,heading=state.heading||0,ground=terrainHeight(x,z);roverSpeed.textContent=`${(state.v||0).toFixed(1)} m/s`;roverBattery.textContent=`${(state.battery??0).toFixed(0)}%`;roverSamples.textContent=`${(state.samples||[]).filter(Boolean).length} / 3`;rover.position.set(x,ground-.27,z);rover.rotation.y=heading;wheels.forEach((w,i)=>{w.rotation.x+=(state.v||0)*.035;const lx=w.userData.localX??w.position.x,lz=w.userData.localZ??w.position.z;w.userData.localX=lx;w.userData.localZ=lz;const wx=x+Math.cos(heading)*lx+Math.sin(heading)*lz,wz=z-Math.sin(heading)*lx+Math.cos(heading)*lz;w.position.y=1.15+terrainHeight(wx,wz)-ground;wheelHubs[i].position.y=w.position.y;});sampleMeshes.forEach((m,i)=>{m.orb.material.color.set(state.samples?.[i]?0x55e6ae:0xffd66e);m.orb.material.emissive.set(state.samples?.[i]?0x126a48:0x8b5410);});
  const sites=[[90,-38],[260,58],[445,-48]];let targetIndex=sites.findIndex((_,i)=>!state.samples?.[i]);if(targetIndex<0){roverTargetCopy.textContent="ALL SCIENCE SITES COMPLETE";roverArrow.style.opacity=".25";}else{const [tx,tz]=sites[targetIndex],dx=tx-x,dz=tz-z,bearing=Math.atan2(dx,-dz)-heading;roverTargetCopy.textContent=`SAMPLE ${targetIndex+1} · ${Math.hypot(dx,dz).toFixed(0)} m`;roverArrow.style.transform=`rotate(${bearing}rad)`;roverArrow.style.opacity="1";}roverCameraMode.textContent=`${roverCamera.mode} · ${roverCamera.distance.toFixed(0)} m`;
  const pitch=roverCamera.pitch,dist=roverCamera.distance,cp=Math.cos(pitch),targetY=ground+2.2;camera.position.set(x+Math.sin(roverCamera.yaw)*dist*cp,targetY+Math.sin(pitch)*dist,z+Math.cos(roverCamera.yaw)*dist*cp);camera.lookAt(x,targetY,z);}
if(mode==="docking"){const x=state.x||0,y=state.y||0;earth.rotation.y+=.0008;earthClouds.rotation.y+=.0011;station.position.set(0,0,0);craft.position.set(x*.12,y*.12,0);craft.rotation.z=Math.atan2(state.vy||0,state.vx||0);approachLine.geometry.dispose();approachLine.geometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x*.12,y*.12,0),new THREE.Vector3(38,0,0)]);approachLine.computeLineDistances();const target=new THREE.Vector3(0,-80,-90),cp=Math.cos(dockingCamera.pitch);camera.position.set(target.x+Math.sin(dockingCamera.yaw)*dockingCamera.distance*cp,target.y+Math.sin(dockingCamera.pitch)*dockingCamera.distance,target.z+Math.cos(dockingCamera.yaw)*dockingCamera.distance*cp);camera.lookAt(target);}
renderer.render(scene,camera);}
window.NOVALUXExplorationScene={render,available:true};
window.dispatchEvent(new Event("novalux-exploration-3d-ready"));
