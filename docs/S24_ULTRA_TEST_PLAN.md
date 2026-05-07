# Samsung Galaxy S24 Ultra Test Plan

## Device Specs Reference

| Spec | Value |
|------|-------|
| Screen | 6.8" Dynamic AMOLED 2X, 3120×1440 |
| Refresh | 120Hz adaptive |
| OS | Android 14+ (One UI 6+) |
| RAM | 12GB |
| Storage | 256GB+ |
| Bluetooth | 5.3 (A2DP, LE) |
| WiFi | Wi-Fi 7 |
| CPU | Snapdragon 8 Gen 3 |

## Test Modes

### Mode 1: Emulator (Development)
```bash
# Start emulator with API 34
# In Android Studio or via command line:
emulator -avd Pixel_8_Pro_API_34

# Backend must be running on host machine
node server/api.mjs

# App connects via 10.0.2.2 (emulator loopback)
```

### Mode 2: USB Install (Local Debug)
```bash
# Connect S24 Ultra via USB, enable USB debugging
adb devices  # verify connection

# Build and install
./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk

# Watch logs
adb logcat -s "VaibApp:D" "OkHttp:D" "System.err:W"
```

### Mode 3: LAN Backend (Same WiFi)
```bash
# Find PRIME IP
hostname -I  # e.g., 192.168.1.42

# Backend already binds 0.0.0.0, so accessible from LAN
# In app Settings, set URL: http://192.168.1.42:4014
```

### Mode 4: Tailscale Backend (Remote)
```bash
# Get Tailscale IP
tailscale ip -4  # e.g., 100.x.x.x

# In app Settings, set URL: http://100.x.x.x:4014
# Works from anywhere with Tailscale on both ends
```

---

## Physical Phone Test Checklist

### Install & Launch
| # | Test | Expected Result |
|---|------|-----------------|
| 1 | Install debug APK via USB | Install succeeds, no security warnings |
| 2 | Launch from app drawer | App opens within 2 seconds, dark screen appears |
| 3 | Cold start | "Hello vAIb" or HomeScreen renders |
| 4 | Warm start (relaunch) | App resumes instantly, no blank flash |
| 5 | Kill and restart | App reinitializes, connects to backend |

### Backend Connectivity
| # | Test | Expected Result |
|---|------|-----------------|
| 6 | Default URL (10.0.2.2) | Shows "Demo Mode" banner (not emulator) |
| 7 | Set correct LAN IP | Green dot appears, live data loads |
| 8 | Set incorrect URL | Red dot, demo data, no crash |
| 9 | Toggle URL while running | Reconnects within 1 poll cycle (3s) |
| 10 | Backend goes down while app running | Switches to demo mode within 10s |
| 11 | Backend comes back | Auto-recovers to live data |
| 12 | Airplane mode | Demo mode, no crash, keeps retrying |

### Screen Tests (Portrait)
| # | Screen | Test | Expected |
|---|--------|------|----------|
| 13 | Home | Track title visible | Shows current track name + artist |
| 14 | Home | BPM display | Shows BPM value (e.g., 138) |
| 15 | Home | Play controls | Previous, Next, Favorite, Dislike buttons work |
| 16 | Home | Tags visible | Shows genre tags as chips |
| 17 | Stations | 5 stations shown | Grid of 5 station cards |
| 18 | Stations | Station names | Prime Pulse, Lo-Fi, Cyber Salsa, Focus, XsyVerse |
| 19 | Stations | LIVE indicator | Pulsing cyan dot on active stations |
| 20 | Queue | Track list | Shows tracks in current playlist |
| 21 | Queue | Active track | Currently playing track highlighted |
| 22 | EQ | 10 sliders visible | All frequency bands shown |
| 23 | EQ | Preset dropdown | 8 presets selectable |
| 24 | EQ | Slider movement | Sliders adjust smoothly, values update |
| 25 | Stats | Stat tiles | Numbers visible, formatted correctly |
| 26 | Stats | Agent leaderboard | 7 agents ranked by activity |
| 27 | Agents | Agent list | All 7 agents with avatars |
| 28 | Agents | Agent profile | Tap agent → detail with mood, tastes |
| 29 | Settings | Backend URL input | Editable, saves to preferences |
| 30 | Settings | Test connection | Button calls health check |

