# Android Architecture

## Package Structure

```
com.xsytrance.vaib
├── MainActivity.kt                 # Entry point, sets content, handles rotation
├── ui/
│   ├── theme/
│   │   ├── Color.kt               # All color constants (neon cyan, gold, magenta)
│   │   ├── Type.kt                # Typography scale (Display, Headline, Body, Caption)
│   │   └── Theme.kt               # VaibTheme {} — dark AMOLED, Material3 base
│   ├── components/                # Reusable Compose UI pieces
│   │   ├── VaibCard.kt           # Container card with glow border
│   │   ├── AgentChip.kt          # Circular avatar + name pill
│   │   ├── StationCard.kt        # Station tile with live indicator
│   │   ├── TrackCard.kt          # Track row with play/fav buttons
│   │   ├── StatusPill.kt         # Online/offline badge
│   │   ├── EqualizerBand.kt      # Single EQ slider with label
│   │   ├── VisualizerBars.kt     # Animated bar visualizer
│   │   ├── ReactionBadge.kt      # Agent reaction chip (emoji + text)
│   │   ├── TokenBudgetPill.kt    # Remaining tokens display
│   │   └── StatTile.kt           # Grid stat box (label + big number)
│   ├── screens/                   # One file per screen
│   │   ├── HomeScreen.kt         # Now playing + quick controls
│   │   ├── StationsScreen.kt     # 5-station grid
│   │   ├── QueueScreen.kt        # Upcoming tracks list
│   │   ├── EQScreen.kt           # 10-band equalizer
│   │   ├── StatsScreen.kt        # Listening dashboards
│   │   ├── AgentsScreen.kt       # Agent roster + profiles
│   │   └── SettingsScreen.kt     # Backend URL, theme, about
│   └── navigation/
│       └── VaibNavHost.kt        # Bottom nav + screen routing
├── data/
│   ├── model/                     # Data classes (POKOs)
│   │   ├── Agent.kt              # id, name, vibe, mood, metrics, tastes[]
│   │   ├── Track.kt              # id, title, artist, bpm, energy, tags[]
│   │   ├── Station.kt            # id, name, description, trackIds[]
│   │   ├── Reaction.kt           # agentId, trackId, type, comment, tokens
│   │   └── AppState.kt           # Full runtime state envelope
│   ├── DemoData.kt               # Hardcoded fallback data (offline mode)
│   └── VaibRepository.kt         # Single source of truth, merges API + demo
├── network/
│   └── ApiClient.kt              # HTTP calls: getState(), postAction(), health()
└── viewmodel/
    └── VaibViewModel.kt          # StateFlow<AppState>, exposes UI state
```

## Architecture Pattern: MVVM-lite

vAIb uses a lightweight MVVM pattern — no Room database, no complex UseCase layers. The data flow is:

```
┌─────────────┐     HTTP      ┌──────────────┐     StateFlow     ┌─────────────┐
│  Backend    │ ────────────> │  Repository  │ ────────────────> │  ViewModel  │
│  API:4014   │               │              │                   │             │
└─────────────┘               └──────────────┘                   └──────┬──────┘
     ▲                                                                  │
     │                                                                  │ Compose
     │                                                                  ▼
     │                                                         ┌─────────────┐
     └─────────────────────────────────────────────────────────│    UI       │
           POST /action (on user interaction)                  │   Screens   │
                                                               └─────────────┘
```

### Why MVVM-lite?

- **No Room DB**: All state lives in the backend JSON file
- **No UseCases**: Actions are simple (play, favorite, next) — no business logic complexity
- **No Domain Layer**: The backend IS the domain layer
- **Repository pattern**: Still useful — merges network + demo data, handles offline

## Data Layer

### ApiClient
- Pure HTTP: `java.net.HttpURLConnection` or `OkHttp` (if available)
- Three methods: `getState()`, `postAction(action, payload)`, `healthCheck()`
- Base URL from Settings (default: `http://10.0.2.2:4014` for emulator)
- 5-second timeout on requests
- Returns parsed JSON or throws

### Repository
- Holds the current `AppState` in a `MutableStateFlow`
- `refresh()` → calls ApiClient, updates StateFlow
- `performAction(action, payload)` → POST, then refresh
- If network fails: emit demo data, set `isOffline = true`
- Exposes: `state: StateFlow<AppState>`, `isOffline: StateFlow<Boolean>`

