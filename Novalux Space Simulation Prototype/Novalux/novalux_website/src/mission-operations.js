import { LAUNCH_VEHICLES } from "./physics/launch-vehicle.js";

const STORE = "novalux-mission-operations-v1";
const $ = (id) => document.getElementById(id);
const BODIES = Object.freeze({
  earth: { name: "Earth", radius: 6_371_000, mu: 3.986004418e14, min: 160_000, max: 42_000_000, defaultAltitude: 400_000 },
  moon: { name: "Moon", radius: 1_737_400, mu: 4.9048695e12, min: 10_000, max: 500_000, defaultAltitude: 100_000 },
  mars: { name: "Mars", radius: 3_389_500, mu: 4.282837e13, min: 80_000, max: 1_000_000, defaultAltitude: 250_000 }
});
const DATA_RATES_MB_DAY = Object.freeze({
  "Multispectral camera": 80, "High-resolution camera": 300,
  "Scientific sensor suite": 120, "Spectrometer": 60, "Radar instrument": 500
});
const STATIONS = Object.freeze({
  regional: { name: "Regional Ground Station", dish: 12, gain: 0, contactMinutes: 90, noiseFigure: 2.5, description: "A regional station for Earth-orbit mission exercises." },
  deep34: { name: "Deep-Space Station · 34 m class", dish: 34, gain: 0, contactMinutes: 120, noiseFigure: 1.2, description: "A medium deep-space antenna class for lunar and interplanetary exercises." },
  deep70: { name: "Deep-Space Station · 70 m class", dish: 70, gain: 0, contactMinutes: 180, noiseFigure: 0.8, description: "A large deep-space antenna class with stronger modeled receive gain." }
});
const DEFAULTS = { body: "earth", altitude: 400_000, inclination: 51.6, launcher: "Medium launch vehicle", station: "deep34", frequency: 8.4, txPower: 100, txGain: 35, bitrate: 10, contactMinutes: 120, dataOverride: 0 };
let settings = { ...DEFAULTS };
let groundDataTouched = false;
const fmt = (n, d = 1) => Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: d }) : "—";
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function calculateCircularOrbit(bodyKey, altitudeM, inclinationDeg = 0) {
  const body = BODIES[bodyKey];
  const altitude = Number(altitudeM);
  const inclination = Number(inclinationDeg);
  if (!body || !Number.isFinite(altitude) || altitude < body.min || altitude > body.max || !Number.isFinite(inclination) || inclination < 0 || inclination > 180) return { valid: false, reason: "Orbit altitude or inclination is outside this educational model's supported range." };
  const radius = body.radius + altitude;
  const speed = Math.sqrt(body.mu / radius);
  const period = 2 * Math.PI * Math.sqrt(radius ** 3 / body.mu);
  const escape = Math.sqrt(2 * body.mu / radius);
  return { valid: true, body: body.name, altitude, radius, inclination, circularSpeed: speed, periodSeconds: period, periodMinutes: period / 60, escapeSpeed: escape, orbitalEnergy: -body.mu / (2 * radius) };
}

export function evaluateSpacecraftDesign(design, launcherName = design?.selections?.launcher) {
  if (!design?.components || !design?.selections) return { complete: false, missing: ["Spacecraft design unavailable"] };
  const categories = ["platform", "propulsion", "power", "instrument", "communication", "launcher"];
  const selected = {};
  const missing = [];
  for (const category of categories) {
    const name = category === "launcher" ? (launcherName || design.selections.launcher) : design.selections[category];
    const item = design.components[category]?.items?.[name];
    if (!item) missing.push(category);
    else selected[category] = { name, ...item };
  }
  if (missing.length) return { complete: false, missing };
  const s = selected;
  const dryMass = [s.platform, s.propulsion, s.power, s.instrument, s.communication].reduce((n, x) => n + (Number(x.mass) || 0), 0);
  const powerDemand = [s.platform, s.propulsion, s.instrument, s.communication].reduce((n, x) => n + (Number(x.powerDemand ?? x.power) || 0), 0);
  const powerOutput = Number(s.power.output) || 0;
  const componentCost = categories.slice(0, 5).reduce((n, key) => n + (Number(s[key].cost) || 0), 0);
  const launchCost = Number(s.launcher.cost) || 0;
  const capacity = Number(s.launcher.capacity) || LAUNCH_VEHICLES[launcherName]?.payloadCapacity || 0;
  return { complete: true, selected: s, dryMass, powerDemand, powerOutput, powerMargin: powerOutput - powerDemand, powerReservePercent: powerDemand > 0 ? (powerOutput / powerDemand - 1) * 100 : 0, componentCost, launchCost, totalCost: componentCost + launchCost, capacity, massMargin: capacity - dryMass, compatible: dryMass <= capacity };
}