### Bottom Navigation
| # | Test | Expected Result |
|---|------|-----------------|
| 31 | Home tab | Shows Home screen |
| 32 | Stations tab | Shows station grid |
| 33 | Queue tab | Shows queue list |
| 34 | EQ tab | Shows equalizer |
| 35 | More tab | Opens overflow menu |
| 36 | More → Stats | Navigates to stats screen |
| 37 | More → Agents | Navigates to agents screen |
| 38 | More → Settings | Navigates to settings screen |
| 39 | Tab switch | Smooth transition, 150ms |

### Screen Rotation
| # | Test | Expected Result |
|---|------|-----------------|
| 40 | Rotate to landscape | Layout changes (stretched portrait or DJ Deck) |
| 41 | Rotate back to portrait | Returns to portrait layout |
| 42 | Data persistence | Track info survives rotation (via ViewModel) |
| 43 | Scroll position | List scroll position may reset (acceptable) |

### AMOLED Dark Theme
| # | Test | Expected Result |
|---|------|-----------------|
| 44 | Background color | Pure black (#000000) in dark room |
| 45 | Neon cyan accents | Cyan buttons/glows visible, not washed out |
| 46 | Text contrast | All text readable on black background |
| 47 | Gold elements | Favorite stars clearly gold, not yellowed |
| 48 | No light bleed | No white/light elements where black expected |

---

## Bluetooth Test Steps

### BT Connection (Physical Device Only)
```bash
# Verify BT state
adb shell settings get global bluetooth_on
# 1 = on, 0 = off
```

| # | Test | Expected Result |
|---|------|-----------------|
| 49 | BT enabled check | App detects BT state (mocked for MVP) |
| 50 | BT preset suggestion | EQ screen shows "Bluetooth Punch" hint |
| 51 | BT stats display | Stats screen shows mocked BT percentage |
| 52 | No BT crash | App works regardless of BT state |

---

## Backend Connectivity Tests

### curl Test Suite
Run from the S24 Ultra's shell (via ADB) or from a computer on the same network:

```bash
# Test 1: Health check
curl http://PRIME_IP:4014/health
# Expected: {"ok":true,"service":"vaib-api","port":4014}

# Test 2: Full state
curl http://PRIME_IP:4014/state | jq '.meta.appName'
# Expected: "vAIb for Agents"

# Test 3: Play action
curl -X POST http://PRIME_IP:4014/action \
  -H "Content-Type: application/json" \
  -d '{"action":"play","payload":{"trackId":"track-breaker"}}'
# Expected: Full state JSON with currentTrack = Breaker Chapel

# Test 4: Favorite action
curl -X POST http://PRIME_IP:4014/action \
  -H "Content-Type: application/json" \
  -d '{"action":"favorite"}'
# Expected: Track added to favorites array

# Test 5: Error case
curl -X POST http://PRIME_IP:4014/action \
  -H "Content-Type: application/json" \
  -d '{"action":"play","payload":{"trackId":"invalid"}}'
# Expected: {"error":"Track not found"}
```

---

## EQ Screen Accessibility

| # | Test | Expected Result |
|---|------|-----------------|
| 53 | Slider touch targets | 48dp minimum touch target |
| 54 | Slider labels | All frequency labels readable |
| 55 | Preset selector | Dropdown opens and selects |
| 56 | Reset button | Returns all sliders to 0 |
| 57 | Value display | Current dB value visible below each slider |

---

## Stats Screen Verification

| # | Test | Expected Result |
|---|------|-----------------|
| 58 | Stat tiles | Numbers displayed, not zero or null |
| 59 | Agent leaderboard | 7 agents listed with rank |
| 60 | Station rankings | 5 stations in order |
| 61 | Bluetooth section | Shows mocked 78.5% value |
| 62 | Scroll performance | Smooth 60fps scrolling |

---

## Agent Reactions Verification

| # | Test | Expected Result |
|---|------|-----------------|
| 63 | Agent roster | All 7 agents visible with distinct names |
| 64 | Agent avatar | Initial or generated avatar shown |
| 65 | Agent mood | Current mood string displayed |
| 66 | Reaction count | Stats show non-zero reaction counts |
| 67 | Token budget | Token pill shows remaining tokens |

---

## Token Tracking Verification

| # | Test | Expected Result |
|---|------|-----------------|
| 68 | Initial budget | Shows 800/800 or similar |
| 69 | Token estimation | `ceil("hello".length/4)` = 2 |
| 70 | Depletion warning | Amber pill when < 50 tokens |
| 71 | Zero tokens | Red pill, emoji-only reactions |

---

## Useful ADB Commands

```bash
# ── Device ──
adb devices                          # List connected devices
adb -s <serial> <command>           # Target specific device
adb shell getprop ro.product.model  # Device model

# ── Install ──
adb install -r app-debug.apk         # Install (replace if exists)
adb install -d app-debug.apk         # Allow downgrade
adb uninstall com.xsytrance.vaib    # Uninstall

# ── Logs ──
adb logcat -c                        # Clear logs
adb logcat -s "VaibApp:D"           # Filter by tag
adb logcat | grep -i "vaib\|error"  # Filter by content
adb logcat -d > vaib_logs.txt       # Dump to file

# ── Screenshot ──
adb shell screencap -p /sdcard/screen.png
adb pull /sdcard/screen.png

# ── Screen record ──
adb shell screenrecord /sdcard/demo.mp4
adb pull /sdcard/demo.mp4
# Press Ctrl+C to stop recording

# ── Input ──
adb shell input keyevent 26          # Power button
adb shell input keyevent 82          # Menu button
adb shell input swipe 300 1000 300 500  # Swipe up

# ── Network ──
adb shell ifconfig                   # Device network info
adb shell ping -c 3 PRIME_IP        # Test connectivity to backend

# ── Performance ──
adb shell dumpsys meminfo com.xsytrance.vaib  # Memory usage
adb shell dumpsys battery            # Battery status

# ── File access ──
adb shell ls /sdcard/Android/data/com.xsytrance.vaib/
adb pull /sdcard/Android/data/com.xsytrance.vaib/files/

# ── Tailscale (if installed) ──
adb shell tailscale ip -4           # Tailscale IP on device
```

## Performance Benchmarks (S24 Ultra Targets)

| Metric | Target |
|--------|--------|
| Cold start | < 2 seconds |
| Screen transition | < 200ms |
| API response (LAN) | < 500ms |
| API response (Tailscale) | < 1000ms |
| Polling update | Every 3s, no UI jank |
| Memory usage | < 150MB |
| APK size | < 50MB (debug) |
| Frame rate | 60fps on all screens |

## Sign-Off Checklist

Mark each section complete before proceeding:

- [ ] Install & Launch (tests 1-5)
- [ ] Backend Connectivity (tests 6-12)
- [ ] Screen Tests (tests 13-30)
- [ ] Bottom Navigation (tests 31-39)
- [ ] Screen Rotation (tests 40-43)
- [ ] AMOLED Theme (tests 44-48)
- [ ] Bluetooth (tests 49-52)
- [ ] Backend API (curl tests)
- [ ] EQ Accessibility (tests 53-57)
- [ ] Stats (tests 58-62)
- [ ] Agent Reactions (tests 63-67)
- [ ] Token Tracking (tests 68-71)

**Minimum for Phase 1 completion:** Sections 1-5 + Backend API passing.
