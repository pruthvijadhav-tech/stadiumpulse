import React, { useMemo, memo } from "react";
import { Eye } from "lucide-react";
import PropTypes from "prop-types";

// ---------------------------------------------------------------------------
// SVG layout — stable module-level constant; never recreated on re-render.
// Each entry describes the SVG primitive to draw for a given zone key.
// ---------------------------------------------------------------------------
const SVG_LAYOUT = {
  "Section 100":      { type: "ellipse", cx: 200, cy: 150, rx: 65,  ry: 45,  strokeWidth: 16 },
  "Section 200":      { type: "path",    d: "M200,85 A90,65 0 0,1 200,215",  strokeWidth: 16 },
  "Section 300":      { type: "path",    d: "M200,85 A90,65 0 0,0 200,215",  strokeWidth: 16 },
  "Section 400":      { type: "ellipse", cx: 200, cy: 150, rx: 120, ry: 90,  strokeWidth: 16 },
  "Concourse North":  { type: "path",    d: "M50,150 A150,115 0 0,1 350,150", strokeWidth: 14 },
  "Concourse South":  { type: "path",    d: "M50,150 A150,115 0 0,0 350,150", strokeWidth: 14 },
  "Gate A":           { type: "rect",    x: 185, y: 15,  width: 30, height: 12, rx: 3 },
  "Gate B":           { type: "rect",    x: 362, y: 138, width: 12, height: 24, rx: 3 },
  "Gate C":           { type: "rect",    x: 185, y: 273, width: 30, height: 12, rx: 3 },
  "Gate D":           { type: "rect",    x: 26,  y: 138, width: 12, height: 24, rx: 3 },
};

// Legend items — static, defined once
const LEGEND = [
  { cls: "green",  label: "Low (<40%)", symbol: "✓" },
  { cls: "yellow", label: "Moderate (40–70%)", symbol: "!" },
  { cls: "red",    label: "High (>70%)", symbol: "⚠" },
];

/**
 * Returns the CSS class for a zone based on its crowd density.
 * @param {number} density - Crowd density as a percentage (0–100).
 * @returns {string} CSS class name.
 */
function densityClass(density) {
  if (density < 40) return "zone-green";
  if (density <= 70) return "zone-yellow";
  return "zone-red";
}

/**
 * Returns a human-readable congestion label for a given density.
 * @param {number} density - Crowd density as a percentage (0–100).
 * @returns {string} Congestion level label.
 */
function densityLabel(density) {
  if (density < 40) return "Low Congestion";
  if (density <= 70) return "Moderate Congestion";
  return "High Congestion";
}

/**
 * Returns the badge colour class for a given density.
 * @param {number} density - Crowd density as a percentage (0–100).
 * @returns {string} Colour class ("green" | "yellow" | "red").
 */
function densityBadgeCls(density) {
  if (density < 40) return "green";
  if (density <= 70) return "yellow";
  return "red";
}

/**
 * Returns the accessibility symbol representing the congestion level.
 * @param {number} density - Crowd density as a percentage (0–100).
 * @returns {string} Unicode symbol.
 */
function getDensitySymbol(density) {
  if (density < 40) return "✓";
  if (density <= 70) return "!";
  return "⚠";
}

