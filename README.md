# StadiumPulse

**StadiumPulse** is a GenAI-powered solution built to optimize stadium operations and enhance the fan experience for the FIFA World Cup 2026 at MetLife Stadium. 

## Chosen Vertical
**Smart Stadiums & Tournament Operations**

This project tackles the logistical and experiential challenges of managing massive crowds during global events. By combining real-time telemetry with generative AI, it bridges the gap between backend operational visibility and frontend fan engagement.

## Approach and Logic

The core logic of StadiumPulse is a unidirectional data flow driven by a real-time telemetry simulator that continuously updates the application state. The state acts as the single source of truth for both the UI and the generative AI (LLM).

The goal was to demonstrate how LLMs can be utilized not just as static chatbots, but as real-time analytical engines that monitor live state and generate actionable operational directives.

## How the Solution Works

### 1. The Telemetry Simulator (Mock Data)
The initial baseline state is loaded from `mockStadiumData.js`. Inside `App.jsx`, a `setInterval` hook acts as a real-time telemetry simulator. Every 5 seconds, this simulator "drifts" the state—randomly adjusting zone densities, wait times, and crowd movements across the stadium. This continuously mutating JSON object (`stadiumData`) simulates a live event environment.

### 2. The AI Orchestration (LLM Integration)
The LLM (Gemini 1.5 Flash via `@google/generative-ai`) interfaces with the real-time state in two primary ways:

- **Operations Alert Feed (`App.jsx` -> `AlertFeed.jsx`)**:
  As the simulated state changes, `App.jsx` continuously evaluates the zones. When a zone crosses a critical density threshold (>70%), the *entire live JSON state* is bundled into a prompt and sent to the LLM. The LLM acts as an Operations AI, analyzing the real-time data to generate a structured JSON alert with intelligent recommendations (e.g., "Redirect fans to Gate D, as Gate C is at 95%"). This is then pushed to the Operations Dashboard.

- **Fan Concierge (`FanChat.jsx`)**:
  When a user submits a query to the fan chat, the component bundles the query *along with the most current `stadiumData` JSON* and sends it to the LLM. The LLM acts as an intelligent concierge, grounding its answers in the exact reality of the stadium at that second (e.g., advising the fan on the shortest current food queue or avoiding a congested gate).

> **Note on Fallbacks**: If the `VITE_GEMINI_API_KEY` is not present or an API call fails due to rate limits, the app seamlessly falls back to a high-fidelity local simulation mode. The `AlertFeed` pulls from a hardcoded pool of realistic stadium events, and the `FanChat` uses a keyword-based heuristic matcher to provide fallback responses based on the live state.

### 3. The User Interface (UI)
The main `App.jsx` component holds the global `stadiumData` and distributes it down to the UI components via props:
- **OpsDashboard.jsx** computes KPIs and draws charts based on the real-time `stadiumData` and its historical metrics.
- **CongestionMap.jsx** dynamically colors the SVG stadium zones (green, yellow, red) based on the live density values.
- **AlertFeed.jsx** maps over the array of AI-generated alerts.
- **FanChat.jsx** uses the live state to formulate accurate responses and suggestions.

## Assumptions Made

1. **Telemetry Infrastructure**: We assume the stadium is equipped with a dense network of IoT sensors, optical turnstiles, and camera-based crowd counting to provide the real-time density and wait-time data that our simulator mimics.
2. **LLM Latency & Limits**: We assume the LLM can handle frequent state-injection prompts. In a real-world scenario, the AI operations feed would likely rely on a more complex streaming or vector-embedded architecture rather than injecting the entire JSON tree into the prompt every few seconds.
3. **Frontend Role**: We assume this is a unified command/concierge frontend for demonstration purposes. In a real deployment, the Fan App and Ops Dashboard would be physically separated applications, and the state would be managed via a centralized backend pub/sub model (e.g., WebSockets or Server-Sent Events) rather than a client-side interval simulator.

## Folder Structure

```text
stadiumpulse/
├── src/
│   ├── assets/              # Static assets (images, icons, etc.)
│   ├── components/          # React components
│   │   ├── AlertFeed.jsx    # Displays real-time AI-generated operational alerts
│   │   ├── CongestionMap.jsx# Interactive SVG map of stadium zones and real-time congestion
│   │   ├── FanChat.jsx      # GenAI-powered conversational assistant for fans
│   │   └── OpsDashboard.jsx # Operations dashboard with key metrics and telemetry charts
│   ├── data/
│   │   └── mockStadiumData.js # The baseline initial stadium state (zones, wait times, match info)
│   ├── App.jsx              # Main orchestrator: holds global state, telemetry simulator, and LLM polling
│   ├── App.css              # Global styles and layout classes
│   ├── index.css            # Core design system tokens, variables, and utility classes
│   └── main.jsx             # React application entry point
├── .env.example             # Template for API keys
├── .gitignore               # Ignored files (node_modules, dist, .env)
└── package.json             # Project dependencies and scripts
```
