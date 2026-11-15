
"use strict";

import { PHYSICS } from "./physics/constants.js";
import { OrbitalEngine, THRUST_MODES } from "./physics/orbital-engine.js";
import { hohmannTransfer } from "./physics/orbit-elements.js";
import { buildShip } from "./ship/ship-model.js";
import { OrbitalScene } from "./visualization/scene.js";

/*
=========================================================
NOVALUX ALPHA 0.3
ORBITAL SIMULATION BOOTSTRAP
=========================================================
*/

const $ = id => document.getElementById(id);

const engine = new OrbitalEngine();

// Sim time to stop at when "warp to apsis" is used; null when inactive.
let warpTarget = null;
let warpLabel = "";
let designChangedWhileFlying = false;

let scene = null;

let animationFrame = null;
let previousFrame = 0;

let simulationSpeed = 500;
let simulationActive = false;
let initialized = false;

const ui = {
    altitude: null,
    velocity: null,
    elapsed: null,
    period: null,
    status: null,
    speed: null,
    start: null,
    reset: null,
    speedLabel: null,
    hazardList: null,

    shipName: null, shipMass: null, shipDry: null, shipProp: null,
    shipPropBar: null, shipDv: null, shipBattery: null, shipBatteryBar: null,
    shipPower: null, shipThrust: null, shipLaunch: null,
    shipWarnings: null, shipNotice: null,

    orbitPeri: null, orbitApo: null, orbitEcc: null, orbitInc: null,
    orbitSpeeds: null,

    throttle: null, throttleLabel: null, modes: null, instrument: null,

    planAltitude: null, planDv: null, planTotal: null, planTime: null,
    planBurn1: null, planBurn2: null, warpPeri: null, warpApo: null
};

/*
=========================================================
1. INTERFACE CREATION
=========================================================
*/

