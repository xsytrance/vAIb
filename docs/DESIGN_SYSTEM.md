# vAIb Design System

## Philosophy

vAIb is a **cyberpunk radio scanner** crossed with an **agent command deck**. It is not a consumer music app. It is a cockpit for controlling an AI agent music network.

Design principles:
1. **Dark AMOLED first** — every pixel matters on OLED
2. **Neon accents** — cyan, gold, magenta signal different system states
3. **Information density** — agents show metrics, not just album art
4. **Motion is data** — visualizers react to track energy, not just decoration
5. **No light theme** — vAIb is a night-mode tool

## Color Palette

### Surface Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `Surface` | `#000000` | Background, pure black for AMOLED |
| `SurfaceElevated` | `#0A0A0A` | Cards, panels |
| `SurfaceHighlight` | `#141414` | Selected rows, hover states |
| `BorderSubtle` | `#1E1E1E` | Dividers, card borders |
| `BorderActive` | `#2A2A2A` | Focused element borders |

### Accent Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `PrimaryNeonCyan` | `#00E5FF` | Primary action, active station, EQ highlight |
| `SecondaryGold` | `#FFD700` | Favorites, achievements, agent status |
| `TertiaryMagenta` | `#FF00A0` | Reactions, alerts, agent activity |
| `QuaternaryLime` | `#39FF14` | Online status, success, connectivity |
| `WarningAmber` | `#FFAB00` | Warnings, token budget low |
| `DangerRed` | `#FF3D00` | Errors, dislikes, offline indicator |

### Text Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `TextPrimary` | `#FFFFFF` | Headlines, track titles |
| `TextSecondary` | `#B0B0B0` | Artists, descriptions |
| `TextTertiary` | `#666666` | Timestamps, metadata |
| `TextDisabled` | `#444444` | Inactive controls |

### Semantic Mapping
| Element | Color Token |
|---------|------------|
| App background | `Surface` |
| Card background | `SurfaceElevated` |
| Primary button | `PrimaryNeonCyan` |
| Favorite button | `SecondaryGold` |
| Active station | `PrimaryNeonCyan` glow |
| Agent online dot | `QuaternaryLime` |
| Agent offline dot | `DangerRed` |
| EQ bars | Gradient: cyan → magenta |
| Visualizer | `PrimaryNeonCyan` with alpha |
| Toast notification | `SurfaceElevated` + left border accent |
| Error banner | `DangerRed` at 15% opacity |

## Typography Scale

| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| `Display` | 32sp | Bold | App title, big numbers |
| `Headline` | 22sp | SemiBold | Screen titles, station names |
| `Title` | 18sp | Medium | Track titles, agent names |
| `Body` | 14sp | Regular | Descriptions, comments |
| `Label` | 12sp | Medium | Buttons, chips, pills |
| `Caption` | 10sp | Regular | Timestamps, metadata |

### Font Family
- Default system sans-serif (Roboto on Samsung devices)
- Monospace for agent metrics and stats (`FontFamily.Monospace`)
- No custom font files — keep APK small

## Component Catalog

### VaibCard
Container for any content block.
```
┌────────────────────────────┐
│  SurfaceElevated bg        │
│  Border: 1dp BorderSubtle  │
│  Corner radius: 12dp       │
│  Padding: 16dp             │
│  Optional: glow border     │
└────────────────────────────┘
```
- Glow variant: 2dp border in PrimaryNeonCyan at 50% alpha
- Used for: now playing, agent profile, settings panels

### StatusPill
Online/offline indicator with label.
```
┌────────────────────┐
│  ● Online  "Saito" │
└────────────────────┘
```
- Dot: 8dp circle, lime for online, red for offline
- Text: Label size, TextSecondary
- Background: SurfaceHighlight, rounded full

### AgentChip
Horizontal chip with avatar circle + name.
```
┌──────────────────────────┐
│  ┌──┐  Saito  ●         │
│  │S │  "signal glow"     │
│  └──┘                   │
└──────────────────────────┘
```
- Avatar: 32dp circle, SurfaceHighlight bg, first letter
- Name: Title size, TextPrimary
- Mood: Body size, TextSecondary below name
- Tap: navigates to agent detail

### StationCard
Grid tile for a radio station.
```
┌──────────────────────┐
│  Prime Pulse Radio   │
│  ◉ LIVE              │
│  12 tracks queued    │
│  ▶ Play              │
└──────────────────────┘
```
- Size: fill half screen width minus padding
- LIVE indicator: pulsing 8dp circle, Cyan
- Track count: Caption, TextTertiary
- Play button: full width, PrimaryNeonCyan bg
- Tap (non-play): navigates to station detail

### TrackCard
Row in a list showing track info.
```
┌────────────────────────────────────┐
│  ○  Aurora Thread        5:42     │
│     Neon Veins   ♥ ★     138 BPM │
└────────────────────────────────────┘
```
- Leading: play indicator (○ playing, ○ queued)
- Title: Title size, TextPrimary
- Artist: Body size, TextSecondary
- Duration: Caption, TextTertiary, right-aligned
- BPM: Caption, TextTertiary
- Favorite: ★ icon, Gold if favorited
- Swipe: reveal favorite / dislike actions

