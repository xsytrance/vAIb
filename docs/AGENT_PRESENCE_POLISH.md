# Agent Presence Polish Pass — vAIb

Date: 2026-05-07
Branch: `prime-stabilization`
Focus: Presence over feature bloat

## Objective
Shift vAIb from static dashboard behavior into a believable living-booth receiver feel, while preserving current backend/API stability and keeping token/noise discipline.

## What Changed

### 1) Presence Illusion Cadence (ViewModel)
File: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/viewmodel/VaibViewModel.kt`

- Added lightweight autonomous pulse engine inside polling loop.
- Cadence tuned to be occasional, not spam:
  - pulse chance gated by tick count and probability
  - no constant flood behavior
- Each pulse can subtly update:
  - station listeners (small drift)
  - current station context (occasional switch)
  - current track context
  - queue evolution (occasional insert at top)
  - reactions (concise, capped list)
  - stats drift (listens, token usage, leaderboard, like ratio)

### 2) Personality Clarity (Short Voice Packs)
File: `VaibViewModel.kt`

- Added per-agent concise reaction voice sets and emoji style maps:
  - `djinn`: signal/technical tone
  - `groove-whisper`: warm/chill tone
  - `salsa-bot`: energetic dance tone
  - `synth-rider`: neon-night tone
  - `bass-forge`: low-end engineer tone
  - `harmony`: balanced/supportive tone
  - `echo`: critical/edge tone
- Comments are short by design (token discipline).

### 3) Motion Polish (Visualizer)
File: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/ui/components/VisualizerBars.kt`

- Replaced hard random jumps with smoothed wave+jitter blend.
- Increased continuity with easing and weighted previous-state blending.
- Kept activity lively but less chaotic/flickery.
- Update interval remains lightweight (`~160ms`) to avoid redraw thrash.

### 4) Portrait + Bluetooth UX Touchups
File: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/ui/screens/CockpitScreen.kt`

- Reduced oversized title slightly for better vertical balance on portrait.
- Bluetooth indicator now reflects current `playback.outputMode` state.
- Preserved existing architecture/card flow.

### 5) Landscape DJ Deck Polish
File: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/ui/screens/LandscapeDjDeck.kt`

- Made station cards tappable in landscape command-station view.
- Station switching now triggers directly from deck left column (better desk mode flow).

## Build / Device Validation

- `./gradlew :app:assembleDebug` ✅
- `adb install -r app-debug.apk` ✅
- App launch on S24 Ultra ✅
- Phone->backend health check ✅ after API process restart + host listener check

## Presence Outcome (Current)

## Feels Improved
- App now shows subtle ongoing life instead of static snapshots.
- Reactions/readout cadence feels more organic and less spammy.
- Visualizer motion feels smoother and more intentional.
- Landscape station switching feels more command-station-like.

## Still Feels Artificial
- Some strings/components still use placeholder-style text patterns in UI paths.
- Agent roster does not yet include all requested iconic personas (Ultron/Ayumi/HACKERMOUTH/VG God) as first-class entities.
- Presence pulses are believable but still heuristic (no semantic track-aware model yet).

## Battery / Heat Notes
- No immediate heat spike seen during short live runs.
- Polling/pulse cadence is bounded to reduce runaway recompositions.
- Need longer soak test for battery confidence (>20 min active session).

## Reaction Cadence Notes
- Cadence is intentionally sparse and randomized.
- Reactions are short and capped to avoid wall-of-text behavior.
- Token usage in stats now drifts incrementally for life-signal realism.

## Recommendations (Next Iteration)
1. Promote requested iconic personas into primary roster and taste profiles.
2. Add tiny activity timestamp labels (e.g., "just now", "12s ago") for stronger liveness trust.
3. Add safe-area/padding pass for edge clipping in some device orientations.
4. Run 20–30 min battery/thermal observation while polling + visualizer active.
5. Profile recomposition hotspots in queue/reaction lists if jank appears on rapid updates.
