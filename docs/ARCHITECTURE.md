# vAIb System Architecture

## Overview

vAIb is an Android-first, AI-native music cockpit. Seven AI agents host radio stations, queue tracks, and react to music in real time. Humans tune in from an Android app that serves as the command deck for the entire agent network.

The system is split into four layers:

1. **Android App** — Jetpack Compose UI, the human-facing cockpit
2. **Backend API** — Node.js HTTP server, the agent brain and state manager
3. **JSON Data Layer** — Persistent state files, the memory layer
4. **Web Beta** — Vite/React reference UI, preserved for design validation

## System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        HUMAN LAYER                          │
│  ┌────────────────────────┐    ┌──────────────────────────┐ │
│  │   Android App (S24)    │    │   Web Beta (Vite/React)  │ │
│  │   Jetpack Compose      │    │   Port 4013 — Reference  │ │
│  │   Portrait + Landscape │    │   Preserved, read-only   │ │
│  └───────────┬────────────┘    └──────────────────────────┘ │
└──────────────┼──────────────────────────────────────────────┘
               │ HTTP GET/POST (JSON)
               │ Poll every 3-5s
               ▼
┌─────────────────────────────────────────────────────────────┐
│                      BACKEND API LAYER                      │
│                   Node.js (no deps)                          │
│                   Port 4014, binds 0.0.0.0                   │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │  /state      │  │  /action     │  │  /health           │ │
│  │  GET — full  │  │  POST — do   │  │  GET — check       │ │
│  │  derived     │  │  something   │  │  alive             │ │
│  └──────────────┘  └──────────────┘  └────────────────────┘ │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  store.mjs — JSON read/write, state shape enforcement  │ │
│  │  api.mjs   — HTTP routing, action dispatch, derive()   │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────┬──────────────────────────────────────────────┘
               │ fs.readFile / fs.writeFile
               ▼
┌─────────────────────────────────────────────────────────────┐
│                      DATA LAYER                             │
│              data/state.json — single source of truth        │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │  agents      │  │  library     │  │  playlists         │ │
│  │  (7 agents)  │  │  (tracks)    │  │  (stations)        │ │
│  └──────────────┘  └──────────────┘  └────────────────────┘ │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │  events      │  │notifications │  │  preferences       │ │
│  │  (activity)  │  │  (toasts)    │  │  (human toggles)   │ │
│  └──────────────┘  └──────────────┘  └────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Component Descriptions

### Android App (`android/vAIbAndroid/`)
- **Language**: Kotlin
- **UI Framework**: Jetpack Compose
- **Architecture**: MVVM-lite with ViewModel + StateFlow
- **Min SDK**: 28 (Android 9)
- **Target**: Samsung Galaxy S24 Ultra
- **Orientation**: Portrait primary, landscape DJ Deck mode
- **Theme**: Dark AMOLED only, neon accents

### Backend API (`server/`)
- **Runtime**: Node.js, zero external dependencies
- **Server**: `node:http` built-in module
- **Port**: 4014 (configurable via `VAIB_PORT`)
- **Bind**: `0.0.0.0` for LAN + Tailscale access
- **CORS**: `*` allowed, all methods exposed
- **State**: Single JSON file at `data/state.json`

### Data Layer (`data/state.json`)
- Single JSON file, human-readable
- Auto-created with seed data if missing
- Atomic write on every action
- Contains: agents, library, playlists, notifications, events, preferences

### Web Beta (`src/`, `index.html`, Vite config)
- Preserved as reference implementation
- Shows how the UI should feel
- Read-only — do not modify
- Runs on port 4013 via Vite dev server
- Proxies `/api/backend/*` to the API server

## Communication Flow

```
┌──────────┐     GET /state          ┌──────────┐
│ Android  │ ──────────────────────> │ Backend  │
│  App     │ <──────────────────────│   API    │
│          │     200 + full state    │          │
│          │                         │          │
│          │     POST /action        │          │
│          │ ──────────────────────> │          │
│          │ <──────────────────────│          │
│          │     200 + updated state │          │
│          │                         │          │
│          │     GET /health         │          │
│          │ ──────────────────────> │          │
│          │ <──────────────────────│          │
│          │     200 {ok, service}   │          │
└──────────┘                         └──────────┘
```

### Polling Strategy
- Android app polls `GET /state` every 3-5 seconds
- On user action, immediately `POST /action`, then refresh state
- If backend unreachable, show connection status indicator
- Fall back to demo data baked into the app when offline

## Data Flow Diagram

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  data/      │───>│  store.mjs  │───>│  api.mjs    │───>│  Android    │
│ state.json  │    │  read/write │    │  derive()   │    │  Compose UI │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
     ▲                                                        │
     │                                                        │
     └────────────────────────────────────────────────────────┘
                    POST /action (mutate + write)
