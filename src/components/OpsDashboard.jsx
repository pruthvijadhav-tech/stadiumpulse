import React, { useMemo } from "react";
import { Users, Clock, AlertOctagon, TrendingUp, Info } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import CongestionMap from "./CongestionMap";
import AlertFeed from "./AlertFeed";

// ---------------------------------------------------------------------------
// MetricCard — reusable KPI tile used in the top metrics strip
// ---------------------------------------------------------------------------
function MetricCard({ icon, label, value, subLabel, subColor, glowVariant }) {
  return (
    <div className="metric-card">
      <div className="metric-icon-box" aria-hidden="true">{icon}</div>
      <span className="metric-label">{label}</span>
      <span className="metric-value">{value}</span>
      <span style={{ fontSize: "0.65rem", color: subColor || "var(--text-muted)", fontWeight: subColor ? "bold" : "normal" }}>
        {subLabel}
      </span>
      <div className={`metric-glow-effect ${glowVariant}`} />
    </div>
  );
}

// Recharts tooltip style — stable object reference to prevent tooltip re-mount
const CHART_TOOLTIP_STYLE = {
  backgroundColor: "#0f172a",
  borderColor: "var(--border-color)",
  borderRadius: "8px",
  color: "#f8fafc",
  fontSize: "0.75rem",
};

// ---------------------------------------------------------------------------
export default function OpsDashboard({
  stadiumData,
  alerts,
  onResolveAlert,
  onAcknowledgeAlert,
  selectedZone,
  onSelectZone,
  densityHistory,
}) {
  // Memoize derived metrics so they don't recompute on every render
  const { averageWaitTime, peakZoneName, peakDensity, attendanceEstimate, capacityPct } = useMemo(() => {
    const gates = Object.values(stadiumData.zones).filter(z => z.type === "gate");
    const avgWait = Math.round(gates.reduce((sum, g) => sum + g.currentWaitTime, 0) / gates.length);

    const [, peakZone] = Object.entries(stadiumData.zones).reduce(
      (max, curr) => (curr[1].density > max[1].density ? curr : max),
      Object.entries(stadiumData.zones)[0]
    );

    const seatingZones = Object.values(stadiumData.zones).filter(z => z.type === "seating");
    const avgSeatingDensity = seatingZones.reduce((sum, s) => sum + s.density, 0) / seatingZones.length;
    const estimate = Math.round((avgSeatingDensity / 100) * stadiumData.capacity * 0.95);

    return {
      averageWaitTime: avgWait,
      peakZoneName: peakZone.name.split(" ")[0],
      peakDensity: peakZone.density,
      attendanceEstimate: estimate,
      capacityPct: Math.round((estimate / stadiumData.capacity) * 100),
    };
  }, [stadiumData]);

  // Active zone defaults to Gate B when nothing is selected
  const activeZoneKey = selectedZone || "Gate B";
  const activeZoneData = stadiumData.zones[activeZoneKey];

  // Build chart data only when history or selected zone changes
  const chartData = useMemo(
    () =>
      (densityHistory[activeZoneKey] || []).map((density, i) => ({
        time: i === 9 ? "Now" : `-${(9 - i) * 5}m`,
        Density: density,
      })),
    [densityHistory, activeZoneKey]
  );

  const waitColor =
    averageWaitTime > 25 ? "var(--color-red)" :
    averageWaitTime > 15 ? "var(--color-yellow)" :
    "var(--color-green)";

  return (
    <div className="ops-layout">
      {/* ── LEFT: Metrics + Congestion Map ── */}
      <div className="ops-column-left">
        <div className="metrics-grid">
          <MetricCard
            icon={<Users size={16} />}
            label="Est. Attendance"
            value={attendanceEstimate.toLocaleString()}
            subLabel={`~${capacityPct}% of capacity`}
            glowVariant="cyan"
          />
          <MetricCard
            icon={<Clock size={16} />}
            label="Avg. Gate Wait"
            value={`${averageWaitTime} Min`}
            subLabel={averageWaitTime > 25 ? "Action Recommended" : "Within Normal Limits"}
            subColor={waitColor}
            glowVariant="amber"
          />
          <MetricCard
            icon={<AlertOctagon size={16} />}
            label="Peak Congestion"
            value={`${peakZoneName} (${peakDensity}%)`}
            subLabel={peakDensity > 75 ? "CRITICAL STATUS" : "MONITORING"}
            subColor="var(--color-red)"
            glowVariant="rose"
          />
        </div>

        <div className="ops-card">
          <div className="ops-card-header">
            <span className="ops-card-title">
              <TrendingUp size={18} aria-hidden="true" />
              Interactive Crowd Congestion Map
            </span>
          </div>
          <div className="ops-card-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <CongestionMap
              zones={stadiumData.zones}
              selectedZone={activeZoneKey}
              onSelectZone={onSelectZone}
              viewMode="ops"
            />
          </div>
        </div>
      </div>

      {/* ── RIGHT: Alert Feed + Density Trend Chart ── */}
      <div className="ops-column-right">
        <AlertFeed alerts={alerts} onResolveAlert={onResolveAlert} onAcknowledgeAlert={onAcknowledgeAlert} />

        <div className="ops-card">
          <div className="ops-card-header">
            <span className="ops-card-title">
              <TrendingUp size={18} aria-hidden="true" />
              Density Trend: {activeZoneData?.name || activeZoneKey}
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <Info size={12} aria-hidden="true" /> Click zone on map to load trend
            </span>
          </div>
          <div className="ops-card-body" style={{ minHeight: "270px" }}>
            <div className="chart-container-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="time" stroke="var(--text-muted)" style={{ fontSize: "0.7rem" }} />
                  <YAxis domain={[0, 100]} stroke="var(--text-muted)" style={{ fontSize: "0.7rem" }} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: "0.75rem", color: "var(--text-muted)" }} />
                  <Line type="monotone" dataKey="Density" stroke="var(--primary)" strokeWidth={2.5} activeDot={{ r: 6 }} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
