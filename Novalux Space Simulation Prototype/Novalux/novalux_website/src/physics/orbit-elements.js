"use strict";

/*
 * Orbital elements from a state vector, plus transfer helpers.
 * Reference plane: the x-z plane; the equatorial normal is -y
 * (an orbit with angular momentum along -y is a prograde equatorial orbit).
 */

const cross = (a, b) => ({
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
});
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const norm = a => Math.hypot(a.x, a.y, a.z);

export function orbitalElements(position, velocity, mu) {
    const r = norm(position);
    const v = norm(velocity);

    const h = cross(position, velocity);
    const hMag = norm(h);

    const energy = v * v / 2 - mu / r;

    // eccentricity vector
    const vxh = cross(velocity, h);
    const ev = {
        x: vxh.x / mu - position.x / r,
        y: vxh.y / mu - position.y / r,
        z: vxh.z / mu - position.z / r
    };
    const e = norm(ev);

    const bound = energy < 0;
    const a = bound ? -mu / (2 * energy) : Infinity;

    const periapsisRadius = hMag * hMag / (mu * (1 + e));
    const apoapsisRadius = bound ? a * (1 + e) : Infinity;

    const inclination = hMag > 0
        ? Math.acos(Math.max(-1, Math.min(1, -h.y / hMag)))
        : 0;

    const period = bound ? 2 * Math.PI * Math.sqrt(a ** 3 / mu) : Infinity;

    let trueAnomaly = null;
    let timeToPeriapsis = null;
    let timeToApoapsis = null;

    if (e > 1e-6) {
        let cosNu = dot(ev, position) / (e * r);
        cosNu = Math.max(-1, Math.min(1, cosNu));
        trueAnomaly = Math.acos(cosNu);
        if (dot(position, velocity) < 0) trueAnomaly = 2 * Math.PI - trueAnomaly;

        if (bound) {
            const E = 2 * Math.atan2(
                Math.sqrt(1 - e) * Math.sin(trueAnomaly / 2),
                Math.sqrt(1 + e) * Math.cos(trueAnomaly / 2)
            );
            let M = E - e * Math.sin(E);
            M = ((M % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
            const n = 2 * Math.PI / period;
            timeToPeriapsis = (2 * Math.PI - M) / n;
            timeToApoapsis = ((Math.PI - M + 2 * Math.PI) % (2 * Math.PI)) / n;
        }
    }

    return {
        semiMajorAxis: a,
        eccentricity: e,
        inclination,
        periapsisRadius,
        apoapsisRadius,
        period,
        specificEnergy: energy,
        angularMomentum: hMag,
        bound,
        trueAnomaly,
        timeToPeriapsis,
        timeToApoapsis
    };
}

export function circularSpeed(radius, mu) {
    return Math.sqrt(mu / radius);
}

export function escapeSpeed(radius, mu) {
    return Math.sqrt(2 * mu / radius);
}

/* Two-impulse Hohmann transfer between circular orbits of radius r1 and r2. */
export function hohmannTransfer(r1, r2, mu) {
    const a = (r1 + r2) / 2;
    const v1 = Math.sqrt(mu / r1);
    const v2 = Math.sqrt(mu / r2);
    const vt1 = Math.sqrt(mu * (2 / r1 - 1 / a));
    const vt2 = Math.sqrt(mu * (2 / r2 - 1 / a));

    const dv1 = Math.abs(vt1 - v1);
    const dv2 = Math.abs(v2 - vt2);

    return {
        dv1,
        dv2,
        total: dv1 + dv2,
        transferTime: Math.PI * Math.sqrt(a ** 3 / mu)
    };
}
