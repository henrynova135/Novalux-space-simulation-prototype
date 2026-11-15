"use strict";

import { PHYSICS } from "./constants.js";

const G0 = 9.80665;
const R_EARTH = PHYSICS.EARTH_RADIUS;
const MU = PHYSICS.EARTH_MU;
const RHO0 = 1.225;
const SCALE_HEIGHT = 8500;

/** Modeled launch vehicles. Values are educational simulation parameters, not flight hardware specifications. */
export const LAUNCH_VEHICLES = Object.freeze({
    "Small launch vehicle": {
        name: "Small launch vehicle", payloadCapacity: 80, fairingMass: 180,
        stages: [
            { name: "Stage 1 · booster", dryMass: 850, propellant: 6000, thrust: 155000, isp: 300, area: 1.8 },
            { name: "Stage 2 · upper stage", dryMass: 220, propellant: 2500, thrust: 50000, isp: 350, area: 0.8 }
        ]
    },
    "Medium launch vehicle": {
        name: "Medium launch vehicle", payloadCapacity: 350, fairingMass: 650,
        stages: [
            { name: "Stage 1 · core", dryMass: 6200, propellant: 52000, thrust: 1_050_000, isp: 295, area: 8.0 },
            { name: "Stage 2 · upper stage", dryMass: 1450, propellant: 12500, thrust: 190000, isp: 345, area: 2.2 }
        ]
    },
    "Heavy launch vehicle": {
        name: "Heavy launch vehicle", payloadCapacity: 1500, fairingMass: 2100,
        stages: [
            { name: "Stage 1 · core booster", dryMass: 28000, propellant: 245000, thrust: 5_800_000, isp: 300, area: 25 },
            { name: "Stage 2 · transfer stage", dryMass: 6500, propellant: 52000, thrust: 850000, isp: 355, area: 8 },
            { name: "Stage 3 · orbital insertion", dryMass: 1800, propellant: 13500, thrust: 180000, isp: 440, area: 3 }
        ]
    }
});

