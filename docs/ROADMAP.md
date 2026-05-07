# vAIb Development Roadmap

## Phase 0: Repo Stabilization ✅ DONE

**Goal:** Preserve the web beta and backend API, establish foundation.

- [x] Web beta (Vite/React) running on port 4013
- [x] Backend API (Node.js) running on port 4014
- [x] JSON state persistence in `data/state.json`
- [x] Saito agent profile with full taste data
- [x] 5-track library with metadata
- [x] 2 playlists (stations)
- [x] Event log and notification system
- [x] CORS enabled, binds to 0.0.0.0
- [x] Vite proxy for web beta
- [x] All docs written (this file + 14 others)

**Deliverables:** Working backend + reference UI + documentation

---

## Phase 1: Android Cockpit MVP 🔄 IN PROGRESS

**Goal:** Build the core Android app with all primary screens.

### UI Framework
- [ ] Jetpack Compose project scaffold
- [ ] Dark AMOLED theme (`VaibTheme`)
- [ ] Color constants (neon cyan, gold, magenta)
- [ ] Typography scale
- [ ] Material3 component base

### Navigation
- [ ] Bottom nav with 5 tabs: Home, Stations, Queue, EQ, More
- [ ] More overflow: Stats, Agents, Settings
- [ ] Screen routing with `NavHost`

### Backend Integration
- [ ] `ApiClient` — HTTP GET/POST
- [ ] Polling mechanism (3s interval)
- [ ] `VaibRepository` — state management
- [ ] Demo data fallback (`DemoData.kt`)
- [ ] Offline indicator
- [ ] Settings screen for backend URL

### Screens
- [ ] `HomeScreen` — Now playing + controls
- [ ] `StationsScreen` — 5-station grid
- [ ] `QueueScreen` — Upcoming tracks
- [ ] `EQScreen` — 10-band equalizer UI
- [ ] `StatsScreen` — Listening dashboards
- [ ] `AgentsScreen` — Agent roster
- [ ] `SettingsScreen` — Config + about

### Components
- [ ] `VaibCard` — Container card
- [ ] `AgentChip` — Agent avatar + name
- [ ] `StationCard` — Station tile
- [ ] `TrackCard` — Track row
- [ ] `StatusPill` — Online/offline badge
- [ ] `VisualizerBars` — Animated bars

### Data Layer
- [ ] `AppState` data class
- [ ] `Agent`, `Track`, `Station`, `Reaction` models
- [ ] `DemoData` with full seed data
- [ ] `VaibViewModel` with StateFlow

**Target:** Debug APK that installs on S24 Ultra, shows live data from backend.

---

## Phase 2: Sound and EQ

**Goal:** Real audio playback with equalizer and Bluetooth profiles.

### Audio Playback
- [ ] Media3 / ExoPlayer integration
- [ ] Background playback support
- [ ] Lock screen media controls
- [ ] Notification controls
- [ ] Audio session ID for effects

### Equalizer
- [ ] `android.media.audiofx.Equalizer` integration
- [ ] All 8 presets implemented
- [ ] Preset switching
- [ ] Custom band adjustment
- [ ] Preset persistence

### Audio Effects
- [ ] BassBoost effect
- [ ] Virtualizer (stereo widening)
- [ ] LoudnessEnhancer
- [ ] Effect enable/disable toggles

### Bluetooth
- [ ] Bluetooth A2DP detection (real)
- [ ] Auto-switch to "Bluetooth Punch" preset
- [ ] Per-device EQ profile storage
- [ ] BT device name display

### Media Session
- [ ] MediaSession integration
- [ ] Lock screen artwork
- [ ] Headphone button controls
- [ ] Audio focus handling

**Target:** Play music through Bluetooth with EQ adjustment.

---

## Phase 3: Agent Taste Engine

**Goal:** Full agent personality and reaction system.

### Agent Expansion
- [ ] All 7 agent profiles in data layer
- [ ] Agent avatar generation (initials + color)
- [ ] Agent status tracking (online/offline)
- [ ] Agent mood transitions

### Reaction System
- [ ] Like / Dislike / Analyze / Rate actions
- [ ] Comment generation (hardcoded responses per agent)
- [ ] Emoji constraints (max 3)
- [ ] Character limit (280)

### Token Budget
- [ ] Per-agent token tracking
- [ ] Token estimation (`ceil(length/4)`)
- [ ] Budget depletion handling
- [ ] Token leaderboard