```

The `derive()` function in `api.mjs` enriches raw state into runtime state:
- Resolves `currentTrackId` → full track object
- Resolves `playlistId` → full playlist + track list
- Builds `favorites` and `skipped` arrays from track IDs
- Adds `unreadNotifications` count
- Computes `tasteVector` (5-dimension taste profile)
- Generates `autonomyHooks` (agent behavior rules)

## Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Android App | Kotlin | 1.9+ | Primary language |
| Android App | Jetpack Compose | BOM 2024.02+ | UI framework |
| Android App | Material 3 | Latest | Component base |
| Android App | ViewModel + StateFlow | Latest | State management |
| Backend API | Node.js | 18+ | Server runtime |
| Backend API | Built-in `http` | — | HTTP server |
| Data Layer | JSON file | — | Persistence |
| Web Beta | Vite + React | 19+ | Reference UI |
| Dev Server | Vite | 8+ | Web dev + proxy |

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Single JSON file | `data/state.json` | Simplicity, human-readable, no DB setup |
| Zero backend deps | Node.js built-ins only | No `npm install` fragility, portable |
| Polling over WebSocket | HTTP GET every 3-5s | Simpler, works over Tailscale, no connection mgmt |
| MVVM-lite | ViewModel + StateFlow | Not full MVVM — no Room DB, no complex UseCases |
| Demo data fallback | Hardcoded data class | App works offline, good for testing |
| Dark AMOLED only | No light theme | vAIb is a cockpit, not a lifestyle app |
| 7 agents hardcoded | No dynamic creation | Agents are personalities, not user data |
| 5 stations | Playlist = station | Simple mapping, extensible later |
| Bluetooth-first EQ | Design for A2DP | S24 Ultra + car speakers / headphones |
| Portrait primary | Phone is default | Landscape is bonus DJ Deck mode |

## File Map

```
vAIb/
├── android/vAIbAndroid/          # Android app (Kotlin + Compose)
│   ├── app/src/main/java/com/xsytrance/vaib/
│   │   ├── MainActivity.kt
│   │   ├── ui/
│   │   │   ├── theme/
│   │   │   │   ├── Color.kt
│   │   │   │   ├── Type.kt
│   │   │   │   └── Theme.kt
│   │   │   ├── components/
│   │   │   │   ├── VaibCard.kt
│   │   │   │   ├── AgentChip.kt
│   │   │   │   ├── StationCard.kt
│   │   │   │   ├── TrackCard.kt
│   │   │   │   ├── StatusPill.kt
│   │   │   │   ├── EqualizerBand.kt
│   │   │   │   ├── VisualizerBars.kt
│   │   │   │   └── ReactionBadge.kt
│   │   │   ├── screens/
│   │   │   │   ├── HomeScreen.kt
│   │   │   │   ├── StationsScreen.kt
│   │   │   │   ├── QueueScreen.kt
│   │   │   │   ├── EQScreen.kt
│   │   │   │   ├── StatsScreen.kt
│   │   │   │   ├── AgentsScreen.kt
│   │   │   │   └── SettingsScreen.kt
│   │   │   └── navigation/
│   │   │       └── VaibNavHost.kt
│   │   ├── data/
│   │   │   ├── model/
│   │   │   │   ├── Agent.kt
│   │   │   │   ├── Track.kt
│   │   │   │   ├── Station.kt
│   │   │   │   ├── Reaction.kt
│   │   │   │   └── AppState.kt
│   │   │   ├── DemoData.kt
│   │   │   └── VaibRepository.kt
│   │   ├── network/
│   │   │   └── ApiClient.kt
│   │   └── viewmodel/
│   │       └── VaibViewModel.kt
│   └── ...
├── server/
│   ├── api.mjs                    # HTTP server, routes, derive()
│   └── store.mjs                  # JSON read/write, base state
├── data/
│   └── state.json                 # Persistent state
├── src/
│   ├── App.jsx                    # Web beta (REFERENCE ONLY)
│   ├── main.jsx                   # Web entry point
│   └── styles.css                 # Web styles
├── docs/                          # This documentation
├── index.html                     # Web beta HTML
├── package.json                   # Node deps (Vite + React)
└── vite.config.js                 # Vite proxy config
```

## Security Notes

- Backend uses HTTP, not HTTPS (local network only)
- CORS is wide open (`*`) for LAN/Tailscale flexibility
- No authentication yet — this is a personal device app
- No sensitive data — all tracks are fake metadata
- Android `network_security_config` allows cleartext for local IPs
