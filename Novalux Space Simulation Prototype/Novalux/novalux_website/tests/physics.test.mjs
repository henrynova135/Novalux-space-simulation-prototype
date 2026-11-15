import test from "node:test";
import assert from "node:assert/strict";

import { OrbitalEngine } from "../src/physics/orbital-engine.js";
import { PHYSICS, EARTH_ORBIT } from "../src/physics/constants.js";
import { atmosphericDensity } from "../src/physics/atmosphere.js";
import { hohmannTransfer, orbitalElements } from "../src/physics/orbit-elements.js";
import { buildShip, DEFAULT_SHIP } from "../src/ship/ship-model.js";
import { G0 } from "../src/ship/ship-data.js";

/* Minimal copy of the designer catalogue (same numbers as app.js). */
const components = {
    platform: { items: {
        "CubeSat": { mass: 15, powerDemand: 15 },
        "Explorer": { mass: 100, powerDemand: 40 }
    } },
    propulsion: { items: {
        "Chemical propulsion": { mass: 18, power: 5 },
        "Electric propulsion": { mass: 10, power: 35 },
        "Cold gas propulsion": { mass: 5, power: 2 }
    } },
    power: { items: {
        "Solar array": { mass: 12, output: 65 },
        "Radioisotope power": { mass: 25, output: 55 }
    } },
    instrument: { items: { "Spectrometer": { mass: 10, power: 18 } } },
    communication: { items: { "X-band communication": { mass: 7, power: 12 } } },
    launcher: { items: { "Small launch vehicle": { capacity: 80 }, "Heavy launch vehicle": { capacity: 1500 } } }
};

const design = (over = {}) => ({
    components,
    selections: {
        platform: "Explorer", propulsion: "Chemical propulsion", power: "Solar array",
        instrument: "Spectrometer", communication: "X-band communication",
        launcher: "Heavy launch vehicle", ...over
    }
});

function fly(engine, seconds, dt = 1) {
    for (let t = 0; t < seconds; t += dt) engine.step(dt);
}

test("circular orbit conserves energy and keeps the analytic period", () => {
    const e = new OrbitalEngine();
    e.start();
    const t0 = e.getTelemetry().orbit.specificEnergy;
    fly(e, Math.round(EARTH_ORBIT.PERIOD));
    const t = e.getTelemetry();
    assert.ok(!t.destroyed);
    assert.ok(Math.abs((t.orbit.specificEnergy - t0) / t0) < 1e-3, "drag only: tiny change");
    assert.ok(Math.abs(t.orbit.period - EARTH_ORBIT.PERIOD) / EARTH_ORBIT.PERIOD < 1e-3);
    assert.ok(t.orbit.eccentricity < 1e-4);
    assert.ok(Math.abs(t.orbit.inclination) < 1e-6);
});

test("atmosphere density is monotonic and realistic", () => {
    let prev = Infinity;
    for (let h = 0; h <= 1_000_000; h += 10_000) {
        const d = atmosphericDensity(h);
        assert.ok(d <= prev);
        prev = d;
    }
    assert.ok(Math.abs(atmosphericDensity(0) - 1.225) < 1e-6);
    const d400 = atmosphericDensity(400_000);
    assert.ok(d400 > 1e-12 && d400 < 1e-11);
});

test("ship model: masses, delta-v and launch margin", () => {
    const ship = buildShip(design());
    assert.equal(ship.valid, true);
    assert.equal(ship.dryMass, 100 + 18 + 12 + 10 + 7);
    assert.equal(ship.totalMass, ship.dryMass + 60);
    const expected = 310 * G0 * Math.log(ship.totalMass / ship.dryMass);
    assert.ok(Math.abs(ship.deltaV - expected) < 1e-9);
    assert.equal(ship.launch.withinCapacity, true);

    const small = buildShip(design({ launcher: "Small launch vehicle" }));
    assert.equal(small.launch.withinCapacity, false);

    assert.equal(buildShip({ components, selections: {} }).valid, false);
});

