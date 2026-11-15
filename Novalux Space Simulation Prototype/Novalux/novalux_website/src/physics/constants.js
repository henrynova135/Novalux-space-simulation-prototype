
"use strict";

export const PHYSICS = Object.freeze({
    G: 6.67430e-11,

    EARTH_MASS: 5.97219e24,
    EARTH_RADIUS: 6_371_000,
    EARTH_MU: 3.986004418e14,

    INITIAL_ALTITUDE: 400_000,
    SPACECRAFT_MASS: 500,

    // Maximum simulated duration of one integration step.
    TIME_STEP: 1,

    // Maximum real-time duration processed per animation frame.
    MAX_FRAME_DELTA: 0.05,

    WARNING_DISTANCE: 1_000,
    APPROACH_PREDICTION_TIME: 600
});

export const EARTH_ORBIT = Object.freeze({
    INITIAL_ALTITUDE: PHYSICS.INITIAL_ALTITUDE,

    get INITIAL_RADIUS() {
        return PHYSICS.EARTH_RADIUS + this.INITIAL_ALTITUDE;
    },

    get CIRCULAR_SPEED() {
        return Math.sqrt(
            PHYSICS.EARTH_MU / this.INITIAL_RADIUS
        );
    },

    get PERIOD() {
        return 2 * Math.PI * Math.sqrt(
            Math.pow(this.INITIAL_RADIUS, 3) /
            PHYSICS.EARTH_MU
        );
    }
});
