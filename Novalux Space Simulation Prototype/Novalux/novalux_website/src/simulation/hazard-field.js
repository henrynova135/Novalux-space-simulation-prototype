
"use strict";

import { PHYSICS } from "../physics/constants.js";

const TRAINING_OBJECTS = [
    {
        id: "SAT-001",
        name: "Research Satellite",
        type: "satellite",
        diameter: 4.0,
        altitude: 400_000,
        inclination: 0.02,
        phase: 1.1
    },
    {
        id: "SAT-002",
        name: "Communication Satellite",
        type: "satellite",
        diameter: 3.0,
        altitude: 420_000,
        inclination: 0.08,
        phase: 2.8
    },
    {
        id: "DEB-001",
        name: "Structural Fragment",
        type: "debris",
        diameter: 0.4,
        altitude: 401_000,
        inclination: 0.03,
        phase: 2.0
    },
    {
        id: "DEB-002",
        name: "Metallic Fragment",
        type: "debris",
        diameter: 0.12,
        altitude: 397_000,
        inclination: 0.04,
        phase: 4.2
    },
    {
        id: "DEB-003",
        name: "Panel Fragment",
        type: "debris",
        diameter: 1.2,
        altitude: 405_000,
        inclination: 0.12,
        phase: 5.1
    },
    {
        id: "DEB-004",
        name: "Small Debris",
        type: "debris",
        diameter: 0.08,
        altitude: 410_000,
        inclination: 0.06,
        phase: 0.7
    },
    {
        id: "DEB-005",
        name: "Rocket Body Fragment",
        type: "debris",
        diameter: 2.0,
        altitude: 415_000,
        inclination: 0.15,
        phase: 3.7
    },
    {
        id: "DEB-006",
        name: "Insulation Fragment",
        type: "debris",
        diameter: 0.2,
        altitude: 390_000,
        inclination: 0.1,
        phase: 5.7
    }
];

/* VECTOR UTILITIES */

function vector(x = 0, y = 0, z = 0) {
    return { x, y, z };
}

function subtract(a, b) {
    return vector(
        a.x - b.x,
        a.y - b.y,
        a.z - b.z
    );
}

function magnitude(a) {
    return Math.sqrt(
        a.x * a.x +
        a.y * a.y +
        a.z * a.z
    );
}

/* ORBITAL POSITION */

function getOrbitalRadius(object) {
    return PHYSICS.EARTH_RADIUS + object.altitude;
}

function getAngularVelocity(object) {
    const radius = getOrbitalRadius(object);

    return Math.sqrt(
        PHYSICS.EARTH_MU / radius ** 3
    );
}

function getPosition(object, time) {
    const radius = getOrbitalRadius(object);
    const angularVelocity = getAngularVelocity(object);

    const angle = object.phase + angularVelocity * time;

    const sin = Math.sin(angle);
    const cos = Math.cos(angle);

    const sinI = Math.sin(object.inclination);
    const cosI = Math.cos(object.inclination);

    return vector(
        radius * cos,
        radius * sin * sinI,
        radius * sin * cosI
    );
}

function getVelocity(object, time) {
    const radius = getOrbitalRadius(object);
    const angularVelocity = getAngularVelocity(object);

    const angle = object.phase + angularVelocity * time;

    const sin = Math.sin(angle);
    const cos = Math.cos(angle);

    const sinI = Math.sin(object.inclination);
    const cosI = Math.cos(object.inclination);

    return vector(
        -radius * angularVelocity * sin,
        radius * angularVelocity * cos * sinI,
        radius * angularVelocity * cos * cosI
    );
}

/*
 * Estimated mass (kg) when an object does not define one.
 * Debris: hollow-fragment average density; satellites: ~80 kg per cubic metre of bounding box.
 */
function estimateMass(object) {
    if (Number.isFinite(object.mass)) return object.mass;

    const radius = object.diameter / 2;

    return object.type === "satellite"
        ? 80 * object.diameter ** 3
        : 1000 * (4 / 3) * Math.PI * radius ** 3;
}

/* HAZARD FIELD */

