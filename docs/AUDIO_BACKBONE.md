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

## Known limitations
- Asset tracks are path-ready but no bundled audio files committed yet.
- Notification transport controls are not fully wired yet (MediaSession is active foundation).
- EQ DSP binding to platform effects is deferred to next stable lane.