export function atmosphericDensityAtAltitude(altitude) {
    if (altitude < 0) return RHO0;
    if (altitude > 150_000) return 0;
    return RHO0 * Math.exp(-altitude / SCALE_HEIGHT);
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

/**
 * Simplified 2D Earth launch model in a local rotating-Earth frame.
 * State units: downrange/altitude (m), horizontal/radial velocity (m/s).
 * RK4 is used for the translational state; propellant flow is integrated per step.
 */
export class LaunchVehicleSimulator {
    constructor({ vehicleName, payloadMass, targetAltitude = 400_000 } = {}) {
        this.vehicle = LAUNCH_VEHICLES[vehicleName];
        if (!this.vehicle) throw new Error(`Unknown launch vehicle: ${vehicleName}`);
        if (!(payloadMass > 0)) throw new Error("A configured spacecraft payload is required.");
        this.payloadMass = payloadMass;
        this.targetAltitude = targetAltitude;
        this.reset();
    }

    reset() {
        this.stageIndex = 0;
        this.elapsed = 0;
        this.downrange = 0;
        this.altitude = 0;
        this.horizontalVelocity = 465; // approximate eastward surface rotation at the equator
        this.verticalVelocity = 0;
        this.mass = this.payloadMass + this.vehicle.fairingMass + this.vehicle.stages.reduce((s, x) => s + x.dryMass + x.propellant, 0);
        this.stagePropellant = this.vehicle.stages[0].propellant;
        this.fairingAttached = true;
        this.status = "READY";
        this.throttle = 1;
        this.maxQ = 0;
        this.maxAccelerationG = 0;
        this.events = ["Vehicle configured. Awaiting ignition."];
        this.failureReason = null;
        this.stageAwaitingSeparation = false;
        this.insertionAchieved = false;
    }

    get stage() { return this.vehicle.stages[this.stageIndex] ?? null; }

    ignite() {
        if (this.status !== "READY") return false;
        if (this.payloadMass > this.vehicle.payloadCapacity) {
            this.status = "FAILED";
            this.failureReason = `Payload ${this.payloadMass.toFixed(1)} kg exceeds ${this.vehicle.payloadCapacity} kg capacity.`;
            return false;
        }
        this.status = "ASCENT";
        this.events.push("Main engine ignition. Liftoff confirmed.");
        return true;
    }

    setThrottle(value) { this.throttle = clamp(Number(value) || 0, 0, 1); }

    jettisonFairing() {
        if (!this.fairingAttached || this.altitude < 70_000 || this.status !== "ASCENT") return false;
        this.mass -= this.vehicle.fairingMass;
        this.fairingAttached = false;
        this.events.push(`Payload fairing jettisoned at ${(this.altitude / 1000).toFixed(1)} km.`);
        return true;
    }

    cutoff() {
        if (this.status !== "ASCENT" || !this.stage || this.stageAwaitingSeparation) return false;
        this.throttle = 0;
        this.stageAwaitingSeparation = true;
        this.events.push(`${this.stage.name} engine cutoff commanded at ${(this.altitude / 1000).toFixed(1)} km.`);
        return true;
    }

    separateStage() {
        if (!this.stageAwaitingSeparation || !this.stage) return false;
        const discarded = this.stage.dryMass + this.stagePropellant;
        this.mass -= discarded;
        this.stageIndex += 1;
        this.stageAwaitingSeparation = false;
        if (!this.stage) {
            this.status = "COAST";
            this.events.push("All launch stages expended. Coast and orbital-insertion verification.");
            this.verifyInsertion();
            return true;
        }
        this.stagePropellant = this.stage.propellant;
        this.events.push(`${this.stage.name} ignition after separation. ${discarded.toFixed(0)} kg dry stage discarded.`);
        return true;
    }

    _pitch(altitude, elapsed) {
        // Gravity-turn schedule: remain mostly vertical through the dense lower atmosphere.
        const byTime = clamp((elapsed - 8) / 220, 0, 1);
        const byAltitude = clamp(altitude / 200_000, 0, 1);
        return Math.max(byTime, byAltitude) * (Math.PI / 2);
    }

    _derivative(s, stage, throttle, pitch) {
        const r = R_EARTH + Math.max(0, s.h);
        const gravity = MU / (r * r);
        const speed = Math.hypot(s.vx, s.vh);
        const rho = atmosphericDensityAtAltitude(s.h);
        const area = stage.area + (this.fairingAttached ? this.vehicle.fairingMass / 500 : 0);
        const drag = 0.5 * rho * speed * speed * 0.5 * area;
        const dragX = speed > 0 ? -drag * s.vx / speed / Math.max(1, s.m) : 0;
        const dragH = speed > 0 ? -drag * s.vh / speed / Math.max(1, s.m) : 0;
        const thrust = stage.thrust * throttle;
        const ax = thrust * Math.sin(pitch) / Math.max(1, s.m) + dragX - (s.vh * s.vx) / r;
        const ah = thrust * Math.cos(pitch) / Math.max(1, s.m) + dragH - gravity + (s.vx * s.vx) / r;
        return { x: s.vx, h: s.vh, vx: ax, vh: ah };
    }

    _rk4(dt, stage, throttle, pitch) {
        const s = { x: this.downrange, h: this.altitude, vx: this.horizontalVelocity, vh: this.verticalVelocity, m: this.mass };
        const add = (a, k, f) => ({ x: a.x + k.x * f, h: a.h + k.h * f, vx: a.vx + k.vx * f, vh: a.vh + k.vh * f, m: a.m });
        const k1 = this._derivative(s, stage, throttle, pitch);
        const k2 = this._derivative(add(s, k1, dt / 2), stage, throttle, pitch);
        const k3 = this._derivative(add(s, k2, dt / 2), stage, throttle, pitch);
        const k4 = this._derivative(add(s, k3, dt), stage, throttle, pitch);
        const combine = key => (k1[key] + 2*k2[key] + 2*k3[key] + k4[key]) * dt / 6;
        this.downrange += combine("x");
        this.altitude += combine("h");
        this.horizontalVelocity += combine("vx");
        this.verticalVelocity += combine("vh");
    }

    step(dt = 0.25) {
        if (this.status !== "ASCENT" || this.stageAwaitingSeparation || !this.stage) return this.telemetry();
        const stage = this.stage;
        const throttle = this.throttle;
        if (throttle <= 0) { this.elapsed += dt; return this.telemetry(); }
        const flow = stage.thrust / (stage.isp * G0);
        const effectiveThrottle = Math.min(throttle, 7.5 * G0 * this.mass / stage.thrust);
        const used = Math.min(this.stagePropellant, flow * dt * effectiveThrottle);
        const pitch = this._pitch(this.altitude, this.elapsed);
        const beforeMass = this.mass;
        this._rk4(dt, stage, effectiveThrottle, pitch);
        this.mass -= used;
        this.stagePropellant -= used;
        this.elapsed += dt;
        const speed = Math.hypot(this.horizontalVelocity, this.verticalVelocity);
        const q = 0.5 * atmosphericDensityAtAltitude(this.altitude) * speed * speed;
        this.maxQ = Math.max(this.maxQ, q);
        const accel = stage.thrust * effectiveThrottle / Math.max(1, (beforeMass + this.mass) / 2);
        this.maxAccelerationG = Math.max(this.maxAccelerationG, accel / G0);

        if (this.altitude < -5) return this.fail("Vehicle impacted the launch site / terrain.");
        if (this.altitude > 150_000 && this.fairingAttached) return this.fail("Fairing remained attached beyond the safe jettison window.");
        if (this.maxAccelerationG > 8) return this.fail("Payload structural acceleration limit exceeded (8 g). ");

        if (this.stagePropellant <= 1e-6) {
            this.stagePropellant = 0;
            this.stageAwaitingSeparation = true;
            this.events.push(`${stage.name} propellant depleted. Awaiting your stage-separation command.`);
        }
        if (this.elapsed > 900) return this.fail("Launch guidance timeout: orbital insertion not achieved.");
        return this.telemetry();
    }

    verifyInsertion() {
        const radius = R_EARTH + this.altitude;
        const speed = Math.hypot(this.horizontalVelocity, this.verticalVelocity);
        const circular = Math.sqrt(MU / radius);
        const flightPathAngle = Math.atan2(this.verticalVelocity, Math.max(1e-9, this.horizontalVelocity));
        const altitudeOK = this.altitude >= 160_000 && this.altitude <= 2_000_000;
        const speedOK = Math.abs(speed - circular) <= Math.max(250, circular * 0.08);
        const directionOK = Math.abs(flightPathAngle) < 0.20;
        if (altitudeOK && speedOK && directionOK) {
            this.status = "ORBIT ACHIEVED";
            this.insertionAchieved = true;
            this.events.push(`Orbital insertion verified: ${(this.altitude/1000).toFixed(1)} km altitude, ${(speed/1000).toFixed(3)} km/s.`);
        } else {
            this.fail(`Orbital insertion failed: altitude ${(this.altitude/1000).toFixed(1)} km, speed ${(speed/1000).toFixed(2)} km/s. Target near ${(circular/1000).toFixed(2)} km/s with near-horizontal flight path.`);
        }
    }

    fail(reason) { this.status = "FAILED"; this.failureReason = reason; this.events.push(`MISSION FAILED: ${reason}`); return this.telemetry(); }

    telemetry() {
        const speed = Math.hypot(this.horizontalVelocity, this.verticalVelocity);
        return {
            status: this.status, elapsed: this.elapsed, altitude: this.altitude,
            downrange: this.downrange, horizontalVelocity: this.horizontalVelocity,
            verticalVelocity: this.verticalVelocity, speed, mass: this.mass,
            stageIndex: this.stageIndex, stageCount: this.vehicle.stages.length,
            stageName: this.stage?.name ?? "All stages expended",
            stagePropellant: this.stagePropellant, stagePropellantFraction: this.stage ? this.stagePropellant / this.stage.propellant : 0,
            fairingAttached: this.fairingAttached, maxQ: this.maxQ,
            maxAccelerationG: this.maxAccelerationG, throttle: this.throttle,
            canSeparate: this.stageAwaitingSeparation, canJettisonFairing: this.fairingAttached && this.altitude >= 70_000 && this.status === "ASCENT",
            insertionAchieved: this.insertionAchieved, failureReason: this.failureReason,
            events: [...this.events]
        };
    }
}
