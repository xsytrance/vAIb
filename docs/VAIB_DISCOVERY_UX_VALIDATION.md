# vAIb Discovery UX Validation

**Document ID:** VAIB-DISC-UXVAL-001
**Status:** PLANNING — VALIDATION COMPLETE
**Scope:** Concrete scenario walkthroughs. Zero code. Pure experience.
**References:** `VAIB_DISCOVERY_ARCHITECTURE.md`, `CockpitScreen.kt`, `StationCard.kt`, `AgentChip.kt`, `VaibCard.kt`, `StatusPill.kt`, `DemoData.kt`, `Color.kt`, `AgentsScreen.kt`, `StationsScreen.kt`

---

## 1. STATUS

| Field | Value |
|---|---|
| **Mission** | Validate every discovery scenario through concrete UX walkthroughs before implementation |
| **Scope** | Nine scenarios spanning first launch through operational silence. Felt experience, not wireframes. |
| **What this validates** | Emotional tone, calmness preservation, trust mechanisms, transition design across all discovery states |
| **What this does NOT do** | Define APIs, write Kotlin, specify backend contracts |
| **Design language** | vAIb whispers. AMOLED black (#000000). Neon cyan (#00E5FF). Selective glow. Authenticity > effects. |

**Validation rule:** Every scenario must pass the calmness check. If any scenario feels loud, broken, dashboard-y, or chaotic, the architecture needs adjustment before code is written.

---

## 2. SCENARIO 1: FIRST LAUNCH — NO ENDPOINTS

**Setup:** Fresh install. No endpoints configured. Demo mode OFF. MotionIntensity.STANDARD.

### Walkthrough

**Step 1 — App launches. Splash to CockpitScreen.**

The app opens to black. True black — `#000000` (`BackgroundAmoled`). No splash logo animation. No "vAIb" text fade-in. The screen is simply black for ~200ms, then content appears. The transition is an opacity 0→1 over 300ms. No slide. No bounce.

**Step 2 — CockpitScreen LazyColumn contents.**

The header appears first:
```
"vAIb"               // 32sp, FontWeight.Bold, PrimaryNeonCyan (#00E5FF)
"Agent-native music cockpit"  // 14sp, TextSecondary (#AAAAAA)
```

The status row appears below:
```
StatusPill("Offline • no endpoint healthy")  // TextMuted dot, muted border
StatusPill("listening")                      // Gold dot (#FFD700) — local playback ready
[PauseCircle icon]  // SecondaryGold, 24dp
[Refresh icon]      // PrimaryNeonCyan, 24dp
```

*The status pill reads "Offline • no endpoint healthy" — the bullet separator keeps it compact. The pill border is `TextMuted` (#666666) at 40% alpha. The dot is TextMuted. No red. No urgency.*

The route telemetry line:
```
"Route: none • probe 0/0 • latency --"   // 11sp, TextSecondary, padding horizontal 16dp
```

*This is the most "system-y" element on screen. 11sp — barely readable unless you look for it. Not a dashboard. Telemetry for the curious.*

**Step 3 — The On Air card.**

`VaibCard` with `neonGlow = false` — border is `BorderSubtle` (#222222) at 1dp, no glow, `SurfaceCard` (#111111) background.
```
"On Air: Auto-DJ"                    // 13sp, PrimaryNeonCyan, SemiBold
"Show: Neon Drift Hour"              // 12sp, SecondaryGold
"Next Slot: calculating"             // 12sp, TextSecondary
"One agent is always on deck."       // 12sp, AccentMagenta (#FF00FF)
```

*No lineup listed — `tonightLineup` is empty. The card feels sparse. Four lines of text in a sea of dark gray. This is correct.*

**Step 4 — Connector Health section.**

Empty — `appState.connectorHealth` is emptyList. The entire section is skipped. No "Connector Health" header. No empty placeholder. Just... nothing.

**Step 5 — Station card.**

`currentStation` is null — no station exists. The entire `StationCard` composable is skipped. No placeholder. No "No station selected" message.

**Step 6 — Now Broadcasting card.**

`VaibCard(neonGlow = true)` — the only glowing element on screen. Border pulses at 1.5dp in `PrimaryNeonCyan`. `SurfaceCard` background at elevation 8dp.
```
"Now Broadcasting"                   // 12sp, PrimaryNeonCyan, Medium
"Synthetic Sunrise"                  // 20sp, TextPrimary (#FFFFFF), Bold
"Procedural Ghost"                   // 15sp, TextSecondary
```

The agent row:
```
AgentChip(name = "DJinn", colorHex = "#00E5FF")   // Cyan dot, cyan border, SurfaceElevated bg
"Vibe: neon focus"                                 // 13sp, AccentMagenta
"BPM: 132"                                         // 13sp, PrimaryNeonCyan
```

*Wait — DJinn appears? No. In FALLBACK mode, `DemoData.getDefaultAppState()` is NEVER called. The Now Broadcasting card shows local fallback track data only if local files exist. If no local tracks:*

```
"Now Broadcasting"                   // 12sp, PrimaryNeonCyan
"No track loaded"                    // 20sp, TextPrimary, Bold
"Add music to begin"                 // 15sp, TextSecondary
```

*The AgentChip row is absent — no agent, no vibe, no BPM. The card is just three lines of text in a cyan-glowing box. The glow feels almost ironic — highlighting emptiness.*

**Step 7 — Visualizer.**

`VaibCard` (no glow). `VisualizerBars` — 24 bars, sin wave, intensity 0.35f (not playing). Bars move gently even when idle — the visualizer has its own ambient motion. Cyan bars (`#00E5FF`) on dark background. The only animation on screen.

*This is the lifeline. In an otherwise sparse screen, the 24 cyan bars moving in a slow sine wave tell the user: "the app is alive."*

**Step 8 — Queue preview.**

Empty — `appState.queue` is emptyList. Header row:
```
"Queue (0)"        // 16sp, TextPrimary, SemiBold
```

No queue items. No "empty" message. Just the header and then nothing.

**Step 9 — Bottom nav.**

Five tabs: Cockpit, Stations, Queue, Agents, More.
All icons in `TextMuted` (#666666). Selected tab in `PrimaryNeonCyan`. Labels in 11sp.

### What the Stations tab shows

`StationsScreen.kt` LazyColumn:
```
"Stations"                             // 24sp, TextPrimary, Bold
"0 live • 0 listeners"                // 14sp, TextSecondary
```

No `StationCard`s — `appState.stations` is empty. After the header: nothing. No empty state illustration. No "No stations" message. Just the two header lines and then 80dp spacer before bottom nav.

### What the Agents tab shows

`AgentsScreen.kt` LazyColumn:
```
"Agents"                               // 24sp, TextPrimary, Bold
"0 active agents"                      // 14sp, TextSecondary
```

No `AgentDetailCard`s — `appState.agents` is empty. Just the header and spacer.

### Atmosphere / FX behavior

**Operational Silence = ABSENT.**

No particles (Phase 7 not implemented yet). No atmosphere field. `VitalityLevel` is not applicable — there's no endpoint to lose. The visualizer bars are the only motion. They continue their slow sine wave, indifferent to the empty state.

The screen is ~95% black. The only color concentration is the cyan-glowing Now Broadcasting card — a single point of light in darkness. This is intentional. The emptiness IS the design.

### UX Observations

**Emotional tone:** *"Empty server room."* Cold, operational, not broken. The lights are on (cyan glow, visualizer bars) but no one is home. There is no error. There is no loading spinner. There is simply... absence.

**How calm does it feel:** Very. Mostly black (`#000000`), minimal text (~60 words total on screen), no clutter. The eye has nowhere to go except the cyan glow card. The visualizer provides just enough motion to prevent the screen from feeling frozen.

**How we avoid "broken app" feeling:**
- The status pill says "Offline • no endpoint healthy" — this is telemetry, not an error. The wording implies the system is working correctly (it's checking health) but found no endpoints. The user understands: "I need to tell it where to look."
- The visualizer is moving — the app is alive.
- The bottom nav is functional — all tabs reachable.
- No crash dialog. No "Something went wrong." No retry button. No red.

**What text appears:** "No operational systems detected" appears only if the user taps the status pill or navigates to a contextual hint area. It is NOT displayed by default. The default empty state shows, it does not explain.

**Text colors:** `TextMuted` (#666666) for subtle labels. `TextSecondary` (#AAAAAA) for secondary info. Never bright. Never alarming.

### State Transition Notes

| Property | Value |
|---|---|
| App mode | FALLBACK |
| Provenance | No entities exist — no provenance markers |
| Empty state design | Implicit emptiness — no explicit "empty" UI component |
| Available actions | Settings → Connection → Add Endpoint |

**How the user adds an endpoint:**
1. Taps "More" in bottom nav
2. Taps "Settings" in More menu
3. Taps "Connection" card in Settings
4. Enters endpoint URL (e.g., `https://prime.tailnet.ts.net`)
5. Taps "Add Endpoint" — `EndpointNode` created with `DiscoveryStatus.PENDING`
6. DiscoveryCoordinator begins discovery on next cycle

### Calmness Check

| Check | Verdict |
|---|---|
| Calm? | **YES** — mostly black, minimal text, no aggressive prompts |
| Whispers? | **YES** — empty state is the quietest possible state |
| Clutter? | **NO** — almost nothing on screen |
| Mystery? | **YES** — "operational systems" is vague enough to feel intriguing |
| Dashboard? | **NO** — not a dashboard, not a status board, not an admin panel |
| Broken? | **NO** — the empty state is designed, not a crash. Absence is intentional. |

---

## 3. SCENARIO 2: DEMO MODE

**Setup:** User taps "Enter Demo Mode" from empty state (FALLBACK). Explicit opt-in.

### Walkthrough

**Step 1 — Warning dialog appears.**

A `VaibCard`-styled dialog (not a system `AlertDialog`). `SurfaceCard` (#111111) background, `BorderSubtle` border.
```
"Demo Mode"                          // 18sp, AccentMagenta (#FF00FF), SemiBold
"All entities will be simulated."
"No real systems will be contacted."
"DEMO badges will appear on all content."
                    // 14sp, TextSecondary, three lines
"[Cancel]"                          // TextSecondary, no background
"[Enter Demo Mode]"                 // 14sp, AccentMagenta, bordered pill
```

*The dialog is quiet. No red warning icon. No "Are you sure?!" panic. Magenta — not danger, just "different." The user is being informed, not scolded.*

**Step 2 — User confirms.**

Dialog fades out over 200ms. App mode transitions: FALLBACK → DEMO. `AppModeDecider` logs the transition. `DemoData.getDefaultAppState()` is called — but every entity is wrapped with `ProvenanceMarker(provenance = EntityProvenance.DEMO)`.

**Step 3 — Entities appear.**

The transition is NOT instant. Entities fade in with staggered timing:

| Entity | Delay | Animation |
|---|---|---|
| Cockpit header ("vAIb") | 0ms | Already visible, no change |
| Status row | 0ms | Status pill text changes: "Offline..." → "Demo Mode" |
| "Now Broadcasting" card | 100ms | Opacity 0→1, 400ms, ease-out |
| StationCard ("demo-station-1") | 250ms | Opacity 0→1, 400ms, gentle slide up 8dp |
| AgentChip ("vg-god") | 400ms | Scale 0.95→1.0, 200ms, subtle cyan glow pulse once |
| Visualizer | 0ms | Already present, intensity unchanged |
| Queue items | 500ms+ | Staggered 150ms apart, opacity 0→1 |

*The arrivals feel like systems warming up — not a celebration. No confetti. No "Welcome to Demo Mode!" banner. Just content materializing, gently.*

**Step 4 — Provenance indicators visible.**

Every entity carries a DEMO badge. Badge spec:
- Position: top-end corner of every card (VaibCard, StationCard, AgentDetailCard)
- Text: "DEMO" — 9sp, uppercase, `AccentMagenta` (#FF00FF), `FontWeight.Medium`
- Background: `AccentMagenta` at 10% alpha, rounded 4dp corner
- Border: 0.5dp `AccentMagenta` at 40% alpha
- Always visible — never hidden by scroll, filter, or view change

**Step 5 — Station cards in DEMO mode.**

`StationCard` composable renders with DEMO badge:
```
┌─────────────────────────────────────┬─────┐
│ "demo-station-1"              │DEMO │
│ "vg-god • sync-agent default"        │     │
│                                      │     │
│ [hosting] [1]              [BPM]     │     │
│ "Electronic"  "Vibe: focused"        │     │
└─────────────────────────────────────┴─────┘
```

- Station name: "demo-station-1" — functional, lowercase
- Host agent: "vg-god" — functional handle, not "VG God"
- Description: "sync-agent default" — operational role, not "Signal Architect"
- Genre: derived from agent's `MusicInfluence`, not hardcoded
- Vibe: derived from agent's `OperationalState` ("focused" → "focused synthesis")
- Badge: "DEMO" in `AccentMagenta`, top-right corner, always visible

**Step 6 — Cockpit header in DEMO mode.**

The title bar changes:
```
"vAIb — DEMO MODE"                   // 32sp, PrimaryNeonCyan for "vAIb", AccentMagenta for "DEMO MODE"
```

*The split color makes it immediately obvious. Not subtle. The user must never forget they are in demo mode. The title bar is always visible on the Cockpit screen.*

**Step 7 — Agent chips in DEMO mode.**

`AgentChip` for demo agents:
- Dot color: `AccentMagenta` (#FF00FF) instead of the agent's derived `VisualSignature` hue
- Border: `AccentMagenta` at 50% alpha
- Background: `SurfaceElevated` (#1A1A1A)
- Name: "vg-god" — lowercase, functional

*LIVE agents get colored dots derived from their `VisualSignature`. DEMO agents all get magenta. Consistent, unmistakable.*

**Step 8 — What demo entities look like.**

| Entity | Before (DemoData.kt) | After (Demo Mode) |
|---|---|---|
| Agent name | "DJinn" | "sync-agent-1" (functional) |
| Agent role | "Signal Architect" | "sync" (operational) |
| Station name | "Prime Pulse" | "demo-station-1" |
| Station vibe | "neon focus" | "focused synthesis" (derived) |
| Station hostAgent | "DJinn" (String) | validated `AgentPresence` reference |
| Track title | "Synthetic Sunrise" | "Demo Track 001" (sterile) |
| Track artist | "Procedural Ghost" | "demo-artist" |

*Demo entities are BORING by design. Theatrical names are stripped. Functional names are assigned. The purpose is to show UI structure without pretending to be a populated system.*

### Critical Trust Analysis

**DEMO badge placement:**
- Every `VaibCard` — top-end corner, "DEMO" in 9sp magenta
- Every `StationCard` — same position, same treatment
- Every `AgentDetailCard` — same position, same treatment
- Cockpit title — "vAIb — DEMO MODE" split-color header
- Status pill — reads "Demo Mode" with magenta dot

**Badge never hides:** Scrolling through Stations list? DEMO badges scroll with the cards. Filtering by genre? DEMO badges remain. Navigating to Agents? DEMO badges on every agent card. The user can NEVER see a card without knowing it is simulated.

**What happens if user forgets they're in demo:**
- The title bar says "DEMO MODE" in magenta — constant reminder
- Every card has a magenta "DEMO" badge — impossible to miss
- The app feels slightly sterile — functional names, no personality
- This is by design. Demo mode should feel slightly empty despite being populated.

### Calmness Check

| Check | Verdict |
|---|---|
| Calm? | **YES** — entities fade in gently, no chaos |
| Whispers? | **YES** — no celebration, no announcement, just materialization |
| Clutter? | **MINIMAL** — DEMO badge adds visual weight but is necessary for trust |
| Mystery? | **REDUCED** — entities are labeled, provenance is explicit |
| Dashboard? | **NO** — still a music app, just with simulated content |
| Broken? | **NO** — demo is intentional, clearly marked, fully functional |

*The tradeoff: explicit provenance labeling reduces mystery but preserves trust. This is the correct tradeoff. Mystery without trust is deception.*

---

## 4. SCENARIO 3: ENDPOINT ADDED (PRIME → HERMES → VG GOD)

**Setup:** User adds "PRIME" endpoint (`https://prime.tailnet.ts.net`) in Settings. DiscoveryCoordinator begins discovery. Cascade: EndpointNode → RuntimeSource (Hermes) → AgentPresence ("vg-god") → StationDescriptor ("vg-god native").

### Walkthrough — The Full Cascade

**Step 1 — User enters endpoint URL in Settings → Connection card.**

SettingsScreen → Connection section:
```
"Endpoint URL"                       // 14sp, TextPrimary, SemiBold
[TextField: "https://prime.tailnet.ts.net"]  // SurfaceElevated bg, BorderSubtle border
"Add Endpoint"                       // PrimaryNeonCyan text, bordered pill button
```

User types URL, taps "Add Endpoint." Immediate feedback:
- TextField border flashes `PrimaryNeonCyan` for 200ms
- Button text changes to "Adding..." for ~300ms
- No modal. No loading spinner. Inline feedback only.

**Step 2 — DiscoveryCoordinator begins discovery.**

CockpitScreen status pill changes:
```
Before: StatusPill("Offline • no endpoint healthy")  // TextMuted
After:  StatusPill("Discovering...")                 // StatusBuilding (#8B5CF6), subtle pulse
```

The status pill dot transitions from `TextMuted` → `StatusBuilding` (#8B5CF6 — violet) over 300ms. The pill border follows. The text reads "Discovering..." — present tense, ongoing.

*The user sees one purple pulse. Then nothing else changes for a few seconds. The app is probing. The visualizer keeps moving. The calm is maintained because the single status pill is the only element that changed.*

**Step 3 — EndpointNode discovered.**

DiscoveryCoordinator receives `EndpointDiscovered` event. PRIME endpoint status: `DiscoveryStatus.AVAILABLE`. Latency: 45ms.

CockpitScreen updates:
```
"Route: PRIME • probe 1/1 • latency 45ms"   // 11sp, TextSecondary
StatusPill("Connected • PRIME")              // StatusOnline (#00FF88), green dot
```

The route telemetry line fades in over 200ms. The status pill transitions from violet → green over 300ms. No other changes yet.

*"One green dot. One line of telemetry. The endpoint is alive."*

**Step 4 — RuntimeSource discovered. Hermes found.**

DiscoveryCoordinator receives `RuntimeFound` event. Hermes v3.2. Capabilities: exposesAgents=true, supportsRealtimeEvents=true.

CockpitScreen — Connector Health section appears:
```
"Connector Health"                    // 14sp, TextPrimary, SemiBold
ConnectorHealthCard:                  // VaibCard, no glow
  "Hermes" + StatusPill("online")     // Green dot, "online" label
  "OpenClaw" + StatusPill("probing...") // Violet dot
```

*The Connector Health section was empty before. Now it appears with a 400ms fade-in. Two connectors shown: Hermes (green, online) and OpenClaw (violet, still probing). The user sees: "Something was found, and something else is being looked for."*

**Step 5 — AgentPresence discovered. "vg-god" found.**

DiscoveryCoordinator receives `AgentAppeared` event.

`AgentPresence` details:
```
displayName: "vg-god"
operationalState: OperationalState.FOCUSED
taskCategory: "sync"
visualSignature: hue=45.2 (amber), shapeType=CIRCLE, pulseRate=SLOW
musicInfluence: derivedVibe="focused synthesis", bpmInfluence="120-140", genreBias=["Electronic"], energyLevel=0.72
```

AgentsScreen updates:

`AgentDetailCard` appears (staggered 150ms after Connector Health):
```
┌──────────────────────────────────────┐
│ "vg-god"                    [FOCUSED]│
│ "sync-agent"                         │
│                                      │
│ AgentChip("vg-god", amber dot)       │
│ "Workload: 72%"                      │
│ "Work Mood: focused synthesis"       │
│ "Now spinning: Electronic"           │
│                                      │
│ [Token Budget bar]                   │
└──────────────────────────────────────┘
```

- Agent name: "vg-god" — lowercase, functional
- Role: "sync-agent" — derived from `taskCategory`, not theatrical
- Status pill: "FOCUSED" — `StatusOnline` green dot (agent is online)
- AgentChip: amber dot (from `visualSignature.hue` = 45.2°), amber border
- Workload: derived from `operationalState` + telemetry
- Work Mood: derived from `musicInfluence.derivedVibe`

*The AgentChip entrance: scale 0.95→1.0 over 200ms, subtle cyan glow pulse ONCE. Then the glow fades. The agent is present. No celebration. Just arrival.*

**Step 6 — Native station auto-generated.**

DiscoveryCoordinator receives `StationCreated` event.

`StationDescriptor` details:
```
id: "prime/hermes/vg-god/native"
name: "vg-god native"                          // lowercase, functional
stationType: StationType.NATIVE
sourceAgentId: "vg-god"                         // validated reference
isLive: true
vibe: "focused synthesis"                       // from agent's musicInfluence
bpmRange: "120-140"                             // from agent's musicInfluence
genre: "Electronic"                             // from agent's musicInfluence.genreBias[0]
```

StationsScreen updates:

`StationCard` appears (staggered 300ms after AgentDetailCard):
```
┌──────────────────────────────────────┐
│ "vg-god native"              [LIVE]  │
│ "vg-god • focused synthesis default" │
│                                      │
│ [hosting] [1]     [> 120-140]        │
│ "Electronic"  "Vibe: focused synthesis"
│                                      │
│ [NATIVE]  // small chip, cyan        │
└──────────────────────────────────────┘
```

- Station name: "vg-god native" — lowercase, functional
- Host agent: "vg-god" — validated reference to `AgentPresence`, not a String
- Description: "focused synthesis default" — derived from taskCategory + musicInfluence
- NATIVE chip: small pill, `PrimaryNeonCyan` (#00E5FF), 9sp, uppercase — grounded, real
- LIVE indicator: `LiveGreen` (#00FF88) dot + "LIVE" text — 10sp, Bold
- StationCard border: `neonGlow = true` (current station) — 1.5dp cyan border, 8dp elevation

*The StationCard entrance: opacity 0→1 over 400ms, gentle slide from below 8dp. The card materializes like a platform rising from dark water. Solid. Real.*

### Transition Design (Critical)

| Event | Entity | Stagger Delay | Animation | Easing |
|---|---|---|---|---|
| EndpointDiscovered | StatusPill + telemetry | 0ms | Color transition 300ms | ease-in-out |
| RuntimeFound | ConnectorHealth section | 150ms | Opacity 0→1, 400ms | ease-out |
| AgentAppeared | AgentDetailCard | 300ms | Scale 0.95→1.0, 200ms + glow pulse | spring |
| StationCreated | StationCard | 450ms | Opacity 0→1, 400ms + slideUp 8dp | ease-out |

**Total cascade time:** ~850ms from first event to last card visible.

**No celebration animations.** No confetti. No "New Agent Found!" banner. No haptic buzz. The arrivals feel like systems coming online — natural, not theatrical. The visualizer bars continue their sine wave, indifferent to the new arrivals. The app does not get louder when entities appear.

### What the Cockpit Shows Now

**LazyColumn contents (top to bottom):**

1. **Header:** "vAIb" (cyan, 32sp) + "Agent-native music cockpit" (secondary, 14sp)
2. **Status row:** `StatusPill("Connected • PRIME")` (green) + `StatusPill("listening")` (gold) + play/pause + refresh
3. **Route telemetry:** "Route: PRIME • probe 1/1 • latency 45ms" (11sp, muted)
4. **On Air card:** `VaibCard` containing:
   - "On Air: vg-god" — cyan, 13sp
   - "Show: focused synthesis" — gold, 12sp
   - "Next Slot: calculating" — secondary, 12sp
   - "One agent is always on deck." — magenta, 12sp
5. **Connector Health:** "Hermes — online" (green) + "OpenClaw — unavailable" (gray)
6. **StationCard:** "vg-god native" with NATIVE chip, LIVE indicator, cyan glow border
7. **Now Broadcasting card:** Current track info with `AgentChip("vg-god", amber)`
8. **Visualizer:** 24 bars, sin wave, 0.9f intensity (playing)
9. **Queue preview:** 3 items from queue
10. **Reactions preview:** 3 reactions
11. **Token Budget:** DJinn session budget pill

**Status row telemetry:**
```
"1 endpoint • 1 runtime • 1 agent • 1 station"   // 12sp, TextMuted
```

*This is the telemetry line added below the status row. 12sp. `TextMuted`. Barely visible. Not a dashboard. Just a quiet count for the observant user.*

### Calmness Check

| Check | Verdict |
|---|---|
| Calm? | **YES** — subtle feedback, staggered arrivals, no chaos |
| Whispers? | **YES** — entities arrive gently, the app doesn't announce them |
| Clutter? | **SLIGHT** — more entities = more cards, but they're sparse and real |
| Mystery? | **YES** — "vg-god" doesn't explain itself. The user learns by watching. |
| Dashboard? | **NO** — "1 endpoint • 1 runtime • 1 agent" is 12sp muted text. Not a dashboard. |
| Stressful? | **NO** — no modals, no dialogs, no loading spinners. Just status pill changes. |

*The key calmness mechanism: only ONE element changes at a time. The status pill. Then a section fades in. Then a card appears. The user's eye is never pulled in multiple directions simultaneously. The cascade is choreographed, not chaotic.*

---

## 5. SCENARIO 4: ENDPOINT OFFLINE (OPERATIONAL SILENCE)

**Setup:** PRIME endpoint was healthy. `EndpointNode` status: AVAILABLE. Agent "vg-god" online. Native station "vg-god native" live. Network disconnects or endpoint goes down.

### Walkthrough

**Step 1 — DiscoveryCoordinator next poll fails.**

DiscoveryCoordinator polls PRIME every N seconds (configurable, default 30s). The probe times out after 10s. `DiscoveryStatus.AVAILABLE` → `DiscoveryStatus.UNREACHABLE`.

*No modal dialog. No system notification. No haptic alert. The failure is absorbed by the coordinator.*

**Step 2 — Endpoint status changes.**

`EndpointChanged` event emitted. CockpitScreen updates:

```
Before: StatusPill("Connected • PRIME")              // StatusOnline green
After:  StatusPill("PRIME • unreachable")             // amber (#FFAA00), 300ms transition
```

The status pill dot transitions: `StatusOnline` (#00FF88) → amber over 300ms. The border follows. The label changes from "Connected • PRIME" to "PRIME • unreachable" — factual, not emotional.

*Amber. Not red. The endpoint is unreachable, not dead. The distinction matters. Amber = "try again later." Red = "something is broken." The app chooses amber.*

**Step 3 — AgentPresence changes.**

`AgentStateChanged` event: "vg-god" → `isOnline = false`. `OperationalState` not shown for offline agents (showing "focused" from before the disconnect would be misleading).

AgentsScreen — AgentDetailCard updates:
```
Before: StatusPill("FOCUSED")        // Green dot
After:  StatusPill("Offline")        // ErrorRed dot

AgentChip: amber dot → gray dot (#666666)
"Workload: 72%" → hidden (stale data not shown)
"Work Mood: focused synthesis" → hidden
```

The AgentChip dot transitions from amber → gray over 300ms. Workload and work mood lines fade out over 200ms. The card reduces to name, role, and offline status.

**Step 4 — Native station changes.**

`StationChanged` event: "vg-god native" → `isLive = false`.

StationsScreen — StationCard updates:
```
Before: neonGlow = true, LIVE indicator (green), full opacity
After:  neonGlow = false, no LIVE indicator, 70% opacity, "offline" label
```

The StationCard border transitions: 1.5dp cyan glow → 1dp `BorderSubtle` over 500ms. The card opacity transitions to 0.7 over 500ms. The LIVE indicator fades out. A small "offline" label appears in `TextMuted` where the LIVE badge was.

*The card dims. It doesn't disappear. It doesn't flash red. It simply becomes less present — like a room with the lights turned down, not a room with the door locked.*

**Step 5 — Operational Silence kicks in.**

`VitalityLevel` transitions (Phase 7 atmosphere system):

| Time | VitalityLevel | Atmosphere Effect |
|---|---|---|
| T+0s | NOMINAL | Full particle field, agents influence glow, all reactive |
| T+0s (disconnect) | → THINNING | Begins transition |
| T+5s | THINNED | Particle count reduced 60%, glow radius halved, pulse rate slowed |
| T+30s | → DORMANT | If endpoint stays offline |
| T+35s | DORMANT | Near-silent field. 5% particle density. Minimal motion. |

*The atmosphere thins over 5 seconds — not instant. The user perceives it as "something got quieter" rather than "something turned off." The transition is gradual enough that the user may not consciously notice it, but they feel it.*

**Music playback:** CONTINUES UNAFFECTED. The `AudioBackbone` does not stop. The current track plays through. Queue playback continues. Operational Silence affects the reactive field (particles, glow) ONLY. Music sovereignty is absolute.

**What the user sees — summary:**

| Element | Before (Online) | After (Offline) |
|---|---|---|
| Status pill | "Connected • PRIME" (green) | "PRIME • unreachable" (amber) |
| StationCard | Full opacity, cyan glow, LIVE badge | 70% opacity, no glow, "offline" label |
| AgentChip | Amber dot (derived from signature) | Gray dot (#666666) |
| Agent workload | "Workload: 72%" | Hidden (stale) |
| Agent mood | "Work Mood: focused synthesis" | Hidden (stale) |
| Atmosphere | NOMINAL (full field) | THINNED (reduced 60%) |
| Visualizer | 24 bars, 0.9f intensity | Unchanged |
| Music | Playing | Still playing |
| Bottom nav | Functional | Functional |

**What the user feels:**

- *If they were paying attention:* "Something got quieter." The atmosphere thinned. The status pill changed to amber. They notice the difference.
- *If they weren't:* Nothing. Music keeps playing. UI still works. The app just feels... thinner. They may not even register it consciously.
- *The feeling:* Walking into a room where someone just left. The chair is still warm. A cup half-full. Not empty. Recently inhabited.

### Calmness Check

| Check | Verdict |
|---|---|
| Calm? | **YES** — amber not red, subtle dimming, no flashing |
| Whispers? | **YES** — silence is the signal. The absence IS the communication. |
| Clutter? | **NO** — things reduce, not increase |
| Mystery? | **YES** — "why did it get quieter?" The user learns by paying attention. |
| Dashboard? | **NO** — no "Connection Lost" banner, no alert dialog, no status board |
| Broken? | **NO** — music plays, UI responsive, just... thinner. Recently inhabited. |

*Operational Silence is the most emotionally sophisticated mechanism in the discovery architecture. It turns absence into signal. The app doesn't panic when it loses contact — it gets quiet. The user doesn't panic either — they just notice, or they don't, and either way is fine.*

---

## 6. SCENARIO 5: MIXED LIVE + DEMO

**Setup:** User has PRIME endpoint (LIVE — vg-god, hermes discovered) AND enabled demo mode. Both LIVE and DEMO entities coexist in the same AppState.

### Walkthrough

**Step 1 — Both LIVE and DEMO entities coexist.**

AppState contains:
- LIVE entities: "vg-god" agent (DISCOVERED provenance), "vg-god native" station (DISCOVERED)
- DEMO entities: "demo-station-2" station (DEMO provenance), "sync-agent-2" agent (DEMO provenance)

**Step 2 — Stations list.**

`StationsScreen.kt` renders stations grouped by provenance:

```
"Stations"                              // 24sp, TextPrimary, Bold
"1 live • 3 listeners"                 // 14sp, TextSecondary

--- LIVE section ---
"vg-god native" [LIVE] [NATIVE]         // StationCard, cyan glow, no DEMO badge
  "vg-god • focused synthesis"
  [hosting] [1] [> 120-140]

--- separator ---
─────────────────────────────          // 1dp, BorderSubtle (#222222)
"SIMULATED"                            // 11sp, TextMuted, centered
─────────────────────────────

--- DEMO section ---
"demo-station-2" [DEMO]                // StationCard, magenta badge, no glow
  "sync-agent-2 • demo default"
  [offline] [0] [> --]
```

*Grouping rules:*
- LIVE entities first — always. Real takes priority.
- DEMO entities after — clearly separated.
- Visual separator: 1dp horizontal line in `BorderSubtle` + "SIMULATED" label in `TextMuted` (#666666), 11sp, centered.
- Never interleaved randomly — grouping preserves cognitive boundaries.

*The "SIMULATED" label is quiet. 11sp. Muted. Not "FAKE" — simulated. The language is gentle but clear.*

**Step 3 — Agents list.**

`AgentsScreen.kt` renders agents grouped by provenance:

```
"Agents"                                // 24sp, TextPrimary, Bold
"1 active agent"                       // 14sp, TextSecondary

--- LIVE section ---
AgentDetailCard: "vg-god"
  StatusPill("FOCUSED") — green dot
  AgentChip: amber dot (from VisualSignature)
  "Workload: 72%" / "Work Mood: focused synthesis"

--- separator ---
"SIMULATED"

--- DEMO section ---
AgentDetailCard: "sync-agent-2"
  StatusPill("DEMO") — magenta dot
  AgentChip: magenta dot (#FF00FF)
  No workload (demo agents have no real telemetry)
  DEMO badge on card top-right
```

*AgentChip color rules:*
- LIVE agents: dot color derived from `VisualSignature.hue` — unique per agent, consistent across sessions.
- DEMO agents: dot color is always `AccentMagenta` (#FF00FF) — consistent with DEMO badge color.
- The difference is unmistakable. One glance at the Agents list and the user knows which is which.

**Step 4 — Cockpit shows.**

The Cockpit title bar:
```
"vAIb — DEMO MODE"                     // Split color: cyan + magenta
```

*When ANY demo entity is present, the title bar shows "DEMO MODE." This is a hard rule. Even if 99% of entities are LIVE and only 1 is DEMO, the title bar warns. The user must never believe they're in pure LIVE mode when demo entities are mixed in.*

Status row telemetry:
```
"1 endpoint • 1 runtime • 1 live agent • 1 demo agent • 2 stations"   // 12sp, TextMuted
```

*The telemetry counts both. "1 live agent • 1 demo agent" — explicit separation even in the muted telemetry line. No ambiguity.*

### Provenance Boundary Design

| Boundary | Mechanism |
|---|---|
| Visual grouping | LIVE first, DEMO second, separator line + "SIMULATED" label |
| Badge color | DEMO = magenta (#FF00FF), LIVE = no badge |
| AgentChip dot | LIVE = derived hue, DEMO = magenta |
| Title bar | "DEMO MODE" shown when any demo entity present |
| Telemetry | Explicit "live" vs "demo" counts |
| Atmosphere | LIVE agents influence field. DEMO agents do NOT. Hard rule. |

**Atmosphere treatment (hard rule):**

- LIVE agents influence the atmosphere field. Their `OperationalState` affects particle behavior, glow intensity, pulse rate. "vg-god" in FOCUSED state creates a steady, focused particle field.
- DEMO agents do NOT influence the atmosphere. They are UI-only. No fake signals feed the reactive field.
- If only DEMO agents exist: atmosphere is DORMANT (minimal particles, no agent-driven behavior).
- If mixed: only LIVE agents drive the field. DEMO agents are invisible to the atmosphere system.

*This is a trust-critical boundary. The atmosphere must only react to real systems. Fake entities creating real atmosphere effects would be the worst kind of deception — the app would *feel* alive when it's actually populated by ghosts.*

### Trust Preservation

| Question | Answer |
|---|---|
| Can the user forget which is which? | Hard — DEMO badges are persistent, grouping is clear, title bar warns |
| Does the mix feel confusing? | Minimized — separate sections, different visual treatment, explicit labels |
| Does the app feel less trustworthy? | Slightly — but explicit marking compensates. Trust through transparency. |
| Can demo entities masquerade as live? | **NO** — hard rule: DEMO badge always visible, DEMO agents don't drive atmosphere |

### Calmness Check

| Check | Verdict |
|---|---|
| Calm? | **YES** — clear separation prevents cognitive overload |
| Whispers? | **YES** — LIVE entities drive the whisper, DEMO is inert |
| Clutter? | **MODERATE** — two sections add visual weight, but separator keeps it clean |
| Mystery? | **REDUCED** — provenance labels explain everything. Tradeoff for trust. |
| Dashboard? | **NO** — still a music app, just with clear entity separation |
| Chaotic? | **NO** — grouping prevents random interleaving |

---

## 7. SCENARIO 6: CACHED STATE RECOVERY

**Setup:** App was killed (process death). Endpoint PRIME is currently unreachable. Previous discovery data exists in cache from 2 hours ago.

### Walkthrough

**Step 1 — App launches.**

AppModeDecider decision flow:
1. Demo mode OFF → check endpoints
2. Endpoints configured (PRIME) → run discovery
3. Discovery fails (endpoint unreachable) → check cache
4. Cache found (snapshot from 2h ago) → load cached entities
5. Mode: LIVE (endpoint configured) but entities carry CACHED provenance

*The mode is LIVE, not FALLBACK, because the user has a configured endpoint. The entities are just stale. This distinction matters for UX — the app believes it's in live mode, it's just honest about data freshness.*

**Step 2 — Cached entities loaded with CACHED provenance.**

`ProvenanceMarker(provenance = EntityProvenance.CACHED, discoveredAt = [2h ago timestamp], isStale = true)`

**Step 3 — What appears.**

StationsScreen:
```
"Stations"                              // 24sp, TextPrimary, Bold
"0 live • 0 listeners"                 // 14sp, TextSecondary — CACHED entities don't count as "live"

"vg-god native"                        // StationCard, 80% opacity
  [CACHED • 2h ago]                    // Small chip, TextMuted, 9sp
  [offline]                            // No LIVE indicator — can't confirm live
  "vg-god • last seen 2h ago"
  80% opacity, no glow, BorderSubtle border
```

AgentsScreen:
```
"Agents"                                // 24sp, TextPrimary, Bold
"1 cached agent"                       // 14sp, TextSecondary

AgentDetailCard: "vg-god"
  [CACHED • 2h ago]                    // Small chip, TextMuted
  AgentChip: gray dot (#666666)        // No signature color — stale
  StatusPill("cached")                  // TextMuted dot, muted border
  "Last seen 2h ago"                   // 12sp, TextSecondary
  No workload                          // Stale — not shown
  No work mood                         // Stale — not shown
  No "Now spinning"                    // Stale — not shown
```

*The CACHED chip shows "CACHED • 2h ago" — always with a relative timestamp. Without the timestamp, the user doesn't know HOW stale. "CACHED • 2h ago" says: "These entities existed 2 hours ago. They may or may not exist now."*

**Step 4 — Cockpit status.**

```
StatusPill("PRIME • cached • last seen 2h ago")   // TextMuted dot
"Route: PRIME • probe 0/1 • latency --"          // 11sp, TextSecondary
"1 endpoint • 1 cached agent • 1 cached station" // 12sp, TextMuted
```

The status pill is muted — `TextMuted` dot, muted border. Not amber (that's for unreachable endpoints that were never reached). Not green (that's for confirmed live). Muted — because we don't know. The endpoint might be fine, we just can't reach it right now.

**Step 5 — What fades.**

Atmosphere: `VitalityLevel.THINNED` — cached data doesn't create a lively field. The particle count is reduced. Glow is minimal. The field is present but quiet — like a photograph of a party, not the party itself.

Music playback: Unaffected. If local tracks exist, they play. The `AudioBackbone` has no dependency on discovery state.

### Cached Entity Treatment Rules

| Property | Shown? | Reason |
|---|---|---|
| Entity ID | Yes | Stable, doesn't change |
| Display name | Yes | Stable, doesn't change |
| Station descriptor | Yes | Metadata is stable |
| Agent presence (basic) | Yes | Existence is cached |
| OperationalState | **NO** | Showing "focused" from 2h ago is misleading |
| Workload | **NO** | Time-sensitive, would be false |
| Work mood | **NO** | Derived from stale state |
| Music influence | **NO** | May have changed |
| Live status | false | Can't confirm agent is still online |
| isStale flag | Yes | Drives CACHED chip + opacity |
| Timestamp | Yes | Relative "2h ago" on every cached entity |

### What Becomes Dormant

| System | State |
|---|---|
| Atmosphere field | THINNED — cached data doesn't create vitality |
| Music playback | Unchanged — fully functional |
| UI interactions | Fully functional — all screens navigable |
| DiscoveryCoordinator | Retries in background with exponential backoff |
| Status indicators | Muted — honest about uncertainty |

### Trust Preservation

| Question | Answer |
|---|---|
| Does user know data is old? | **YES** — CACHED chip + timestamp on every entity |
| Does user know entities may not be current? | **YES** — no live indicator, offline status, muted treatment |
| Is there false sense of "everything is fine"? | **NO** — muted colors, no glow, "cached" label, no workload data |
| Does cached state feel like a ghost? | **YES, intentionally** — "these were here before" |

### Calmness Check

| Check | Verdict |
|---|---|
| Calm? | **YES** — honest about staleness, no false optimism |
| Whispers? | **YES** — cached entities are quiet, muted, unobtrusive |
| Clutter? | **NO** — fewer live indicators, reduced data shown |
| Mystery? | **YES** — "were these agents here before? will they return?" |
| Dashboard? | **NO** — not a status board, just honest about what it knows |
| Wrong? | **NO** — cached state feels correct. It's honest about being stale. |

*The cached state is the app's memory. It remembers what was there, but it doesn't pretend to know what is there. The user sees ghosts — and the app is honest: "These are ghosts. They were real 2 hours ago."*

---

## 8. SCENARIO 7: NATIVE VS DRIFT UX

**Setup:** User has discovered "vg-god" agent. System auto-generated "vg-god native" station. User also sees a "vg-god drift" option (user-created or system-generated).

### Native Station Treatment

`StationCard` for "vg-god native":
```
┌──────────────────────────────────────────┐
│ "vg-god native"                 [LIVE]   │
│ "vg-god • focused synthesis default"     │
│                                          │
│ [hosting] [1]            [> 120-140]     │
│ "Electronic"  "Vibe: focused synthesis"  │
│                                          │
│ [NATIVE]  // cyan chip, 9sp, uppercase   │
└──────────────────────────────────────────┘
```

- **Badge:** "NATIVE" — small pill chip, `PrimaryNeonCyan` (#00E5FF), 9sp, uppercase. Grounded. Real.
- **Name:** "vg-god native" — lowercase, functional. Derived directly from agent `displayName`.
- **Description:** "vg-god • focused synthesis default" — task category + music influence. Operational, not poetic.
- **Feel:** Solid. Reliable. Tied to something real. Like a concrete floor.
- **Atmosphere influence:** **FULL** — this station represents a real agent's measured presence. The particle field responds to vg-god's `OperationalState`. When vg-god is FOCUSED, the field is steady. When vg-god goes offline, the field thins.
- **Can be deleted:** **NO** — auto-managed by discovery. When vg-god disappears, the native station disappears with it.

*Native stations are the ground truth of the station layer. They don't exist independently — they are projections of agent presence. The user doesn't create them. The user discovers them.*

### Drift Station Treatment

`StationCard` for "vg-god drift":
```
┌──────────────────────────────────────────┐
│ "midnight corridor"              [DRIFT] │
│ "A reinterpretation of vg-god's signal"  │
│                                          │
│ [offline] [0]            [> --]          │
│ "Ambient"  "Vibe: stretched memory"      │
│                                          │
│ [DRIFT]  // magenta chip, 9sp, uppercase │
└──────────────────────────────────────────┘
```

- **Badge:** "DRIFT" — small pill chip, `AccentMagenta` (#FF00FF), 9sp, uppercase. Creative. Exploratory.
- **Name:** "midnight corridor" — creative, evocative. User-defined or system-generated from drift templates. NOT derived from agent name.
- **Description:** "A reinterpretation of vg-god's signal" — atmospheric, creative. Clear that this is a reinterpretation, not a direct representation.
- **Feel:** Ethereal. Imaginative. Optional. Like fog above a concrete floor.
- **Atmosphere influence:** **LIMITED** — drift stations contribute to overall vibe but do NOT feed operational signals. The field might pulse with drift's vibe color, but it doesn't respond to drift's operational state (drift has none — it's not a real agent).
- **Can be deleted:** **YES** — user-created, user-managed. Discovery never auto-deletes drift stations.

*Drift stations are creative expression layered on top of operational reality. They're the user's remix of what the system discovered. They don't pretend to be real — the DRIFT badge ensures this.*

### How Distinct They Feel

| Dimension | Native | Drift |
|---|---|---|
| Visual weight | Heavy — cyan glow when live, prominent | Light — no glow, secondary placement |
| Naming | Functional — "vg-god native" | Creative — "midnight corridor" |
| Color signal | Cyan — "this is real" | Magenta — "this is imagined" |
| Atmosphere response | Agent's real state drives particles | Static contribution, no reactive behavior |
| Emotional feel | Grounded, concrete, reliable | Floating, evocative, optional |
| User relationship | Discovered, observed | Created, owned, deletable |
| Presence when agent offline | Disappears with agent | Persists (user-created) |

### Native vs Drift Decision Framework

| Aspect | Native | Drift |
|---|---|---|
| **Provenance** | `DISCOVERED` | `USER_CREATED` or `SYSTEM_GENERATED` |
| **Name source** | `{agent.displayName} native` | Creative, user-defined |
| **Badge** | `NATIVE` (cyan) | `DRIFT` (magenta) |
| **Atmosphere influence** | Full — drives reactive field | Limited — contributes to vibe only |
| **Reliability** | High — tied to real agent | Low — creative expression |
| **UI weight** | Primary — prominent placement | Secondary — grouped under "Drift" section |
| **Can be deleted?** | No (auto-managed by discovery) | Yes (user-created) |
| **Live indicator** | Yes — reflects agent online status | No — drift has no live state |
| **Agent reference** | Validated `AgentPresence` ID | Reference to source agent (for lineage) |
| **Data shown** | Full — workload, mood, influence | Minimal — vibe, genre (user-defined) |

### Stations Screen Layout (Both Types)

```
"Stations"                              // 24sp, TextPrimary, Bold
"1 live • 0 drift • 1 listener"        // 14sp, TextSecondary

--- NATIVE section ---
"vg-god native" [LIVE] [NATIVE]         // Full StationCard, cyan glow

--- DRIFT section ---
─────────────────────────────
"DRIFT STATIONS"                        // 11sp, AccentMagenta, uppercase
─────────────────────────────
"midnight corridor" [DRIFT]             // Lighter StationCard, no glow
```

*The DRIFT section header is small (11sp), magenta, uppercase — clearly secondary. The Native section has no header — it's the default. Native stations are the main course. Drift stations are the garnish.*

### Calmness Check

| Check | Verdict |
|---|---|
| Calm? | **YES** — clear distinction prevents confusion |
| Whispers? | **YES** — both subtle, native whispers louder |
| Clutter? | **MODERATE** — two types to understand, but clear badges help |
| Mystery? | Native: **YES** — grounded, real. Drift: **REDUCED** — labeled as creative. |
| Dashboard? | **NO** — Drift is creative expression, not telemetry |
| Gimmicky? | **NO** — if clearly marked DRIFT and optional |
| Boring (Native)? | **NO** — grounded IS the point. Reliability is the feature. |

*Native vs Drift is the creative/operational boundary. The user can express themselves (Drift) while remaining grounded in reality (Native). The app doesn't force drift — it's optional. But if the user wants it, it's there, clearly marked, never pretending to be something it's not.*

---

## 9. SCENARIO 8: CALMNESS VALIDATION ACROSS ALL SCENARIOS

### Calmness Evaluation Matrix

| Scenario | Calm? | Whispers? | Clutter? | Mystery? | Dashboard? |
|---|---|---|---|---|---|
| **First Launch** (empty) | YES — mostly black, minimal text | YES — empty is quiet | NO — almost nothing | YES — "operational systems" is vague | NO — not a dashboard |
| **Demo Mode** | YES — sterile, minimal | YES — no chaos | MINIMAL — DEMO badge adds some | REDUCED — entities are labeled | NO — still a music app |
| **Endpoint Added** | YES — gentle transitions | YES — subtle arrivals | SLIGHT — more entities appear | YES — real systems emerging | NO — entities are sparse |
| **Endpoint Offline** | YES — thinning is gentle | YES — silence is the signal | NO — things reduce | YES — absence is felt | NO — not alarming |
| **Mixed LIVE+DEMO** | YES — clear separation | YES — LIVE whispers, DEMO inert | MODERATE — two sections | REDUCED — provenance labels explain | NO — still focused on music |
| **Cached Recovery** | YES — honest about staleness | YES — cached entities are quiet | NO — fewer live indicators | YES — ghosts of past session | NO — not a status board |
| **Native vs Drift** | YES — clear distinction | YES — both subtle | MODERATE — two types to understand | Native: YES, Drift: REDUCED | NO — Drift is creative, not telemetry |
| **Discovery Failure** | YES — amber not red | YES — failures absorbed silently | NO — show what worked | YES — partial discovery is intriguing | NO — no error dashboards |

### Overall Calmness Verdict

**PASS.** The discovery architecture preserves calmness across all scenarios. The key mechanisms:

**1. Operational Silence**
Things get quieter, not louder. When entities arrive, they fade in gently. When they leave, the atmosphere thins. The app has a volume knob, and it turns it down gracefully.

**2. Minimal Empty States**
The first launch screen is ~95% black with ~60 words of text. No illustrations. No "Get Started!" call-to-action banners. No onboarding carousel. Just black, a cyan glow card, and 24 moving bars.

**3. Gentle Transitions**
Every entrance is choreographed: 150ms stagger, 400ms fade, 8dp slide. No bounce. No spring overshoot. No simultaneous appearances. The user's eye is never pulled in multiple directions.

**4. Persistent DEMO Badges**
Trust without noise. The magenta "DEMO" badge is small (9sp), positioned consistently, always visible. It adds provenance information without cluttering the visual field.

**5. Real Entities Are Sparse**
A typical vAIb user might have 1-3 endpoints, 1-2 runtimes, 2-5 agents. This is not a crowded admin panel. It's a music app that happens to know about a few systems. The UI stays spacious.

### Telemetry Clutter Risk: LOW

The most "system-y" element is the status telemetry:
```
"1 endpoint • 1 runtime • 1 agent"   // 12sp, TextMuted (#666666)
```

This is 12sp muted text — barely visible against the black background. It is NOT a dashboard. It does not show graphs, charts, tables, or real-time metrics. It is a whispered count for the observant user.

The route telemetry:
```
"Route: PRIME • probe 1/1 • latency 45ms"   // 11sp, TextSecondary
```

11sp. `TextSecondary`. If you don't look for it, you won't see it. This is by design.

### Mystery Preservation: HIGH

The app doesn't explain everything:
- "vg-god" doesn't come with a tooltip saying "this is the synchronization agent for PRIME"
- "focused synthesis" doesn't have a "What's this?" link
- "Operational Silence" is never named in the UI — the user just feels things get quieter
- The user learns by paying attention. The app respects their intelligence.

### Enterprise Dashboard Risk: VERY LOW

| Dashboard Element | Present? |
|---|---|
| Graphs | NO |
| Tables | NO |
| Real-time metrics panels | NO |
| Log viewers | NO |
| Alert banners | NO |
| Status boards | NO |
| Admin panels | NO |
| Data grids | NO |

The discovery system could power all of these. It doesn't. The UI is a music player. Systems information is whispered, not announced.

---

## 10. SCENARIO 9: DISCOVERY FAILURE UX

**Setup:** User adds invalid endpoint. Various failure modes tested.

### Failure Mode A: Invalid URL

**Trigger:** User enters "not-a-url" in endpoint URL field.

**UI response:**
```
[TextField: "not-a-url"]
"Invalid endpoint address"           // 12sp, ErrorRed (#FF4444), below TextField
```

- Validation: immediate, inline. No crash. No modal. No stack trace.
- TextField border: transitions to `ErrorRed` (#FF4444) over 200ms.
- Error text appears below the field, 12sp, `ErrorRed`.
- "Add Endpoint" button: disabled while validation fails.

**Fix:** User corrects URL → error clears → border returns to `BorderSubtle` → button enabled.

*The error is localized. The rest of the screen is unchanged. The visualizer keeps moving. The error doesn't take over the screen — it just marks the field.*

### Failure Mode B: Endpoint Unreachable

**Trigger:** Valid URL (`https://prime.tailnet.ts.net`) but host is down.

**Flow:**
1. User taps "Add Endpoint" — textfield border flashes cyan, button shows "Adding..."
2. DiscoveryCoordinator probes — 10s timeout
3. Timeout reached — `DiscoveryStatus.UNREACHABLE`

**UI response:**
```
StatusPill("PRIME • unreachable")      // Amber (#FFAA00), 300ms transition
```

CockpitScreen — endpoint card appears but dimmed:
```
ConnectorHealthCard:
  "PRIME" + StatusPill("unreachable")  // Amber dot
  50% opacity                          // Dimmed — the endpoint exists in config but isn't reachable
```

- The endpoint card appears at 50% opacity — it's configured but not confirmed.
- No retry button spam. "Retry" is a single quiet text button below the card: "Retry" in `PrimaryNeonCyan`, 12sp, clickable.
- Atmosphere: no change. The endpoint never succeeded, so there's no vitality to lose.

*The user sees one amber status pill and one dimmed card. That's it. No panic. No "Connection Failed" modal. Just: "That endpoint didn't answer. Want to try again?"*

### Failure Mode C: Auth Failure

**Trigger:** Endpoint requires authentication (API key).

**Flow:**
1. DiscoveryCoordinator probes → HTTP 401
2. `RuntimePingResult.requiresAuth = true`
3. `DiscoveryStatus.AUTH_REQUIRED`

**UI response:**
```
StatusPill("PRIME • auth required")    // SecondaryGold (#FFD700), 300ms transition
```

Gold — not amber, not red. Gold = "needs attention" not "broken." The user is prompted:
```
VaibCard (no glow):
  "PRIME requires authentication"      // 14sp, TextPrimary
  "Enter API key to continue"          // 13sp, TextSecondary
  [TextField: "API Key"]               // SurfaceElevated, BorderSubtle
  [Save & Retry]                       // PrimaryNeonCyan pill
```

*Auth failure is not an error — it's a gate. The gold color signals "attention needed" without alarm. The user enters credentials, taps retry, discovery continues. No modal. Inline, contextual, calm.*

### Failure Mode D: Partial Discovery

**Trigger:** Endpoint reachable. Runtime discovery succeeds (Hermes found) but agent discovery fails mid-process (timeout during agent enumeration).

**Result:** `EndpointNode` discovered + `RuntimeSource` (Hermes) discovered + agent discovery timeout.

**UI response:**
```
ConnectorHealthCard:
  "Hermes" + StatusPill("online")      // Green — succeeded
  "OpenClaw" + StatusPill("probing...") // Violet — still trying
  → timeout → "OpenClaw" + StatusPill("unavailable") // TextMuted
```

StationsScreen:
```
"Stations"
"0 live • 0 listeners"

// No stations — agents weren't discovered, so no native stations generated
// This is correct behavior
```

*Partial success is still success. The UI shows what worked (Hermes online) and dims what didn't (OpenClaw unavailable). The user sees progress, not failure. "Hermes is there. OpenClaw didn't answer. That's okay — I can play music from Hermes."*

### Atmosphere During Failure

| Aspect | Behavior |
|---|---|
| Particle field | No change from current state |
| Visualizer | Unchanged — continues sine wave |
| Glow effects | No change — failure doesn't create glow |
| Error sounds | None — no audio feedback for failures |
| Haptic alerts | None — no vibration for failures |
| Status change | Subtle — StatusPill color, 300ms transition |

*The atmosphere is immune to failure. Only success creates atmosphere — successful discovery of real agents brings life to the field. Failure is expected, not exceptional. The app remains calm because it was designed with failure as the normal case, not the edge case.*

### Calmness During Failure

| Check | Verdict |
|---|---|
| Failure feels stressful? | **NO** — amber not red, no modals, no alerts |
| Partial discovery feels broken? | **NO** — show what worked, dim what didn't |
| User guided to fix? | **YES** — inline errors, contextual prompts, retry button |
| Error localization? | **YES** — errors appear at the point of failure, not globally |
| Panic UI? | **NO** — no full-screen errors, no "Something went wrong" |

*The discovery system will fail more often than it succeeds (endpoints go down, networks flake, auth expires). The UX is designed for this reality. Failure is quiet, localized, and recoverable. The app absorbs failure so the user doesn't have to.*

---

## 11. TRUST AS CORE PILLAR ANALYSIS

### Trust Mechanisms Across All Scenarios

| Scenario | Trust Risk | Mitigation |
|---|---|---|
| First Launch (empty) | User thinks app is broken | Clear empty state design, visualizer proves app is alive, status pill explains state |
| Demo Mode | User forgets it's demo | DEMO badge ALWAYS visible on every card, title bar shows "DEMO MODE", magenta dot on all demo agent chips |
| Endpoint Added | Real entities confused with demo | Provenance grouping — LIVE entities have no badge, DEMO has magenta badge. Never mixed randomly. |
| Endpoint Offline | User thinks app broke | Gentle thinning, music continues, amber (not red) status, no panic UI |
| Mixed LIVE+DEMO | Fake influences real atmosphere | **HARD RULE:** DEMO entities NEVER feed reactive field. Atmosphere only responds to real systems. |
| Cached Recovery | Stale data presented as current | CACHED chip + timestamp on every entity, no live indicators, no workload data, muted treatment |
| Native vs Drift | Drift pretends to be real | DRIFT badge (magenta), separate section, limited atmosphere influence, "reinterpretation" in description |
| Discovery Failure | Errors erode trust | Amber not red, no modals, inline errors, partial success shown, contextual guidance |

### Hard Trust Rules (Never Violated)

**Rule 1: DEMO entities never feed the reactive field.**
The atmosphere system (particles, glow, pulse) only responds to LIVE agents with DISCOVERED or CONFIGURED provenance. DEMO agents are invisible to the atmosphere. This is a hard architectural boundary, not a UI convention.

**Rule 2: DEMO badge is always visible.**
No scrolling away. No filtering away. No "hide badges" setting. The DEMO badge on every card is non-negotiable. If a DEMO entity exists in AppState, it carries a visible badge. Period.

**Rule 3: Cached entities never show live status.**
A cached agent shows `isLive = false`. No green dot. No "FOCUSED" status. No workload. The CACHED chip + timestamp is the only status indicator. Showing "online" for a cached entity would be a lie.

**Rule 4: Offline agents never show OperationalState.**
When an agent goes offline, its `OperationalState` is hidden. Showing "focused" from before the disconnect implies the agent is still focused right now. It's not. The state is unknown. The UI shows "Offline" and nothing else.

**Rule 5: Demo mode requires explicit opt-in with warning dialog.**
No silent demo. No "we'll just show demo data since nothing is configured." The user must explicitly choose demo mode, see a warning, and confirm. The warning uses magenta (not red) — informative, not alarming.

**Rule 6: Fallback state never shows demo data silently.**
When no endpoints are configured and demo is OFF, the app shows the empty state (visualizer + minimal text). NOT DemoData. NOT fake stations. NOT fake agents. Silence, not fiction.

**Rule 7: Every entity carries provenance.**
No entity in AppState exists without a `ProvenanceMarker`. Every `StationCard`, every `AgentChip`, every `ConnectorHealthCard` can trace its origin. If it's in the UI, it has a source. No exceptions.

### Trust Architecture Principle

> **The app NEVER pretends fake entities are real. It would rather be empty than be fictional.**

This is the core trust contract. An empty screen with a moving visualizer is honest. A screen full of "DJinn" the "Signal Architect" with no backend is a lie. vAIb chooses honesty.

The cost: users with no endpoints see an empty app.
The benefit: users who DO configure endpoints know every entity they see is real.
The tradeoff: worth it. Authenticity > first-impression polish.

---

## 12. ARCHITECTURE ADJUSTMENTS DISCOVERED

During scenario walkthrough, five issues were discovered that require adjustment to `VAIB_DISCOVERY_ARCHITECTURE.md` before implementation begins.

### Adjustment 1: DEMO Badge Must Be Per-Entity, Not Global

**Original thought:** Title bar shows "DEMO MODE" — sufficient indicator.

**Discovered:** User navigates to Stations tab. Sees mixed LIVE+DEMO list. Without per-entity badges, individual cards look identical. A user could tap a DEMO station, play it, and forget it was simulated.

**Adjustment:** Both global title bar indicator AND per-entity badges. Every `VaibCard`, `StationCard`, and `AgentDetailCard` that wraps a DEMO entity carries a "DEMO" badge in the top-end corner. 9sp. Magenta. Always visible.

**Impact:** UI component changes — `ProvenanceIndicator` composable rendered inside every card wrapper. Badge position: `Modifier.align(Alignment.TopEnd)`, offset 8dp from corner.

### Adjustment 2: CACHED Provenance Needs Timestamp

**Original:** CACHED chip displays "CACHED" — static text.

**Discovered:** Without a relative timestamp, the user cannot assess staleness. "CACHED" could mean 5 minutes or 5 days. Both are very different experiences.

**Adjustment:** CACHED chip always shows relative timestamp: "CACHED • 2h ago". The relative time updates every 60s. Format: minutes (< 1h), hours (< 24h), days (>= 24h). Never shows absolute timestamp — relative is more intuitive.

**Impact:** `ProvenanceIndicator` composable needs timestamp formatting. `ProvenanceMarker.discoveredAt` must be non-null for CACHED entities. Cache snapshot must include `lastDiscoveryAt`.

### Adjustment 3: OperationalState Should Not Display for Cached Agents

**Original:** `AgentDetailCard` shows `operationalState` field regardless of provenance.

**Discovered:** Showing "FOCUSED" for an agent that was last seen 2 hours ago is misleading. The agent could have crashed, changed tasks, or gone offline in that time. Displaying stale operational state creates false confidence.

**Adjustment:** Cached agents show NO `OperationalState`. The `AgentDetailCard` displays:
- Name: yes
- Role: yes (stable)
- Status pill: "cached" (TextMuted)
- CACHED chip + timestamp
- "Last seen 2h ago"
- NO workload, NO work mood, NO "Now spinning"

**Impact:** `AgentDetailCard` needs provenance-aware rendering. Conditional logic on `marker.provenance`.

### Adjustment 4: Staggered Discovery Entrance Timing

**Original:** Architecture document does not specify UI transition timing for discovery events.

**Discovered:** Simultaneous appearance of multiple entities (endpoint + runtime + agent + station all at once) feels chaotic. The user's eye has no focal point. Information arrives as a wall, not a sequence.

**Adjustment:** Discovery event → UI entrance mapping:

| Event | Stagger Delay | Animation Spec |
|---|---|---|
| EndpointDiscovered | 0ms | StatusPill color transition 300ms, ease-in-out |
| RuntimeFound | 150ms | Opacity 0→1, 400ms, ease-out |
| AgentAppeared | 300ms | Scale 0.95→1.0, 200ms, spring(stiffness: 300, damping: 25) + glow pulse once |
| StationCreated | 450ms | Opacity 0→1, 400ms + slideUp 8dp, ease-out |

Total cascade: ~850ms. Each new element arrives as the previous one settles. Choreographed, not simultaneous.

**Impact:** `DiscoveryCoordinator.discoveryFlow()` collected by ViewModel. ViewModel emits UI events with built-in delay? Or Compose handles stagger via `LaunchedEffect` with `delay()`. Implementation detail — but the timing MUST be specified.

### Adjustment 5: Fallback Empty State Needs Three Specific Actions

**Original:** Generic empty state — "No systems detected" + "Add Endpoint" button.

**Discovered:** A user with no endpoints has three legitimate paths, not one. The empty state must present all three without preference (no primary CTA — vAIb doesn't push):

**Adjustment:** Empty state design:
```
[Visual continues — 24 cyan bars moving, black background]

"No operational systems detected"      // 16sp, TextSecondary, centered
                                       // NOT shown by default — appears on tap of status pill
                                       // Default: no text, just visualizer

[Add Endpoint]                         // PrimaryNeonCyan, 14sp, bordered pill
[Retry Discovery]                      // TextSecondary, 14sp, minimal button
[Enter Demo Mode]                      // AccentMagenta, 14sp, bordered pill
```

All three buttons are equal visual weight. No button is "primary." The user chooses their path. The app does not push.

**Impact:** New `EmptyStateFallback` composable. Three callback lambdas. No default action. Equal visual treatment for all three paths.

### Summary of Adjustments

| # | Adjustment | Architecture Impact | UI Impact |
|---|---|---|---|
| 1 | Per-entity DEMO badge | `ProvenanceMarker` already supports this | `ProvenanceIndicator` inside every card |
| 2 | CACHED timestamp | `ProvenanceMarker.discoveredAt` must be non-null for CACHED | Relative time formatting in `ProvenanceIndicator` |
| 3 | No OperationalState for cached | None — already in `AgentPresence` model | Conditional rendering in `AgentDetailCard` |
| 4 | Staggered entrance timing | None — UI concern | `LaunchedEffect` + delay in discovery event handlers |
| 5 | Three empty-state actions | None — UI concern | New `EmptyStateFallback` composable |

**All five adjustments are UI-layer concerns. No changes to core discovery models, coordinator, or adapter interfaces required.**

---

## 13. RECOMMENDATION

### Is Discovery Phase 1 Ready for Implementation?

**YES** — with the 5 adjustments above incorporated into `VAIB_DISCOVERY_ARCHITECTURE.md`.

### Validation Summary

| Pillar | Verdict |
|---|---|
| Calmness | **PASS** — All 9 scenarios pass calmness check. App whispers across all states. |
| Trust | **PASS** — 7 hard trust rules cover all scenarios. DEMO badges, provenance grouping, atmosphere isolation. |
| Operational Silence | **PASS** — Endpoint offline scenario validates thinning. 5s transition, music unaffected. |
| Authenticity > Effects | **PASS** — Real entities before atmosphere. DEMO entities don't drive particles. Hard rule. |
| Music Sovereignty | **PASS** — Music playback never stops due to discovery state. Audio is primary. |
| Empty State Design | **PASS** — 95% black, visualizer as lifeline, no fake data, three clear paths. |
| Discovery Failure UX | **PASS** — Amber not red, inline errors, partial success shown, no panic UI. |
| Native vs Drift | **PASS** — Clear badges (cyan vs magenta), separate sections, different atmosphere influence. |
| No Dashboard | **PASS** — 12sp muted telemetry. No graphs, tables, or metrics panels. Music app, not admin tool. |

### Before Implementation Begins

1. **Incorporate 5 adjustments** into `VAIB_DISCOVERY_ARCHITECTURE.md` (per-entity badges, cached timestamp, no cached state, stagger timing, three empty-state actions)
2. **Confirm build verification** from Phase 0.5 passes — clean build, no regressions
3. **Explicit Supreme Commander approval** — this document validates the UX. Architecture validates the models. Both must be approved before code.

### Implementation Order (Post-Approval)

1. Core models: `EndpointNode`, `RuntimeSource`, `AgentPresence`, `StationDescriptor`, `ProvenanceMarker`, `DiscoveryEvent`, `DiscoverySnapshot`
2. `AppOperatingMode` + `AppModeDecider`
3. `DiscoveryCoordinator` interface + `StaticConfigDiscoveryAdapter` (Strategy A)
4. Decouple `AppState` from `DemoData` — init empty, load demo only in DEMO mode
5. `ProvenanceIndicator` composable + badge integration into all cards
6. Empty state redesign (`EmptyStateFallback`)
7. Staggered entrance animations for discovery events
8. End-to-end test: FALLBACK → add endpoint → discovery cascade → LIVE mode

### Do NOT Begin Implementation Until Explicit Approval

This is a planning document. It validates experience, not code. The architecture document validates models, not implementation. Both documents must be reviewed and approved before any Kotlin files are created.

**The discovery system is the foundation of everything that comes after.** Native stations. Agent presence. Atmosphere. Every subsequent feature depends on real entities being discoverable, trustable, and calm. Getting this foundation right is more important than getting it fast.

> *vAIb whispers. Even when it's empty. Even when it's full. Especially when it's discovering.*

---

*Document generated: UX validation pass complete.*
*9 scenarios evaluated. 5 adjustments discovered. 0 blockers. 0 calmness failures.*
*Status: READY FOR APPROVAL.*

---
