"use strict";

import { LaunchVehicleSimulator, LAUNCH_VEHICLES } from "./physics/launch-vehicle.js";
import { buildShip } from "./ship/ship-model.js";
import { createLaunch3D } from "./launch-3d.js";

const $ = id => document.getElementById(id);
let sim = null;
let raf = null;
let lastFrame = 0;
let running = false;
let speed = 1;
let currentShip = null;
let currentVehicle = null;
let visualTelemetry = null;
let visualRAF = null;
let visualPreviousFairing = true;
let visualPreviousStage = 0;
let fairingAnimStart = 0;
let stageAnimStart = 0;
let separatedStageVisual = null;
let launchVisualStart = performance.now();
let launch3D = null;
let launch3DReady = false;

function design() { return window.NOVALUX?.getDesign?.() ?? null; }
function fmt(v, d = 1) { return Number.isFinite(v) ? v.toFixed(d) : "—"; }
function set(id, value) { const el = $(id); if (el) el.textContent = value; }
function initLaunch3D() {
    try {
      launch3D?.dispose();
      launch3D = createLaunch3D($("launch-3d-canvas"), currentVehicle, design()?.mission ?? "earth");
      launch3DReady = true;
      $("launch-canvas")?.classList.add("launch-2d-fallback-hidden");
    } catch (error) {
      console.warn("NOVALUX 3D launch renderer unavailable; using 2D fallback.", error);
      launch3D = null; launch3DReady = false;
      $("launch-canvas")?.classList.remove("launch-2d-fallback-hidden");
    }
}

