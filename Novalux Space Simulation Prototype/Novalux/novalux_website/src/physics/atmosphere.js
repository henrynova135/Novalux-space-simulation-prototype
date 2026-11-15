"use strict";

import { PHYSICS } from "./constants.js";

/*
 * Simplified Earth atmosphere (log-linear interpolation of a
 * US-Standard-Atmosphere-like density table, moderate solar activity).
 * Educational model: good to within a factor of ~2 above 150 km.
 */
const TABLE = [
    [0, 1.225],
    [25_000, 3.95e-2],
    [50_000, 1.03e-3],
    [80_000, 1.85e-5],
    [100_000, 5.6e-7],
    [150_000, 2.1e-9],
    [200_000, 2.5e-10],
    [300_000, 1.9e-11],
    [400_000, 2.8e-12],
    [500_000, 5.2e-13],
    [600_000, 1.1e-13],
    [800_000, 1.1e-14],
    [1_000_000, 3.5e-15]
];

export const ATMOSPHERE_BURNUP_ALTITUDE = 80_000;

export function atmosphericDensity(altitude) {
    if (!Number.isFinite(altitude)) return 0;
    if (altitude <= 0) return TABLE[0][1];

    const last = TABLE[TABLE.length - 1];
    if (altitude >= last[0]) return 0;

    for (let i = 1; i < TABLE.length; i++) {
        const [h1, d1] = TABLE[i];
        if (altitude <= h1) {
            const [h0, d0] = TABLE[i - 1];
            const t = (altitude - h0) / (h1 - h0);
            return Math.exp(Math.log(d0) + t * (Math.log(d1) - Math.log(d0)));
        }
    }

    return 0;
}

/* Earth's rotation axis in simulation coordinates (equatorial orbits are prograde). */
export const EARTH_SPIN_AXIS = Object.freeze({ x: 0, y: -1, z: 0 });
export const EARTH_ROTATION_RATE = 7.2921159e-5;

/*
 * Drag acceleration for a body with ballistic factor Cd*A/m (m^2/kg).
 * Velocity is taken relative to the co-rotating atmosphere.
 */
export function dragAcceleration(position, velocity, cdAreaOverMass) {
    const radius = Math.hypot(position.x, position.y, position.z);
    const altitude = radius - PHYSICS.EARTH_RADIUS;
    const density = atmosphericDensity(altitude);

    if (density <= 0 || !(cdAreaOverMass > 0)) {
        return { x: 0, y: 0, z: 0 };
    }

    const w = EARTH_ROTATION_RATE;
    const a = EARTH_SPIN_AXIS;

    // atmosphere velocity = omega x r
    const atm = {
        x: w * (a.y * position.z - a.z * position.y),
        y: w * (a.z * position.x - a.x * position.z),
        z: w * (a.x * position.y - a.y * position.x)
    };

    const rel = {
        x: velocity.x - atm.x,
        y: velocity.y - atm.y,
        z: velocity.z - atm.z
    };

    const speed = Math.hypot(rel.x, rel.y, rel.z);
    const k = -0.5 * density * cdAreaOverMass * speed;

    return { x: k * rel.x, y: k * rel.y, z: k * rel.z };
}
