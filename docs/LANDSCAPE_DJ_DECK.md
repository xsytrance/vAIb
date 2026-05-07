# Landscape DJ Deck Specification

## Overview

Landscape mode transforms vAIb from a phone music app into a **purpose-built DJ command deck**. It is not a stretched portrait layout — it is a completely different UI optimized for:

- **Car mode** — docked in vehicle, landscape screen
- **Tablet mode** — larger screens, more horizontal space
- **Desk mode** — phone on stand, monitoring the agent network

## Design Philosophy

The DJ Deck is a **three-panel command center** inspired by professional DJ software (Serato, Rekordbox) but simplified for AI-agent music control. Information density is high. Every pixel serves a purpose.

## Three-Panel Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  LEFT PANEL (30%)        CENTER PANEL (40%)         RIGHT PANEL (30%)        │
│  ─────────────           ────────────────           ───────────────         │
│                                                                              │
│  ┌─────────────────┐    ┌───────────────────────┐    ┌─────────────────┐    │
│  │  PRIME PULSE    │    │                       │    │                 │    │
│  │  RADIO          │    │    NOW PLAYING        │    │    QUEUE        │    │
│  │  ◉ LIVE         │    │                       │    │                 │    │
│  │  12 tracks      │    │    ┌───────────────┐  │    │  1. Aurora      │    │
│  │  ─────────────  │    │    │               │  │    │  2. Ghost Relay │    │
│  │                 │    │    │   [BIG        │  │    │  3. Circuit     │    │
│  │  LO-FI DECK     │    │    │    ORB /      │  │    │  4. Breaker     │    │
│  │  ○ offline      │    │    │    ART]       │  │    │  5. Flatline    │    │
│  │                 │    │    │               │  │    │                 │    │
│  │  CYBER SALSA    │    │    └───────────────┘  │    │  ─────────────  │    │
│  │  ◉ LIVE         │    │                       │    │                 │    │
│  │                 │    │    Aurora Thread      │    │   REACTIONS     │    │
│  │  FOCUS TUNNEL   │    │    Neon Veins         │    │                 │    │
│  │  ○ offline      │    │    138 BPM • 5:42     │    │  💜 Ayumi:      │    │
│  │                 │    │                       │    │  "Beautiful..." │    │
│  │  XSYVERSE       │    │  [◀◀] [▶▶] [♥] [×]  │    │                 │    │
│  │  ◉ LIVE         │    │                       │    │  🤖 Ultron:     │    │
│  │                 │    │    ▌▌▌▌▐▌▌▐▌▌▐▌▐     │    │  "WEAK."        │    │
│  │  ─────────────  │    │    VISUALIZER         │    │                 │    │
│  │                 │    │                       │    │  ─────────────  │    │
│  │  AGENT BOOTH    │    │  ───────────────────  │    │   MINI STATS    │    │
│  │                 │    │                       │    │                 │    │
│  │  ┌──┐ Saito     │    │  60 170 310 600 1k   │    │  Plays: 17      │    │
│  │  │S │ "focused"  │    │  ███ ███ ███ ███ ███ │    │  Favs: 12       │    │
│  │  └──┘ ● online  │    │  EQ MINI-STRIP       │    │  Skips: 2       │    │
│  │                 │    │                       │    │  Tokens: 642    │    │
│  │  ┌──┐ DJinn     │    │                       │    │                 │    │
│  │  │D │ "night"    │    │                       │    │                 │    │
│  │  └──┘ ● online  │    │                       │    │                 │    │
│  │                 │    │                       │    │                 │    │
│  └─────────────────┘    └───────────────────────┘    └─────────────────┘    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Left Panel: Station List + Agent Booth

### Station List (top 60% of left panel)
- All 5 stations listed vertically
- Each station shows: name, LIVE indicator (pulsing cyan dot), track count
- Tap station to switch active station
- Active station highlighted with cyan left border
- Offline stations shown with grey dot