function buildPanel() {
    if ($("novalux-launch-system")) return;
    const orbital = $("novalux-orbital-workspace");
    const panel = document.createElement("section");
    panel.id = "novalux-launch-system";
    panel.className = "launch-system panel";
    panel.innerHTML = `
      <div class="launch-heading"><div><div class="eyebrow">NOVALUX // LAUNCH SYSTEM</div><h3>Rocket Launch & Ascent</h3><p>Staged launch vehicle · atmospheric drag · gravity turn · payload fairing · orbital insertion</p></div><span id="launch-status" class="orbital-status">CONFIGURE</span></div>
      <div class="launch-grid">
        <div class="launch-visual-panel"><div class="rotate-phone-hint" role="status"><b>↻ Rotate your phone</b><span>Landscape gives you a wider flight view and room for the mission meters.</span></div><canvas id="launch-3d-canvas" aria-label="Three dimensional live rocket ascent visualization"></canvas><canvas id="launch-canvas" width="900" height="470" aria-label="Live rocket ascent visualization"></canvas><div class="launch-readouts"><span>ALTITUDE <b id="launch-alt">0.0 km</b></span><span>SPEED <b id="launch-speed">0.000 km/s</b></span><span>DOWNRANGE <b id="launch-range">0.0 km</b></span></div><div class="launch-flight-meter"><div><span>ORBITAL ALTITUDE PROGRESS · 400 KM REFERENCE</span><b id="launch-altitude-percent">0%</b></div><div class="launch-meter-track"><i id="launch-altitude-fill"></i></div><p id="launch-live-guidance">Awaiting ignition. Follow the flight sequence and act when a control becomes available.</p></div></div>
        <div class="launch-controls">
          <div class="launch-subhead">VEHICLE & PAYLOAD</div>
          <div class="launch-stat"><span>SPACECRAFT</span><b id="launch-payload">—</b></div>
          <div class="launch-stat"><span>LAUNCH VEHICLE</span><b id="launch-vehicle">—</b></div>
          <div class="launch-stat"><span>STACK MASS</span><b id="launch-mass">—</b></div>
          <div class="launch-stat"><span>ACTIVE STAGE</span><b id="launch-stage">—</b></div>
          <div class="launch-stat"><span>STAGE PROPELLANT</span><b id="launch-prop">—</b></div>
          <div class="launch-stat"><span>MAX DYNAMIC PRESSURE</span><b id="launch-q">—</b></div>
          <div class="launch-stat"><span>MAX ACCELERATION</span><b id="launch-g">—</b></div>
          <label class="launch-range-label" for="launch-throttle">THROTTLE <b id="launch-throttle-label">100%</b></label>
          <input id="launch-throttle" type="range" min="0" max="100" value="100" step="1">
          <label class="launch-range-label" for="launch-speed-control">SIMULATION RATE <b id="launch-rate-label">1×</b></label>
          <input id="launch-speed-control" type="range" min="1" max="20" value="1" step="1">
          <div class="launch-buttons"><button id="launch-ignite" class="primary-button">IGNITION / LIFTOFF</button><button id="launch-pause" class="orbital-button" disabled>PAUSE</button><button id="launch-fairing" class="orbital-button" disabled>JETTISON FAIRING</button><button id="launch-cutoff" class="orbital-button" disabled>ENGINE CUTOFF</button><button id="launch-separate" class="orbital-button" disabled>SEPARATE STAGE</button><button id="launch-reset" class="orbital-button">RESET LAUNCH</button><button id="launch-transfer" class="primary-button" disabled>CONTINUE TO ORBITAL OPERATIONS →</button></div><div class="launch-device-keys" aria-label="Desktop keyboard shortcuts"><span><kbd>Space</kbd> Ignite / Pause</span><span><kbd>F</kbd> Fairing</span><span><kbd>X</kbd> Cutoff</span><span><kbd>Enter</kbd> Separate stage</span><span><kbd>R</kbd> Reset</span><span><kbd>C</kbd> Continue</span></div><div class="launch-touch-actions" aria-label="Touch launch controls"><button type="button" data-launch-action="ignite">IGNITE</button><button type="button" data-launch-action="pause" disabled>PAUSE</button><button type="button" data-launch-action="fairing" disabled>FAIRING</button><button type="button" data-launch-action="cutoff" disabled>CUTOFF</button><button type="button" data-launch-action="separate" disabled>SEPARATE STAGE</button><button type="button" data-launch-action="reset">RESET</button><button type="button" data-launch-action="transfer" disabled>CONTINUE</button></div>
          <p class="launch-hint" id="launch-guidance">Select an Earth mission and complete your spacecraft design. Fairing release and every stage separation require your confirmation.</p>
        </div>
      </div>
      <div class="launch-bottom-grid"><div><div class="launch-subhead">FLIGHT EVENTS</div><ol id="launch-events" class="launch-events"><li>Awaiting vehicle configuration.</li></ol></div><div><div class="launch-subhead">FLIGHT SEQUENCE · WHEN TO ACT</div><div class="launch-sequence"><span data-step="0">01 · IGNITION</span><span data-step="1">02 · ASCENT</span><span data-step="2">03 · FAIRING</span><span data-step="3">04 · STAGING</span><span data-step="4">05 · ORBIT INSERTION</span></div><p class="launch-hint" id="launch-sequence-help">Fairing: wait until 70 km or higher, then press Jettison Fairing. Staging: wait for the stage propellant to reach 0% and the simulator to request separation; press Separate Stage. Repeat for each stage. After the final stage, orbital insertion is checked automatically using altitude, speed and flight direction; 400 km is only a visual reference, not a required exact altitude.</p></div></div>`;
    if (orbital) orbital.insertAdjacentElement("afterend", panel);
    else $("simulation-view")?.appendChild(panel);
    bind();
    configure();
    initLaunch3D();
    startVisualLoop();
}

function configure() {
    stop();
    const d = design();
    currentShip = buildShip(d);
    const mission = d?.mission ?? "earth";
    const launcherName = d?.selections?.launcher;
    const launcher = LAUNCH_VEHICLES[launcherName];
    currentVehicle = launcher || null;
    if (launch3D) { launch3D.dispose(); launch3D = null; launch3DReady = false; }
    visualPreviousFairing = true;
    visualPreviousStage = 0;
    fairingAnimStart = 0;
    stageAnimStart = 0;
    separatedStageVisual = null;
    const valid = currentShip.valid && launcher && currentShip.launch?.withinCapacity;
    set("launch-status", valid ? "READY" : "CONFIGURATION REQUIRED");
    set("launch-payload", currentShip.valid ? `${fmt(currentShip.totalMass, 1)} kg · ${currentShip.name}` : "Incomplete design");
    set("launch-vehicle", launcherName || "Not selected");
    set("launch-guidance", valid
      ? (mission === "earth"
          ? "Vehicle is within payload capacity. Launch into Earth orbit, then continue to orbital operations."
          : `Vehicle is within payload capacity. Launch into Earth parking orbit first. Stage 4 will handle the ${mission.toUpperCase()} transfer after orbital insertion.`)
      : "Complete all spacecraft components and select a launch vehicle with enough payload capacity.");
    // Every interplanetary mission must first launch from Earth. The launch sequence
    // therefore enables Earth ascent for Earth, Moon and Mars destinations.
    $("launch-ignite").disabled = !valid;
    $("launch-transfer").disabled = true;
    if (!valid) {
      sim = null; update(null); return;
    }
    sim = new LaunchVehicleSimulator({ vehicleName: launcherName, payloadMass: currentShip.totalMass });
    update(sim.telemetry());
}