export function calculateLinkBudget({ distanceKm, frequencyGHz, txPowerW, txGainDbi, stationDishM, stationGainDbi = 0, bitrateKbps, noiseFigureDb = 1.5 }) {
  const v = [distanceKm, frequencyGHz, txPowerW, txGainDbi, stationDishM, bitrateKbps, noiseFigureDb];
  if (v.some(x => !Number.isFinite(Number(x))) || distanceKm <= 0 || frequencyGHz <= 0 || txPowerW <= 0 || stationDishM <= 0 || bitrateKbps <= 0) return { valid: false, reason: "Enter positive values for distance, frequency, transmitter power, dish diameter and data rate." };
  const c = 299_792_458;
  const wavelength = c / (frequencyGHz * 1e9);
  const dishGain = 10 * Math.log10(0.55 * (Math.PI * stationDishM / wavelength) ** 2) + stationGainDbi;
  const fspl = 92.45 + 20 * Math.log10(distanceKm) + 20 * Math.log10(frequencyGHz);
  const eirp = 10 * Math.log10(txPowerW * 1000) + txGainDbi;
  const receivedDbm = eirp - fspl + dishGain;
  const bandwidthHz = bitrateKbps * 1000;
  const noiseDbm = -174 + 10 * Math.log10(bandwidthHz) + noiseFigureDb;
  const snrDb = receivedDbm - noiseDbm;
  return { valid: true, wavelength, dishGain, fspl, eirp, receivedDbm, noiseDbm, snrDb, linkMarginDb: snrDb - 6, estimatedCapacityKbps: bitrateKbps };
}

