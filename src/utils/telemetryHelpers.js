/**
 * Generate an initial 10-point history list around a base density value.
 * @param {number} baseDensity - The baseline density (0-100).
 * @returns {number[]} Array of 10 drifted density values.
 */
export function makeInitialHistory(baseDensity) {
  return Array.from({ length: 10 }, () => {
    const drift = Math.floor(Math.random() * 11) - 5;
    return Math.max(10, Math.min(95, baseDensity + drift));
  });
}

/**
 * Return a new zones map with each density / wait-time randomly drifted.
 * @param {Object} zones - The current stadium zones state.
 * @returns {Object} A new zones state object with drifted metrics.
 */
export function driftZones(zones) {
  const next = {};
  for (const [key, zone] of Object.entries(zones)) {
    const density = Math.max(10, Math.min(95, zone.density + Math.floor(Math.random() * 9) - 4));
    next[key] = {
      ...zone,
      density,
      ...(zone.type === "gate" && {
        currentWaitTime: Math.max(2, Math.round(density * 0.4 + (Math.random() * 4 - 2))),
      }),
    };
  }
  return next;
}

/**
 * Build an alert object with common timestamp / status fields.
 * @param {Object} params - Alert construction data.
 * @returns {Object} Properly formatted alert object.
 */
export function makeAlert({ id, zone, headline, recommendation, urgency, source }) {
  return {
    id,
    zone,
    headline,
    recommendation,
    urgency,
    source,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    status: "active",
  };
}