test("deep-space mission tanks are added only for Moon and Mars designs", () => {
    const earth = buildShip(design());
    const moon = buildShip({ ...design(), mission: "moon" });
    const mars = buildShip({ ...design(), mission: "mars" });
    assert.equal(earth.propellantCapacity, 60);
    assert.equal(moon.propellantCapacity, 650);
    assert.equal(mars.propellantCapacity, 1300);
    assert.equal(moon.launch.withinCapacity, true);
    assert.equal(mars.launch.withinCapacity, true);
});

test("burn uses propellant exactly as the rocket equation says", () => {
    const ship = buildShip(design());
    const e = new OrbitalEngine(ship);
    e.setMode("prograde");
    e.setThrottle(1);
    e.start();

    const m0 = e.getTelemetry().ship.mass;
    const target = 200; // m/s
    while (e.deltaVSpent < target && !e.destroyed) e.step(1);

    const t = e.getTelemetry();
    const predicted = m0 * Math.exp(-e.deltaVSpent / ship.exhaustVelocity);
    assert.ok(Math.abs(t.ship.mass - predicted) / predicted < 1e-4);
    assert.ok(Math.abs(t.ship.deltaVRemaining - (ship.deltaV - e.deltaVSpent)) < 0.5);
});

test("Hohmann transfer: burn at perigee raises apoapsis to target", () => {
    const ship = buildShip(design());
    const e = new OrbitalEngine(ship);
    const r1 = PHYSICS.EARTH_RADIUS + 400_000;
    const r2 = PHYSICS.EARTH_RADIUS + 800_000;
    const plan = hohmannTransfer(r1, r2, PHYSICS.EARTH_MU);

    e.setMode("prograde");
    e.setThrottle(1);
    e.start();

    while (e.deltaVSpent < plan.dv1 && !e.destroyed) e.step(0.1);
    e.setThrottle(0);

    const o = e.getTelemetry().orbit;
    assert.ok(Math.abs(o.apoapsisAltitude - 800_000) < 15_000, `apoapsis ${o.apoapsisAltitude}`);
    assert.ok(Math.abs(o.periapsisAltitude - 400_000) < 15_000);
});

test("running out of propellant stops thrust", () => {
    const ship = buildShip(design({ platform: "CubeSat", propulsion: "Cold gas propulsion" }));
    const e = new OrbitalEngine(ship);
    e.setMode("prograde");
    e.setThrottle(1);
    e.start();
    fly(e, 5000);
    const t = e.getTelemetry();
    assert.equal(t.ship.propellant, 0);
    assert.equal(t.ship.thrust, 0);
    assert.ok(t.warnings.includes("OUT OF PROPELLANT"));
    assert.ok(Math.abs(t.ship.mass - ship.dryMass) < 1e-9);
});

test("structural g-limit caps acceleration", () => {
    const ship = buildShip(design({ platform: "CubeSat" }));
    const e = new OrbitalEngine(ship);
    e.setThrottle(1);
    e.start();
    e.step(1);
    assert.ok(e.lastAcceleration <= ship.maxAccelG * G0 + 1e-9);
});

test("drag brings a low orbit down and the ship burns up", () => {
    const ship = buildShip(design({ platform: "CubeSat" }));
    const e = new OrbitalEngine(ship);
    // start at 150 km circular
    const r = PHYSICS.EARTH_RADIUS + 150_000;
    e.state = { position: { x: r, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: Math.sqrt(PHYSICS.EARTH_MU / r) } };
    e.start();
    fly(e, 3 * 86400, 20);
    const t = e.getTelemetry();
    assert.equal(t.destroyed, true);
    assert.equal(t.collision.type, "atmosphere");
});

