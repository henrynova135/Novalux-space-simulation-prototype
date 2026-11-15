"use strict";

/*
 * Flight-physics data for designer components.
 *
 * The designer (app.js) owns mass, power and cost. This file adds the
 * physical properties needed to actually fly the design. To add a new
 * platform or engine, add an entry here using the same name as in app.js.
 */

export const G0 = 9.80665;

/* Thrust in newtons at full throttle, specific impulse in seconds. */
export const PROPULSION_PERFORMANCE = Object.freeze({
    "Chemical propulsion": { thrust: 400, isp: 310 },
    "Electric propulsion": { thrust: 2, isp: 3000 },     // thrust game-scaled so burns are playable
    "Cold gas propulsion": { thrust: 20, isp: 70 },
    "Advanced propulsion": { thrust: 150, isp: 1200 }    // fictional
});

/*
 * collisionRadius (m): bounding radius used for collisions
 * crossSection (m^2): average drag area of the bus (solar arrays are added)
 * maxAccelG: structural acceleration limit
 * propellantCapacity (kg), batteryWh: tank and battery size
 */
export const PLATFORM_PHYSICS = Object.freeze({
    "CubeSat": {
        collisionRadius: 0.15,
        crossSection: 0.06,
        dragCoefficient: 2.2,
        maxAccelG: 5,
        propellantCapacity: 4,
        batteryWh: 20
    },
    "Small Satellite": {
        collisionRadius: 0.9,
        crossSection: 1.0,
        dragCoefficient: 2.2,
        maxAccelG: 6,
        propellantCapacity: 20,
        batteryWh: 80
    },
    "Explorer": {
        collisionRadius: 1.8,
        crossSection: 4.0,
        dragCoefficient: 2.2,
        maxAccelG: 4,
        propellantCapacity: 60,
        batteryWh: 200
    }
});

/* Solar array area per watt of output (m^2/W). */
export const SOLAR_AREA_PER_WATT = 0.006;

/* Power sources that do not depend on sunlight. */
export const SUNLIGHT_INDEPENDENT_POWER = Object.freeze(["Radioisotope power"]);

/* Used when a component has no entry above, so new designs still fly. */
export function platformPhysicsFallback(platform) {
    const mass = platform?.mass ?? 50;
    const size = Math.cbrt(mass / 100);

    return {
        collisionRadius: Math.max(0.1, 0.9 * size),
        crossSection: Math.max(0.05, 1.5 * size * size),
        dragCoefficient: 2.2,
        maxAccelG: 5,
        propellantCapacity: Math.max(2, mass * 0.4),
        batteryWh: Math.max(10, mass * 2)
    };
}

export function propulsionFallback(propulsion) {
    const capability = propulsion?.capability ?? 5;

    return {
        thrust: capability * 20,
        isp: 50 + capability * 30
    };
}