function createInterface() {
    const simulationView = $("simulation-view");

    if (!simulationView) {
        throw new Error("Simulation view not found.");
    }

    let workspace = $("novalux-orbital-workspace");

    if (!workspace) {
        workspace = document.createElement("section");

        workspace.id = "novalux-orbital-workspace";

        workspace.innerHTML = `
            <div class="orbital-heading">
                <div>
                    <div class="eyebrow">
                        NOVALUX // ORBITAL MECHANICS
                    </div>

                    <h3>Earth Orbital Simulation</h3>

                    <p>
                        Two-body gravity · atmospheric drag ·
                        thrust and propellant · RK4 integration
                    </p>
                </div>

                <span id="orbital-status"
                      class="orbital-status">
                    INITIALIZED
                </span>
            </div>

            <div class="orbital-layout">

                <div class="orbital-viewport">
                    <div id="orbital-canvas"></div>

                    <div class="orbital-overlay">
                        <span>LIVE 3D SIMULATION</span>
                        <span>DRAG TO ROTATE · SCROLL TO ZOOM</span>
                    </div>
                </div>

                <div class="orbital-dashboard">

                    <div class="orbital-panel">
                        <div class="orbital-panel-title">
                            SPACECRAFT <span id="ship-name" class="orbital-tag"></span>
                        </div>

                        <div class="orbital-metric"><span>MASS (DRY)</span>
                            <strong><b id="ship-mass">--</b> <small id="ship-dry"></small></strong></div>

                        <div class="orbital-metric"><span>PROPELLANT</span>
                            <strong id="ship-prop">--</strong></div>
                        <div class="orbital-bar"><i id="ship-prop-bar"></i></div>

                        <div class="orbital-metric"><span>Δv REMAINING</span>
                            <strong id="ship-dv">--</strong></div>

                        <div class="orbital-metric"><span>BATTERY</span>
                            <strong id="ship-battery">--</strong></div>
                        <div class="orbital-bar power"><i id="ship-battery-bar"></i></div>

                        <div class="orbital-metric"><span>POWER GEN / USE</span>
                            <strong id="ship-power">--</strong></div>

                        <div class="orbital-metric"><span>THRUST</span>
                            <strong id="ship-thrust">--</strong></div>

                        <div class="orbital-metric"><span>LAUNCH MARGIN</span>
                            <strong id="ship-launch">--</strong></div>

                        <div id="ship-warnings" class="orbital-warnings"></div>
                        <div id="ship-notice" class="orbital-note"></div>
                    </div>

                    <div class="orbital-panel">
                        <div class="orbital-panel-title">ORBIT</div>

                        <div class="orbital-metric"><span>ALTITUDE</span>
                            <strong id="orbital-altitude">400.00 km</strong></div>
                        <div class="orbital-metric"><span>VELOCITY</span>
                            <strong id="orbital-velocity">7.670 km/s</strong></div>
                        <div class="orbital-metric"><span>PERIAPSIS</span>
                            <strong id="orbit-peri">--</strong></div>
                        <div class="orbital-metric"><span>APOAPSIS</span>
                            <strong id="orbit-apo">--</strong></div>
                        <div class="orbital-metric"><span>ECCENTRICITY</span>
                            <strong id="orbit-ecc">--</strong></div>
                        <div class="orbital-metric"><span>INCLINATION</span>
                            <strong id="orbit-inc">--</strong></div>
                        <div class="orbital-metric"><span>ORBITAL PERIOD</span>
                            <strong id="orbital-period">92.6 min</strong></div>
                        <div class="orbital-metric"><span>CIRC. / ESCAPE SPEED</span>
                            <strong id="orbit-speeds">--</strong></div>
                        <div class="orbital-metric"><span>ELAPSED TIME</span>
                            <strong id="orbital-elapsed">00:00:00</strong></div>
                    </div>

                    <div class="orbital-panel">
                        <div class="orbital-panel-title">FLIGHT CONTROLS</div>

                        <label class="orbital-speed-label">
                            THROTTLE
                            <strong id="throttle-label">0%</strong>
                        </label>
                        <input type="range" id="throttle" min="0" max="100" step="1" value="0">

                        <div class="orbital-modes" id="thrust-modes"></div>

                        <label class="orbital-check">
                            <input type="checkbox" id="instrument-toggle" checked>
                            Science instrument powered
                        </label>

                        <div class="orbital-hint">
                            Keys: <b>Z</b> full · <b>X</b> cut · <b>W/S</b> ±10% · <b>1–7</b> direction
                        </div>
                    </div>

                    <div class="orbital-panel">
                        <div class="orbital-panel-title">MANEUVER PLANNER</div>

                        <label class="orbital-field">
                            Target circular altitude (km)
                            <input type="number" id="plan-altitude" min="160" max="35786" step="10" value="800">
                        </label>

                        <div class="orbital-metric"><span>Δv 1 / Δv 2</span>
                            <strong id="plan-dv">--</strong></div>
                        <div class="orbital-metric"><span>TOTAL vs AVAILABLE</span>
                            <strong id="plan-total">--</strong></div>
                        <div class="orbital-metric"><span>BURN 1 DURATION</span>
                            <strong id="plan-time">--</strong></div>

                        <div class="orbital-row">
                            <button type="button" id="plan-burn1" class="orbital-button">BURN Δv1</button>
                            <button type="button" id="plan-burn2" class="orbital-button">BURN Δv2</button>
                        </div>
                        <div class="orbital-row">
                            <button type="button" id="warp-peri" class="orbital-button">WARP TO PERIAPSIS</button>
                            <button type="button" id="warp-apo" class="orbital-button">WARP TO APOAPSIS</button>
                        </div>
                        <div class="orbital-hint">
                            Burn Δv1 at periapsis, warp to apoapsis, then burn Δv2.
                            Burns cut off automatically at the planned Δv.
                        </div>
                    </div>

                    <div class="orbital-panel">
                        <div class="orbital-panel-title">
                            NEARBY ORBITAL OBJECTS
                        </div>

                        <div id="orbital-hazard-list">
                            <div class="hazard-empty">
                                Initializing orbital environment...
                            </div>
                        </div>
                    </div>

                    <div class="orbital-panel">

                        <div class="orbital-panel-title">
                            SIMULATION CONTROL
                        </div>

                        <button
                            type="button"
                            id="orbital-start"
                            class="orbital-button primary"
                        >
                            START SIMULATION
                        </button>

                        <button
                            type="button"
                            id="orbital-reset"
                            class="orbital-button"
                        >
                            RESET ORBIT
                        </button>

                        <label class="orbital-speed-label">
                            TIME ACCELERATION

                            <strong id="orbital-speed-label">
                                500×
                            </strong>
                        </label>

                        <input
                            type="range"
                            id="orbital-speed"
                            min="1"
                            max="1000"
                            step="1"
                            value="500"
                        >

                        <div class="orbital-speed-range">
                            <span>1×</span>
                            <span>1000×</span>
                        </div>

                    </div>

                </div>
            </div>

            <div class="orbital-notice">
                <strong>SIMULATION NOTES</strong>

                <p>
                    Earth is a point mass with an exponential
                    atmosphere (drag below ~1000 km; burn-up below
                    80 km) and a cylindrical shadow for eclipses.
                    Attitude control is ideal: the ship points
                    instantly in the chosen direction. Electric
                    thrust is game-scaled so burns are playable.
                    Oblateness, third-body effects and solar
                    pressure are not modelled. Object sizes are
                    enlarged for visibility. Closest-approach
                    predictions use simplified relative motion.
                </p>
            </div>
        `;

        const existingPanel = simulationView.querySelector(
            ".simulation-panel"
        );

        if (existingPanel) {
            existingPanel.insertAdjacentElement(
                "afterend",
                workspace
            );
        } else {
            simulationView.appendChild(workspace);
        }
    }

    // Always connect UI references, even if workspace exists.
    ui.altitude = $("orbital-altitude");
    ui.velocity = $("orbital-velocity");
    ui.elapsed = $("orbital-elapsed");
    ui.period = $("orbital-period");

    ui.status = $("orbital-status");
    ui.speed = $("orbital-speed");
    ui.start = $("orbital-start");
    ui.reset = $("orbital-reset");

    ui.speedLabel = $("orbital-speed-label");
    ui.hazardList = $("orbital-hazard-list");

    ui.shipName = $("ship-name");
    ui.shipMass = $("ship-mass");
    ui.shipDry = $("ship-dry");
    ui.shipProp = $("ship-prop");
    ui.shipPropBar = $("ship-prop-bar");
    ui.shipDv = $("ship-dv");
    ui.shipBattery = $("ship-battery");
    ui.shipBatteryBar = $("ship-battery-bar");
    ui.shipPower = $("ship-power");
    ui.shipThrust = $("ship-thrust");
    ui.shipLaunch = $("ship-launch");
    ui.shipWarnings = $("ship-warnings");
    ui.shipNotice = $("ship-notice");

    ui.orbitPeri = $("orbit-peri");
    ui.orbitApo = $("orbit-apo");
    ui.orbitEcc = $("orbit-ecc");
    ui.orbitInc = $("orbit-inc");
    ui.orbitSpeeds = $("orbit-speeds");

    ui.throttle = $("throttle");
    ui.throttleLabel = $("throttle-label");
    ui.modes = $("thrust-modes");
    ui.instrument = $("instrument-toggle");

    ui.planAltitude = $("plan-altitude");
    ui.planDv = $("plan-dv");
    ui.planTotal = $("plan-total");
    ui.planTime = $("plan-time");
    ui.planBurn1 = $("plan-burn1");
    ui.planBurn2 = $("plan-burn2");
    ui.warpPeri = $("warp-peri");
    ui.warpApo = $("warp-apo");

    for (const [name, element] of Object.entries(ui)) {
        if (!element) {
            throw new Error(
                `Orbital interface element missing: ${name}`
            );
        }
    }
}