### Demo Data (DemoData.kt)
- Hardcoded copy of `baseState` from `store.mjs`
- Same structure as API response
- Used when: backend unreachable, first launch, emulator without backend
- Contains 5 tracks, 2 playlists, 1 agent (Saito) with full profile

## UI Layer (Jetpack Compose)

### Theme
- Material3 base, completely overridden for dark AMOLED
- `Surface` = pure black `#000000`
- Primary accent = neon cyan `#00E5FF`
- No light theme — `isSystemInDarkTheme()` ignored
- Dynamic color disabled — static palette for brand consistency

### StateFlow → Compose
```kotlin
@Composable
fun HomeScreen(viewModel: VaibViewModel = viewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val isOffline by viewModel.isOffline.collectAsStateWithLifecycle()

    // state.runtime.currentTrack — always available (demo fallback)
    // isOffline — shows "Demo Mode" banner when true
}
```

## Polling Mechanism

```kotlin
// In ViewModel
viewModelScope.launch {
    while (isActive) {
        try {
            repository.refresh()
            isOffline.value = false
        } catch (e: Exception) {
            isOffline.value = true
        }
        delay(3000) // 3 seconds
    }
}
```

- Runs continuously while app is foregrounded
- Pauses in background (use `LifecycleEventObserver`)
- On resume: immediate refresh + restart polling
- User actions bypass polling (instant POST + refresh)

## Navigation

### Bottom Navigation (5 tabs)
```
┌─────────────────────────────────────────────┐
│  [Home]  [Stations]  [Queue]  [EQ]  [More] │
└─────────────────────────────────────────────┘
```

| Tab | Icon | Destination |
|-----|------|-------------|
| Home | `Icons.Default.Home` | Now playing + controls |
| Stations | `Icons.Default.Radio` | 5-station grid |
| Queue | `Icons.Default.List` | Upcoming tracks |
| EQ | `Icons.Default.Equalizer` | 10-band equalizer |
| More | `Icons.Default.MoreVert` | Overflow menu |

### More Overflow Menu
Tapping "More" opens a dropdown/sheet:
- Stats → StatsScreen
- Agents → AgentsScreen
- Settings → SettingsScreen

### Navigation Implementation
- `VaibNavHost.kt` with `rememberNavController()`
- `Scaffold` with `BottomAppBar` holding 5 nav items
- Each tab has its own back stack (optional)
- Deep links not yet implemented

## Landscape Mode: DJ Deck

When device rotates to landscape, the entire layout switches to a purpose-built DJ Deck:

```
Landscape (DJ Deck Mode)
┌──────────────┬───────────────────────────────┬──────────────┐
│              │                               │              │
│   LEFT       │         CENTER                │    RIGHT     │
│   PANEL      │         PANEL                 │    PANEL     │
│              │                               │              │
│ Station List │     Big Now Playing           │   Queue      │
│ + Agent      │     + Visualizer              │ + Reactions  │
│   Booth      │     + EQ Mini-Strip           │ + Mini Stats │
│              │                               │              │
│ 30% width    │        40% width              │  30% width   │
└──────────────┴───────────────────────────────┴──────────────┘
```

See `LANDSCAPE_DJ_DECK.md` for full specification.

### Orientation Detection
```kotlin
val configuration = LocalConfiguration.current
when (configuration.orientation) {
    Configuration.ORIENTATION_LANDSCAPE -> DjDeckLayout()
    else -> PortraitLayout()
}
```

## File Purposes (Quick Reference)

| File | Purpose | Lines (est) |
|------|---------|-------------|
| `MainActivity.kt` | Entry, theme, rotation | ~40 |
| `Theme.kt` | Dark AMOLED theme wrapper | ~60 |
| `Color.kt` | All hex color constants | ~30 |
| `Type.kt` | Font scale | ~25 |
| `VaibNavHost.kt` | Bottom nav + routing | ~80 |
| `VaibViewModel.kt` | StateFlow, polling, actions | ~120 |
| `VaibRepository.kt` | API + demo merge | ~80 |
| `ApiClient.kt` | HTTP GET/POST | ~60 |
| `DemoData.kt` | Offline fallback data | ~200 |
| `AppState.kt` | Data class mirror of API | ~50 |
| `Agent.kt`, `Track.kt`, `Station.kt`, `Reaction.kt` | Model classes | ~15 each |
| `*Screen.kt` (7 files) | Screen Composables | ~150 each |
| `*Card.kt`, `*Chip.kt`, `*Pill.kt` (8 files) | UI components | ~50 each |
