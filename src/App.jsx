import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Sparkles, LayoutDashboard, MessageSquare, Map } from "lucide-react";
import { stadiumData as baseStadiumData } from "./data/mockStadiumData";
import FanChat from "./components/FanChat";
import OpsDashboard from "./components/OpsDashboard";
import CongestionMap from "./components/CongestionMap";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ---------------------------------------------------------------------------
// Helpers — defined outside the component so they are never recreated
// ---------------------------------------------------------------------------

/** Generate an initial 10-point history list around a base density value. */
export function makeInitialHistory(baseDensity) {
  return Array.from({ length: 10 }, () => {
    const drift = Math.floor(Math.random() * 11) - 5;
    return Math.max(10, Math.min(95, baseDensity + drift));
  });
}

/** Return a new zones map with each density / wait-time randomly drifted. */
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

/** 10-event fallback pool used when no Gemini key is present. */
const FALLBACK_EVENT_POOL = [
  { zone: "Section 200", headline: "Medical Assist Needed", rec: "Fan unresponsive in Row G Seat 14. Deploy Medical Station 2 crew and clear aisle immediately.", urgency: "high" },
  { zone: "Concourse South", headline: "Heat Advisory Zone 2", rec: "Heat index exceeds 95°F. Activate all cooling fans and open Hydration Station 1 on Concourse South.", urgency: "medium" },
  { zone: "Gate C", headline: "VIP Convoy Incoming", rec: "FIFA VIP motorcade ETA 8 mins. Clear Gate C south lane, deploy 4 security escorts at dropoff.", urgency: "low" },
  { zone: "Gate B", headline: "Credential Scan Failure", rec: "Turnstile B-7 NFC scanner offline. Redirect fans to B-3 through B-6, dispatch Tech Team Alpha.", urgency: "medium" },
  { zone: "Concourse North", headline: "Fan Altercation Reported", rec: "Disturbance near Taco Stand. Dispatch 2 stewards immediately, notify Security Sector North.", urgency: "high" },
  { zone: "Section 400", headline: "Lost Child Protocol", rec: "Unaccompanied child (approx. 6 yrs) at Upper Bowl Section 412. Activate PA announcement and family reunification desk.", urgency: "high" },
  { zone: "Gate A", headline: "Prohibited Item Flagged", rec: "X-ray scanner flagged oversized bag at Gate A Lane 3. Isolate lane, secondary screening required.", urgency: "medium" },
  { zone: "Concourse North", headline: "Beer Garden Queue Spike", rec: "Beer Garden queue at 22 mins. Open secondary serving counter and increase pouring staff to 6.", urgency: "low" },
  { zone: "Section 100", headline: "Lighting Fault Zone 3", rec: "Section 100-128 overhead lighting at 40% brightness. Notify Facilities Ops, deploy portable flood light.", urgency: "medium" },
  { zone: "Gate D", headline: "Shuttle Delay Alert", rec: "FIFA Shuttle bus 3 delayed 18 mins. Update fan information screens at Gate D and notify Station staff.", urgency: "low" },
];

/** Build an alert object with common timestamp / status fields. */
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

