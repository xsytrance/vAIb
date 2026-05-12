# vAIb — Android Build & Deployment Guide

## Critical: API Base URL for Android

**THE MOST COMMON BUG:** When the Android app loads from `file:///android_asset/public/`, relative fetch paths like `/api/backend` resolve to `file:///api/backend` — which is a 404.

**NEVER SHIP AN APK WITH `127.0.0.1` OR `localhost` AS API BASE.**

As of commit `e2104d9`, `vite.config.js` defaults `__API_BASE__` to `http://100.110.224.126:4014` specifically to prevent Android offline regressions.

### The Fix

The `__API_BASE__` constant must be set to an **absolute URL** at build time:

```bash
# Build with the API base URL baked in
cd /home/xsyprime/projects/vaiB-x
VITE_API_BASE='http://100.110.224.126:4014' npx vite build
npx cap sync android
```

### Why This Matters

| Context | How API URL Works |
|---|---|
| **Browser dev mode** | Vite proxy: `/api/backend` → `localhost:4014` ✅ |
| **Android APK** | Relative paths resolve to `file:///api/backend` ❌ |
| **Android APK (fixed)** | Absolute URL `http://100.110.224.126:4014` ✅ |

### vite.config.js Key Lines

```js
export default defineConfig({
  define: {
    // MUST default to an absolute URL for Android file:// loading
    __API_BASE__: JSON.stringify(process.env.VITE_API_BASE || 'http://127.0.0.1:4014'),
  },
  server: {
    // Dev server proxy works in browser, irrelevant for Android
    proxy: {
      '/api/backend': {
        target: 'http://127.0.0.1:4014',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/backend/, ''),
      },
    },
  },
})
```

### How to Verify the Fix Before Building APK

```bash
# After building, check the URL is in the output JS
grep '100.110.224.126:4014' dist/assets/index-*.js
# Should return at least 1 match (the API base URL)

# Check it made it to Android assets
grep '100.110.224.126:4014' android/app/src/main/assets/public/assets/index-*.js
# Should also return at least 1 match

# Guardrail: must return ZERO matches
grep -E '127\.0\.0\.1:4014|localhost:4014' dist/assets/*.js android/app/src/main/assets/public/assets/*.js
# If anything matches here, STOP and rebuild with correct VITE_API_BASE.
```

## Release Gate (mandatory)

Before sending any APK:

1. Build with Android API target (preferred):
   - `npm run build:android`
2. Verify assets contain `100.110.224.126:4014`.
3. Verify assets do **not** contain `127.0.0.1:4014` or `localhost:4014`.
4. Rebuild APK:
   - `cd android && ./gradlew clean assembleDebug`
5. Provide checksum (`sha256sum`) with APK delivery.

Do not skip this gate, even for "quick" rebuilds.

## Full Android Build Workflow

```bash
cd ~/projects/vaiB-x

# 1. Set the API URL and build the web frontend
VITE_API_BASE='http://100.110.224.126:4014' npx vite build

# 2. Sync web assets to the Android project
npx cap sync android

# 3. Build the APK (Android SDK must be installed)
export ANDROID_HOME=$HOME/Android/Sdk
cd android && ./gradlew assembleDebug
cd ..

# 4. APK is at:
android/app/build/outputs/apk/debug/app-debug.apk

# 5. Copy to public server for download
cp android/app/build/outputs/apk/debug/app-debug.apk ~/public_html/vaibx/app-debug.apk
```

## Download URL

After building, the APK is available at:
```
http://100.110.224.126:8080/app-debug.apk
```

## OTA Auto-Update

The APK has a built-in updater (`com.vaibx.app.Updater`) that:
1. Checks the API on launch: `GET /settings/mobile-updates`
2. Compares current `versionCode` vs server `latest.versionCode`
3. If newer, prompts the user to download and install
4. APK URL is served from the same public server

### Update the OTA Config

```bash
# Update the mobile-updates.json config
cat > ~/projects/vaiB-x/config/mobile-updates.json << 'EOF'
{
  "android": {
    "stable": {
      "latest": {
        "versionName": "1.2",
        "versionCode": 3,
        "minVersionCode": 1,
        "mandatory": true,
        "notes": "Your release notes here",
        "apkUrl": "http://100.110.224.126:8080/app-debug.apk",
        "sha256": "...",
        "publishedAt": "2026-05-12T00:00:00Z"
      }
    }
  }
}
EOF
```

## Services

User-level systemd services (the ONLY ones that work):

```
~/.config/systemd/user/vaib-api.service   # Port 4014 - backend API
~/.config/systemd/user/vaib-ui.service    # Port 4013 - UI dev server
~/.config/systemd/user/vaib-probe.service # Agent probe
```

**System-level services at `/etc/systemd/system/` have been removed** — they caused port conflicts.

### Managing Services

```bash
# Reload after editing service files
systemctl --user daemon-reload

# Restart both services
systemctl --user restart vaib-api.service vaib-ui.service

# Check status
systemctl --user status vaib-api.service
```

### Pre-Start Port Cleaner

Before each service starts, `scripts/vaib-prestart.sh` kills any existing process on port 4013 or 4014. This prevents `EADDRINUSE` death spirals after crashes.