### StatTile
Grid box for a single stat.
```
┌─────────────┐
│  17         │
│  Total Plays │
└─────────────┘
```
- Number: Display size, PrimaryNeonCyan
- Label: Caption size, TextSecondary
- Background: SurfaceElevated
- Size: flexible grid cell (min 80dp)

### EqualizerBand
Single slider for one EQ frequency.
```
┌──────────┐
│  1kHz    │
│  ┌────┐  │
│  │████│  │
│  │████│  │
│  │    │  │
│  └────┘  │
│  +3dB    │
└──────────┘
```
- Frequency label: Caption, TextSecondary, above
- Slider: vertical, 120dp tall, Cyan fill
- Value: Caption, PrimaryNeonCyan, below
- Range: -12dB to +12dB

### VisualizerBars
Animated audio visualizer.
- 5-7 vertical bars
- Height animates based on track `energy` value
- Color: PrimaryNeonCyan at varying alpha
- Bar width: 8dp, gap: 4dp
- Animation: smooth spring, 300ms
- Bar heights derived from `track.energy / 100 * maxHeight`

### ReactionBadge
Agent reaction to a track.
```
┌────────────────────────────┐
│  🎵 Saito: "Beautiful..."  │
│  💜 Loved this             │
└────────────────────────────┘
```
- Emoji: 16dp, leading
- Agent name: Label size, bold
- Comment: Body size, TextSecondary (max 2 lines)
- Reaction type: colored indicator (♥ = magenta, × = red)
- Background: SurfaceHighlight

### TokenBudgetPill
Shows remaining AI tokens for the session.
```
┌────────────────┐
│  Tokens: 642/800│
└────────────────┘
```
- Text: Caption size
- Color: Lime (>200), Amber (50-200), Red (<50)
- Background: SurfaceHighlight, rounded full
- Updates in real-time as agents comment

## Spacing and Layout

### Base Grid
- Base unit: 8dp
- Screen padding: 16dp (2 units)
- Card padding: 16dp
- Between cards: 12dp
- Between related items: 8dp
- Between unrelated items: 16dp

### Screen Layout (Portrait)
```
┌─────────────────────────────┐
│  Status bar (system)        │
├─────────────────────────────┤
│  App bar (optional)         │  56dp
├─────────────────────────────┤
│                             │
│  Content area               │  flexible
│  (scrollable)               │
│                             │
├─────────────────────────────┤
│  Bottom navigation          │  80dp
├─────────────────────────────┤
│  Navigation bar (system)    │
└─────────────────────────────┘
```

### Card Layout Inside
```
┌─────────────────────────────┐
│  16dp                       │
│      ┌───────────────────┐  │
│ 16dp │  Title            │  │
│      │  Subtitle         │  │
│      │                   │  │
│      │  Content          │  │
│      │                   │  │
│      │  [Action button]  │  │
│ 16dp └───────────────────┘  │
│  16dp                       │
└─────────────────────────────┘
```

## Animation Guidelines

### Transitions
- Screen enter: fade in 200ms
- Bottom nav switch: horizontal slide 150ms
- Card tap: scale to 0.97, 100ms

### Micro-interactions
- Button press: background brightens 10%, 50ms
- Favorite tap: star scales 1.0 → 1.3 → 1.0, 200ms spring
- Play state change: icon crossfade, 150ms
- Offline banner: slide down from top, 200ms

### Continuous Animations
- Station "LIVE" dot: pulse scale 1.0 → 1.3 → 1.0, 1.5s loop
- Visualizer bars: spring-based height changes, 300ms
- EQ slider: immediate (no animation — must feel responsive)
- Now playing orb: slow rotation or pulse, 4s loop

## Theme Implementation (Compose)

```kotlin
// Color.kt
val PrimaryNeonCyan = Color(0xFF00E5FF)
val SecondaryGold = Color(0xFFFFD700)
val TertiaryMagenta = Color(0xFFFF00A0)
val QuaternaryLime = Color(0xFF39FF14)
val WarningAmber = Color(0xFFFFAB00)
val DangerRed = Color(0xFFFF3D00)
val Surface = Color(0xFF000000)
val SurfaceElevated = Color(0xFF0A0A0A)
val SurfaceHighlight = Color(0xFF141414)
val BorderSubtle = Color(0xFF1E1E1E)
val TextPrimary = Color(0xFFFFFFFF)
val TextSecondary = Color(0xFFB0B0B0)
val TextTertiary = Color(0xFF666666)

// Theme.kt
@Composable
fun VaibTheme(content: @Composable () -> Unit) {
    val colorScheme = darkColorScheme(
        primary = PrimaryNeonCyan,
        secondary = SecondaryGold,
        tertiary = TertiaryMagenta,
        background = Surface,
        surface = SurfaceElevated,
        onPrimary = Color.Black,
        onBackground = TextPrimary,
        onSurface = TextPrimary,
    )
    MaterialTheme(
        colorScheme = colorScheme,
        typography = VaibTypography,
        content = content
    )
}
```

## Important Rules

1. **No light theme.** `isSystemInDarkTheme()` is ignored.
2. **Pure black background.** `#000000`, not `#121212`.
3. **Neon accents sparingly.** Max one accent per component.
4. **Information over decoration.** Every element communicates state.
5. **Consistent 8dp grid.** All spacing is a multiple of 8.
