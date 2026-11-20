/**
 * Small defensive wrapper around browser storage.
 * The simulation should remain usable when storage is disabled, unavailable,
 * malformed, or full; persistence is a convenience, not a startup requirement.
 */
export function readLocalJSON(key, fallback = {}) {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    if (raw === null || raw === undefined || raw === '') return fallback;
    const value = JSON.parse(raw);
    return value && typeof value === 'object' ? value : fallback;
  } catch {
    return fallback;
  }
}

export function writeLocalJSON(key, value) {
  try {
    if (!globalThis.localStorage) return false;
    globalThis.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