/*
=========================================================
2. THREE.JS SCENE
=========================================================
*/

function initializeScene() {
    const container = $("orbital-canvas");

    if (!container) {
        throw new Error(
            "Orbital canvas container not found."
        );
    }

    if (scene) {
        scene.destroy();
        scene = null;
    }

    scene = new OrbitalScene(container);

    refreshScene();
    scene.render();
}

function refreshScene() {
    if (!scene) return;

    const telemetry = engine.getTelemetry();

    scene.updateSpacecraft(telemetry.position);
    scene.updateHazards(telemetry.hazards);
}

/*
=========================================================
3. TIME FORMATTING
=========================================================
*/

function formatElapsedTime(seconds) {
    const total = Math.floor(seconds);

    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const remaining = total % 60;

    return [hours, minutes, remaining]
        .map(value => String(value).padStart(2, "0"))
        .join(":");
}

/*
=========================================================
4. TELEMETRY
=========================================================
*/

const MODE_LABELS = {
    "hold": "HOLD",
    "prograde": "PROGRADE",
    "retrograde": "RETROGRADE",
    "radial-out": "RADIAL OUT",
    "radial-in": "RADIAL IN",
    "normal": "NORMAL",
    "anti-normal": "ANTI-NORMAL"
};

function km(value, digits = 1) {
    return Number.isFinite(value)
        ? (value / 1000).toFixed(digits) + " km"
        : "OPEN";
}

