"use strict";

/*
 * Electrical power bookkeeping for one simulation sub-step.
 *
 * Priority when power is short:
 *   1. bus (platform + communications)
 *   2. propulsion
 *   3. science instruments (shed first)
 */
export function stepPower(ship, powerState, inputs, dt) {
    const { sunlit, throttle, instrumentOn } = inputs;
    const p = ship.power;

    const generation = p.sunDependent ? (sunlit ? p.output : 0) : p.output;

    const base = p.base;
    const thrustRequest = p.propulsion * throttle;
    const instrumentRequest = instrumentOn ? p.instrument : 0;

    const energyAvailable = powerState.batteryWh * 3600; // joules
    const available = generation + (dt > 0 ? energyAvailable / dt : 0);

    let instrumentOk = instrumentOn;
    let thrustFactor = 1;
    let platformOk = true;

    let wanted = base + thrustRequest + instrumentRequest;

    if (available < wanted) {
        instrumentOk = false;
        wanted = base + thrustRequest;
    }

    if (available < wanted) {
        thrustFactor = thrustRequest > 0
            ? Math.max(0, (available - base) / thrustRequest)
            : 1;
        wanted = base + thrustRequest * thrustFactor;
    }

    if (available < base) {
        platformOk = false;
        thrustFactor = 0;
        instrumentOk = false;
        wanted = Math.max(0, available);
    }

    powerState.batteryWh = Math.max(
        0,
        Math.min(p.batteryWh, powerState.batteryWh + (generation - wanted) * dt / 3600)
    );

    return {
        generation,
        demand: wanted,
        thrustFactor,
        instrumentOk,
        platformOk,
        batteryWh: powerState.batteryWh
    };
}
