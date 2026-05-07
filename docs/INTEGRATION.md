# Android-to-Backend Integration Guide

## Overview

The Android app communicates with the Node.js backend via HTTP polling. This document covers the connection strategy, fallback behavior, and data flow from network to UI.

## Backend URL Configuration

### Default URLs by Environment
| Environment | Default URL | Where to Set |
|-------------|-------------|--------------|
| Emulator | `http://10.0.2.2:4014` | Hardcoded default |
| Physical Device (LAN) | `http://<PRIME_IP>:4014` | Settings screen |
| Physical Device (Tailscale) | `http://<PRIME_TAILSCALE_IP>:4014` | Settings screen |

### `10.0.2.2` Explained
Android Emulator has a special alias `10.0.2.2` that maps to the host machine's `localhost`. This is an emulator-only address — it does NOT work on physical devices.

### Settings Screen
The Settings screen must expose:
- Backend URL text input (default: `http://10.0.2.2:4014`)
- "Test Connection" button (calls GET /health)
- Connection status indicator (green/red dot)
- "Reset to Default" button
- Stored in `SharedPreferences` key: `backend_url`

### PRIME IP Discovery
When running on a physical device, you need the PRIME machine's IP:
```bash
# On the PRIME machine (where backend runs):
hostname -I        # All IPs
ip addr            # Detailed interface list
tailscale ip -4    # Tailscale IP (100.x.x.x)
```

Enter this IP in the Android Settings screen: `http://192.168.1.xxx:4014`

## Polling Strategy

### Implementation
```kotlin
class VaibViewModel(private val repository: VaibRepository) : ViewModel() {

    private val _state = MutableStateFlow<AppState>(DemoData.initialState)
    val state: StateFlow<AppState> = _state.asStateFlow()

    private val _isOffline = MutableStateFlow(false)
    val isOffline: StateFlow<Boolean> = _isOffline.asStateFlow()

    init {
        startPolling()
    }

    private fun startPolling() {
        viewModelScope.launch {
            while (isActive) {
                try {
                    val newState = repository.refresh()
                    _state.value = newState
                    _isOffline.value = false
                } catch (e: Exception) {
                    _isOffline.value = true
                    // Keep showing last known state or demo data
                }
                delay(3000) // 3 seconds
            }
        }
    }
}
```

### Pacing Rules
- **Normal polling**: every 3 seconds
- **After user action**: immediate refresh (skip the delay)
- **Background**: pause polling (save battery)
- **Foreground resume**: immediate refresh + restart polling
- **Offline detected**: slow to 10 second intervals, keep trying

### Lifecycle Management
```kotlin
// Pause/resume with lifecycle
class MainActivity : ComponentActivity() {
    override fun onResume() {
        super.onResume()
        viewModel.resumePolling()
    }

    override fun onPause() {
        super.onPause()
        viewModel.pausePolling()
    }
}
```

## Data Flow

```
┌──────────┐    HTTP GET     ┌──────────┐    emit     ┌──────────┐
│ Backend  │ ───────────────>│Repository│────────────>│ ViewModel│
│ :4014    │                 │          │  StateFlow  │          │
└──────────┘                 └──────────┘             └────┬─────┘
                                                           │
                            ┌──────────────────────────────┼──────┐
                            │                              │      │
                            ▼                              ▼      ▼
                     ┌──────────────┐           ┌──────────────┐
                     │ Compose UI   │           │ DemoData     │
                     │ (observes    │           │ (fallback)   │
                     │  state)      │           │              │
                     └──────────────┘           └──────────────┘
```

### Flow Description
1. **Repository** polls backend every 3 seconds via `ApiClient`
2. **Repository** parses JSON response into `AppState` data class
3. **Repository** emits new state to `MutableStateFlow`
4. **ViewModel** exposes `StateFlow<AppState>` to UI
5. **Compose UI** collects state with `collectAsStateWithLifecycle()`
6. If network fails → Repository emits `DemoData.initialState`, sets `isOffline = true`

## Demo Data Fallback

### When Demo Data is Used
- Backend unreachable (connection refused, timeout)
- First launch before backend configured
- Emulator without backend running
- Airplane mode / no network

### Demo Data Contents
`DemoData.kt` contains a hardcoded copy of the full API response:
- 5 tracks in library
- 2 playlists (stations)
- 1 agent (Saito) with complete profile
- Sample notifications and events
- Default preferences

### Offline Indicator
When using demo data, show a subtle banner:
```kotlin
if (isOffline) {
    Surface(
        color = DangerRed.copy(alpha = 0.15f),
        modifier = Modifier.fillMaxWidth()
    ) {
        Text(
            "Demo Mode — Backend unreachable",
            color = DangerRed,
            style = MaterialTheme.typography.labelSmall,
            modifier = Modifier.padding(8.dp)
        )
    }
}
```

## Connection Status Indicator

A persistent dot in the app bar shows connection state:

| State | Color | Meaning |
|-------|-------|---------|
| Green (`QuaternaryLime`) | Connected, live data | All good |
| Amber (`WarningAmber`) | Connecting / slow | Intermittent |
| Red (`DangerRed`) | Offline, demo mode | Backend unreachable |
| Grey (`TextDisabled`) | Unknown | Initial state |

## Error Handling Strategy

### Network Errors
```kotlin
sealed class ApiResult<out T> {
    data class Success<T>(val data: T) : ApiResult<T>()
    data class Error(val message: String) : ApiResult<Nothing>()
    object NetworkError : ApiResult<Nothing>()
}
```

### Error Recovery
1. **Timeout** (5s) → mark offline, show demo data, retry in 10s
2. **Connection refused** → mark offline, show demo data, retry in 10s
3. **HTTP 500** → show error toast, keep current state, retry next poll
4. **Parse error** → log to console, show demo data, retry next poll
5. **No route to host** → mark offline, show demo data, retry in 10s

### User-Facing Errors
- **Toast**: transient errors (action failed, server error)
- **Banner**: persistent offline state
- **Silent**: polling failures (auto-recover, don't spam)

## Network Security Config

Since the backend uses HTTP (not HTTPS) on local networks, Android blocks cleartext by default. Add a network security config:

### `res/xml/network_security_config.xml`
```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system"/>
        </trust-anchors>
    </base-config>
</network-security-config>
```

### `AndroidManifest.xml`
```xml
<application
    android:networkSecurityConfig="@xml/network_security_config"
    ... >
```

> ⚠️ This allows cleartext for ALL domains. For production, restrict to specific IPs.

## Required Permissions

```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

No runtime permission dialogs needed for basic network access.

## Quick Test Checklist

| Test | Expected |
|------|----------|
| Backend running, emulator open | Green dot, live data, track list populates |
| Backend stopped, app open | Red dot, demo data shown, tracks visible |
| Backend restarted while app open | Auto-recovers to green dot within 10s |
| Toggle to wrong URL in Settings | Red dot, demo data, no crash |
| Toggle back to correct URL | Green dot, live data returns |
| Airplane mode | Red dot, demo data, no crash |
| Action (favorite) while offline | Shows "offline" toast, queues or ignores |

## Implementation Files

| File | Responsibility |
|------|---------------|
| `network/ApiClient.kt` | HTTP GET/POST, timeout config, error wrapping |
| `data/VaibRepository.kt` | Poll loop, state merge, offline detection |
| `viewmodel/VaibViewModel.kt` | Expose StateFlow, action dispatch, lifecycle |
| `data/DemoData.kt` | Offline fallback data |
| `ui/screens/SettingsScreen.kt` | Backend URL config, connection test |
