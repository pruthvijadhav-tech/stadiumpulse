import React, { memo } from "react";
import PropTypes from "prop-types";
import { AlertTriangle, Shield, CheckCircle, Zap, Activity } from "lucide-react";

function AlertFeed({ alerts, onResolveAlert, onAcknowledgeAlert }) {
  // Urgency icon color helper
  const getAlertStyle = (urgency) => {
    switch (urgency) {
      case "high":
        return {
          icon: <AlertTriangle size={16} className="text-red" style={{ color: "var(--color-red)" }} aria-hidden="true" />,
          class: "urgency-high"
        };
      case "medium":
        return {
          icon: <Shield size={16} className="text-yellow" style={{ color: "var(--color-yellow)" }} aria-hidden="true" />,
          class: "urgency-medium"
        };
      default:
        return {
          icon: <CheckCircle size={16} className="text-green" style={{ color: "var(--color-green)" }} aria-hidden="true" />,
          class: "urgency-low"
        };
    }
  };

  return (
    <div className="ops-card" style={{ flex: 1 }}>
      <div className="ops-card-header">
        <span className="ops-card-title">
          <Activity size={18} aria-hidden="true" />
          Real-Time AI Operational Alerts
        </span>
        <span style={{
          fontSize: "0.7rem",
          background: "var(--primary-light)",
          color: "var(--primary)",
          padding: "0.25rem 0.5rem",
          borderRadius: "var(--radius-sm)",
          fontWeight: 700
        }}>
          {alerts.filter(a => a.status === "active").length} ACTIVE
        </span>
      </div>
      <div className="ops-card-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {alerts.length === 0 ? (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            color: "var(--text-muted)",
            height: "100%"
          }}>
            <CheckCircle size={32} style={{ color: "var(--color-green)", marginBottom: "0.75rem", opacity: 0.8 }} aria-hidden="true" />
            <p style={{ fontSize: "0.85rem", fontWeight: 600 }}>All Systems Nominal</p>
            <p style={{ fontSize: "0.75rem", opacity: 0.7 }}>No operational anomalies detected.</p>
          </div>
        ) : (
          <div className="alert-feed-container">
            {alerts.map((alert) => {
              const style = getAlertStyle(alert.urgency);
              const isActive = alert.status === "active";
              
              return (
                <div 
                  key={alert.id} 
                  className={`alert-item ${style.class}`}
                  style={{
                    opacity: isActive ? 1 : 0.6,
                    transition: "opacity 0.3s ease",
                    borderLeftWidth: "4px"
                  }}
                >
                  <div className="alert-top">
                    <div className="alert-title-group">
                      <span className="alert-zone-badge">{alert.zone}</span>
                      <span className="alert-headline" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        {style.icon}
                        {alert.headline}
                      </span>
                    </div>
                    <span className="alert-time">{alert.timestamp}</span>
                  </div>

                  <div className="alert-recommendation">
                    <strong>AI Recommendation: </strong>
                    {alert.recommendation}
                  </div>

                  <div className="alert-actions">
                    {isActive ? (
                      <>
                        <button 
                          className="ops-btn ops-btn-secondary"
                          onClick={() => onAcknowledgeAlert(alert.id)}
                          aria-label={`Acknowledge alert for ${alert.zone}`}
                        >
                          Acknowledge
                        </button>
                        <button 
                          className="ops-btn ops-btn-primary"
                          onClick={() => onResolveAlert(alert.id)}
                          aria-label={`Dispatch team for ${alert.zone}`}
                        >
                          <Zap size={12} aria-hidden="true" />
                          Dispatch Team
                        </button>
                      </>
                    ) : (
                      <span style={{
                        fontSize: "0.7rem",
                        color: alert.status === "dispatched" ? "var(--primary)" : "var(--color-green)",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        padding: "0.25rem 0.5rem",
                        background: "rgba(255,255,255,0.03)",
                        borderRadius: "4px"
                      }}>
                        <CheckCircle size={10} />
                        {alert.status === "dispatched" ? "Dispatched" : "Acknowledged"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="sim-alert-loader">
          <span className="sim-pulse-dot"></span>
          <span>Simulated Ops telemetry streams active (updating live...)</span>
        </div>
      </div>
    </div>
  );
}

AlertFeed.propTypes = {
  /** Array of active operational alert objects */
  alerts:             PropTypes.arrayOf(PropTypes.shape({
    id:             PropTypes.string.isRequired,
    zone:           PropTypes.string.isRequired,
    headline:       PropTypes.string.isRequired,
    recommendation: PropTypes.string.isRequired,
    urgency:        PropTypes.oneOf(["high", "medium", "low"]).isRequired,
    status:         PropTypes.string.isRequired,
    timestamp:      PropTypes.string,
    source:         PropTypes.string,
  })).isRequired,
  /** Callback to resolve/dispatch an alert by id */
  onResolveAlert:     PropTypes.func.isRequired,
  /** Callback to acknowledge an alert by id */
  onAcknowledgeAlert: PropTypes.func.isRequired,
};

// Memoized: AlertFeed only re-renders when the alerts array or its callbacks
// actually change — not on every 5-second telemetry tick that updates stadiumData.
export default memo(AlertFeed);
