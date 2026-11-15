import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.181.0/build/three.module.js";

function makeCanvasTexture(draw, size = 1024) {
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d"); draw(ctx, size);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}

function earthTexture() {
  return makeCanvasTexture((ctx, s) => {
    const ocean = ctx.createLinearGradient(0, 0, 0, s);
    ocean.addColorStop(0, "#174f79"); ocean.addColorStop(.48, "#126b91"); ocean.addColorStop(1, "#082d55");
    ctx.fillStyle = ocean; ctx.fillRect(0, 0, s, s);
    const continents = [
      [[.06,.22],[.11,.15],[.18,.13],[.22,.19],[.20,.27],[.24,.32],[.21,.40],[.17,.43],[.15,.52],[.10,.48],[.08,.38],[.04,.32]],
      [[.25,.08],[.34,.07],[.39,.13],[.47,.12],[.51,.18],[.58,.16],[.63,.22],[.60,.29],[.54,.31],[.50,.38],[.44,.35],[.40,.42],[.34,.36],[.29,.31],[.25,.23]],
      [[.43,.39],[.49,.42],[.51,.50],[.48,.58],[.46,.67],[.42,.75],[.39,.68],[.40,.57],[.37,.49]],
      [[.70,.35],[.76,.30],[.82,.34],[.85,.41],[.81,.48],[.77,.50],[.74,.44]],
      [[.78,.65],[.84,.63],[.88,.68],[.86,.75],[.81,.77],[.77,.72]],
      [[.57,.55],[.61,.52],[.65,.57],[.64,.63],[.60,.66],[.56,.61]]
    ];
    continents.forEach((points, index) => {
      ctx.beginPath();
      points.forEach(([x,y], i) => { const px=x*s, py=y*s; if(i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py); });
      ctx.closePath();
      ctx.fillStyle = ["#397b59","#4b865b","#39734f","#477d54","#56885c","#36704d"][index];
      ctx.fill();
      ctx.strokeStyle = "rgba(18,67,55,.32)"; ctx.lineWidth = 5; ctx.stroke();
    });
    ctx.globalAlpha=.10; ctx.fillStyle="#c5e7dc";
    for(let i=0;i<150;i++){const x=(i*83)%s, y=(i*137)%s;ctx.beginPath();ctx.ellipse(x,y,18+(i%6)*17,3+(i%4)*3,Math.sin(i)*.32,0,Math.PI*2);ctx.fill();}
    ctx.globalAlpha=1;
  });
}

function cloudTexture() {
  return makeCanvasTexture((ctx,s)=>{ctx.clearRect(0,0,s,s); for(let i=0;i<260;i++){const x=(i*197)%s,y=(i*311)%s;ctx.fillStyle=`rgba(235,249,255,${.025+(i%5)*.012})`;ctx.beginPath();ctx.ellipse(x,y,18+(i%7)*12,4+(i%4)*3,Math.sin(i)*.25,0,Math.PI*2);ctx.fill();}},1024);
}

export function createLaunch3D(canvas, vehicle, destination = "earth") {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x020712);
  // A continuous sky dome: blue atmospheric limb near the horizon, fading to
  // deep space overhead. Stars remain visible through the upper sky.
  const skyGeometry = new THREE.SphereGeometry(180, 40, 28);
  const skyMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { uAltitude: { value: 0 } },
    vertexShader: `varying vec3 vSkyDir; void main(){ vSkyDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform float uAltitude; varying vec3 vSkyDir; void main(){
      float h = normalize(vSkyDir).y;
      float spaceBlend = smoothstep(42000.0, 165000.0, uAltitude);
      vec3 space = vec3(0.002,0.004,0.012);
      vec3 upperBlue = vec3(0.055,0.30,0.58);
      vec3 horizonBlue = vec3(0.12,0.48,0.72);
      vec3 lowBlue = vec3(0.025,0.16,0.34);
      float upperMix = smoothstep(0.02,0.88,h);
      float limbMix = exp(-pow((h+0.015)*5.5,2.0));
      vec3 blueSky = mix(lowBlue, upperBlue, upperMix);
      blueSky = mix(blueSky, horizonBlue, limbMix*0.62);
      vec3 col = mix(blueSky, space, spaceBlend);
      gl_FragColor = vec4(col,1.0);
    }`
  });
  scene.add(new THREE.Mesh(skyGeometry, skyMaterial));
  // Begin at a low, ground-level tracking angle. The camera pulls back during
  // ascent so the launchpad, atmospheric climb and curved Earth remain legible.
  const camera = new THREE.PerspectiveCamera(52, 1, .1, 650); camera.position.set(7, 4, 18); camera.lookAt(0, 1.0, 0);
  // User-controlled orbit camera. The default spherical offset reproduces the
  // original launch view; pointer drag and wheel only change the viewpoint.
  const launchOrbit = { yaw: Math.atan2(7, 18), pitch: Math.atan2(3.2, Math.hypot(7, 18)), zoom: 1, distance: Math.hypot(7, 3.2, 18), dragging: false, x: 0, y: 0 };
  canvas.style.touchAction = "none";
  canvas.style.cursor = "grab";
  canvas.addEventListener("pointerdown", e => { launchOrbit.dragging = true; launchOrbit.x = e.clientX; launchOrbit.y = e.clientY; canvas.setPointerCapture?.(e.pointerId); canvas.style.cursor = "grabbing"; });
  canvas.addEventListener("pointermove", e => { if (!launchOrbit.dragging) return; const dx=e.clientX-launchOrbit.x, dy=e.clientY-launchOrbit.y; launchOrbit.x=e.clientX; launchOrbit.y=e.clientY; launchOrbit.yaw-=dx*.008; launchOrbit.pitch=THREE.MathUtils.clamp(launchOrbit.pitch+dy*.006,-1.25,1.25); });
  for (const type of ["pointerup","pointercancel","lostpointercapture"]) canvas.addEventListener(type,()=>{launchOrbit.dragging=false;canvas.style.cursor="grab";});
  canvas.addEventListener("wheel",e=>{e.preventDefault();launchOrbit.zoom=THREE.MathUtils.clamp(launchOrbit.zoom*Math.exp(e.deltaY*.001),.45,2.8);},{passive:false});
  canvas.addEventListener("dblclick",()=>{launchOrbit.yaw=Math.atan2(7,18);launchOrbit.pitch=Math.atan2(3.2,Math.hypot(7,18));launchOrbit.zoom=1;launchOrbit.distance=Math.hypot(7,3.2,18);});
  scene.add(new THREE.HemisphereLight(0x9bdcff,0x172338,1.6));
  const sun = new THREE.DirectionalLight(0xfff0d5,3.2); sun.position.set(-8,10,8); sun.castShadow = true; sun.shadow.mapSize.set(1024,1024); scene.add(sun);

  const earthRadius = 34;
  const earth = new THREE.Mesh(new THREE.SphereGeometry(earthRadius,96,64),new THREE.MeshStandardMaterial({map:earthTexture(),roughness:1,metalness:0})); earth.position.set(0,-34.73,0); earth.receiveShadow = true; scene.add(earth);
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(34.07,80,56),new THREE.MeshBasicMaterial({map:cloudTexture(),transparent:true,opacity:.72,depthWrite:false})); clouds.position.copy(earth.position); scene.add(clouds);
  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(34.32,80,56),new THREE.MeshBasicMaterial({color:0x48bfff,transparent:true,opacity:.2,side:THREE.BackSide})); atmosphere.position.copy(earth.position); scene.add(atmosphere);
  // No surface terrain or loose rocks in the launch scene.

  const pad = new THREE.Group();
  const ground = new THREE.Mesh(new THREE.CylinderGeometry(2.8,3.2,.28,48), new THREE.MeshStandardMaterial({color:0x263746, roughness:.95}));
  ground.position.set(0,-.62,0); pad.add(ground);
  const tower = new THREE.Mesh(new THREE.BoxGeometry(.22,4.8,.24), new THREE.MeshStandardMaterial({color:0x9aaab6, metalness:.45, roughness:.65}));
  tower.position.set(-1.25,1.75,-.35); pad.add(tower);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.35,.16,.2), new THREE.MeshStandardMaterial({color:0x718797, metalness:.35, roughness:.7}));
  arm.position.set(-.62,2.5,-.35); pad.add(arm);
  const padLight = new THREE.PointLight(0xffa45e, 1.4, 8); padLight.position.set(0,.2,1.2); pad.add(padLight);
  pad.position.set(0,-.25,0); scene.add(pad);

  const destMaterial = new THREE.MeshStandardMaterial({color:0xb7b4aa, roughness:1, metalness:0});
  const dest = new THREE.Mesh(new THREE.SphereGeometry(3.2,48,32), destMaterial);
  if (destination === "mars") dest.material.color.setHex(0xb85b3c);
  dest.visible = false; scene.add(dest);
  const destGlow = new THREE.Mesh(new THREE.SphereGeometry(3.42,40,28), new THREE.MeshBasicMaterial({color:0x8fcaff, transparent:true, opacity:.10, side:THREE.BackSide}));
  destGlow.visible = false; scene.add(destGlow);
  const transferCurve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0,0,0), new THREE.Vector3(17,17,-4), new THREE.Vector3(30,13,0));
  const transferLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(transferCurve.getPoints(80)), new THREE.LineDashedMaterial({color:0x79d8ff, dashSize:.65, gapSize:.42, transparent:true, opacity:.65}));
  transferLine.computeLineDistances(); transferLine.visible = false; scene.add(transferLine);

  const starGeo = new THREE.BufferGeometry(), starPositions=[];
  for(let i=0;i<1800;i++){const u=Math.random()*2-1,a=Math.random()*Math.PI*2,r=65+Math.random()*90;starPositions.push(r*Math.sqrt(1-u*u)*Math.cos(a),r*u,r*Math.sqrt(1-u*u)*Math.sin(a));}
  starGeo.setAttribute("position",new THREE.Float32BufferAttribute(starPositions,3));
  const stars = new THREE.Points(starGeo,new THREE.PointsMaterial({color:0xd9efff,size:.23,transparent:true,opacity:.85}));scene.add(stars);

  const rocket = new THREE.Group(); scene.add(rocket);
  const metal = new THREE.MeshStandardMaterial({color:0xc5d4df,metalness:.62,roughness:.38});
  const dark = new THREE.MeshStandardMaterial({color:0x536b80,metalness:.65,roughness:.4});
  const white = new THREE.MeshStandardMaterial({color:0xe7f0f6,metalness:.3,roughness:.42});
  const stageMeshes=[]; let y=-.25;
  const stages=vehicle?.stages||[];
  for(let i=stages.length-1;i>=0;i--){
    const st=stages[i], len=1.35+Math.min(.45,Math.sqrt(st.propellant)/1200), radius=.25+i*.055;
    const body=new THREE.Mesh(new THREE.CylinderGeometry(radius*.92,radius,len,24),i===0?metal:dark);body.position.y=y-len/2;rocket.add(body);
    const band=new THREE.Mesh(new THREE.CylinderGeometry(radius*1.04,radius*1.04,.09,24),white);band.position.y=y-len+.12;rocket.add(band);
    const bell=new THREE.Mesh(new THREE.CylinderGeometry(radius*.32,radius*.52,.3,20),dark);bell.position.y=y-len-.12;rocket.add(bell);
    stageMeshes[i]={body,band,bell,len,radius};y-=len;
  }
  const launchBaseY = -.46 - y;
  // Payload sits directly on the upper-stage interface (the top of the
  // stage stack is y=-0.25), eliminating the visible floating gap.
  const payload=new THREE.Mesh(new THREE.CylinderGeometry(.19,.24,.65,20),white);payload.position.y=.075;rocket.add(payload);
  const payloadAdapter=new THREE.Mesh(new THREE.CylinderGeometry(.27,.30,.18,24),metal);payloadAdapter.position.y=-.16;rocket.add(payloadAdapter);
  const nose=new THREE.Mesh(new THREE.ConeGeometry(.23,.62,24),white);nose.position.y=.71;rocket.add(nose);
  const fairingGroup=new THREE.Group(); rocket.add(fairingGroup);
  const fairMat=new THREE.MeshStandardMaterial({color:0xe3edf4,metalness:.25,roughness:.36,side:THREE.DoubleSide});
  for(let side=0;side<2;side++){
    const shell=new THREE.Mesh(new THREE.CylinderGeometry(.02,.32,1.45,24,1,true,side*Math.PI,Math.PI),fairMat);shell.position.y=1.125;shell.rotation.y=side*Math.PI;fairingGroup.add(shell);
  }
  const flame=new THREE.Mesh(new THREE.ConeGeometry(.24,2.0,24),new THREE.MeshBasicMaterial({color:0xff8b35,transparent:true,opacity:.86}));flame.rotation.x=Math.PI;flame.position.y=y-.85;rocket.add(flame);
  const coreFlame=new THREE.Mesh(new THREE.ConeGeometry(.11,1.55,20),new THREE.MeshBasicMaterial({color:0xffe9a3,transparent:true,opacity:.9}));coreFlame.rotation.x=Math.PI;coreFlame.position.y=y-.72;rocket.add(coreFlame);
  const smokeGeo=new THREE.BufferGeometry();const smokeCount=180;const smokePos=new Float32Array(smokeCount*3);for(let i=0;i<smokeCount;i++){smokePos[i*3]=(Math.random()-.5)*2;smokePos[i*3+1]=-Math.random()*4;smokePos[i*3+2]=(Math.random()-.5)*2;}
  smokeGeo.setAttribute("position",new THREE.BufferAttribute(smokePos,3));const smoke=new THREE.Points(smokeGeo,new THREE.PointsMaterial({color:0xc3d0d8,size:.14,transparent:true,opacity:.25,depthWrite:false}));rocket.add(smoke);
  const debris=[];
  const resize=()=>{const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight||canvas.clientWidth*.522);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};
  const ro=new ResizeObserver(resize);ro.observe(canvas.parentElement||canvas);resize();
  let last=performance.now();
  function update(t, now=performance.now(), fairingAt=0, stageAt=0, separatedStage=null){
    const dt=Math.min(.05,(now-last)/1000);last=now;
    const altitude=t?.altitude||0, elapsed=t?.elapsed||0, active=Boolean(t?.status==="ASCENT"&&t?.throttle>0&&!t?.canSeparate);
    const progress=Math.min(1,Math.max(0,altitude/400000));
    const ascentBlend=Math.min(1,Math.max(0,altitude/120000));
    const orbitViewBlend = THREE.MathUtils.smoothstep(altitude, 65000, 400000);
    skyMaterial.uniforms.uAltitude.value = Math.max(0, altitude);
    pad.visible=altitude<145000;
    pad.scale.setScalar(Math.max(.08,1-Math.max(0,altitude-18000)/150000));
    dest.visible=destination!=="earth" && altitude>90000;
    destGlow.visible=dest.visible;
    transferLine.visible=destination!=="earth" && altitude>120000;
    if(destination!=="earth"){
      const travel=Math.min(1,Math.max(0,(t?.downrange||0)/18000000));
      dest.position.x=(destination==="moon"?30:36)-travel*7;
      dest.position.y=(destination==="moon"?13:17)-travel*2;
      dest.rotation.y+=dt*(destination==="mars"?.035:.012);
      destGlow.position.copy(dest.position);
    }

    // Compress real altitude into a cinematic visual scale: the physics still
    // targets 400 km, while the planet remains large enough to read in-frame.
    const ascentHeight = Math.max(0, altitude) / 30000;
    rocket.position.set(Math.min(3.0,(t?.downrange||0)/950000),launchBaseY+ascentHeight,0);
    rocket.rotation.z=-(Math.min(1.05,Math.max(0,altitude/240000))*.72);
    const activeIndex=t?.stageIndex ?? 0;
    stageMeshes.forEach((m,i)=>{const visible=activeIndex<stageMeshes.length && i>=activeIndex; m.body.visible=m.band.visible=m.bell.visible=visible;});
    flame.visible=coreFlame.visible=active;const flicker=.8+Math.sin(now*.025)*.12;flame.scale.set(1,active?(.72+((t?.throttle||0)*.55))*flicker:0.001,1);coreFlame.scale.set(1,active?flicker:0.001,1);
    smoke.visible=active&&altitude<80000;smoke.rotation.y+=dt*.18;
    if(fairingAt){const p=Math.min(1,(now-fairingAt)/2600);fairingGroup.children.forEach((m,i)=>{m.position.x=(i===0?-1:1)*p*1.5;m.rotation.z=(i===0?-1:1)*p*1.5;m.material.opacity=1-p*.65;m.material.transparent=true;});if(p>=1)fairingGroup.visible=false;}else fairingGroup.visible=t?.fairingAttached!==false;
    if(stageAt&&now-stageAt<3200&&separatedStage){const p=Math.min(1,(now-stageAt)/3200);if(!debris.length){const piece=new THREE.Mesh(new THREE.CylinderGeometry(.2,.25,1.2,16),dark);scene.add(piece);debris.push(piece);}debris[0].visible=true;debris[0].position.set(rocket.position.x-.8-p*2,rocket.position.y-1-p*2,0);debris[0].rotation.z=-p*1.2;}else if(debris.length)debris[0].visible=false;
    earth.rotation.y+=dt*.012;clouds.rotation.y+=dt*.016;stars.rotation.y+=dt*.001;
    if(destination!=="earth"){
      const cruise=Math.min(1,Math.max(0,(altitude-100000)/500000));
      earth.scale.setScalar(1-cruise*.48);
      scene.background.lerp(new THREE.Color(0x01030a),cruise*.012);
    } else { earth.scale.setScalar(1); }

    // Stars fade in only as the vehicle clears the atmosphere.
    stars.material.opacity = THREE.MathUtils.smoothstep(altitude, 65000, 165000) * 0.88;

    // Ground-level chase shot transitions continuously into a pulled-back
    // orbital establishing shot, revealing a smaller curved Earth at 400 km.
    // Keep the vehicle as the visual subject through orbital insertion. The
    // old target drifted 14 units below the rocket and pulled the camera 25
    // units away, making the spacecraft nearly disappear in the final frame.
    const target = new THREE.Vector3(
      rocket.position.x,
      rocket.position.y + THREE.MathUtils.lerp(0.25, 0.55, orbitViewBlend),
      0
    );
    const orbitCos = Math.cos(launchOrbit.pitch);
    const baseDistance = THREE.MathUtils.lerp(Math.hypot(7, 3.2, 18), Math.hypot(4, 2.4, 13.5), orbitViewBlend);
    const orbitDistance = baseDistance * launchOrbit.zoom;
    const desiredCamera = new THREE.Vector3(
      target.x + Math.sin(launchOrbit.yaw) * orbitDistance * orbitCos,
      target.y + Math.sin(launchOrbit.pitch) * orbitDistance,
      target.z + Math.cos(launchOrbit.yaw) * orbitDistance * orbitCos
    );
    camera.fov = 52;
    camera.updateProjectionMatrix();
    camera.position.copy(desiredCamera);
    camera.lookAt(target);
    renderer.render(scene,camera);
  }
  return {update,dispose(){ro.disconnect();renderer.dispose();scene.traverse(o=>{o.geometry?.dispose?.();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose?.();});}};
}
