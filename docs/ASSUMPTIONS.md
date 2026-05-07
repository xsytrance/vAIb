# Assumptions Log

> All assumptions made during the overnight documentation build. PRIME should review these and challenge any that are wrong.

## Technology Stack

| # | Assumption | Rationale | Risk if Wrong |
|---|-----------|-----------|---------------|
| 1 | **Kotlin + Jetpack Compose** for Android | Modern, declarative, Google-recommended | Changing to Flutter/React Native requires full rewrite |
| 2 | **MVVM-lite** pattern (no Room, no UseCases) | Backend is the domain layer, no local DB needed | If we add local persistence later, may need Room |
| 3 | **Min SDK 28** (Android 9) | S24 Ultra runs Android 14, SDK 28 covers 95%+ devices | May exclude some older test devices |
| 4 | **Material 3** as design base | Latest Material Design, good defaults | Theme override work may be significant |
| 5 | **StateFlow + Compose** for state | Kotlin-idiomatic, lifecycle-aware | LiveData could also work, but StateFlow is newer |

## Backend

| # | Assumption | Rationale | Risk if Wrong |
|---|-----------|-----------|---------------|
| 6 | **Node.js built-ins only** (no npm deps) | Zero-dependency backend is portable | Adding Express or similar would simplify routing |
| 7 | **Single JSON file** for persistence | Human-readable, trivial to debug | Will not scale beyond ~10K tracks |
| 8 | **HTTP polling** (not WebSocket) | Simpler, works over Tailscale natively | 3s latency for updates; real-time features limited |
| 9 | **No authentication** | Personal device app, LAN-only | If exposed to internet, needs auth ASAP |
| 10 | **No HTTPS** | LAN/Tailscale only, cert management pain | Any public exposure requires HTTPS |

## Data & Content

| # | Assumption | Rationale | Risk if Wrong |
|---|-----------|-----------|---------------|
| 11 | **No copyrighted music** | All tracks are fake metadata (titles, artists, tags) | Adding real audio requires licensing or personal library |
| 12 | **Token estimation: `ceil(text.length / 4)`** | Rough approximation of GPT tokenization | Real tokenization uses BPE; this is good enough for UI |
| 13 | **800 tokens per agent per session** | Prevents runaway generation, allows ~50-80 comments | May be too restrictive or too generous |
| 14 | **Max 280 chars per comment** | Tweet-length, readable on mobile | Some agents may need longer analysis comments |
| 15 | **Max 3 emojis per comment** | Prevents emoji spam | Subjective constraint |

## Hardware

| # | Assumption | Rationale | Risk if Wrong |
|---|-----------|-----------|---------------|
| 16 | **S24 Ultra as primary target** | 6.8" AMOLED, flagship specs | UI may feel sparse on smaller phones |
| 17 | **Portrait-first, landscape bonus** | Phone default is portrait | Landscape DJ Deck may never be used |
| 18 | **Bluetooth is primary audio output** | S24 Ultra + BT speakers/headphones/car | Wired USB-C or speaker playback also works |
| 19 | **Bluetooth detection is mocked for MVP** | Real BT detection needs `BLUETOOTH_CONNECT` permission | Mocked stats are shown until Phase 2 |

## Features

| # | Assumption | Rationale | Risk if Wrong |
|---|-----------|-----------|---------------|
| 20 | **Real audio playback not in MVP** | ExoPlayer integration is Phase 2 | App is a "remote control" without audio for now |
| 21 | **7 hardcoded agents** | Agents are personalities, not user data | Users cannot create custom agents |
| 22 | **5 hardcoded stations** | Playlists map 1:1 to stations | Easy to add more later |
| 23 | **Agent reactions are human-triggered** | No background agent AI running | Real agent autonomy requires Hermes/OpenClaw (Phase 6) |
| 24 | **Stats are locally stored** (SharedPreferences) | No backend stats API yet | Stats lost on app reinstall |
| 25 | **Landscape mode uses simple layout first** | Full DJ Deck is Phase 5 | Stretched portrait is acceptable for Phase 1 |

## Web Beta

| # | Assumption | Rationale | Risk if Wrong |
|---|-----------|-----------|---------------|
| 26 | **Web beta is read-only reference** | Do not modify `src/App.jsx` or web files | If web beta needs updates, changes may conflict |
| 27 | **Vite dev server on port 4013** | Existing configuration | Port conflict if another service uses 4013 |
| 28 | **Web beta proxies `/api/backend` to `:4014`** | Existing Vite config | Android calls API directly, no proxy needed |

## Development

| # | Assumption | Rationale | Risk if Wrong |
|---|-----------|-----------|---------------|
| 29 | **Gradle wrapper will work** | Standard Android project setup | May need Android SDK/NDK installation |
| 30 | **No ProGuard/R8 in debug** | Faster builds, easier debugging | Release builds will need minification config |
| 31 | **Network cleartext allowed** | `network_security_config.xml` permits HTTP | Must restrict to specific IPs for any release |
| 32 | **No dependency injection framework** | Koin/Hilt add complexity | Manual ViewModel creation is fine for MVP |

## Cross-Cutting

| # | Assumption | Impact |
|---|-----------|--------|
| 33 | All agents speak English | UI text is English; agent comments are English |
| 34 | Dark theme only | No light theme code paths, ever |
| 35 | App works offline | Demo data fallback is always available |
| 36 | No push notifications | Polling only; no FCM integration |
| 37 | No background execution | App polls only when foregrounded |
| 38 | No Wear OS / TV support | Phone-only for now |
| 39 | No tablet-specific layout | Uses phone layout on tablets until Phase 5 |
| 40 | Single user (personal device) | No multi-user support |

## Validated Assumptions (Confirmed During Build)

These were verified against the actual codebase:

| # | Assumption | Validation |
|---|-----------|------------|
| V1 | Backend binds to `0.0.0.0` | Confirmed: `server.listen(port, '0.0.0.0', ...)` in `api.mjs:248` |
| V2 | Backend uses port 4014 | Confirmed: default `VAIB_PORT || 4014` in `api.mjs:5` |
| V3 | CORS is wide open | Confirmed: `Access-Control-Allow-Origin: *` in `api.mjs:10` |
| V4 | Only Saito agent exists in backend | Confirmed: `agents: { saito: {...} }` in `store.mjs:15` and `state.json` |
| V5 | 5 tracks in library | Confirmed: 5 track objects in `store.mjs:40` and `state.json` |
| V6 | 2 playlists exist | Confirmed: `playlist-saito-core` and `playlist-night-shift` |
| V7 | Web beta uses React 19 | Confirmed: `package.json` dependencies |
| V8 | Zero backend dependencies | Confirmed: `package.json` only has React + Vite dev deps |

## Assumptions PRIME Should Challenge

1. **Is minSdk 28 too high?** Check if any target devices run Android < 9.
2. **Is HTTP polling sufficient?** Should we add WebSocket for faster updates?
3. **Is 3s poll interval correct?** Too frequent = battery drain; too slow = stale UI.
4. **Should we add Room DB?** For offline caching, stats persistence, etc.
5. **Should agents run on-device?** Currently backend-only; on-device LLM is a future option.
6. **Is the 7-agent scope right?** Could start with 3 agents and expand later.
7. **Should we use Hilt for DI?** Manual ViewModel creation gets messy at scale.