// ---------------------------------------------------------------------------
export default function App() {
  const [activeView, setActiveView] = useState("fan"); // "fan" | "ops"
  const [fanSubView, setFanSubView] = useState("chat"); // "chat" | "map"
  const [language, setLanguage] = useState("en"); // "en" | "es"
  const [stadiumData, setStadiumData] = useState(baseStadiumData);
  const [selectedZone, setSelectedZone] = useState("Gate B");
  const [alerts, setAlerts] = useState([
    makeAlert({ id: "alert-init-1", zone: "Gate B", headline: "Gate B Congestion Rising", recommendation: "Deploy auxiliary ticketing staff and open East Gate 2 immediately.", urgency: "high", source: "fallback" }),
    makeAlert({ id: "alert-init-2", zone: "Section 400", headline: "Upper Hydration Queue High", recommendation: "Water station 2 wait times exceeding 10 m. Enable reserve water line.", urgency: "medium", source: "fallback" }),
  ]);
  const [densityHistory, setDensityHistory] = useState({});

  // Demo States
  const [isDemoActive, setIsDemoActive] = useState(false);
  const [demoNotification, setDemoNotification] = useState("");
  const [demoSimulatedQuery, setDemoSimulatedQuery] = useState("");
  const demoStep = useRef(0);
  const demoIntervalRef = useRef(null);

  // Refs so async alert generation always sees latest values without re-subscribing
  const isGeneratingAlert = useRef(false);
  const alertsRef = useRef(alerts);
  useEffect(() => { alertsRef.current = alerts; }, [alerts]);

  const stadiumDataRef = useRef(stadiumData);
  useEffect(() => { stadiumDataRef.current = stadiumData; }, [stadiumData]);

  // --- INITIALIZE HISTORY (once on mount) ---
  useEffect(() => {
    const initial = {};
    for (const [key, zone] of Object.entries(baseStadiumData.zones)) {
      initial[key] = makeInitialHistory(zone.density);
    }
    setDensityHistory(initial);
  }, []);

  // --- TELEMETRY SIMULATOR: drifts zone densities every 5 s ---
  useEffect(() => {
    if (isDemoActive) return; // Pause standard simulation during demo

    const id = setInterval(() => {
      setStadiumData(prev => ({
        ...prev,
        zones: driftZones(prev.zones),
        amenitiesDetails: {
          ...prev.amenitiesDetails,
          foodStalls: prev.amenitiesDetails.foodStalls.map(stall => ({
            ...stall,
            waitTime: Math.max(2, Math.min(30, stall.waitTime + Math.floor(Math.random() * 5) - 2)),
          })),
        },
      }));
    }, 5000);

    return () => clearInterval(id); // Cleanup on unmount
  }, [isDemoActive]);

  // --- DENSITY HISTORY: append latest density reading each tick ---
  // Also gates a 35 % chance alert check per tick (throttled by isGeneratingAlert ref)
  useEffect(() => {
    if (Object.keys(densityHistory).length === 0) return;

    setDensityHistory(prev => {
      const updated = {};
      for (const [key, list] of Object.entries(prev)) {
        if (stadiumData.zones[key]) {
          updated[key] = [...list.slice(1), stadiumData.zones[key].density];
        } else {
          updated[key] = list;
        }
      }
      return updated;
    });

    if (Math.random() < 0.35 && !isGeneratingAlert.current) {
      evaluateAndTriggerAlert();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stadiumData]);

  // ---------------------------------------------------------------------------
  // Alert generation — reads from refs so it never has stale closure issues
  // ---------------------------------------------------------------------------
  const evaluateAndTriggerAlert = useCallback(async () => {
    isGeneratingAlert.current = true;

    const currentAlerts = alertsRef.current;
    const currentData = stadiumDataRef.current;
    const alertedZones = new Set(currentAlerts.filter(a => a.status === "active").map(a => a.zone));

    const urgentZones = Object.entries(currentData.zones)
      .filter(([key, zone]) => zone.density > 70 && !alertedZones.has(key))
      .sort((a, b) => b[1].density - a[1].density);

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    try {
      if (urgentZones.length > 0) {
        // Congestion alert — a high-density zone needs ops attention
        const [zoneKey, zoneData] = urgentZones[0];
        const allZonesSummary = Object.entries(currentData.zones)
          .map(([k, z]) => `${k}: ${z.density}%${z.currentWaitTime ? ` (${z.currentWaitTime}m wait)` : ""}`)
          .join("; ");

        if (apiKey) {
          const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: "gemini-1.5-flash" });
          const prompt = `You are the StadiumPulse AI Operations Center for FIFA World Cup 2026 at MetLife Stadium.

Stadium-wide snapshot: ${allZonesSummary}

CRITICAL: Zone "${zoneKey}" (${zoneData.type}) is at ${zoneData.density}% density${zoneData.currentWaitTime ? ` with ${zoneData.currentWaitTime} min wait` : ""}. Amenities: ${(zoneData.amenities || []).join(", ")}.

Generate a detailed alert. Return ONLY valid JSON — no markdown:
{
  "headline": "<5-word alert title>",
  "recommendation": "<2 sentences referencing neighbouring zones or amenities from the snapshot>",
  "urgency": "${zoneData.density > 80 ? "high" : "medium"}"
}`;
          const { response } = await model.generateContent(prompt);
          const data = JSON.parse(response.text().replace(/```json|```/g, "").trim());
          setAlerts(prev => [makeAlert({ id: `alert-${Date.now()}`, zone: zoneKey, ...data, source: "gemini" }), ...prev]);
        } else {
          // Fallback: find the nearest low-density zone of same type to suggest redirect
          const [nearKey, nearZone] = Object.entries(currentData.zones)
            .filter(([k, z]) => z.density < 40 && z.type === zoneData.type && k !== zoneKey)
            .sort((a, b) => a[1].density - b[1].density)[0] || [];
          const redirect = nearKey ? ` Redirect to ${nearKey} (${nearZone.density}%).` : "";
          const recommendation = zoneData.type === "gate"
            ? `Open all auxiliary checkpoint lanes at ${zoneKey}. Wait: ${zoneData.currentWaitTime} min.${redirect}`
            : `Deploy crowd stewards to ${zoneKey} exits to clear concourse.${redirect}`;
          setAlerts(prev => [makeAlert({ id: `alert-${Date.now()}`, zone: zoneKey, headline: `${zoneKey} Congestion Critical`, recommendation, urgency: zoneData.density > 80 ? "high" : "medium", source: "fallback" }), ...prev]);
        }
      } else if (Math.random() < 0.20) {
        // Spontaneous operational event (medical, security, infra, etc.)
        if (apiKey) {
          const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: "gemini-1.5-flash" });
          const zonesContext = Object.entries(currentData.zones).map(([k, z]) => `${k}: ${z.density}%`).join(", ");
          const prompt = `You are StadiumPulse AI Ops for FIFA World Cup 2026 at MetLife Stadium.
Densities: ${zonesContext}
Generate ONE realistic non-congestion stadium event (medical, security, infra, weather, lost item, vendor, etc.).
Return ONLY valid JSON:
{ "zone": "<Gate A|Gate B|Gate C|Gate D|Concourse North|Concourse South|Section 100|Section 200|Section 300|Section 400>", "headline": "<5-word title>", "recommendation": "<2 action sentences>", "urgency": "<high|medium|low>" }`;
          try {
            const { response } = await model.generateContent(prompt);
            const data = JSON.parse(response.text().replace(/```json|```/g, "").trim());
            if (!alertedZones.has(data.zone)) {
              setAlerts(prev => [makeAlert({ id: `alert-${Date.now()}`, ...data, source: "gemini" }), ...prev]);
            }
          } catch {
            // Gemini event generation failed — use fallback pool silently
            const ev = FALLBACK_EVENT_POOL[Math.floor(Math.random() * FALLBACK_EVENT_POOL.length)];
            if (!alertedZones.has(ev.zone)) {
              setAlerts(prev => [makeAlert({ id: `alert-${Date.now()}`, zone: ev.zone, headline: ev.headline, recommendation: ev.rec, urgency: ev.urgency, source: "fallback" }), ...prev]);
            }
          }
        } else {
          const ev = FALLBACK_EVENT_POOL[Math.floor(Math.random() * FALLBACK_EVENT_POOL.length)];
          if (!alertedZones.has(ev.zone)) {
            setAlerts(prev => [makeAlert({ id: `alert-${Date.now()}`, zone: ev.zone, headline: ev.headline, recommendation: ev.rec, urgency: ev.urgency, source: "fallback" }), ...prev]);
          }
        }
      }
    } catch (err) {
      console.error("[StadiumPulse] Alert generation error:", err.message || err);
    } finally {
      isGeneratingAlert.current = false;
    }
  }, []); // No deps — reads everything from refs

  // --- DEMO SEQUENCER ---
  const runDemoSequence = useCallback(() => {
    if (isDemoActive) return;
    setIsDemoActive(true);
    demoStep.current = 0;
    setDemoNotification("");
    setDemoSimulatedQuery("");
    
    // T=0: Switch to Ops and focus Gate C
    setActiveView("ops");
    setSelectedZone("Gate C");

    // Start a 1-second ticker to run the sequence
    demoIntervalRef.current = setInterval(() => {
      demoStep.current += 1;
      const t = demoStep.current;

      if (t <= 10) {
        // T=0 to 10: Spike Gate C density
        setStadiumData(prev => ({
          ...prev,
          zones: {
            ...prev.zones,
            "Gate C": {
              ...prev.zones["Gate C"],
              density: Math.min(95, prev.zones["Gate C"].density + 6),
              currentWaitTime: Math.min(45, prev.zones["Gate C"].currentWaitTime + 3)
            }
          }
        }));
      }

      if (t === 10) {
        // T=10: Trigger Alert
        const rec = "Gate C critical congestion. Open auxiliary lanes and redirect arriving fans to Gate D immediately.";
        setAlerts(prev => [makeAlert({ id: `alert-demo-${Date.now()}`, zone: "Gate C", headline: "Gate C Congestion Critical", recommendation: rec, urgency: "high", source: "gemini" }), ...prev]);
      }

      if (t === 12) {
        // T=12: Push Fan Notification
        setDemoNotification("⚠️ PROACTIVE ALERT: Avoid Gate C - High congestion detected. Please reroute to Gate D.");
      }

      if (t === 15) {
        // T=15: Switch back to Fan view and chat
        setActiveView("fan");
        setFanSubView("chat");
      }

      if (t === 17) {
        // T=17: Auto-type the query (FanChat handles typing simulation)
        setDemoSimulatedQuery("where's the nearest bathroom");
      }

      if (t >= 25 && demoIntervalRef.current) {
        // T=25: End sequence ticker (FanChat auto-sends query when ready)
        clearInterval(demoIntervalRef.current);
        demoIntervalRef.current = null;
        // Reset demo mode after 5 seconds so normal simulation resumes
        setTimeout(() => {
          setIsDemoActive(false);
          setDemoNotification("");
          setDemoSimulatedQuery("");
        }, 5000);
      }
    }, 1000);
  }, [isDemoActive]);

  // Clean up demo interval
  useEffect(() => {
    return () => {
      if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
    }
  }, []);

  // --- Dispatch: mark alert + drop zone density after 6 s ---
  const handleResolveAlert = useCallback((id) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: "dispatched" } : a));
    const alert = alertsRef.current.find(a => a.id === id);
    if (!alert) return;
    setTimeout(() => {
      setStadiumData(prev => {
        const zone = prev.zones[alert.zone];
        if (!zone) return prev;
        return {
          ...prev,
          zones: {
            ...prev.zones,
            [alert.zone]: {
              ...zone,
              density: Math.round(zone.density * 0.55),
              ...(zone.type === "gate" && { currentWaitTime: Math.max(3, Math.round(zone.currentWaitTime * 0.4)) }),
            },
          },
        };
      });
      setAlerts(prev => prev.filter(a => a.id !== id));
    }, 6000);
  }, []);

  const handleAcknowledgeAlert = useCallback((id) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: "acknowledged" } : a));
    setTimeout(() => setAlerts(prev => prev.filter(a => a.id !== id)), 4000);
  }, []);

  // Derived — read env once per render (string is stable so no useMemo needed)
  const aiMode = import.meta.env.VITE_GEMINI_API_KEY ? "gemini" : "fallback";

  return (
    <div className={`app-container ${activeView === "ops" ? "theme-ops" : "theme-fan"}`}>
      {/* ── GLOBAL HEADER ── */}
      <header className="app-header">
        <div className="logo-container">
          <span className="logo-badge">WC26</span>
          <span className="logo-text">StadiumPulse</span>
        </div>

        <div className="header-controls">
          <div
            className={`env-key-badge ${aiMode === "gemini" ? "active" : "inactive"}`}
            title={aiMode === "gemini"
              ? "Gemini API key loaded — real LLM calls active"
              : "No VITE_GEMINI_API_KEY — running high-fidelity local fallback"}
          >
            <Sparkles size={12} />
            <span>{aiMode === "gemini" ? "Gemini AI Active" : "AI Fallback Mode"}</span>
          </div>

          <div className="view-switcher" role="group" aria-label="View Switcher">
            <button className="switch-btn" onClick={runDemoSequence} disabled={isDemoActive} aria-label="Run automated demo sequence" style={{ color: isDemoActive ? "var(--color-yellow)" : "inherit" }}>
              <Sparkles size={14} aria-hidden="true" />
              {isDemoActive ? "Demo Running..." : "Play Demo"}
            </button>
            <div style={{ width: "1px", background: "var(--border-color)", margin: "0.25rem 0.5rem" }} />
            <button className={`switch-btn ${activeView === "fan" ? "active" : ""}`} onClick={() => setActiveView("fan")} aria-label="Switch to Fan Concierge View" aria-pressed={activeView === "fan"}>
              <MessageSquare size={14} aria-hidden="true" />
              Fan Concierge
            </button>
            <button className={`switch-btn ${activeView === "ops" ? "active" : ""}`} onClick={() => setActiveView("ops")} aria-label="Switch to Operations Center View" aria-pressed={activeView === "ops"}>
              <LayoutDashboard size={14} aria-hidden="true" />
              Operations Center
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN VIEWS ── */}
      <main className="main-content">
        {activeView === "fan" ? (
          <div className="fan-layout-wrapper">
            <div className="fan-container">
              {/* Fan header: avatar + title + language toggle */}
              <div className="fan-header">
                <div className="fan-header-info">
                  <div className="fan-avatar"><Sparkles size={18} /></div>
                  <div className="fan-title">
                    <h3>WC Assistant</h3>
                    <p>{language === "es" ? "Copa Mundial FIFA 2026" : "FIFA World Cup 2026"}</p>
                  </div>
                </div>
                <div className="lang-toggle" role="group" aria-label="Language selection">
                  {["en", "es"].map(lang => (
                    <button key={lang} className={`lang-btn ${language === lang ? "active" : ""}`} onClick={() => setLanguage(lang)} aria-label={`Change language to ${lang === "es" ? "Spanish" : "English"}`} aria-pressed={language === lang}>
                      {lang.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="fan-sub-navigation" role="tablist" aria-label="Fan Sub-navigation">
                {[
                  { id: "chat", icon: <MessageSquare size={14} aria-hidden="true" />, label: language === "es" ? "Chat de Ayuda" : "Help Chat" },
                  { id: "map",  icon: <Map size={14} aria-hidden="true" />,           label: language === "es" ? "Mapa de Congestión" : "Congestion Map" },
                ].map(tab => (
                  <button key={tab.id} role="tab" aria-selected={fanSubView === tab.id} aria-controls={`fan-panel-${tab.id}`} className={`sub-nav-tab ${fanSubView === tab.id ? "active" : ""}`} onClick={() => setFanSubView(tab.id)}>
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              <div id={`fan-panel-${fanSubView}`} role="tabpanel" style={{ display: "contents" }}>
              {fanSubView === "chat" ? (
                <FanChat stadiumData={stadiumData} language={language} demoNotification={demoNotification} demoSimulatedQuery={demoSimulatedQuery} />
              ) : (
                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
                  <CongestionMap zones={stadiumData.zones} selectedZone={selectedZone} onSelectZone={setSelectedZone} viewMode="fan" />
                </div>
              )}
              </div>
            </div>
          </div>
        ) : (
          <OpsDashboard
            stadiumData={stadiumData}
            alerts={alerts}
            onResolveAlert={handleResolveAlert}
            onAcknowledgeAlert={handleAcknowledgeAlert}
            selectedZone={selectedZone}
            onSelectZone={setSelectedZone}
            densityHistory={densityHistory}
          />
        )}
      </main>

      {/* ── OPS FOOTER ── */}
      {activeView === "ops" && (
        <footer className="ops-footer">
          <div className="system-status">
            <span className="status-dot" />
            <span>TELEMETRY STREAM: SECURE CONNECTION ACTIVE</span>
          </div>
          <span>FIFA World Cup 2026 Operations Console</span>
          <span>East Rutherford, NJ</span>
        </footer>
      )}
    </div>
  );
}
