/**
 * Linearized Clohessy-Wiltshire relative motion for a deputy spacecraft
 * near a circular-orbit target. x is radial, y is along-track; SI units.
 * This is an educational local-orbit model, not a flight-navigation solution.
 */
export function integrateClohessyWiltshire(state, dt, thrustX = 0, thrustY = 0, meanMotion = 0.0011) {
  if (!state || !Number.isFinite(dt) || dt < 0) throw new TypeError("A valid state and non-negative timestep are required");
  const n2 = meanMotion * meanMotion;
  const ax = 3 * n2 * state.x + 2 * meanMotion * state.vy + thrustX;
  const ay = -2 * meanMotion * state.vx + thrustY;
  state.vx += ax * dt;
  state.vy += ay * dt;
  state.x += state.vx * dt;
  state.y += state.vy * dt;
  return { ax, ay };
}