test("electric thruster is power-limited when battery is empty in eclipse", () => {
    const ship = buildShip(design({ propulsion: "Electric propulsion", power: "Solar array" }));
    const e = new OrbitalEngine(ship);
    e.powerState.batteryWh = 0;
    // put ship in Earth's shadow (opposite the sun)
    const r = PHYSICS.EARTH_RADIUS + 400_000;
    e.state = { position: { x: -r * 0.88, y: -r * 0.3, z: -r * 0.37 }, velocity: { x: 0, y: 0, z: 0 } };
    e.state.velocity = { x: 0, y: 0, z: 0 };
    e.setThrottle(1);
    e.setMode("prograde");
    e.start();
    e.step(1);
    const t = e.getTelemetry();
    assert.equal(t.ship.sunlit, false);
    assert.equal(t.ship.thrust, 0);
    assert.ok(t.warnings.includes("POWER FAILURE"));
});

test("RTG keeps producing power in eclipse", () => {
    const ship = buildShip(design({ power: "Radioisotope power" }));
    assert.equal(ship.power.sunDependent, false);
});

test("collision with debris reports speed and energy; ship size matters", () => {
    const ship = buildShip(design());
    const e = new OrbitalEngine(ship);
    const obj = e.hazards.getObjects(0).find(o => o.id === "DEB-001");
    e.state = { position: { ...obj.position }, velocity: { ...obj.velocity } };
    e.start();
    e.step(1);
    const t = e.getTelemetry();
    assert.equal(t.destroyed, true);
    assert.equal(t.collision.id, "DEB-001");
    assert.ok(t.collision.impactEnergy >= 0);

    const small = buildShip(design({ platform: "CubeSat" }));
    assert.ok(small.collisionRadius < ship.collisionRadius);
});

test("default reference ship still behaves like the original point mass", () => {
    const e = new OrbitalEngine(DEFAULT_SHIP);
    assert.equal(e.getTelemetry().ship.mass, PHYSICS.SPACECRAFT_MASS);
    e.setThrottle(1);
    e.start();
    e.step(10);
    assert.equal(e.lastThrust, 0);
});

test("orbital elements: known elliptical orbit", () => {
    const rp = PHYSICS.EARTH_RADIUS + 400_000;
    const ra = PHYSICS.EARTH_RADIUS + 1_400_000;
    const a = (rp + ra) / 2;
    const vp = Math.sqrt(PHYSICS.EARTH_MU * (2 / rp - 1 / a));
    const el = orbitalElements({ x: rp, y: 0, z: 0 }, { x: 0, y: 0, z: vp }, PHYSICS.EARTH_MU);
    assert.ok(Math.abs(el.apoapsisRadius - ra) < 1);
    assert.ok(Math.abs(el.periapsisRadius - rp) < 1);
    assert.ok(Math.abs(el.eccentricity - (ra - rp) / (ra + rp)) < 1e-9);
});

test("burn program delivers exactly the requested delta-v and cuts off", () => {
    const e = new OrbitalEngine(buildShip(design()));
    e.start();
    assert.ok(e.burn(123.4, "prograde"));
    fly(e, 400, 1);
    const t = e.getTelemetry();
    assert.ok(Math.abs(e.deltaVSpent - 123.4) < 1e-6, `spent ${e.deltaVSpent}`);
    assert.equal(t.ship.throttle, 0);
    assert.equal(t.ship.burnRemaining, null);
});

import { LaunchVehicleSimulator, LAUNCH_VEHICLES, atmosphericDensityAtAltitude } from "../src/physics/launch-vehicle.js";

test("launch vehicle catalogue respects designer payload classes", () => {
    assert.equal(LAUNCH_VEHICLES["Small launch vehicle"].payloadCapacity, 80);
    assert.equal(LAUNCH_VEHICLES["Medium launch vehicle"].payloadCapacity, 350);
    assert.equal(LAUNCH_VEHICLES["Heavy launch vehicle"].payloadCapacity, 1500);
});

