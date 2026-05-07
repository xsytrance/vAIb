# S24 First Boot Report — vAIb Android

Date: 2026-05-07
Branch: `prime-stabilization`
Device: Samsung Galaxy S24 Ultra (`192.168.1.19:5555`)

## Build + Install
- `./gradlew :app:assembleDebug` ✅ SUCCESS
- APK: `android/vAIbAndroid/app/build/outputs/apk/debug/app-debug.apk` (~52.9 MB)
- `adb install -r app-debug.apk` ✅ SUCCESS
- Launch: `adb shell am start -n com.xsytrance.vaib/.MainActivity` ✅ SUCCESS

## Backend Connection Result
- API server confirmed running on host port `4014`.
- Phone-to-host ping: ✅ (`192.168.1.19 -> 192.168.1.147`)
- Initial phone TCP to `:4014` timed out due host firewall rule gap.
- Added UFW allow rules:
  - `4014/tcp ALLOW 192.168.1.0/24`
  - `4014/tcp ALLOW 100.64.0.0/10`
- Phone curl validation after firewall update:
  - `curl http://192.168.1.147:4014/health` ✅ `{"ok":true,"service":"vaib-api","port":4014}`
  - `curl /stats` ✅ returns live JSON

## Android Repair Lane Summary (incremental convergence)
Repaired without project reset:
- Fixed malformed Kotlin syntax and string interpolation breakpoints:
  - `ReactionBadge.kt`
  - `AgentsScreen.kt`
  - `EqScreen.kt`
  - `StatsScreen.kt`
- Resolved Compose/lifecycle compile issues:
  - Added `androidx.lifecycle:lifecycle-runtime-compose:2.7.0`
  - Added missing imports (`sp`, `background`, `Color`)
- Preserved architecture and screen structure; no broad rewrite.

## First-Run UX Observations
Artifacts:
- `logs/s24-portrait-app.png`
- `logs/s24-landscape-app.png`
- `logs/s24-logcat-snippet.txt`

### Launch success/failure
- App launches and stays up. No crash loops observed.

### Portrait screenshots/issues
- Captured frame appears to remain landscape-composed; true portrait render needs explicit in-app orientation run.
- Action: add deterministic portrait test pass (force rotation + confirm recomposition path).

### Landscape DJ Deck observations
- DJ-deck style layout renders successfully.
- 3-column structure visible (stations/now-playing/queue).
- Mini EQ + visualizer visible and aligned.
- No fatal rendering breakage.

### FPS / smoothness
- No obvious jank/stutter observed in static first-boot check.
- Formal frame-time profiling still pending (Macrobenchmark / `gfxinfo`).

### Readability notes
- Strong header/title hierarchy and neon card contrast.
- Some top text and edge elements risk clipping under system bars in landscape.
- Right-edge interaction space competes with system nav region.

### AMOLED quality notes
- Aesthetic is strong on OLED (deep dark palette + neon accents).
- Some panels are near-black instead of pure black, so there is headroom for power optimization later.

### Battery / heat concerns
- No immediate heat spike during boot/install/smoke test.
- No battery anomaly observed in this short run.
- Long-session polling impact still needs measurement.

## Immediate UX improvements needed (next pass)
1. Confirm and hard-validate true portrait composition path.
2. Safe-area/padding fixes for top clipping and right-edge controls in landscape.
3. Ensure backend URL/device profile flow is robust (not host-hardcoded long-term).
4. Add explicit backend status chip in cockpit for quick operator confidence.
5. Run quick performance pass after interaction tests (scroll + nav + queue updates).

## Status
- Milestone reached: **green Android build + install + first boot on real S24 Ultra**.
- Next milestone: **Agent Presence Polish Pass** (alive feel, believable low-noise activity, tasteful motion) on top of stable baseline.

## Agent Presence Polish Update (same day)

### What improved
- Added autonomous presence pulses in Android ViewModel (occasional reactions, queue changes, listener drift, stats drift).
- Added concise per-agent voice patterns for stronger identity cues.
- Smoothed visualizer motion to reduce jitter and improve “signal flow” feel.
- Landscape DJ deck station cards are now tappable for faster station switching.

### What still feels dead/artificial
- Some UI content paths still show placeholder-style string rendering and need cleanup.
- Agent roster/persona set is not yet fully aligned to requested iconic cast (Ultron/Ayumi/HACKERMOUTH/VG God).
- Presence behavior remains rule-based (believable, but still synthetic).

### Motion observations
- Visualizer now appears less chaotic and more rhythmic.
- Card/activity motion remains subtle; no heavy animation loops introduced.

### Battery / heat observations
- Short run after polish showed no immediate thermal issue.
- Need longer soak run to quantify polling + animation battery impact.

### Reaction cadence observations
- Activity cadence is now occasional instead of constant.
- Reactions remain concise and token-aware (short comments, bounded list depth).

### UX recommendations
1. Add explicit "updated just now" indicators for trust in liveness.
2. Fix placeholder text rendering paths in station/metadata cards.
3. Complete portrait safe-area and clipping pass.
4. Add optional low-power visualizer mode toggle for long sessions.
