
"use strict";

import {
    PHYSICS,
    EARTH_ORBIT
} from "./constants.js";

import { HazardField } from "../simulation/hazard-field.js";
import {
    dragAcceleration,
    atmosphericDensity,
    ATMOSPHERE_BURNUP_ALTITUDE
} from "./atmosphere.js";
import {
    orbitalElements,
    circularSpeed,
    escapeSpeed
} from "./orbit-elements.js";
import { DEFAULT_SHIP, remainingDeltaV } from "../ship/ship-model.js";
import { G0 } from "../ship/ship-data.js";
import { stepPower } from "../ship/power.js";

/* Sun direction (inertial, fixed). Gives roughly 35-40% eclipse in the start orbit. */
const SUN_DIRECTION = (() => {
    const v = { x: 0.88, y: 0.30, z: 0.37 };
    const n = Math.hypot(v.x, v.y, v.z);
    return { x: v.x / n, y: v.y / n, z: v.z / n };
})();

export const THRUST_MODES = Object.freeze([
    "hold", "prograde", "retrograde", "radial-out", "radial-in", "normal", "anti-normal"
]);

function dot3(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
function cross3(a, b) {
    return vector(
        a.y * b.z - a.z * b.y,
        a.z * b.x - a.x * b.z,
        a.x * b.y - a.y * b.x
    );
}
function unit(a) {
    const m = magnitude(a);
    return m > 0 ? multiply(a, 1 / m) : vector();
}

/* Cylindrical Earth shadow. */
export function isSunlit(position) {
    const along = dot3(position, SUN_DIRECTION);
    if (along >= 0) return true;

    const perpendicular = magnitude(
        add(position, multiply(SUN_DIRECTION, -along))
    );

    return perpendicular > PHYSICS.EARTH_RADIUS;
}

/* VECTOR UTILITIES */

function vector(x = 0, y = 0, z = 0) {
    return { x, y, z };
}

function add(a, b) {
    return vector(
        a.x + b.x,
        a.y + b.y,
        a.z + b.z
    );
}

function multiply(a, scalar) {
    return vector(
        a.x * scalar,
        a.y * scalar,
        a.z * scalar
    );
}

function magnitude(a) {
    return Math.sqrt(
        a.x ** 2 +
        a.y ** 2 +
        a.z ** 2
    );
}


/* EARTH GRAVITY */

function gravity(position) {
    const radius = magnitude(position);

    if (
        !Number.isFinite(radius) ||
        radius <= PHYSICS.EARTH_RADIUS
    ) {
        return vector();
    }

    return multiply(
        position,
        -PHYSICS.EARTH_MU / radius ** 3
    );
}

/*
 * ctx = { thrustAcceleration: vector (constant over the step),
 *         ballistic: Cd*A/m for atmospheric drag }
 */
function acceleration(state, ctx) {
    let a = gravity(state.position);

    if (ctx) {
        if (ctx.ballistic > 0) {
            a = add(a, dragAcceleration(state.position, state.velocity, ctx.ballistic));
        }
        if (ctx.thrustAcceleration) {
            a = add(a, ctx.thrustAcceleration);
        }
    }

    return a;
}

/* RK4 INTEGRATION */

function derivative(state, ctx) {
    return {
        position: state.velocity,
        velocity: acceleration(state, ctx)
    };
}

function addDerivative(state, derivativeValue, scale) {
    return {
        position: add(state.position, multiply(derivativeValue.position, scale)),
        velocity: add(state.velocity, multiply(derivativeValue.velocity, scale))
    };
}

function rk4(state, dt, ctx) {
    const k1 = derivative(state, ctx);
    const k2 = derivative(addDerivative(state, k1, dt / 2), ctx);
    const k3 = derivative(addDerivative(state, k2, dt / 2), ctx);
    const k4 = derivative(addDerivative(state, k3, dt), ctx);

    function combine(property) {
        return multiply(
            add(
                add(k1[property], multiply(k2[property], 2)),
                add(multiply(k3[property], 2), k4[property])
            ),
            dt / 6
        );
    }

    return {
        position: add(state.position, combine("position")),
        velocity: add(state.velocity, combine("velocity"))
    };
}

/* THRUST DIRECTION */

function thrustDirection(mode, state) {
    const r = unit(state.position);
    const v = unit(state.velocity);
    const n = unit(cross3(state.position, state.velocity));

    switch (mode) {
        case "prograde": return v;
        case "retrograde": return multiply(v, -1);
        case "radial-out": return r;
        case "radial-in": return multiply(r, -1);
        case "normal": return n;
        case "anti-normal": return multiply(n, -1);
        default: return vector();
    }
}

/* ORBITAL ENGINE */

export class OrbitalEngine {
    constructor(ship = DEFAULT_SHIP) {
        this.hazards = new HazardField();
        this.ship = ship;
        this.controls = { throttle: 0, mode: "prograde", instrumentOn: true };
        this.reset();
    }

    /* Replace the spacecraft (from the designer) and restart the orbit. */
    setShip(ship) {
        this.ship = ship ?? DEFAULT_SHIP;
        this.reset();
    }

    setThrottle(value) {
        const t = Number(value);
        this.controls.throttle = Number.isFinite(t) ? Math.max(0, Math.min(1, t)) : 0;
    }

    setMode(mode) {
        if (THRUST_MODES.includes(mode)) this.controls.mode = mode;
    }

    /* Burn at full throttle until deltaV (m/s) has been delivered, then cut off. */
    burn(deltaV, mode) {
        if (!(deltaV > 0) || !(this.ship.thrust > 0)) return false;
        if (mode) this.setMode(mode);
        this.burnProgram = { remaining: deltaV, total: deltaV };
        this.controls.throttle = 1;
        return true;
    }

    cancelBurn() {
        this.burnProgram = null;
        this.controls.throttle = 0;
    }

    setInstrumentOn(on) {
        this.controls.instrumentOn = Boolean(on);
    }

    reset() {
        const radius = EARTH_ORBIT.INITIAL_RADIUS;
        const speed = EARTH_ORBIT.CIRCULAR_SPEED;

        this.state = {
            position: vector(radius, 0, 0),
            velocity: vector(0, 0, speed)
        };

        this.mass = this.ship.totalMass;
        this.propellant = this.ship.propellantMass;
        this.powerState = { batteryWh: this.ship.power.batteryWh };
        this.deltaVSpent = 0;
        this.scienceSeconds = 0;
        this.lastPower = {
            generation: this.ship.power.output,
            demand: this.ship.power.base + this.ship.power.instrument,
            thrustFactor: 1,
            instrumentOk: true, platformOk: true,
            batteryWh: this.powerState.batteryWh
        };
        this.lastThrust = 0;
        this.lastAcceleration = 0;
        this.sunlit = true;

        this.hazards.spacecraftCollisionRadius = this.ship.collisionRadius;

        this.controls.throttle = 0;
        this.burnProgram = null;

        this.elapsedTime = 0;

        this.running = false;
        this.destroyed = false;

        this.collision = null;
    }

    start() {
        if (!this.destroyed) {
            this.running = true;
        }
    }

    pause() {
        this.running = false;
    }

    /*
     * dt is simulated time in seconds.
     * It is not real-world elapsed time.
     */
    step(dt) {
        if (
            !this.running ||
            this.destroyed ||
            !Number.isFinite(dt) ||
            dt <= 0
        ) {
            return;
        }

        const substeps = Math.max(
            1,
            Math.ceil(dt / PHYSICS.TIME_STEP)
        );

        const stepSize = dt / substeps;

        for (let i = 0; i < substeps; i++) {
            const previousPosition = {
                ...this.state.position
            };

            const previousTime = this.elapsedTime;

            /* ---- power, thrust and propellant for this sub-step ---- */

            const ship = this.ship;
            const canThrust =
                ship.thrust > 0 &&
                this.propellant > 0 &&
                this.controls.mode !== "hold";

            const requestedThrottle = canThrust ? this.controls.throttle : 0;

            this.sunlit = isSunlit(this.state.position);

            const power = stepPower(
                ship,
                this.powerState,
                {
                    sunlit: this.sunlit,
                    throttle: requestedThrottle,
                    instrumentOn: this.controls.instrumentOn
                },
                stepSize
            );

            this.lastPower = power;

            if (power.instrumentOk) this.scienceSeconds += stepSize;

            let thrustNewtons = ship.thrust * requestedThrottle * power.thrustFactor;

            // structural acceleration limit
            const maxForce = this.mass * ship.maxAccelG * G0;
            thrustNewtons = Math.min(thrustNewtons, maxForce);

            // "burn for X m/s" program: trim the last sub-step so it ends exactly on target
            if (this.burnProgram && thrustNewtons > 0) {
                const dvStep = thrustNewtons / this.mass * stepSize;

                if (dvStep >= this.burnProgram.remaining) {
                    thrustNewtons *= this.burnProgram.remaining / dvStep;
                    this.burnProgram.remaining = 0;
                } else {
                    this.burnProgram.remaining -= dvStep;
                }
            }

            let propellantUsed = 0;

            if (thrustNewtons > 0) {
                propellantUsed = thrustNewtons / (ship.isp * G0) * stepSize;

                if (propellantUsed >= this.propellant) {
                    propellantUsed = this.propellant;
                    thrustNewtons = propellantUsed * ship.isp * G0 / stepSize;
                }
            }

            const thrustAcceleration = thrustNewtons > 0
                ? multiply(
                    thrustDirection(this.controls.mode, this.state),
                    thrustNewtons / this.mass
                )
                : vector();

            this.lastThrust = thrustNewtons;
            this.lastAcceleration = thrustNewtons / this.mass;

            const ctx = {
                thrustAcceleration,
                ballistic: ship.dragCoefficient * ship.crossSection / this.mass
            };

            /* ---- integrate ---- */

            this.state = rk4(
                this.state,
                stepSize,
                ctx
            );

            this.elapsedTime += stepSize;

            if (this.burnProgram && this.burnProgram.remaining <= 0) {
                this.burnProgram = null;
                this.controls.throttle = 0;
            }

            if (propellantUsed > 0) {
                this.propellant -= propellantUsed;
                this.mass -= propellantUsed;
                this.deltaVSpent += this.lastAcceleration * stepSize;

                if (this.propellant < 1e-9) {
                    this.propellant = 0;
                    this.mass = ship.dryMass;
                }
            }

            const radius = magnitude(
                this.state.position
            );

            /*
             * INVALID STATE PROTECTION
             */

            if (
                !Number.isFinite(radius) ||
                !Number.isFinite(this.state.velocity.x) ||
                !Number.isFinite(this.state.velocity.y) ||
                !Number.isFinite(this.state.velocity.z)
            ) {
                this.destroyed = true;
                this.running = false;

                this.collision = {
                    type: "simulation-error",
                    name: "Invalid physics state",
                    time: this.elapsedTime
                };

                break;
            }

            /*
             * EARTH COLLISION
             */

            if (radius <= PHYSICS.EARTH_RADIUS) {
                this.destroyed = true;
                this.running = false;

                this.collision = {
                    type: "earth",
                    name: "Earth surface",
                    distance:
                        radius - PHYSICS.EARTH_RADIUS,
                    time: this.elapsedTime
                };

                break;
            }

            /*
             * ATMOSPHERIC BURN-UP
             */

            if (radius - PHYSICS.EARTH_RADIUS <= ATMOSPHERE_BURNUP_ALTITUDE) {
                this.destroyed = true;
                this.running = false;

                this.collision = {
                    type: "atmosphere",
                    name: "Atmospheric re-entry (burn-up)",
                    distance: radius - PHYSICS.EARTH_RADIUS,
                    time: this.elapsedTime
                };

                break;
            }

            /*
             * ORBITAL OBJECT COLLISION
             */

            const collision = this.hazards.checkCollisions(
                previousPosition,
                this.state.position,
                previousTime,
                this.elapsedTime
            );

            if (collision) {
                const hazard = collision.object;
                const relativeVelocity = {
                    x: hazard.velocity.x - this.state.velocity.x,
                    y: hazard.velocity.y - this.state.velocity.y,
                    z: hazard.velocity.z - this.state.velocity.z
                };
                const relativeSpeed = magnitude(relativeVelocity);

                // Kinetic energy released in the collision (reduced-mass form).
                const reducedMass =
                    (this.mass * hazard.mass) / (this.mass + hazard.mass);

                this.destroyed = true;
                this.running = false;

                this.collision = {
                    type: hazard.type,
                    name: hazard.name,
                    id: hazard.id,
                    distance: collision.distance,
                    time: collision.time,
                    relativeSpeed,
                    impactEnergy: 0.5 * reducedMass * relativeSpeed ** 2,
                    objectMass: hazard.mass
                };

                break;
            }
        }
    }

    getTelemetry() {
        const radius = magnitude(
            this.state.position
        );

        const speed = magnitude(
            this.state.velocity
        );

        const altitude =
            radius - PHYSICS.EARTH_RADIUS;

        const elements = orbitalElements(
            this.state.position,
            this.state.velocity,
            PHYSICS.EARTH_MU
        );

        const spacecraft = {
            position: {
                ...this.state.position
            },

            velocity: {
                ...this.state.velocity
            }
        };

        const hazards = this.hazards.getObjects(
            this.elapsedTime
        );

        const approaches =
            this.hazards.predictClosestApproach(
                spacecraft,
                this.elapsedTime
            );

        const periapsisAltitude = elements.periapsisRadius - PHYSICS.EARTH_RADIUS;
        const apoapsisAltitude = Number.isFinite(elements.apoapsisRadius)
            ? elements.apoapsisRadius - PHYSICS.EARTH_RADIUS
            : Infinity;

        const ship = this.ship;

        const warnings = [];
        if (elements.bound && periapsisAltitude < 160_000) warnings.push("ORBIT DECAYING");
        if (!elements.bound) warnings.push("ESCAPE TRAJECTORY");
        if (ship.thrust > 0 && this.propellant <= 0) warnings.push("OUT OF PROPELLANT");
        if (!this.lastPower.platformOk) warnings.push("POWER FAILURE");
        else if (this.controls.instrumentOn && !this.lastPower.instrumentOk) warnings.push("INSTRUMENTS OFFLINE");
        if (this.lastPower.thrustFactor < 1 && this.controls.throttle > 0) warnings.push("THRUST POWER-LIMITED");

        return {
            altitude,
            speed,
            radius,

            elapsedTime: this.elapsedTime,
            orbitalPeriod: elements.period,

            orbit: {
                ...elements,
                periapsisAltitude,
                apoapsisAltitude,
                circularSpeed: circularSpeed(radius, PHYSICS.EARTH_MU),
                escapeSpeed: escapeSpeed(radius, PHYSICS.EARTH_MU)
            },

            ship: {
                name: ship.name,
                valid: ship.valid,
                mass: this.mass,
                dryMass: ship.dryMass,
                propellant: this.propellant,
                propellantCapacity: ship.propellantCapacity,
                deltaVRemaining: remainingDeltaV(ship, this.mass),
                deltaVSpent: this.deltaVSpent,
                thrust: this.lastThrust,
                thrustMax: ship.thrust,
                acceleration: this.lastAcceleration,
                throttle: this.controls.throttle,
                burnRemaining: this.burnProgram ? this.burnProgram.remaining : null,
                mode: this.controls.mode,
                instrumentOn: this.controls.instrumentOn,
                scienceSeconds: this.scienceSeconds,
                batteryWh: this.powerState.batteryWh,
                batteryCapacity: ship.power.batteryWh,
                powerGeneration: this.lastPower.generation,
                powerDemand: this.lastPower.demand,
                sunlit: this.sunlit,
                atmosphericDensity: atmosphericDensity(altitude)
            },

            warnings,

            position: spacecraft.position,
            velocity: spacecraft.velocity,

            destroyed: this.destroyed,
            running: this.running,
            collision: this.collision,

            hazards,
            approaches
        };
    }
}