function describeCollision(collision) {
    if (!collision) return "";

    if (collision.type === "atmosphere") {
        return "Burned up in the atmosphere.";
    }

    if (collision.type === "earth") {
        return "Impact with Earth.";
    }

    if (Number.isFinite(collision.relativeSpeed)) {
        const energyMJ = collision.impactEnergy / 1e6;
        return `Collision with ${collision.name} at ` +
            `${(collision.relativeSpeed / 1000).toFixed(1)} km/s ` +
            `(${energyMJ.toFixed(0)} MJ).`;
    }

    return `Collision: ${collision.name}.`;
}

function updateTelemetry() {
    if (!ui.altitude) return;

    const telemetry = engine.getTelemetry();
    const ship = telemetry.ship;
    const orbit = telemetry.orbit;

    ui.altitude.textContent =
        (telemetry.altitude / 1000).toFixed(2) + " km";

    ui.velocity.textContent =
        (telemetry.speed / 1000).toFixed(3) + " km/s";

    ui.elapsed.textContent =
        formatElapsedTime(telemetry.elapsedTime);

    ui.period.textContent =
        Number.isFinite(telemetry.orbitalPeriod)
            ? (telemetry.orbitalPeriod / 60).toFixed(2) + " min"
            : "OPEN TRAJECTORY";

    ui.orbitPeri.textContent = km(orbit.periapsisAltitude);
    ui.orbitApo.textContent = km(orbit.apoapsisAltitude);
    ui.orbitEcc.textContent = orbit.eccentricity.toFixed(4);
    ui.orbitInc.textContent =
        (orbit.inclination * 180 / Math.PI).toFixed(2) + "°";
    ui.orbitSpeeds.textContent =
        `${(orbit.circularSpeed / 1000).toFixed(2)} / ` +
        `${(orbit.escapeSpeed / 1000).toFixed(2)} km/s`;

    ui.shipName.textContent = ship.name.toUpperCase();
    ui.shipMass.textContent = ship.mass.toFixed(1) + " kg";
    ui.shipDry.textContent = `(${ship.dryMass.toFixed(0)} dry)`;

    const propFraction = ship.propellantCapacity > 0
        ? ship.propellant / ship.propellantCapacity
        : 0;

    ui.shipProp.textContent =
        `${ship.propellant.toFixed(2)} / ${ship.propellantCapacity.toFixed(0)} kg`;
    ui.shipPropBar.style.width = (propFraction * 100).toFixed(1) + "%";
    ui.shipPropBar.parentElement.classList.toggle("low", propFraction < 0.15);

    ui.shipDv.textContent = ship.deltaVRemaining.toFixed(0) + " m/s";

    const batteryFraction = ship.batteryCapacity > 0
        ? ship.batteryWh / ship.batteryCapacity
        : 0;

    ui.shipBattery.textContent =
        `${ship.batteryWh.toFixed(1)} / ${ship.batteryCapacity.toFixed(0)} Wh` +
        (ship.sunlit ? " · SUN" : " · ECLIPSE");
    ui.shipBatteryBar.style.width = (batteryFraction * 100).toFixed(1) + "%";
    ui.shipBatteryBar.parentElement.classList.toggle("low", batteryFraction < 0.15);

    ui.shipPower.textContent =
        `${ship.powerGeneration.toFixed(0)} / ${ship.powerDemand.toFixed(0)} W`;

    ui.shipThrust.textContent = ship.thrustMax > 0
        ? `${ship.thrust.toFixed(1)} N · ${(ship.acceleration / 9.80665).toFixed(2)} g`
        : "NO ENGINE";

    const launch = currentShip.launch;
    ui.shipLaunch.textContent = launch
        ? `${launch.margin >= 0 ? "+" : ""}${launch.margin.toFixed(0)} kg` +
          (launch.withinCapacity ? "" : " ✕ OVER CAPACITY")
        : "--";

    // warnings + collision text
    ui.shipWarnings.replaceChildren();

    const lines = [...telemetry.warnings];
    if (telemetry.collision) lines.unshift(describeCollision(telemetry.collision));

    for (const text of lines) {
        const div = document.createElement("div");
        div.textContent = text;
        ui.shipWarnings.appendChild(div);
    }

    ui.shipNotice.textContent = designChangedWhileFlying
        ? "Design changed in the Designer. Press RESET ORBIT to fly it."
        : (currentShip.valid
            ? ""
            : currentShip.errors[0] ?? "Spacecraft not configured; using reference spacecraft.");

    // controls state
    ui.throttle.value = Math.round(ship.throttle * 100);
    ui.throttleLabel.textContent =
        Math.round(ship.throttle * 100) + "%" +
        (ship.burnRemaining !== null
            ? ` · burn ${ship.burnRemaining.toFixed(0)} m/s left`
            : "");

    ui.modes.querySelectorAll("button").forEach(button => {
        button.classList.toggle("active", button.dataset.mode === ship.mode);
    });

    updatePlanner(telemetry);

    if (telemetry.destroyed) {
        ui.status.textContent = "LOST";

        ui.status.classList.remove("running");
        ui.status.classList.add("danger");

        ui.start.disabled = true;
        ui.start.textContent = "SIMULATION ENDED";
    }
}

