# vAIb-X Maintenance Log

## 2026-05-12T16:40:00Z — Runtime Noise Isolation + Federation Heartbeat

- Added runtime ignore coverage for `/logs/`, `/data/music-cache/`, and local scratch PNG renders.
- Stopped tracking noisy runtime files: `data/state.json`, `data/telemetry-rollups.json`, `data/telemetry.ndjson`.
- Wired `scripts/vaib-federation-watch.sh` into `scripts/vaib-ensure-up.sh` as a best-effort heartbeat so each probe cycle also records cross-node visibility.
- Marked probe/watch scripts executable.

## 2026-05-12T08:30:00Z — Full Relocation, Shimmer UI, OTA Updater

**Relocation**: Moved project from `~/.openclaw/workspace/vAIb-X` to `~/projects/vaiB-x`.
- Updated all 3 user systemd services (`vaib-api`, `vaib-ui`, `vaib-probe`) to new WorkingDirectory
- Nuked system-level `/etc/systemd/system/vaib-*` services that caused port conflicts
- Added `scripts/vaib-prestart.sh` — kills stale processes on 4013/4014 before service starts
- `ExecStartPre` hook on both api + ui services = no more EADDRINUSE death spirals

**UI Shimmer & Beat-Reactive System**:
- `MusicNoteOverlay.jsx`: star notes (8% chance) grow 2.5x then pop into 6 sparkle particles
- Real-time beat detection via Web Audio API analyser → drives `--beat-intensity` CSS var
- `data-beat-state` on body: idle/pulse/peak
- Shimmer sync: station track name, vAIb wordmark, active agent pill, cockpit name
- Shimmer speed: 3s idle → 1s peak

**Android APK Build Fix**:
- **Root cause**: Android loads from `file:///android_asset/`, relative `/api/backend` paths resolve to `file:///api/backend` (404)
- **Fix**: `vite.config.js` `__API_BASE__` now defaults to `http://127.0.0.1:4014` (absolute URL)
- Builds with `VITE_API_BASE='http://100.110.224.126:4014' npx vite build`
- See `docs/android-build.md` for full build workflow and verification steps

**OTA Auto-Update (Android native)**:
- Added `REQUEST_INSTALL_PACKAGES` permission to AndroidManifest.xml
- Created `Updater.java` — Kotlin/Java update checker on app launch
- Checks `/settings/mobile-updates` API endpoint, compares versionCode
- Downloads APK to Downloads folder, fires `ACTION_INSTALL_PACKAGE` intent
- MainActivity calls `Updater.checkForUpdates()` in `onStart()`
- `config/mobile-updates.json` tracks version info

**New Avatars**: Added pluto_openclaw-main, snake, supersort, vps_tyler6 PNGs
**.gitignore**: Excluded `data/state.json`, `data/telemetry-*`, screenshots

## 2026-05-11T18:29:13.914415
- **Issue**: vAIb-X services were down (ports 4013/4014 not listening)
- **Fix**: Started API server and Vite frontend manually
- **Status**: ✅ RESTORED
