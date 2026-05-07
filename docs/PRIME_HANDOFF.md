# PRIME Handoff Document

> **Written by:** SCOUT (overnight build agent)  
> **For:** PRIME (morning continuation agent)  
> **Status:** Phase 1 (Android MVP) is ready to begin

---

## 1. How to Clone the Repo

The repo is already on the machine at `/mnt/agents/output/vAIb/`. If you need a fresh clone:

```bash
git clone <repo-url> /mnt/agents/output/vAIb
cd /mnt/agents/output/vAIb
```

## 2. How to Run the Backend

```bash
cd /mnt/agents/output/vAIb
node server/api.mjs
```

Expected output:
```
vAIb API listening on 4014
```

The backend **already binds to `0.0.0.0`** (set in `server/api.mjs` line 248). This means it's accessible from:
- The same machine (localhost)
- LAN (any device on same WiFi)
- Tailscale (any device in the tailnet)

### Backend File Map
| File | Purpose |
|------|---------|
| `server/api.mjs` | HTTP server, routes, `derive()` function |
| `server/store.mjs` | JSON read/write, `baseState` seed data |
| `data/state.json` | Persistent state (auto-created) |

### Environment Variables
| Variable | Default | Purpose |
|----------|---------|---------|
| `VAIB_PORT` | `4014` | HTTP server port |

### Quick Backend Test
```bash
# Health check
curl http://localhost:4014/health

# Should return: {"ok":true,"service":"vaib-api","port":4014}

# Full state
curl http://localhost:4014/state | head -50
```

## 3. How to Find PRIME IP

Run ONE of these on the machine hosting the backend:

```bash
# All IPs (simplest)
hostname -I

# Detailed
ip addr

# Tailscale IP (if using Tailscale)
tailscale ip -4
```

Use the LAN IP (e.g., `192.168.1.xxx`) for same-network testing.  
Use the Tailscale IP (e.g., `100.x.x.x`) for remote testing.

## 4. How to Set Android Backend URL

The Android app needs to know where the backend is. Two ways:

### Option A: In Code (for quick testing)
Edit the default URL in `ApiClient.kt` or wherever the base URL is defined:
```kotlin
// For emulator testing:
val DEFAULT_BASE_URL = "http://10.0.2.2:4014"

// For physical device (replace with actual IP):
val DEFAULT_BASE_URL = "http://192.168.1.xxx:4014"
```

### Option B: Settings Screen (for user flexibility)
Build the Settings screen with a backend URL input:
- Default: `http://10.0.2.2:4014`
- User can edit to their PRIME IP
- Store in `SharedPreferences` key: `backend_url`
- "Test Connection" button calls GET /health

## 5. How to Build Debug APK

```bash
cd /mnt/agents/output/vAIb/android/vAIbAndroid
./gradlew assembleDebug
```

**First build will be slow** — Gradle downloads dependencies.

Output location:
```
app/build/outputs/apk/debug/app-debug.apk
```

### Build Requirements
- Android SDK (API 28+)
- Kotlin 1.9+
- Gradle (via wrapper)
- JDK 17+

### If Gradle Wrapper Issues
```bash
# Regenerate wrapper if needed
cd android/vAIbAndroid
gradle wrapper --gradle-version 8.4
```

## 6. How to Install APK via ADB

### Prerequisites
- Enable Developer Options on S24 Ultra
- Enable USB Debugging
- Connect via USB cable

```bash
# Verify device is connected
adb devices
# Should show: xxxxxxxx    device

# Install (replace path if needed)
adb install -r /mnt/agents/output/vAIb/android/vAIbAndroid/app/build/outputs/apk/debug/app-debug.apk

# Launch app
adb shell am start -n com.xsytrance.vaib/.MainActivity

# View logs
adb logcat -s "VaibApp:D" "System.err:W" "AndroidRuntime:E"
```

### WiFi ADB (no cable)
```bash
# Connect over WiFi (must be on same network)
adb tcpip 5555
adb connect 192.168.1.xxx:5555  # S24 Ultra IP
adb devices
adb install -r app-debug.apk
```

## 7. How to Test Over Tailscale

1. **Install Tailscale** on both PRIME machine and S24 Ultra
2. **Get Tailscale IP**: `tailscale ip -4` on PRIME machine
3. **Start backend**: `node server/api.mjs` (already binds 0.0.0.0)
4. **Set Android URL**: `http://<TAILSCALE_IP>:4014` in Settings
5. **Verify**: Green connection dot in app

Tailscale handles NAT traversal — no port forwarding needed.

## 8. How to Test Bluetooth

