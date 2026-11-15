"use strict";

import {
    G0,
    PROPULSION_PERFORMANCE,
    PLATFORM_PHYSICS,
    SOLAR_AREA_PER_WATT,
    SUNLIGHT_INDEPENDENT_POWER,
    platformPhysicsFallback,
    propulsionFallback
} from "./ship-data.js";

import { PHYSICS } from "../physics/constants.js";

const REQUIRED = ["platform", "propulsion", "power", "instrument", "communication"];

/* Ship used when no design is available: matches the original 500 kg point mass. */
export const DEFAULT_SHIP = Object.freeze({
    valid: true,
    name: "Reference spacecraft",
    selections: {},
    dryMass: PHYSICS.SPACECRAFT_MASS,
    propellantCapacity: 0,
    propellantMass: 0,
    totalMass: PHYSICS.SPACECRAFT_MASS,
    thrust: 0,
    isp: 1,
    exhaustVelocity: 0,
    deltaV: 0,
    crossSection: 1,
    dragCoefficient: 2.2,
    collisionRadius: 2,
    maxAccelG: 10,
    power: {
        output: 0, sunDependent: false, base: 0, instrument: 0,
        propulsion: 0, batteryWh: 0
    },
    launch: null,
    errors: []
});

/*
 * Build a flyable ship from the designer's selections.
 * design = { selections: {category: name}, components: {category: {items}} }
 */
export function buildShip(design) {
    const errors = [];
    const parts = {};

    for (const category of REQUIRED) {
        const name = design?.selections?.[category];
        const item = design?.components?.[category]?.items?.[name];

        if (!item) {
            errors.push(`Select a ${category} component in the Spacecraft Designer.`);
        } else {
            parts[category] = { name, ...item };
        }
    }

    if (errors.length) {
        return { ...DEFAULT_SHIP, valid: false, errors, name: "Unconfigured spacecraft" };
    }

    const { platform, propulsion, power, instrument, communication } = parts;

    const platformPhysics =
        PLATFORM_PHYSICS[platform.name] ?? platformPhysicsFallback(platform);
    const engine =
        PROPULSION_PERFORMANCE[propulsion.name] ?? propulsionFallback(propulsion);

    const dryMass =
        platform.mass + propulsion.mass + power.mass +
        instrument.mass + communication.mass;

    const basePropellantCapacity = platformPhysics.propellantCapacity;
    const missionTankCapacity = design?.mission === "moon" ? 650 : design?.mission === "mars" ? 1300 : 0;
    const propellantCapacity = Math.max(basePropellantCapacity, missionTankCapacity);
    const totalMass = dryMass + propellantCapacity;

    const exhaustVelocity = engine.isp * G0;
    const deltaV = exhaustVelocity * Math.log(totalMass / dryMass);

    const sunDependent = !SUNLIGHT_INDEPENDENT_POWER.includes(power.name);
    const arrayArea = sunDependent ? power.output * SOLAR_AREA_PER_WATT : 0;

    const launcherName = design?.selections?.launcher;
    const launcher = design?.components?.launcher?.items?.[launcherName];

    return {
        valid: true,
        name: platform.name,
        selections: { ...design.selections },
        parts,

        dryMass,
        propellantCapacity,
        propellantMass: propellantCapacity,
        totalMass,

        thrust: engine.thrust,
        isp: engine.isp,
        exhaustVelocity,
        deltaV,

        crossSection: platformPhysics.crossSection + arrayArea,
        dragCoefficient: platformPhysics.dragCoefficient,
        collisionRadius: platformPhysics.collisionRadius,
        maxAccelG: platformPhysics.maxAccelG,

        power: {
            output: power.output,
            sunDependent,
            base: platform.powerDemand + communication.power,
            instrument: instrument.power,
            propulsion: propulsion.power,
            batteryWh: platformPhysics.batteryWh
        },

        launch: launcher
            ? {
                name: launcherName,
                capacity: launcher.capacity,
                margin: launcher.capacity - totalMass,
                withinCapacity: totalMass <= launcher.capacity
            }
            : null,

        errors
    };
}

/* Remaining delta-v for a given current mass. */
export function remainingDeltaV(ship, currentMass) {
    if (!(ship.exhaustVelocity > 0) || currentMass <= ship.dryMass) return 0;
    return ship.exhaustVelocity * Math.log(currentMass / ship.dryMass);
}