// ---------------------------------------------------------------------------
// ZoneShape — renders the correct SVG primitive for a zone entry.
// Memoized: only re-renders when its own density / selection state changes.
// ---------------------------------------------------------------------------
const ZoneShape = memo(function ZoneShape({ zoneId, el, cls, isSelected, onClick, density }) {
  const symbol = getDensitySymbol(density);

  // Approximate symbol text position from shape geometry
  let textX = 200, textY = 150;
  if (el.cx !== undefined) { textX = el.cx; textY = el.cy; }
  else if (el.x !== undefined) { textX = el.x + el.width / 2; textY = el.y + el.height / 2; }
  if (zoneId === "Section 200")     { textX = 280; textY = 150; }
  else if (zoneId === "Section 300")     { textX = 120; textY = 150; }
  else if (zoneId === "Concourse North") { textX = 200; textY = 45; }
  else if (zoneId === "Concourse South") { textX = 200; textY = 255; }

  const shared = {
    className: `svg-zone ${cls} ${isSelected ? "selected" : ""}`,
    onClick,
    onKeyDown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } },
    style: { cursor: "pointer" },
    tabIndex: 0,
    role: "button",
    "aria-label": `${zoneId}, ${densityLabel(density)}. Press Enter to select.`,
  };

  const textElement = (
    <text
      x={textX}
      y={textY}
      className="zone-symbol"
      textAnchor="middle"
      dominantBaseline="middle"
      style={{ fontSize: "10px", fontWeight: "bold", pointerEvents: "none", fill: "var(--text-main)" }}
      aria-hidden="true"
    >
      {symbol}
    </text>
  );

  if (el.type === "ellipse") {
    return <g><ellipse cx={el.cx} cy={el.cy} rx={el.rx} ry={el.ry} strokeWidth={el.strokeWidth} fill="none" {...shared} />{textElement}</g>;
  }
  if (el.type === "path") {
    return <g><path d={el.d} strokeWidth={el.strokeWidth} fill="none" {...shared} />{textElement}</g>;
  }
  if (el.type === "rect") {
    return <g><rect x={el.x} y={el.y} width={el.width} height={el.height} rx={el.rx} fillOpacity={0.8} {...shared} />{textElement}</g>;
  }
  return null;
});

ZoneShape.propTypes = {
  zoneId:     PropTypes.string.isRequired,
  el:         PropTypes.object.isRequired,
  cls:        PropTypes.string.isRequired,
  isSelected: PropTypes.bool.isRequired,
  onClick:    PropTypes.func.isRequired,
  density:    PropTypes.number.isRequired,
};