function readDesign() { return window.NOVALUX?.getDesign?.() || null; }
function readMission() {
  const key = $("mp-mission")?.value || readDesign()?.mission || "earth";
  const duration = Math.max(1, Number($("mp-duration")?.value || 12));
  const objective = $("mp-objective")?.value || readDesign()?.objective || "Mission objective";
  return { key: BODIES[key] ? key : "earth", duration, objective };
}
function loadSettings() {
  try { const saved = JSON.parse(localStorage.getItem(STORE) || "null"); if (saved && saved.version === 1) settings = { ...DEFAULTS, ...saved.settings }; } catch { /* use defaults */ }
}
function saveSettings() {
  try { localStorage.setItem(STORE, JSON.stringify({ version: 1, settings, updatedAt: new Date().toISOString() })); } catch { setStatus("Settings could not be saved in this browser. Export the mission plan to keep a copy."); }
}
function setStatus(message) { const el = $("ops-status"); if (el) el.textContent = message; }
function renderLauncherOptions() {
  const design = readDesign();
  const select = $("ops-launcher");
  if (!select) return;
  const names = Object.keys(LAUNCH_VEHICLES);
  select.innerHTML = names.map(name => `<option value="${esc(name)}">${esc(name)} · ${LAUNCH_VEHICLES[name].payloadCapacity.toLocaleString()} kg</option>`).join("");
  if (design?.selections?.launcher && names.includes(design.selections.launcher) && !settings._launcherTouched) settings.launcher = design.selections.launcher;
  select.value = names.includes(settings.launcher) ? settings.launcher : names[1];
}
function renderOrbit() {
  const mission = readMission();
  const body = BODIES[mission.key];
  const alt = Number($("ops-altitude")?.value ?? settings.altitude);
  const inc = Number($("ops-inclination")?.value ?? settings.inclination);
  settings.body = mission.key; settings.altitude = alt; settings.inclination = inc;
  const result = calculateCircularOrbit(mission.key, alt, inc);
  const altitudeInput = $("ops-altitude");
  if (altitudeInput) { altitudeInput.min = body.min; altitudeInput.max = body.max; }
  $("ops-altitude-value").textContent = `${fmt(alt / 1000, 0)} km`;
  $("ops-inclination-value").textContent = `${fmt(inc, 1)}°`;
  const orbitClass = mission.key === "earth" ? (alt < 2_000_000 ? "LEO" : alt < 35_786_000 ? "MEO" : "GEO / HIGH EARTH ORBIT") : `${body.name.toUpperCase()} PARKING ORBIT`;
  $("ops-orbit-class").textContent = orbitClass;
  if (result.valid) {
    $("ops-orbit-metrics").innerHTML = [["CIRCULAR SPEED", `${fmt(result.circularSpeed / 1000, 3)} km/s`], ["ORBITAL PERIOD", `${fmt(result.periodMinutes / 60, 2)} hours`], ["ESCAPE SPEED", `${fmt(result.escapeSpeed / 1000, 3)} km/s`], ["ORBIT RADIUS", `${fmt(result.radius / 1000, 0)} km`]].map(([a,b]) => `<div class="ops-metric"><small>${a}</small><strong>${esc(b)}</strong></div>`).join("");
    $("ops-orbit-note").textContent = mission.key === "earth" ? "Earth-centered two-body circular orbit estimate. This is a planning calculation, not a launch trajectory or insertion guarantee." : `${body.name}-centered two-body circular orbit estimate. Earth-to-destination transfer, capture and landing trajectories are not simulated in this planner.`;
  } else {
    $("ops-orbit-metrics").innerHTML = `<p class="ops-warning">${esc(result.reason)}</p>`;
  }
  return result;
}
function renderLaunch() {
  const design = readDesign();
  const launch = settings.launcher;
  const resource = evaluateSpacecraftDesign(design, launch);
  const vehicle = LAUNCH_VEHICLES[launch];
  const metrics = $("ops-launch-metrics");
  if (!vehicle) return;
  const mass = resource.complete ? resource.dryMass : NaN;
  const compatible = resource.complete && mass <= vehicle.payloadCapacity;
  metrics.innerHTML = [["PAYLOAD CAPACITY", `${vehicle.payloadCapacity.toLocaleString()} kg`], ["SPACECRAFT DRY MASS", Number.isFinite(mass) ? `${fmt(mass)} kg` : "Incomplete design"], ["PAYLOAD MARGIN", Number.isFinite(mass) ? `${fmt(vehicle.payloadCapacity - mass)} kg` : "—"], ["MODELED LAUNCH COST", `${fmt(resource.complete ? resource.launchCost : (design?.components?.launcher?.items?.[launch]?.cost || 0))} MCr`]].map(([a,b]) => `<div class="ops-metric"><small>${a}</small><strong>${esc(b)}</strong></div>`).join("");
  const verdict = $("ops-launch-verdict");
  verdict.className = `ops-verdict ${compatible ? "ok" : "warn"}`;
  verdict.textContent = !resource.complete ? `Complete the spacecraft designer first. Missing: ${resource.missing.join(", ")}.` : compatible ? `${launch} is compatible with the current modeled payload mass.` : `Payload exceeds this vehicle's modeled capacity by ${fmt(mass - vehicle.payloadCapacity)} kg. Choose a larger vehicle or reduce spacecraft mass.`;
  $("ops-apply-launcher").disabled = !design?.components?.launcher?.items?.[launch];
  return resource;
}
function populateTradeOptions() {
  const design = readDesign();
  if (!design) return;
  for (const cat of ["propulsion", "power", "instrument", "communication", "launcher"]) {
    const select = $(`trade-${cat}`);
    const names = Object.keys(design.components?.[cat]?.items || {});
    const previous = select.value;
    select.innerHTML = names.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join("");
    select.value = names.includes(previous) ? previous : (design.selections?.[cat] || names[0] || "");
  }
}

