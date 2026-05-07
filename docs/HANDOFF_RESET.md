# vAIb Handoff Doc (Reset-Ready)

Last updated: 2026-05-07
Owner: Hermes + xsytrance
Branch: `prime-stabilization`

## 1) Current product state
- Android app (`android/vAIbAndroid`) is building successfully.
- Tailnet connectivity work is in progress and app has backend endpoint/tailnet plumbing.
- Faction Wars system is implemented with:
  - faction scoring, momentum, streaks
  - banners unlocks
  - call-to-arms timed boosts
  - recruitment codes
  - persistence/restore in local stats JSON
- Music continuity problem was identified earlier: playback can end naturally without forced handoff/loop policy.

## 2) What shipped recently
- Faction war progression model expanded.
- Live raid mechanics (Call to Arms) added.
- Stats UI now shows raid status, time left, recruitment codes, and raids triggered.
- Tailnet-oriented backend endpoint model and connection surface were added.
- TTS/narration infrastructure files added (`data/tts/*`) for richer host/agent voice moments.

## 3) Working agreements / product intent
- "Disconnected" should not be the normal experience for tailnet users.
- Music should never stop.
- Agent rotation should feel deliberate (not too frequent changes).
- Experience should feel game-like, social, and viral (factions, events, identity).

## 4) Immediate guardrails for any next coding session
1. **Never-stop audio first**
   - Ensure one source is always active (stream, fallback asset, or emergency loopbed).
   - Add automatic baton-pass between agents before track end.
2. **Tailnet reliability second**
   - Prioritize reachable tailnet hostname discovery and status UX.
   - Distinguish "backend degraded" vs true disconnection.
3. **Rotation pacing**
   - Minimum airtime windows (e.g., 15–25 min blocks).
   - Event-based overrides only during raids.
4. **Build verification every phase**
   - `./gradlew :app:assembleDebug :app:lintDebug`

## 5) Known constraints / open risks
- No useful unit-test coverage in `testDebugUnitTest` currently (`NO-SOURCE` previously).
- Runtime artifacts are ignored in git (`logs/`, `releases/`, `data/state.json`) by design.
- Need on-device soak validation for long-play (>= 2h) and network transitions.

## 6) First actions after reset (operator checklist)
1. Read this file and roadmap (`docs/FEATURE_ROADMAP.md`).
2. Confirm branch status and latest commits.
3. Run Android build/lint.
4. Start with "Never-Stop Audio" phase from roadmap.
5. Ship in small checkpoints and verify each one on device.

## 7) Definition of done for the next milestone
- Audio runs continuously for 2+ hours with no silence.
- Agent handoffs happen on schedule without abrupt cuts.
- Tailnet users see connected/degraded states accurately.
- Faction events influence music flow without chaotic switching.
- Users can understand and join events from the UI in <10 seconds.