### Physical Device Required
- Emulator cannot test Bluetooth
- Use S24 Ultra or any Android device with BT

### Test Steps
```bash
# Verify BT is on
adb shell settings get global bluetooth_on  # should return 1

# Pair a Bluetooth audio device (speaker/headphones)
# through Android Settings > Bluetooth

# In the app, mock BT state is used for MVP:
# EQ screen shows "Bluetooth Punch" as default preset
# Stats screen shows mocked BT usage (78.5%)
```

### Real BT Detection (future)
```kotlin
val bluetoothAdapter = BluetoothAdapter.getDefaultAdapter()
val isA2dpConnected = bluetoothAdapter?.getProfileConnectionState(BluetoothProfile.A2DP) == 
    BluetoothProfile.STATE_CONNECTED
```

## 9. Known Blockers and Workarounds

| Blocker | Workaround | Resolution |
|---------|-----------|------------|
| No Android project scaffold | Must create `android/vAIbAndroid/` from scratch | Phase 1 task |
| No real audio files | All tracks are fake metadata | Phase 2 adds ExoPlayer + real audio |
| Single agent (Saito) | Hardcode other 6 agents in app | Phase 3 adds multi-agent backend |
| Bluetooth is mocked | Use hardcoded BT stats | Phase 2 adds real BT detection |
| No album art | Use gradient orbs / initials | Phase 3+ adds generated art |
| Stats not tracked | Show mock stats from design docs | Phase 4 adds real tracking |
| Landscape not implemented | Portrait only for MVP | Phase 5 adds DJ Deck |
| No lock screen controls | Not applicable without audio | Phase 2 adds MediaSession |
| No background playback | Not applicable without audio | Phase 2 adds ExoPlayer service |

## 10. Recommended Next Steps (Prioritized)

### P0: Get Hello World Running
1. `cd /mnt/agents/output/vAIb/android`
2. Create Android project with `com.xsytrance.vaib` package
3. Verify `MainActivity.kt` launches with "Hello vAIb"
4. Build debug APK: `./gradlew assembleDebug`
5. Install on S24 Ultra: `adb install -r app-debug.apk`

### P1: Theme + First Screen
6. Implement `Color.kt`, `Type.kt`, `Theme.kt` (dark AMOLED)
7. Build `HomeScreen` with Now Playing card
8. Add bottom navigation scaffold
9. Connect to backend with `ApiClient`
10. Show live track data from `GET /state`

### P2: Core Screens
11. Build `StationsScreen` with 5-station grid
12. Build `QueueScreen` with track list
13. Build `EQScreen` with 10-band sliders
14. Add `SettingsScreen` for backend URL
15. Implement polling in `VaibViewModel`

### P3: Offline + Polish
16. Implement `DemoData.kt` fallback
17. Add offline indicator banner
18. Add connection status dot in app bar
19. Test offline → online transition
20. Polish animations and spacing

### P4: Build + Ship
21. Final debug build: `./gradlew assembleDebug`
22. Install on S24 Ultra
23. Test over LAN (set real IP in Settings)
24. Test over Tailscale
25. Verify all screens load with live data

## Quick Reference: File Locations

```
/mnt/agents/output/vAIb/
├── server/api.mjs              # Backend entry point
├── server/store.mjs            # State management
├── data/state.json             # Persistent data
├── src/App.jsx                 # Web beta (REFERENCE ONLY)
├── docs/                       # All documentation
│   ├── ARCHITECTURE.md
│   ├── ANDROID_ARCHITECTURE.md
│   ├── DESIGN_SYSTEM.md
│   ├── AUDIO_EQ_PLAN.md
│   ├── AGENT_TASTE_SYSTEM.md
│   ├── STATS_SYSTEM.md
│   ├── LANDSCAPE_DJ_DECK.md
│   ├── API.md
│   ├── INTEGRATION.md
│   ├── ROADMAP.md
│   ├── PRIME_HANDOFF.md       # This file
│   ├── S24_ULTRA_TEST_PLAN.md
│   ├── ASSUMPTIONS.md
│   └── QA_REPORT.md
└── README.md                   # Update this
```

## Emergency Contacts

If something is broken and this doc doesn't help:
1. Check `docs/API.md` for all backend endpoints
2. Check `docs/INTEGRATION.md` for Android connection issues
3. Check `docs/ASSUMPTIONS.md` for what was decided
4. Read `server/api.mjs` — it's 251 lines, very readable
5. Read `server/store.mjs` — base state shape is defined there

Good luck, PRIME. The foundation is solid. Build the cockpit. 🚀