function renderTrade() {
  const design = readDesign();
  if (!design) { $("trade-current").innerHTML = `<p class="ops-warning">Spacecraft Designer connection unavailable.</p>`; return; }
  const current = evaluateSpacecraftDesign(design);
  const categories = ["propulsion", "power", "instrument", "communication", "launcher"];
  const summary = (r) => r.complete ? [["DRY MASS", `${fmt(r.dryMass)} kg`], ["POWER", `${fmt(r.powerOutput)} W generated / ${fmt(r.powerDemand)} W used`], ["POWER RESERVE", `${fmt(r.powerReservePercent)}%`], ["TOTAL MODELED COST", `${fmt(r.totalCost)} MCr`], ["LAUNCH MARGIN", `${fmt(r.massMargin)} kg`]].map(([a,b])=>`<div class="ops-trade-row"><span>${a}</span><b>${esc(b)}</b></div>`).join("") : `<p class="ops-warning">Incomplete design: ${r.missing.join(", ")}</p>`;
  $("trade-current").innerHTML = summary(current);
  const preview = { ...design, selections: { ...design.selections } };
  for (const cat of categories) preview.selections[cat] = $(`trade-${cat}`).value;
  const alternative = evaluateSpacecraftDesign(preview);
  $("trade-preview").innerHTML = summary(alternative);
  const rows = [];
  if (current.complete && alternative.complete) {
    for (const [label, a, b, unit] of [["Dry mass",current.dryMass,alternative.dryMass,"kg"],["Power demand",current.powerDemand,alternative.powerDemand,"W"],["Power reserve",current.powerReservePercent,alternative.powerReservePercent,"%"],["Total cost",current.totalCost,alternative.totalCost,"MCr"],["Launch margin",current.massMargin,alternative.massMargin,"kg"]]) rows.push(`<div class="ops-delta-row"><span>${label}</span><b>${b-a>=0?"+":""}${fmt(b-a)} ${unit}</b></div>`);
    $("trade-deltas").innerHTML = rows.join("");
    $("trade-verdict").textContent = alternative.compatible ? (alternative.powerMargin >= 0 ? "Preview meets modeled payload and power checks." : "Preview fits the launch vehicle, but modeled power demand exceeds generation.") : "Preview exceeds the selected launch vehicle payload capacity.";
  } else { $("trade-deltas").innerHTML = ""; $("trade-verdict").textContent = "Complete all six spacecraft categories to compare configurations."; }
}
function renderGround() {
  const mission = readMission();
  const station = STATIONS[settings.station] || STATIONS.deep34;
  const distances = { earth: 2_000, moon: 384_400, mars: 150_000_000 };
  const distance = Number($("ground-distance")?.value) || distances[mission.key];
  const rate = Number($("ground-rate")?.value) || settings.bitrate;
  const power = Number($("ground-power")?.value) || settings.txPower;
  const gain = Number($("ground-tx-gain")?.value) || settings.txGain;
  const frequency = Number($("ground-frequency")?.value) || settings.frequency;
  const stationKey = $("ground-station")?.value || settings.station;
  settings.station = stationKey; settings.bitrate = rate; settings.txPower = power; settings.txGain = gain; settings.frequency = frequency; settings.contactMinutes = Number($("ground-contact")?.value) || station.contactMinutes;
  const activeStation = STATIONS[stationKey] || station;
  const link = calculateLinkBudget({ distanceKm: distance, frequencyGHz: frequency, txPowerW: power, txGainDbi: gain, stationDishM: activeStation.dish, stationGainDbi: activeStation.gain, bitrateKbps: rate, noiseFigureDb: activeStation.noiseFigure });
  const instrument = readDesign()?.selections?.instrument || "Multispectral camera";
  const generated = Number($("ground-data")?.value) || DATA_RATES_MB_DAY[instrument] || 100;
  const contactSeconds = settings.contactMinutes * 60;
  const capacityMB = rate * 1000 * contactSeconds / 8 / 1e6;
  const requiredMinutes = generated * 8 * 1e6 / (rate * 1000) / 60;
  $("ground-station-description").textContent = activeStation.description;
  $("ground-distance-value").textContent = `${fmt(distance, 0)} km`;
  $("ground-data-value").textContent = `${fmt(generated, 0)} MB/day`;
  $("ground-contact-value").textContent = `${fmt(settings.contactMinutes, 0)} min/day`;
  $("ground-link-metrics").innerHTML = link.valid ? [["FREE-SPACE PATH LOSS", `${fmt(link.fspl, 1)} dB`], ["RECEIVED POWER", `${fmt(link.receivedDbm, 1)} dBm`], ["MODELED SNR", `${fmt(link.snrDb, 1)} dB`], ["LINK MARGIN", `${fmt(link.linkMarginDb, 1)} dB`], ["DOWNLINK CAPACITY", `${fmt(capacityMB, 1)} MB/day`], ["TIME TO DUMP DAILY DATA", `${fmt(requiredMinutes, 1)} min/day`]].map(([a,b])=>`<div class="ops-metric"><small>${a}</small><strong>${esc(b)}</strong></div>`).join("") : `<p class="ops-warning">${esc(link.reason)}</p>`;
  const ok = link.valid && link.linkMarginDb >= 0 && capacityMB >= generated;
  const verdict = $("ground-verdict"); verdict.className = `ops-verdict ${ok ? "ok" : "warn"}`;
  verdict.textContent = !link.valid ? link.reason : `${ok ? "Modeled link and daily data volume are within the selected assumptions." : "Review the link margin or downlink capacity. The modeled station may not clear the daily data backlog."} This is a static educational link-budget estimate, not a pass prediction.`;
}
function exportPlan() {
  const data = { format: "NOVALUX-MISSION-OPERATIONS", version: 1, mission: readMission(), settings, design: readDesign(), exportedAt: new Date().toISOString(), modelScope: "Educational estimates; not certified mission analysis." };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "novalux-mission-operations.json"; a.click(); URL.revokeObjectURL(url);
}
function refreshAll() { renderOrbit(); renderLaunch(); renderTrade(); renderGround(); }
function init() {
  if (!$ ("ops-launcher")) return;
  loadSettings(); renderLauncherOptions(); populateTradeOptions();
  $("ops-launcher").value = settings.launcher;
  $("ops-altitude").value = settings.altitude;
  $("ops-inclination").value = settings.inclination;
  $("ground-station").value = settings.station;
  $("ground-frequency").value = settings.frequency;
  $("ground-power").value = settings.txPower;
  $("ground-tx-gain").value = settings.txGain;
  $("ground-rate").value = settings.bitrate;
  $("ground-contact").value = settings.contactMinutes;
  const mission = readMission(); $("ground-distance").value = mission.key === "earth" ? 2_000 : mission.key === "moon" ? 384_400 : 150_000_000;
  const instrument = readDesign()?.selections?.instrument || "Multispectral camera"; $("ground-data").value = DATA_RATES_MB_DAY[instrument] || 100;
  $("ops-launcher").addEventListener("change", () => { settings.launcher = $("ops-launcher").value; settings._launcherTouched = true; saveSettings(); renderLaunch(); renderTrade(); });
  $("ops-altitude").addEventListener("input", () => { settings.altitude = Number($("ops-altitude").value); renderOrbit(); saveSettings(); });
  $("ops-inclination").addEventListener("input", () => { settings.inclination = Number($("ops-inclination").value); renderOrbit(); saveSettings(); });
  $("ops-apply-launcher").addEventListener("click", () => { const ok = window.NOVALUX?.selectComponent?.("launcher", settings.launcher); setStatus(ok ? `${settings.launcher} applied to the existing spacecraft designer.` : "Could not apply the selected launch vehicle."); renderLaunch(); renderTrade(); });
  ["trade-propulsion", "trade-power", "trade-instrument", "trade-communication", "trade-launcher"].forEach(id => $(id).addEventListener("change", renderTrade));
  $("trade-apply").addEventListener("click", () => { let changed = 0; for (const cat of ["propulsion", "power", "instrument", "communication", "launcher"]) if (window.NOVALUX?.selectComponent?.(cat, $(`trade-${cat}`).value)) changed++; setStatus(`${changed} trade-study selections applied to the spacecraft designer.`); refreshAll(); });
  ["ground-station", "ground-distance", "ground-frequency", "ground-power", "ground-tx-gain", "ground-rate", "ground-contact", "ground-data"].forEach(id => $(id).addEventListener("input", () => { if (id === "ground-data") groundDataTouched = true; renderGround(); saveSettings(); }));
  $("ground-station").addEventListener("change", () => { renderGround(); saveSettings(); });
  $("ops-export").addEventListener("click", exportPlan);
  $("ops-refresh").addEventListener("click", refreshAll);
  document.addEventListener("novalux:designchange", () => {
    const activeLauncher = readDesign()?.selections?.launcher;
    if (activeLauncher && LAUNCH_VEHICLES[activeLauncher]) settings.launcher = activeLauncher;
    renderLauncherOptions();
    populateTradeOptions();
    if (!groundDataTouched) {
      const instrument = readDesign()?.selections?.instrument || "Multispectral camera";
      $("ground-data").value = DATA_RATES_MB_DAY[instrument] || 100;
    }
    refreshAll();
  });
  $("mp-mission")?.addEventListener("change", () => {
    const body = BODIES[$("mp-mission").value] || BODIES.earth;
    if (settings.altitude < body.min || settings.altitude > body.max) settings.altitude = body.defaultAltitude;
    $("ops-altitude").value = settings.altitude;
    const distances = { earth: 2_000, moon: 384_400, mars: 150_000_000 };
    $("ground-distance").value = distances[$("mp-mission").value] || distances.earth;
    refreshAll(); saveSettings();
  });
  ["mp-objective", "mp-duration"].forEach(id => $(id)?.addEventListener("change", refreshAll));
  document.addEventListener("novalux:viewchange", () => { populateTradeOptions(); refreshAll(); });
  const observer = new MutationObserver(() => { if ($("mission-planner-view")?.classList.contains("active")) refreshAll(); });
  observer.observe($("mission-planner-view"), { attributes: true, attributeFilter: ["class"] });
  refreshAll();
}
if (typeof document !== "undefined") { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init(); }