/*
=========================================================
4b. MANEUVER PLANNER
=========================================================
*/

function planFor(telemetry) {
    const orbit = telemetry.orbit;
    const target = PHYSICS.EARTH_RADIUS +
        (Number(ui.planAltitude.value) || 0) * 1000;

    if (!(target > PHYSICS.EARTH_RADIUS + 160_000)) return null;

    // Near-circular: classic two-burn Hohmann transfer to the target orbit.
    if (orbit.bound && orbit.eccentricity < 0.01) {
        const plan = hohmannTransfer(orbit.semiMajorAxis, target, PHYSICS.EARTH_MU);
        const mode = target >= orbit.semiMajorAxis ? "prograde" : "retrograde";

        return { ...plan, mode1: mode, mode2: mode, circular: true };
    }

    // Elliptical: burn 2 circularises at the current point (use it at an apsis).
    const circular = Math.sqrt(PHYSICS.EARTH_MU / telemetry.radius);
    const dv2 = Math.abs(circular - telemetry.speed);

    return {
        dv1: 0,
        dv2,
        total: dv2,
        mode1: "prograde",
        mode2: circular >= telemetry.speed ? "prograde" : "retrograde",
        circular: false
    };
}

function updatePlanner(telemetry) {
    const plan = planFor(telemetry);
    const ship = telemetry.ship;

    const canBurn = Boolean(plan) &&
        ship.thrustMax > 0 &&
        !telemetry.destroyed;

    ui.planBurn1.disabled = !canBurn || (plan && plan.dv1 <= 0);
    ui.planBurn2.disabled = !canBurn;
    ui.warpPeri.disabled = telemetry.destroyed || telemetry.orbit.timeToPeriapsis === null;
    ui.warpApo.disabled = telemetry.destroyed || telemetry.orbit.timeToApoapsis === null;

    if (!plan) {
        ui.planDv.textContent = "--";
        ui.planTotal.textContent = "Altitude must be ≥ 160 km";
        ui.planTime.textContent = "--";
        return;
    }

    ui.planDv.textContent =
        `${plan.dv1.toFixed(0)} / ${plan.dv2.toFixed(0)} m/s`;

    const ok = plan.total <= ship.deltaVRemaining;

    ui.planTotal.textContent =
        `${plan.total.toFixed(0)} / ${ship.deltaVRemaining.toFixed(0)} m/s ` +
        (ok ? "✓" : "✕");

    if (ship.thrustMax > 0 && ship.mass > 0) {
        const mdot = ship.thrustMax / currentShip.exhaustVelocity;
        const m1 = ship.mass * Math.exp(-plan.dv1 / currentShip.exhaustVelocity);
        const seconds = (ship.mass - m1) / mdot;

        ui.planTime.textContent = seconds < 3600
            ? (seconds / 60).toFixed(1) + " min"
            : (seconds / 3600).toFixed(1) + " h";
    } else {
        ui.planTime.textContent = "NO ENGINE";
    }
}

