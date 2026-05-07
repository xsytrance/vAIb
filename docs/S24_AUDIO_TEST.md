# S24 AUDIO TEST — REAL AUDIO BACKBONE

## Device
- Samsung Galaxy S24 Ultra
- ADB target: `192.168.1.19:5555`

## Build/install evidence
- `./gradlew :app:assembleDebug` -> SUCCESS
- `adb install -r app/build/outputs/apk/debug/app-debug.apk` -> SUCCESS
- Launch intent -> SUCCESS

## Playback foundation evidence
- `dumpsys media_session` shows active session:
  - `com.xsytrance.vaib/androidx.media3.session.id.vaib-media-session`
- Audio playback list includes `uid=10537 packages=com.xsytrance.vaib`

## UX observations
- Cockpit now has live play/pause transport affordance.
- Broadcast header now indicates buffering state.
- Visualizer intensity tied to playback buffering/playing state.
- Persona lanes feel more recognizable with iconic roster.

## Additional soak checks executed
- HOME/background transition: media session remained active.
- Screen off -> wake/unlock -> recheck: media session remained active.
- `dumpsys media_session` repeatedly reports:
  - active `androidx.media3.session.id.vaib-media-session`
  - `Audio playback ... com.xsytrance.vaib`

## Known gaps
- Earbuds + speaker route-switch stress test still needs manual in-hand pass.
- Battery/thermal measurements still need timed 20–30 min controlled run.
- Notification permission UX prompt still needs first-run polish.
