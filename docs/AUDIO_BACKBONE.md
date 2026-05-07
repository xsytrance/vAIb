# AUDIO BACKBONE — Media3/ExoPlayer Pass

## What was implemented
- Added Media3 dependencies in `android/vAIbAndroid/app/build.gradle.kts`:
  - `androidx.media3:media3-exoplayer:1.3.1`
  - `androidx.media3:media3-session:1.3.1`
  - `androidx.media3:media3-ui:1.3.1`
- Added `AudioBackbone.kt`:
  - ExoPlayer initialization
  - MediaSession creation (`vaib-media-session`)
  - station playback routing
  - output-mode detection (Bluetooth vs speaker)
  - playback progress/buffering state exposure
- `Station` model extended with:
  - `streamUrl`
  - `fallbackLocalTrack`
  - `playbackMode` (`local|stream|hybrid`)
- `PlaybackState` extended with:
  - `isBuffering`
  - `playbackSource`
- ViewModel now uses real player backbone for play/pause + station switch.

## Local + Stream logic
Resolution order in `AudioBackbone`:
1. If `fallbackLocalTrack` exists on device: play local file
2. Else if stream exists and mode allows: play stream URL
3. Else fallback to `asset:///audio/<stationId>.mp3`

This keeps local-first architecture while still proving live playback.

## Scope control
- No Spotify
- No YouTube
- No auth/account/cloud
- No giant media library

Mission fit: believable Android AI-radio backbone with minimal risk.

## Local demo assets shipped
Bundled under:
- `android/vAIbAndroid/app/src/main/assets/audio/prime-pulse.mp3`
- `android/vAIbAndroid/app/src/main/assets/audio/city-pop-signal.mp3`
- `android/vAIbAndroid/app/src/main/assets/audio/redline-grid.mp3`
- `android/vAIbAndroid/app/src/main/assets/audio/glitch-ditch.mp3`
- `android/vAIbAndroid/app/src/main/assets/audio/gold-command.mp3`

These are synthetic/royalty-safe generated placeholders for station identity testing.

## Notification controls foundation
- Added `PlayerNotificationManager` wiring in `AudioBackbone`.
- Added notification channel: `vaib-playback`.
- Added manifest permission: `POST_NOTIFICATIONS`.

## Known limitations
- Notification permission prompt UX flow not yet explicit in-app.
- EQ DSP binding to platform effects is deferred to next stable lane.