function startBurn(which) {
    const telemetry = engine.getTelemetry();
    const plan = planFor(telemetry);

    if (!plan) return;

    const dv = which === 1 ? plan.dv1 : plan.dv2;

    if (engine.burn(dv, which === 1 ? plan.mode1 : plan.mode2) && !simulationActive) {
        startSimulation();
    }

    updateTelemetry();
}

function warpTo(kind) {
    const orbit = engine.getTelemetry().orbit;
    const seconds = kind === "peri" ? orbit.timeToPeriapsis : orbit.timeToApoapsis;

    if (seconds === null || !Number.isFinite(seconds)) return;

    warpTarget = engine.elapsedTime + seconds;
    warpLabel = kind === "peri" ? "PERIAPSIS" : "APOAPSIS";

    if (!simulationActive) startSimulation();
}

/*
=========================================================
5. HAZARD PANEL
=========================================================
*/

function updateHazardPanel(approaches) {
    const list = ui.hazardList;

    if (!list) return;

    list.replaceChildren();

    if (!approaches || approaches.length === 0) {
        const empty = document.createElement("div");

        empty.className = "hazard-empty";
        empty.textContent = "No orbital objects detected.";

        list.appendChild(empty);
        return;
    }

    approaches.slice(0, 4).forEach(item => {
        const status = item.collisionRisk
            ? "COLLISION RISK"
            : item.warning
                ? "CLOSE APPROACH"
                : "NOMINAL";

        const statusClass = item.collisionRisk
            ? "critical"
            : item.warning
                ? "warning"
                : "nominal";

        const entry = document.createElement("div");
        entry.className = "hazard-entry";

        const information = document.createElement("div");

        const name = document.createElement("strong");
        name.textContent = String(item.name ?? "Unknown object");

        const details = document.createElement("small");
        details.textContent =
            `${item.id ?? "N/A"} · ${String(item.type ?? "unknown").toUpperCase()}`;

        information.append(name, details);

        const distance = document.createElement("div");
        distance.className = "hazard-distance";

        const distanceValue = document.createElement("strong");

        distanceValue.textContent =
            Number.isFinite(item.missDistance)
                ? (item.missDistance / 1000).toFixed(2) + " km"
                : "N/A";

        const statusLabel = document.createElement("small");
        statusLabel.className = statusClass;
        statusLabel.textContent = status;

        distance.append(distanceValue, statusLabel);

        entry.append(information, distance);
        list.appendChild(entry);
    });
}

/*
=========================================================
6. BUTTON AND STATUS
=========================================================
*/

function updateButton() {
    if (!ui.start || !ui.status) return;

    const telemetry = engine.getTelemetry();

    if (telemetry.destroyed) {
        ui.start.disabled = true;
        ui.start.textContent = "SIMULATION ENDED";

        ui.status.textContent = "LOST";
        ui.status.classList.remove("running");
        ui.status.classList.add("danger");

        return;
    }

    ui.start.disabled = false;

    ui.start.textContent = simulationActive
        ? "PAUSE SIMULATION"
        : "START SIMULATION";

    ui.status.textContent = simulationActive
        ? "RUNNING"
        : "PAUSED";

    ui.status.classList.toggle(
        "running",
        simulationActive
    );

    ui.status.classList.remove("danger");
}

/*
=========================================================
7. SIMULATION LOOP
=========================================================
*/