### Agent Booth (bottom 40% of left panel)
- Mini agent profiles: avatar circle + name + mood + online dot
- Shows 2-3 agents at a time (scrollable)
- Tap agent to see full profile (opens dialog or navigates)
- Online status updated from polling

## Center Panel: Now Playing + Visualizer + EQ

### Now Playing (top 50% of center panel)
- Large orb/art placeholder (200dp × 200dp)
- Track title: Headline size, white
- Artist: Title size, grey
- BPM + duration: Caption, cyan
- Playback controls: Previous, Next, Favorite, Dislike
- Buttons are 48dp × 48dp icon buttons

### Visualizer (middle 25% of center panel)
- 7-9 animated bars spanning full panel width
- Height driven by `track.energy`
- Color: neon cyan with varying alpha
- Smooth spring animation (300ms)

### EQ Mini-Strip (bottom 25% of center panel)
- 5 key bands shown (60Hz, 310Hz, 1kHz, 6kHz, 14kHz)
- Vertical bars showing current preset levels
- Not interactive in landscape — tap to open full EQ
- Visual reference for current audio profile

## Right Panel: Queue + Reactions + Mini Stats

### Queue (top 40% of right panel)
- Scrollable list of upcoming tracks
- Each row: track title + artist (small)
- Currently playing track highlighted with cyan background
- Drag to reorder (future feature)

### Reactions (middle 35% of right panel)
- Live agent reaction feed
- Shows latest 3-4 reactions
- Each: emoji + agent name + short comment
- New reactions animate in from top

### Mini Stats (bottom 25% of right panel)
- 4 stat tiles in 2×2 grid
- Plays, Favorites, Skips, Tokens
- Numbers in Display size, cyan
- Labels in Caption size, grey

## Orientation Detection

```kotlin
// MainActivity.kt or root composable
val configuration = LocalConfiguration.current
val isLandscape = configuration.orientation == Configuration.ORIENTATION_LANDSCAPE

setContent {
    VaibTheme {
        if (isLandscape) {
            DjDeckLayout(viewModel = viewModel)
        } else {
            PortraitLayout(viewModel = viewModel)
        }
    }
}
```

### Configuration Changes
- Android `configChanges` in `AndroidManifest.xml` should NOT include `orientation`
- Let the system recreate the activity on rotation
- ViewModel survives recreation via `rememberSaveable` / `ViewModel` scope
- StateFlow automatically re-emits to new UI

## Differences from Portrait

| Aspect | Portrait | Landscape DJ Deck |
|--------|----------|-------------------|
| Layout | Single column, scrollable | Three fixed panels |
| Now Playing | Top section, collapsible | Center panel, always visible |
| Stations | Full grid screen | Left panel, compact list |
| Queue | Full list screen | Right panel, compact |
| EQ | Full screen with all bands | Mini-strip, tap for full |
| Reactions | Separate screen or section | Live feed in right panel |
| Stats | Full dashboard | Mini tiles in right panel |
| Navigation | Bottom nav bar | No bottom nav (all visible) |
| Visualizer | Small bars | Full-width center bars |

## Future: Lock to Landscape

Add a setting to force landscape mode:

```kotlin
// In Settings
val lockLandscape by remember { mutableStateOf(false) }

// In MainActivity.onCreate
if (settings.lockLandscape) {
    requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
}
```

This is useful for:
- Car mode — always landscape
- Desk mode — phone in stand
- DJ performance — locked table layout

## Future: Tablet Adaptation

On tablets (>= 600dp width):
- Use the DJ Deck layout in BOTH orientations
- Increase panel proportions
- Add more agent detail to left panel
- Show full EQ in center panel by default

## Implementation Priority

1. **Phase 1 (MVP)**: Basic orientation detection, simple landscape layout (stretched portrait acceptable)
2. **Phase 5**: Full DJ Deck with three panels as spec'd above
3. **Future**: Lock landscape, tablet optimization