test("launch vehicle validates payload capacity before ignition", () => {
    const sim = new LaunchVehicleSimulator({ vehicleName: "Small launch vehicle", payloadMass: 100 });
    assert.equal(sim.ignite(), false);
    assert.equal(sim.status, "FAILED");
    assert.match(sim.failureReason, /exceeds/);
});

test("launch sequence tracks propellant, fairing release and manual staging", () => {
    const sim = new LaunchVehicleSimulator({ vehicleName: "Medium launch vehicle", payloadMass: 100 });
    assert.equal(sim.ignite(), true);
    for (let i = 0; i < 1000 && sim.status === "ASCENT" && !sim.stageAwaitingSeparation; i++) sim.step(0.25);
    assert.ok(sim.elapsed > 0);
    assert.ok(sim.mass < sim.vehicle.stages.reduce((m, s) => m + s.dryMass + s.propellant, 100 + sim.vehicle.fairingMass));
    assert.equal(sim.jettisonFairing(), false, "fairing cannot be released before its altitude window");
    assert.ok(sim.telemetry().stagePropellant <= sim.vehicle.stages[0].propellant);
});

test("launch atmospheric density decreases with altitude", () => {
    assert.ok(atmosphericDensityAtAltitude(100_000) < atmosphericDensityAtAltitude(10_000));
    assert.equal(atmosphericDensityAtAltitude(200_000), 0);
});

test("launch engine cutoff is manual and enables stage separation", () => {
    const sim = new LaunchVehicleSimulator({ vehicleName: "Medium launch vehicle", payloadMass: 100 });
    sim.ignite();
    sim.step(1);
    assert.equal(sim.cutoff(), true);
    assert.equal(sim.telemetry().canSeparate, true);
    assert.equal(sim.telemetry().throttle, 0);
    assert.equal(sim.separateStage(), true);
    assert.equal(sim.stageIndex, 1);
});

test("small launcher can reach Earth orbit with manual cutoff and staging", () => {
    const sim = new LaunchVehicleSimulator({ vehicleName: "Small launch vehicle", payloadMass: 50 });
    sim.ignite();
    let fairing = false;
    for (let i = 0; i < 10000 && !["FAILED", "ORBIT ACHIEVED"].includes(sim.status); i++) {
        if (sim.stageAwaitingSeparation) sim.separateStage();
        else {
            sim.step(0.25);
            if (!fairing && sim.altitude >= 70_000) fairing = sim.jettisonFairing();
            const speed = Math.hypot(sim.horizontalVelocity, sim.verticalVelocity);
            if (sim.stageIndex === 1 && sim.altitude > 160_000 && speed >= 7600 && speed <= 7900 && Math.abs(Math.atan2(sim.verticalVelocity, sim.horizontalVelocity)) < 0.2) sim.cutoff();
        }
    }
    assert.equal(sim.status, "ORBIT ACHIEVED");
});

test("medium launcher can reach Earth orbit with manual cutoff and staging", () => {
    const sim = new LaunchVehicleSimulator({ vehicleName: "Medium launch vehicle", payloadMass: 150 });
    sim.ignite();
    let fairing = false;
    for (let i = 0; i < 10000 && !["FAILED", "ORBIT ACHIEVED"].includes(sim.status); i++) {
        if (sim.stageAwaitingSeparation) sim.separateStage();
        else {
            sim.step(0.25);
            if (!fairing && sim.altitude >= 70_000) fairing = sim.jettisonFairing();
            const speed = Math.hypot(sim.horizontalVelocity, sim.verticalVelocity);
            if (sim.stageIndex === 1 && sim.altitude > 160_000 && speed >= 7600 && speed <= 7900 && Math.abs(Math.atan2(sim.verticalVelocity, sim.horizontalVelocity)) < 0.2) sim.cutoff();
        }
    }
    assert.equal(sim.status, "ORBIT ACHIEVED");
});