function bind() {
    $("launch-ignite").addEventListener("click", () => {
      if (!sim || !sim.ignite()) { update(sim?.telemetry()); return; }
      running = true; lastFrame = 0; raf = requestAnimationFrame(loop); update(sim.telemetry());
    });
    $("launch-pause").addEventListener("click", () => { if (running) stop(); else if (sim?.status === "ASCENT" && !sim.stageAwaitingSeparation) { running = true; raf = requestAnimationFrame(loop); } update(sim?.telemetry()); });
    $("launch-throttle").addEventListener("input", e => { const v = Number(e.target.value); $("launch-throttle-label").textContent = `${v}%`; sim?.setThrottle(v / 100); });
    $("launch-speed-control").addEventListener("input", e => { speed = Number(e.target.value); $("launch-rate-label").textContent = `${speed}×`; });
    $("launch-fairing").addEventListener("click", () => { if (sim?.jettisonFairing()) update(sim.telemetry()); });
    $("launch-cutoff").addEventListener("click", () => { if (sim?.cutoff()) { stop(); $("launch-throttle").value = "0"; $("launch-throttle-label").textContent = "0%"; update(sim.telemetry()); } });
    $("launch-separate").addEventListener("click", () => { if (sim?.separateStage()) { if (sim.status === "ASCENT") { sim.setThrottle(1); $("launch-throttle").value = "100"; $("launch-throttle-label").textContent = "100%"; running = true; raf = requestAnimationFrame(loop); } update(sim.telemetry()); } });
    $("launch-reset").addEventListener("click", () => {
      document.dispatchEvent(new Event("novalux:launchreset"));
      configure();
      initLaunch3D();
    });
    $("launch-transfer").addEventListener("click", () => {
      const t = sim?.telemetry();
      if (!t?.insertionAchieved) return;
      document.dispatchEvent(new CustomEvent("novalux:launchcomplete", { detail: { altitude: t.altitude, downrange: t.downrange, horizontalVelocity: t.horizontalVelocity, verticalVelocity: t.verticalVelocity, destination: design()?.mission ?? "earth", shipName: currentShip?.name ?? "Custom spacecraft", dryMass: currentShip?.dryMass ?? 0, totalMass: currentShip?.totalMass ?? 0, propellantMass: currentShip?.propellantMass ?? 0, isp: currentShip?.isp ?? 0, deltaV: currentShip?.deltaV ?? 0 } }));
      set("launch-guidance", "Orbital state transferred to the orbital simulator. Continue with spacecraft operations.");
    });
    document.querySelector(".launch-touch-actions")?.addEventListener("click", e => {
      const action = e.target.closest("[data-launch-action]")?.dataset.launchAction;
      if (!action) return;
      const map = { ignite: "launch-ignite", pause: "launch-pause", fairing: "launch-fairing", cutoff: "launch-cutoff", separate: "launch-separate", reset: "launch-reset", transfer: "launch-transfer" };
      $(map[action])?.click();
    });
    window.addEventListener("keydown", e => {
      if (!document.getElementById("simulation-view")?.classList.contains("active")) return;
      const tag = e.target?.tagName?.toLowerCase();
      if (["input", "select", "textarea", "button"].includes(tag) || e.target?.isContentEditable) return;
      const key = e.key.toLowerCase();
      if (key === " ") { const id = sim?.status === "READY" ? "launch-ignite" : "launch-pause"; if ($(id)?.disabled) return; e.preventDefault(); $(id)?.click(); return; }
      const map = { f: "launch-fairing", x: "launch-cutoff", enter: "launch-separate", r: "launch-reset", c: "launch-transfer" };
      const id = map[key]; if (!id || $(id)?.disabled) return;
      e.preventDefault(); $(id)?.click();
    });
    document.addEventListener("novalux:designchange", () => { configure(); initLaunch3D(); });
  }

  function stop() { running = false; if (raf !== null) cancelAnimationFrame(raf); raf = null; lastFrame = 0; }
  function loop(ts) {
    if (!running || !sim) return;
    if (!lastFrame) lastFrame = ts;
    const realDt = Math.min(0.1, (ts - lastFrame) / 1000);
    lastFrame = ts;
    const steps = Math.max(1, Math.ceil(realDt * speed * 20));
    const dt = (realDt * speed) / steps;
    for (let i = 0; i < steps && sim.status === "ASCENT" && !sim.stageAwaitingSeparation; i++) sim.step(dt);
    if (sim.status !== "ASCENT" || sim.stageAwaitingSeparation) stop();
    update(sim.telemetry());
    if (running) raf = requestAnimationFrame(loop);
  }

  function update(t) {
    const active = t && sim;
    if (t) {
      if (visualPreviousFairing && !t.fairingAttached) fairingAnimStart = performance.now();
      if (t.stageIndex > visualPreviousStage && currentVehicle) {
        separatedStageVisual = currentVehicle.stages[visualPreviousStage] || null;
        stageAnimStart = performance.now();
      }
      visualPreviousFairing = t.fairingAttached;
      visualPreviousStage = t.stageIndex;
      visualTelemetry = t;
    } else {
      visualTelemetry = null;
    }
    set("launch-status", t?.status ?? "CONFIGURE");
    set("launch-alt", `${fmt((t?.altitude ?? 0) / 1000, 2)} km`);
    set("launch-speed", `${fmt((t?.speed ?? 0) / 1000, 3)} km/s`);
    set("launch-range", `${fmt((t?.downrange ?? 0) / 1000, 1)} km`);
    set("launch-mass", active ? `${fmt(t.mass, 0)} kg` : "—");
    set("launch-stage", active ? `${t.stageIndex + (t.stageIndex < t.stageCount ? 1 : 0)} / ${t.stageCount} · ${t.stageName}` : "—");
    set("launch-prop", active ? `${fmt(t.stagePropellant, 1)} kg (${fmt(t.stagePropellantFraction * 100, 0)}%)` : "—");
    set("launch-q", active ? `${fmt(t.maxQ / 1000, 1)} kPa` : "—");
    set("launch-g", active ? `${fmt(t.maxAccelerationG, 2)} g` : "—");
    const altitudePct = Math.max(0, Math.min(100, (t?.altitude ?? 0) / 400000 * 100));
    set("launch-altitude-percent", `${altitudePct.toFixed(0)}%`);
    const altitudeFill = $("launch-altitude-fill"); if (altitudeFill) altitudeFill.style.width = `${altitudePct}%`;
    let nextAction = "Awaiting ignition. Follow the flight sequence and act when a control becomes available.";
    if (t?.insertionAchieved) nextAction = "ORBIT ACHIEVED. Press Continue to Orbital Operations.";
    else if (t?.status === "FAILED") nextAction = `MISSION FAILED: ${t.failureReason || "Review flight events and reset."}`;
    else if (t?.canSeparate) nextAction = `STAGE ${t.stageIndex + 1} EMPTY. Press SEPARATE STAGE now to discard it and ignite the next stage.`;
    else if (t?.canJettisonFairing) nextAction = "FAIRING RELEASE WINDOW OPEN (≥70 km). Press Jettison Fairing now.";
    else if (t?.status === "ASCENT" && t.stagePropellantFraction < .15) nextAction = `STAGE ${t.stageIndex + 1} PROPELLANT LOW (${(t.stagePropellantFraction*100).toFixed(0)}%). Keep monitoring; separation becomes available at depletion.`;
    else if (t?.status === "ASCENT") nextAction = `ASCENT ACTIVE · Stage ${t.stageIndex+1}/${t.stageCount}. Keep throttle up. Fairing release unlocks at 70 km; stage separation unlocks when this stage runs out of propellant.`;
    else if (t?.status === "COAST") nextAction = "Final stage separated. Orbital insertion is being verified; wait for the result.";
    set("launch-live-guidance", nextAction);
    const touchState = {ignite:$("launch-ignite")?.disabled,pause:$("launch-pause")?.disabled,fairing:$("launch-fairing")?.disabled,cutoff:$("launch-cutoff")?.disabled,separate:$("launch-separate")?.disabled,reset:false,transfer:$("launch-transfer")?.disabled};
    document.querySelectorAll("[data-launch-action]").forEach(b=>{const a=b.dataset.launchAction;b.disabled=!!touchState[a];b.textContent=({ignite:"IGNITE / LIFTOFF",pause:running?"PAUSE":"RESUME",fairing:"JETTISON FAIRING",cutoff:"ENGINE CUTOFF",separate:"SEPARATE STAGE",reset:"RESET LAUNCH",transfer:"CONTINUE TO ORBIT"})[a];});
    $("launch-pause").disabled = !active || t.status !== "ASCENT" || t.canSeparate;
    $("launch-pause").textContent = running ? "PAUSE" : "RESUME";
    $("launch-fairing").disabled = !t?.canJettisonFairing;
    $("launch-separate").disabled = !t?.canSeparate;
    $("launch-cutoff").disabled = !t || t.status !== "ASCENT" || t.canSeparate;
    $("launch-transfer").disabled = !t?.insertionAchieved;
    $("launch-ignite").disabled = !sim || !["READY"].includes(t?.status) || !currentShip?.valid;
    const events = $("launch-events");
    if (events) events.innerHTML = (t?.events ?? ["Awaiting vehicle configuration."]).slice(-8).reverse().map(x => `<li>${escapeText(x)}</li>`).join("");
    document.querySelectorAll(".launch-sequence span").forEach((el, i) => {
      const reached = t && ((i === 0 && t.elapsed > 0) || (i === 1 && t.altitude > 0) || (i === 2 && !t.fairingAttached) || (i === 3 && t.stageIndex > 0) || (i === 4 && t.insertionAchieved));
      el.classList.toggle("complete", Boolean(reached));
      el.classList.toggle("current", Boolean(t && ((i === 0 && t.status === "READY") || (i === 1 && t.status === "ASCENT") || (i === 2 && t.fairingAttached && t.altitude >= 70_000) || (i === 3 && t.canSeparate) || (i === 4 && t.status === "COAST"))));
    });
  }
  function escapeText(s) { return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  function startVisualLoop() {
    if (visualRAF !== null) cancelAnimationFrame(visualRAF);
    const frame = () => {
      if (launch3DReady && launch3D) launch3D.update(visualTelemetry, performance.now(), fairingAnimStart, stageAnimStart, separatedStageVisual);
      else draw(visualTelemetry);
      visualRAF = requestAnimationFrame(frame);
    };
    visualRAF = requestAnimationFrame(frame);
  }

  function draw(t) {
    const c = $("launch-canvas"); if (!c) return;
    const ctx = c.getContext("2d"); const w = c.width, h = c.height;
    const now = performance.now();
    const elapsed = t?.elapsed ?? 0;
    const altitude = t?.altitude ?? 0;
    const downrange = t?.downrange ?? 0;
    const active = Boolean(t && t.status === "ASCENT" && t.throttle > 0 && !t.canSeparate);
    const orbit = Boolean(t?.insertionAchieved);
    const failed = t?.status === "FAILED";
    const pitch = Math.min(1.05, Math.max(0, altitude / 240000) * 1.05);
    const camX = w * 0.52 + Math.max(-120, Math.min(150, downrange / 1100));
    const camY = h * 0.66 - Math.min(270, altitude / 850);
    const pulse = now / 1000;

    // Deep-space sky and animated stars.
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#030914"); sky.addColorStop(.58, "#071a30"); sky.addColorStop(1, "#102b45");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 95; i++) {
      const sx = ((i * 137.51 + pulse * (i % 3 + 1) * 2) % (w + 20));
      const sy = (i * 71.73) % (h * .78);
      const twinkle = .35 + .65 * Math.abs(Math.sin(pulse * (i % 5 + 1) + i));
      ctx.globalAlpha = twinkle * (altitude > 90000 ? 1 : .55);
      ctx.fillStyle = i % 9 === 0 ? "#9beaff" : "#d9efff";
      ctx.fillRect(sx, sy, i % 11 === 0 ? 2 : 1, i % 11 === 0 ? 2 : 1);
    }
    ctx.globalAlpha = 1;

    // Curved Earth and moving cloud bands create a camera-follow sense of motion.
    const earthCenterX = w * .48 - Math.min(240, downrange / 1500);
    const earthTop = h * .80 - Math.min(210, altitude / 1450);
    const earthRadius = Math.max(250, 410 + altitude / 1800);
    const earthGrad = ctx.createLinearGradient(0, earthTop - 70, 0, h + 120);
    earthGrad.addColorStop(0, "#6ed6f4"); earthGrad.addColorStop(.08, "#236f9e"); earthGrad.addColorStop(.35, "#123d68"); earthGrad.addColorStop(1, "#06182f");
    ctx.fillStyle = earthGrad;
    ctx.beginPath(); ctx.ellipse(earthCenterX, earthTop + earthRadius * .72, earthRadius * 1.55, earthRadius, 0, Math.PI, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.ellipse(earthCenterX, earthTop + earthRadius * .72, earthRadius * 1.55, earthRadius, 0, Math.PI, Math.PI * 2); ctx.clip();
    for (let i = 0; i < 13; i++) {
      const cx = ((i * 121 + pulse * (8 + i % 4) - downrange / 500) % (w + 240)) - 120;
      const cy = earthTop + 45 + (i % 5) * 24;
      ctx.fillStyle = `rgba(218,244,255,${.035 + (i % 3) * .018})`;
      ctx.beginPath(); ctx.ellipse(cx, cy, 75 + (i % 4) * 22, 8 + (i % 3) * 4, -.12, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = "rgba(117,226,255,.8)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(earthCenterX, earthTop + earthRadius * .72, earthRadius * 1.55, earthRadius, 0, Math.PI, Math.PI * 2); ctx.stroke();

    // Atmosphere glow and speed streaks increase with altitude and velocity.
    if (altitude < 160000) {
      const glow = ctx.createLinearGradient(0, earthTop - 80, 0, earthTop + 70);
      glow.addColorStop(0, "rgba(79,190,255,0)"); glow.addColorStop(.65, `rgba(66,183,255,${.08 + Math.min(.2, altitude / 500000)})`); glow.addColorStop(1, "rgba(79,190,255,0)");
      ctx.fillStyle = glow; ctx.fillRect(0, earthTop - 80, w, 150);
    }

    // Flight path trail.
    if (t && elapsed > 0) {
      ctx.strokeStyle = "rgba(255,178,91,.55)"; ctx.lineWidth = 2; ctx.setLineDash([5, 8]);
      ctx.beginPath(); ctx.moveTo(90, h - 92); ctx.quadraticCurveTo(w * .34, h * .54, camX - 12, camY + 25); ctx.stroke(); ctx.setLineDash([]);
    }

    // Rocket and spacecraft stack, camera-tracked in the centre of the frame.
    const rocketX = t ? camX : w * .50;
    const rocketY = t ? Math.max(88, camY) : h * .48;
    ctx.save(); ctx.translate(rocketX, rocketY); ctx.rotate(pitch);
    drawRocketStack(ctx, now, t, active, orbit, failed);
    ctx.restore();

    // Fairing halves peel away from the payload with independent tumble and drift.
    if (fairingAnimStart && now - fairingAnimStart < 2600) {
      const p = Math.min(1, (now - fairingAnimStart) / 2600);
      drawFairingHalf(ctx, rocketX, rocketY, pitch, -1, p);
      drawFairingHalf(ctx, rocketX, rocketY, pitch, 1, p);
    }

    // Spent booster visibly falls behind the active upper stack.
    if (stageAnimStart && separatedStageVisual && now - stageAnimStart < 3000) {
      const p = Math.min(1, (now - stageAnimStart) / 3000);
      ctx.save(); ctx.translate(rocketX - 34 - p * 95, rocketY + 60 + p * 125);
      ctx.rotate(-.25 - p * .9);
      drawSpentStage(ctx, separatedStageVisual, p);
      ctx.restore();
    }

    // Exhaust and ascent particles are animated continuously, not painted once.
    if (active) {
      for (let i = 0; i < 30; i++) {
        const p = (pulse * (1.1 + (i % 5) * .22) + i * .137) % 1;
        const spread = 10 + p * 48;
        const px = rocketX - Math.sin(pitch) * (70 + p * 150) + (Math.sin(i * 12.7 + pulse * 4) * spread);
        const py = rocketY + Math.cos(pitch) * (70 + p * 150) + p * 45;
        ctx.globalAlpha = (1 - p) * .65; ctx.fillStyle = i % 3 === 0 ? "#ffd27a" : "#ff7738";
        ctx.beginPath(); ctx.arc(px, py, 1.2 + (1 - p) * 2.8, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // HUD, event cues and launch status.
    ctx.fillStyle = "rgba(5,15,27,.76)"; ctx.fillRect(16, 14, 245, 58);
    ctx.strokeStyle = "rgba(87,205,239,.35)"; ctx.strokeRect(16, 14, 245, 58);
    ctx.fillStyle = "#8ddcf4"; ctx.font = "bold 11px Inter, sans-serif"; ctx.fillText("NOVALUX // LIVE ASCENT CAMERA", 28, 34);
    ctx.fillStyle = "#f3f8ff"; ctx.font = "12px Inter, sans-serif"; ctx.fillText(`ALT ${(altitude / 1000).toFixed(1)} km  ·  T+${elapsed.toFixed(0)} s`, 28, 55);
    const label = orbit ? "ORBIT ACHIEVED · SPACECRAFT READY" : failed ? "FLIGHT FAILURE" : active ? "POWERED ASCENT · CAMERA TRACKING" : t?.status === "COAST" ? "COAST / INSERTION CHECK" : "LAUNCH VEHICLE · READY";
    ctx.fillStyle = orbit ? "#7ce3bd" : failed ? "#ff8b8b" : "#ffcb83"; ctx.font = "bold 11px Inter, sans-serif";
    ctx.fillText(label, w - 300, 28);
    if (active) {
      ctx.fillStyle = "rgba(255,255,255,.08)"; ctx.fillRect(16, h - 22, w - 32, 5);
      ctx.fillStyle = "#ff9d49"; ctx.fillRect(16, h - 22, (w - 32) * Math.min(1, altitude / 180000), 5);
    }
  }

  function drawRocketStack(ctx, now, t, active, orbit, failed) {
    const stages = currentVehicle?.stages || [];
    const stageIndex = Math.min(t?.stageIndex ?? 0, Math.max(0, stages.length - 1));
    const visible = stages.slice(stageIndex);
    const bodyW = Math.max(13, Math.min(25, 12 + Math.sqrt(stages[stageIndex]?.area || 2) * 2.2));
    let y = 0;
    // Payload module and instrument bay.
    ctx.fillStyle = "#d8e8f3"; ctx.strokeStyle = "#6d91aa"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.roundRect(-bodyW * .53, -65, bodyW * 1.06, 23, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#3c829e"; ctx.fillRect(-bodyW * .35, -59, bodyW * .7, 8);
    ctx.fillStyle = "#8de7ff"; ctx.fillRect(-bodyW * .23, -47, bodyW * .46, 3);

    // Payload fairing nose cone while attached.
    if (t?.fairingAttached !== false) {
      ctx.fillStyle = "#e8f1f7"; ctx.strokeStyle = "#9bb6c8";
      ctx.beginPath(); ctx.moveTo(-bodyW * .76, -42); ctx.lineTo(0, -91); ctx.lineTo(bodyW * .76, -42); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(99,184,218,.22)"; ctx.beginPath(); ctx.moveTo(-bodyW * .45, -44); ctx.lineTo(0, -82); ctx.lineTo(0, -44); ctx.closePath(); ctx.fill();
    } else {
      ctx.fillStyle = "#f4c46e"; ctx.beginPath(); ctx.moveTo(-5, -43); ctx.lineTo(0, -54); ctx.lineTo(5, -43); ctx.fill();
    }

    y = -42;
    for (let i = visible.length - 1; i >= 0; i--) {
      const originalIndex = stageIndex + i;
      const st = visible[i];
      const len = 45 + Math.min(22, Math.sqrt(st.propellant) / 10);
      const width = bodyW * (1 + originalIndex * .09);
      ctx.fillStyle = originalIndex === stageIndex ? "#cbd8e2" : "#9aaebe";
      ctx.strokeStyle = "#5e778d"; ctx.lineWidth = 1;
      ctx.fillRect(-width / 2, y, width, len); ctx.strokeRect(-width / 2, y, width, len);
      ctx.fillStyle = originalIndex === stageIndex ? "#4c718b" : "#526c82";
      ctx.fillRect(-width / 2 - 2, y + len - 7, width + 4, 5);
      ctx.fillStyle = "rgba(255,255,255,.32)"; ctx.fillRect(-width * .28, y + 4, 2, len - 12);
      // Engine bells and fins.
      ctx.fillStyle = "#43576a"; ctx.fillRect(-width * .34, y + len - 1, width * .68, 10);
      ctx.fillStyle = "#8fa4b6";
      ctx.beginPath(); ctx.moveTo(-width / 2, y + len - 8); ctx.lineTo(-width / 2 - 7, y + len + 4); ctx.lineTo(-width / 2, y + len - 1); ctx.fill();
      ctx.beginPath(); ctx.moveTo(width / 2, y + len - 8); ctx.lineTo(width / 2 + 7, y + len + 4); ctx.lineTo(width / 2, y + len - 1); ctx.fill();
      y += len;
    }
    if (active) {
      const flicker = .82 + Math.sin(now / 31) * .12 + Math.sin(now / 17) * .06;
      const plume = 32 + Math.sin(now / 47) * 10 + (t?.throttle || 1) * 28;
      const baseY = y + 7;
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      const flame = ctx.createLinearGradient(0, baseY, 0, baseY + plume);
      flame.addColorStop(0, "#fff8c9"); flame.addColorStop(.22, "#ffe28a"); flame.addColorStop(.55, "#ff8a38"); flame.addColorStop(1, "rgba(255,66,25,0)");
      ctx.fillStyle = flame; ctx.beginPath(); ctx.moveTo(-bodyW * .3, baseY); ctx.quadraticCurveTo(-bodyW * .8 * flicker, baseY + plume * .5, 0, baseY + plume); ctx.quadraticCurveTo(bodyW * .8 * flicker, baseY + plume * .5, bodyW * .3, baseY); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "rgba(255,241,205,.7)"; ctx.beginPath(); ctx.ellipse(0, baseY + plume * .22, bodyW * .18, plume * .24, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else if (orbit) {
      ctx.fillStyle = "#9ceaff"; ctx.beginPath(); ctx.arc(0, y + 12, 3 + Math.sin(now / 180), 0, Math.PI * 2); ctx.fill();
    } else if (failed) {
      ctx.fillStyle = "#ff6464"; ctx.beginPath(); ctx.arc(0, y + 12, 4, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawFairingHalf(ctx, x, y, pitch, side, progress) {
    const spread = 24 + progress * 120;
    const fall = progress * 65;
    ctx.save(); ctx.translate(x + side * spread, y - 54 + fall); ctx.rotate(pitch + side * progress * 1.8);
    ctx.globalAlpha = 1 - progress * .72; ctx.fillStyle = "#d9e8f2"; ctx.strokeStyle = "#86a9be"; ctx.lineWidth = 1.4;
    ctx.beginPath();
    if (side < 0) { ctx.moveTo(0, 0); ctx.lineTo(-9, -37); ctx.lineTo(-1, -51); ctx.lineTo(1, 0); }
    else { ctx.moveTo(0, 0); ctx.lineTo(9, -37); ctx.lineTo(1, -51); ctx.lineTo(-1, 0); }
    ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  }

  function drawSpentStage(ctx, stage, progress) {
    const width = Math.max(12, Math.min(24, 12 + Math.sqrt(stage.area || 2) * 2.2));
    ctx.globalAlpha = 1 - progress * .75; ctx.fillStyle = "#879bad"; ctx.strokeStyle = "#d2e1ea";
    ctx.fillRect(-width / 2, -28, width, 58); ctx.strokeRect(-width / 2, -28, width, 58);
    ctx.fillStyle = "#465c70"; ctx.fillRect(-width * .35, 24, width * .7, 8);
    ctx.fillStyle = "rgba(255,130,63,.6)"; ctx.beginPath(); ctx.moveTo(-4, 32); ctx.lineTo(0, 48 + progress * 15); ctx.lineTo(4, 32); ctx.fill();
    ctx.globalAlpha = 1;
  }

  buildPanel();