export class HazardField {
    constructor() {
        // Illustrative physical radius for the spacecraft.
        // This is independent of its rendered 3D size.
        this.spacecraftCollisionRadius = 2;

        this.objects = TRAINING_OBJECTS.map(object => ({
            ...object,
            collisionRadius: object.diameter / 2,
            mass: estimateMass(object)
        }));
    }

    getObjects(time) {
        return this.objects.map(object => ({
            ...object,
            position: getPosition(object, time),
            velocity: getVelocity(object, time)
        }));
    }

    /*
     * Checks the closest distance between the spacecraft
     * and each hazard during one integration step.
     *
     * Segment interpolation is an approximation. Smaller
     * integration steps improve collision detection.
     */
    checkCollisions(
        spacecraftStart,
        spacecraftEnd,
        startTime,
        endTime
    ) {
        const hazards = this.getObjects(endTime);

        for (const hazard of hazards) {
            const hazardStart = getPosition(
                hazard,
                startTime
            );

            const hazardEnd = hazard.position;

            const relativeStart = subtract(
                spacecraftStart,
                hazardStart
            );

            const relativeEnd = subtract(
                spacecraftEnd,
                hazardEnd
            );

            const movement = subtract(
                relativeEnd,
                relativeStart
            );

            const denominator =
                movement.x ** 2 +
                movement.y ** 2 +
                movement.z ** 2;

            let fraction = 0;

            if (denominator > 0) {
                const dot =
                    relativeStart.x * movement.x +
                    relativeStart.y * movement.y +
                    relativeStart.z * movement.z;

                fraction = Math.max(
                    0,
                    Math.min(1, -dot / denominator)
                );
            }

            const closest = vector(
                relativeStart.x + movement.x * fraction,
                relativeStart.y + movement.y * fraction,
                relativeStart.z + movement.z * fraction
            );

            const distance = magnitude(closest);

            const combinedRadius =
                this.spacecraftCollisionRadius +
                hazard.collisionRadius;

            if (distance <= combinedRadius) {
                return {
                    object: hazard,
                    distance,
                    collisionRadius: combinedRadius,
                    time:
                        startTime +
                        (endTime - startTime) * fraction
                };
            }
        }

        return null;
    }

    /*
     * Estimates closest approach using constant relative
     * velocity. This is not a full future orbit simulation.
     */
    predictClosestApproach(
        spacecraft,
        time,
        horizon = PHYSICS.APPROACH_PREDICTION_TIME
    ) {
        const hazards = this.getObjects(time);

        return hazards.map(hazard => {
            const relativePosition = subtract(
                hazard.position,
                spacecraft.position
            );

            const relativeVelocity = subtract(
                hazard.velocity,
                spacecraft.velocity
            );

            const speedSquared =
                relativeVelocity.x ** 2 +
                relativeVelocity.y ** 2 +
                relativeVelocity.z ** 2;

            let closestTime = 0;

            if (speedSquared > 0) {
                const dot =
                    relativePosition.x * relativeVelocity.x +
                    relativePosition.y * relativeVelocity.y +
                    relativePosition.z * relativeVelocity.z;

                closestTime = -dot / speedSquared;
            }

            closestTime = Math.max(
                0,
                Math.min(horizon, closestTime)
            );

            const closestPosition = vector(
                relativePosition.x +
                    relativeVelocity.x * closestTime,

                relativePosition.y +
                    relativeVelocity.y * closestTime,

                relativePosition.z +
                    relativeVelocity.z * closestTime
            );

            const missDistance = magnitude(
                closestPosition
            );

            const collisionRadius =
                this.spacecraftCollisionRadius +
                hazard.collisionRadius;

            return {
                id: hazard.id,
                name: hazard.name,
                type: hazard.type,

                diameter: hazard.diameter,
                collisionRadius,

                missDistance,
                closestTime,

                collisionRisk:
                    missDistance <= collisionRadius,

                warning:
                    missDistance <= PHYSICS.WARNING_DISTANCE
            };
        }).sort(
            (a, b) => a.missDistance - b.missDistance
        );
    }
}