function animationLoop(timestamp) {
    if (!simulationActive || !scene) return;

    if (!previousFrame) {
        previousFrame = timestamp;
    }

    const frameDelta = Math.min(
        (timestamp - previousFrame) / 1000,
        PHYSICS.MAX_FRAME_DELTA
    );

    previousFrame = timestamp;

    // Warping to an apsis always runs at maximum acceleration.
    let simulationDelta =
        frameDelta * (warpTarget !== null ? 1000 : simulationSpeed);

    let arrived = false;

    if (warpTarget !== null) {
        const remaining = warpTarget - engine.elapsedTime;

        if (remaining <= simulationDelta) {
            simulationDelta = Math.max(0, remaining);
            arrived = true;
        }
    }

    engine.step(simulationDelta);

    const telemetry = engine.getTelemetry();

    scene.updateSpacecraft(telemetry.position);
    scene.updateHazards(telemetry.hazards);
    scene.render();

    updateTelemetry();
    updateHazardPanel(telemetry.approaches);

    if (arrived && !telemetry.destroyed) {
        warpTarget = null;
        pauseSimulation();
        ui.status.textContent = "AT " + warpLabel;
        return;
    }

    if (telemetry.destroyed) {
        simulationActive = false;

        engine.pause();

        updateButton();

        animationFrame = null;
        previousFrame = 0;

        return;
    }

    animationFrame = requestAnimationFrame(animationLoop);
}

/*
=========================================================
8. START / PAUSE
=========================================================
*/

function startSimulation() {
    if (simulationActive) {
        pauseSimulation();
        return;
    }

    if (engine.getTelemetry().destroyed) {
        resetSimulation();
    }

    if (designChangedWhileFlying) {
        applyDesign();
    }

    simulationActive = true;

    engine.start();

    previousFrame = 0;

    updateButton();

    animationFrame = requestAnimationFrame(animationLoop);
}

function pauseSimulation() {
    simulationActive = false;
    warpTarget = null;

    engine.pause();

    if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }

    previousFrame = 0;

    updateButton();
}

/*
=========================================================
9. RESET
=========================================================
*/

function resetSimulation() {
    pauseSimulation();

    applyDesign();

    if (scene) {
        scene.resetTrajectory();
        scene.resetHazardTrails();

        refreshScene();
        scene.render();
    }

    simulationSpeed = Number(ui.speed.value) || 500;

    ui.speedLabel.textContent =
        simulationSpeed + "×";

    updateTelemetry();

    updateHazardPanel(
        engine.getTelemetry().approaches
    );

    updateButton();
}

/*
=========================================================
9b. DESIGN INTEGRATION
=========================================================
*/

let currentShip = buildShip(null);

function readDesign() {
    try {
        return window.NOVALUX?.getDesign?.() ?? null;
    } catch (error) {
        console.error("NOVALUX: could not read design:", error);
        return null;
    }
}

/* Build the ship from the Designer and restart the flight with it. */
function applyDesign() {
    currentShip = buildShip(readDesign());
    designChangedWhileFlying = false;

    engine.setShip(currentShip);

    ui.instrument.checked = true;
    engine.setInstrumentOn(true);
}

function onDesignChanged() {
    const flying = simulationActive || engine.elapsedTime > 0;

    if (!flying) {
        applyDesign();

        if (scene) {
            scene.resetTrajectory();
            refreshScene();
            scene.render();
        }

        updateTelemetry();
        updateHazardPanel(engine.getTelemetry().approaches);
        updateButton();
        return;
    }

    designChangedWhileFlying = true;
    updateTelemetry();
}

function buildModeButtons() {
    ui.modes.replaceChildren();

    THRUST_MODES.forEach((mode, index) => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "orbital-mode";
        button.dataset.mode = mode;
        button.textContent = `${index + 1} ${MODE_LABELS[mode]}`;

        button.addEventListener("click", () => {
            engine.setMode(mode);
            updateTelemetry();
        });

        ui.modes.appendChild(button);
    });
}

function setThrottle(value) {
    engine.burnProgram = null;
    engine.setThrottle(value);
    updateTelemetry();
}

function onKeyDown(event) {
    const view = $("simulation-view");

    if (!view || !view.classList.contains("active")) return;
    if (event.target instanceof HTMLInputElement &&
        event.target.type !== "range" && event.target.type !== "checkbox") return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    const key = event.key.toLowerCase();
    const throttle = engine.controls.throttle;

    if (key === "z") setThrottle(1);
    else if (key === "x") setThrottle(0);
    else if (key === "w") setThrottle(Math.min(1, throttle + 0.1));
    else if (key === "s") setThrottle(Math.max(0, throttle - 0.1));
    else if (/^[1-7]$/.test(key)) {
        engine.setMode(THRUST_MODES[Number(key) - 1]);
        updateTelemetry();
    } else return;

    event.preventDefault();
}