// ---------------------------------------------------------------------------
// CongestionMap — interactive SVG stadium map with real-time density colours.
// Memoized: re-renders only when zone densities, selection, or viewMode change.
// ---------------------------------------------------------------------------
function CongestionMap({ zones, selectedZone, onSelectZone }) {
  // Derive per-zone CSS class once per render (zones update every 5 s)
  const zoneClasses = useMemo(
    () => Object.fromEntries(Object.entries(zones).map(([k, z]) => [k, densityClass(z.density)])),
    [zones]
  );

  // Stable per-zone click handlers so ZoneShape memo is not invalidated by new refs
  const clickHandlers = useMemo(
    () => Object.fromEntries(Object.keys(SVG_LAYOUT).map(zoneId => [zoneId, () => onSelectZone(zoneId)])),
    [onSelectZone]
  );

  const selectedZoneData = zones[selectedZone];

  return (
    <div className="map-container">
      {/* ── SVG Stadium Diagram ── */}
      <div className="map-svg-wrapper">
        <svg viewBox="0 0 400 300" className="stadium-svg" role="img" aria-label="Interactive Stadium Congestion Map showing gates and seating sections">
          {/* Pitch */}
          <rect x="175" y="132" width="50" height="36" fill="#38a169" fillOpacity={0.6} stroke="#ffffff" strokeWidth="0.8" rx="2" />
          <line x1="200" y1="132" x2="200" y2="168" stroke="#ffffff" strokeWidth="0.8" />
          <circle cx="200" cy="150" r="8" fill="none" stroke="#ffffff" strokeWidth="0.8" />

          {/* Zone shapes */}
          {Object.entries(SVG_LAYOUT).map(([zoneId, el]) => {
            const zone = zones[zoneId];
            if (!zone) return null;
            return (
              <ZoneShape
                key={zoneId}
                zoneId={zoneId}
                el={el}
                cls={zoneClasses[zoneId]}
                density={zone.density}
                isSelected={selectedZone === zoneId}
                onClick={clickHandlers[zoneId]}
              />
            );
          })}

          {/* Gate labels */}
          <text x="200" y="24"  className="svg-label">GATE A</text>
          <text x="355" y="153" className="svg-label" transform="rotate(90, 355, 153)">GATE B</text>
          <text x="200" y="282" className="svg-label">GATE C</text>
          <text x="45"  y="153" className="svg-label" transform="rotate(-90, 45, 153)">GATE D</text>

          {/* Section labels */}
          <text x="200" y="70"  className="svg-label" style={{ fontSize: "6px", opacity: 0.8 }}>SEC 400 (UPPER)</text>
          <text x="135" y="152" className="svg-label" style={{ fontSize: "6px", opacity: 0.8 }}>SEC 300</text>
          <text x="265" y="152" className="svg-label" style={{ fontSize: "6px", opacity: 0.8 }}>SEC 200</text>
          <text x="200" y="120" className="svg-label" style={{ fontSize: "6px", opacity: 0.8 }}>SEC 100</text>
        </svg>
      </div>

      {/* ── Density Legend ── */}
      <div className="map-legend" role="note" aria-label="Map Legend">
        {LEGEND.map(({ cls, label, symbol }) => (
          <div key={cls} className="legend-item">
            <span className={`legend-dot ${cls}`} aria-hidden="true" style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8px", fontWeight: "bold" }}>{symbol}</span>
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* ── Selected Zone Detail Card ── */}
      {selectedZoneData ? (
        <div className="zone-details-card">
          <div className="zone-details-header">
            <span className="zone-details-title" id="zone-details-title">{selectedZoneData.name}</span>
            <span className={`density-badge ${densityBadgeCls(selectedZoneData.density)}`} aria-label={`Density: ${densityLabel(selectedZoneData.density)}, ${selectedZoneData.density}%`}>
              {getDensitySymbol(selectedZoneData.density)} {densityLabel(selectedZoneData.density)} ({selectedZoneData.density}%)
            </span>
          </div>

          <div className="zone-info-grid">
            <div>
              <span className="zone-info-label">Zone Type: </span>
              <span className="zone-info-value" style={{ textTransform: "capitalize" }}>{selectedZoneData.type}</span>
            </div>
            {selectedZoneData.type === "gate" && (
              <div>
                <span className="zone-info-label">Est. Wait Time: </span>
                <span className="zone-info-value" style={{ color: selectedZoneData.currentWaitTime > 30 ? "var(--color-red)" : "inherit" }}>
                  {selectedZoneData.currentWaitTime} mins
                </span>
              </div>
            )}
          </div>

          <div>
            <span className="zone-info-label" style={{ display: "block", marginBottom: "0.25rem" }}>Amenities:</span>
            {selectedZoneData.amenities?.length > 0 ? (
              <div className="zone-amenity-list">
                {selectedZoneData.amenities.map((a, i) => (
                  <span key={i} className="zone-amenity-tag">{a}</span>
                ))}
              </div>
            ) : (
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                No amenities configured.
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="zone-details-card" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", color: "var(--text-muted)" }}>
          <div style={{ textAlign: "center" }}>
            <Eye size={20} style={{ marginBottom: "0.5rem", opacity: 0.6 }} aria-hidden="true" />
            <p style={{ fontSize: "0.8rem" }}>Click any zone or gate to inspect live metrics.</p>
          </div>
        </div>
      )}
    </div>
  );
}

CongestionMap.propTypes = {
  /** Live zone data keyed by zone name */
  zones:        PropTypes.objectOf(PropTypes.object).isRequired,
  /** Currently selected zone name, or null */
  selectedZone: PropTypes.string,
  /** Callback fired with the zone name when the user selects a zone */
  onSelectZone: PropTypes.func.isRequired,
};

CongestionMap.defaultProps = {
  selectedZone: null,
};

export default memo(CongestionMap);
