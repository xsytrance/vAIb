# BLUETOOTH PLAYBACK STATUS

## Foundation implemented
- Runtime output detection via `AudioManager.getDevices(GET_DEVICES_OUTPUTS)`.
- Output mode mapped to app state:
  - `bluetooth`
  - `speaker`
- Cockpit reflects output mode in status chip.
- Playback state now updates with player callbacks and periodic sync.

## Why this matters
vAIb now acts like a Bluetooth-first receiver instead of a static dashboard.

## Current behavior
- When BT route is present, app reports `bluetooth`.
- Play/pause and station switch operate through ExoPlayer-backed path.
- MediaSession is active and visible in device media session dump.

## Next lane (not implemented yet)
- Full notification controls with transport actions
- Audio focus interruption policy (call/nav interruption edge cases)
- Reconnect heuristics for BT route loss/rejoin
- Optional per-device EQ profile persistence