/*
=========================================================
10. VIEW NAVIGATION
=========================================================
*/

function onOrbitalViewChanged() {
    const simulationView = $("simulation-view");

    if (!simulationView) return;

    const isVisible =
        simulationView.classList.contains("active");

    // Stop simulation when leaving this view.
    if (!isVisible && simulationActive) {
        pauseSimulation();
    }

    // Resize when the simulation view becomes visible.
    if (isVisible && scene) {
        requestAnimationFrame(() => {
            if (!scene) return;

            scene.resize();
            scene.render();
        });
    }
}

/*
=========================================================
11. EVENT BINDING
=========================================================
*/

function bindEvents() {
    ui.start.addEventListener(
        "click",
        startSimulation
    );

    ui.reset.addEventListener(
        "click",
        resetSimulation
    );

    ui.speed.addEventListener("input", event => {
        const value = Number(event.target.value);

        simulationSpeed = Number.isFinite(value)
            ? Math.max(1, Math.min(1000, value))
            : 500;

        ui.speedLabel.textContent =
            simulationSpeed + "×";
    });

    ui.throttle.addEventListener("input", event => {
        setThrottle(Number(event.target.value) / 100);
    });

    ui.instrument.addEventListener("change", event => {
        engine.setInstrumentOn(event.target.checked);
        updateTelemetry();
    });

    ui.planAltitude.addEventListener("input", () => updateTelemetry());
    ui.planBurn1.addEventListener("click", () => startBurn(1));
    ui.planBurn2.addEventListener("click", () => startBurn(2));
    ui.warpPeri.addEventListener("click", () => warpTo("peri"));
    ui.warpApo.addEventListener("click", () => warpTo("apo"));

    document.addEventListener("keydown", onKeyDown);

    document.addEventListener(
        "novalux:designchange",
        onDesignChanged
    );

    document.addEventListener(
        "novalux:viewchange",
        onOrbitalViewChanged
    );

    document.addEventListener("novalux:launchcomplete", event => {
        const d = event.detail || {};
        pauseSimulation();
        applyDesign();
        const radius = PHYSICS.EARTH_RADIUS + Number(d.altitude || 0);
        const angle = Number(d.downrange || 0) / PHYSICS.EARTH_RADIUS;
        const c = Math.cos(angle), s = Math.sin(angle);
        const vr = Number(d.verticalVelocity || 0);
        const vt = Number(d.horizontalVelocity || 0);
        engine.state = {
            position: { x: radius * c, y: 0, z: radius * s },
            velocity: { x: vr * c - vt * s, y: 0, z: vr * s + vt * c }
        };
        engine.elapsedTime = 0;
        engine.start();
        simulationActive = true;
        if (scene) { scene.resetTrajectory(); refreshScene(); scene.render(); }
        updateTelemetry();
        updateHazardPanel(engine.getTelemetry().approaches);
        updateButton();
        previousFrame = 0;
        animationFrame = requestAnimationFrame(animationLoop);
    });

    document.addEventListener(
        "visibilitychange",
        () => {
            if (document.hidden && simulationActive) {
                pauseSimulation();
            }
        }
    );
}

/*
=========================================================
12. INITIALIZATION
=========================================================
*/

function initialize() {
    if (initialized) return;

    try {
        createInterface();

        buildModeButtons();

        applyDesign();

        initializeScene();

        bindEvents();

        simulationSpeed = Number(ui.speed.value) || 500;

        ui.speedLabel.textContent =
            simulationSpeed + "×";

        updateTelemetry();

        updateHazardPanel(
            engine.getTelemetry().approaches
        );

        updateButton();

        initialized = true;

        console.log(
            "NOVALUX Alpha 0.3 orbital simulation initialized."
        );

    } catch (error) {
        console.error(
            "NOVALUX orbital initialization failed:",
            error
        );

        const container = $("orbital-canvas");

        if (container) {
            container.textContent =
                "SIMULATION INITIALIZATION FAILED: " +
                String(error.message);
        }
    }
}

initialize();