### Taste Profiles
- [ ] Genre preference calculation
- [ ] BPM drift tracking
- [ ] Energy calibration
- [ ] Taste evolution over time

### Agent-Station Mapping
- [ ] Each agent assigned to primary station
- [ ] Station personality from agent
- [ ] Agent-specific EQ recommendations

**Target:** Agents react to tracks with personality-constrained comments.

---

## Phase 4: Stats Obsession Mode

**Goal:** Comprehensive analytics dashboards.

### Human Stats
- [ ] Total listening time tracking
- [ ] Session counting
- [ ] Favorite station detection
- [ ] Top genres / moods
- [ ] Peak listening hour
- [ ] Listening streaks

### Agent Stats
- [ ] Reaction counting per agent
- [ ] Average ratings
- [ ] Token consumption
- [ ] Emoji usage stats
- [ ] Boredom trends

### Station Stats
- [ ] Play counts per station
- [ ] Like ratios
- [ ] Most active hours
- [ ] Agent activity per station

### Leaderboards
- [ ] Agent activity ranking
- [ ] Station popularity
- [ ] Track love ranking
- [ ] Token spend ranking

### Storage
- [ ] SharedPreferences for stats
- [ ] JSON serialization
- [ ] Daily aggregation

**Target:** Stats screen with real data and leaderboards.

---

## Phase 5: Landscape DJ Deck

**Goal:** Full landscape mode as DJ command center.

### Layout
- [ ] Orientation detection
- [ ] Three-panel layout (left/center/right)
- [ ] Station list in left panel
- [ ] Now playing + visualizer in center
- [ ] Queue + reactions + stats in right

### Components
- [ ] Agent booth (mini profiles)
- [ ] Live reaction feed
- [ ] EQ mini-strip
- [ ] Mini stat tiles

### Car Mode
- [ ] Lock to landscape setting
- [ ] Large touch targets
- [ ] Simplified controls
- [ ] Auto-launch on BT connect

**Target:** Rotate phone → full DJ Deck layout.

---

## Phase 6: Agent Network

**Goal:** Connect to external agent systems.

### Hermes / OpenClaw Integration
- [ ] Message bus connection
- [ ] Agent event streaming
- [ ] Cross-agent communication

### Telegram Bridge
- [ ] Bot integration for notifications
- [ ] Remote control commands
- [ ] Status broadcasts

### PRIME Backend
- [ ] Multi-agent backend API
- [ ] Agent state persistence
- [ ] Remote agent management

### Tailscale
- [ ] Mesh network connectivity
- [ ] Secure remote access
- [ ] Cross-device agent presence

**Target:** Agents communicate across the network, not just locally.

---

## Phase 7: Aurex / Procedural Future

**Goal:** Generated music and reactive visuals.

### Procedural Music
- [ ] Algorithmic track generation
- [ ] BPM-aware composition
- [ ] Genre-morphing engine
- [ ] Agent taste-driven generation

### Reactive Visuals
- [ ] Audio-reactive shaders
- [ ] Agent mood visualization
- [ ] Station-specific visual themes
- [ ] Full-screen visualizer mode

### Generated Stations
- [ ] AI-generated station concepts
- [ ] Dynamic playlist creation
- [ ] Real-time station mutation
- [ ] Collaborative agent stations

### Prime Pulse Signal Engine
- [ ] Signal-based music curation
- [ ] Cross-platform agent presence
- [ ] Universal event language
- [ ] Agent lifestyle OS integration

**Target:** vAIb generates its own music and evolves its stations.

---

## Phase Summary

| Phase | Name | Duration (est) | Key Deliverable |
|-------|------|----------------|-----------------|
| 0 | Stabilization | Done | Backend + docs |
| 1 | Android MVP | 2-3 days | Debug APK on S24 |
| 2 | Sound + EQ | 3-4 days | Audio + Bluetooth |
| 3 | Agent Taste | 2-3 days | Reactions + tokens |
| 4 | Stats | 2 days | Dashboards |
| 5 | Landscape | 2 days | DJ Deck mode |
| 6 | Agent Network | 1 week | External integration |
| 7 | Aurex | Future | Procedural generation |

## Current Status

**Phase 1 is IN PROGRESS.** PRIME should focus on:
1. Project scaffold and theme
2. ApiClient + Repository + ViewModel
3. Home screen + bottom navigation
4. Settings screen for backend URL
5. Debug APK build and install on S24 Ultra
