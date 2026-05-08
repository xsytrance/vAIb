# vAIb Music Cockpit UX Plan

**Document:** VAIB_MUSIC_COCKPIT_UX_PLAN.md
**Version:** 1.0
**Branch:** prime-stabilization
**Status:** Planning Only -- No Implementation
**Last Updated:** 2025-01-20

---

## Table of Contents

1. [Status](#1-status)
2. [Music Safety Confirmation](#2-music-safety-confirmation)
3. [Visualizer-First Cockpit -- 8 Layout Options](#3-visualizer-first-cockpit----8-layout-options)
4. [Visualizer Style System](#4-visualizer-style-system)
5. [Gesture and Interaction Plan](#5-gesture-and-interaction-plan)
6. [Information Layering -- Level 0 to Level 3](#6-information-layering----level-0-to-level-3)
7. [Resonance Trace](#7-resonance-trace)
8. [Prime Nexus Cockpit Relationship](#8-prime-nexus-cockpit-relationship)
9. [Intranet / Solar-Ops Search Plan](#9-intranet--solar-ops-search-plan)
10. [Visual Design Direction Update](#10-visual-design-direction-update)
11. [Implementation Options Audit](#11-implementation-options-audit)
12. [Risks](#12-risks)
13. [Recommended Next Slice](#13-recommended-next-slice)
14. [Waiting](#14-waiting)

---

## 1. STATUS

**Mission:** Design the music cockpit experience plan for vAIb.

**Scope:** Planning only. No implementation. No code changes. Pure architecture and UX design document.

**Branch:** prime-stabilization

**Context:** The vAIb Android app (`com.xsytrance.vaib`) is an agent-native music cockpit built on Jetpack Compose with an AMOLED-first dark theme. The current CockpitScreen.kt (`android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/ui/screens/CockpitScreen.kt`) buries the audio visualizer at ~576dp scroll depth, rendering it invisible on launch. This document plans the fix and the full surrounding UX architecture.

**Key Files Under Analysis:**
- `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/ui/screens/CockpitScreen.kt` (298 lines)
- `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/ui/components/VisualizerBars.kt` (96 lines)
- `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/ui/screens/LandscapeDjDeck.kt` (308 lines)
- `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/ui/theme/Color.kt` (24 lines)
- `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/ui/theme/Type.kt` (40 lines)
- `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/ui/components/VaibCard.kt` (44 lines)
- `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/ui/fx/core/VaibMotion.kt` (146 lines)
- `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/ui/screens/SettingsScreen.kt` (596 lines)

**Design Principles (invariant):**
1. **Music is sovereign.** The visualizer and now-playing information are the most important elements.
2. **Calm over spectacle.** No flashing alerts, no aggressive animations. Whisper-quiet atmosphere.
3. **Glanceable by default.** Everything important visible within 1 second of looking at the screen.
4. **AMOLED-first.** 60%+ of any screen is `#000000` at all times.
5. **Touch-friendly.** Minimum 48dp touch targets. No cramped controls.
6. **Information-rich only when requested.** Expandable layers, not dense dashboards.

---

## 2. MUSIC SAFETY CONFIRMATION

### Protected Boundary List -- ZERO CHANGES PERMITTED

The following files, functions, and behaviors are under **absolute protection**. No UI plan may propose changes to them. This plan is UI-only.

| File/Function | Reason for Protection |
|---|---|
| `AudioBackbone.kt` -- ExoPlayer initialization, `playStation()`, `togglePlayPause()`, `bindListener()` | Core playback engine. Any change risks audio failure. |
| `VaibViewModel.playStation()` | Station selection + playback orchestration |
| `VaibViewModel.togglePlayPause()` | Play/pause toggle |
| `VaibViewModel.syncPlaybackState()` | Playback state synchronization |
| `VaibViewModel.bindPlayer()` | Player listener binding |
| `VaibViewModel.init` auto-play (line 246 area) | Startup auto-play behavior |
| `VaibViewModel.playDjInterstitial()` | DJ interstitial playback |
| `VaibViewModel.playNarrationFile()` | TTS narration playback |
| ExoPlayer URI resolution (`resolveUri()`) | Stream URL resolution logic |
| `Station.streamUrl` | Read-only for display. Never modify. |
| `Station.fallbackLocalTrack` | Read-only for display. Never modify. |
| `Station.playbackMode` | Read-only for display. Never modify. |
| `Track.reason` | Read-only for Resonance Trace source data |

### What CAN Change (UI-Only Boundary)

| Category | Examples |
|---|---|
| Layout order | Reorder LazyColumn items |
| Typography scale | Change font sizes (sp) |
| Card composition | Combine, split, or remove cards |
| Visualizer position | Move within or above LazyColumn |
| Gesture handlers | Add tap/long-press/swipe detectors |
| Information display | What text appears where |
| Card removals | Remove cards from Cockpit |
| Color usage | Apply existing theme colors differently |
| Spacing and padding | Adjust dp values |
| Component visibility | Show/hide elements based on state |

**Verification rule:** If a change would require modifying any line in `AudioBackbone.kt` or any playback-related function in `VaibViewModel.kt`, it is OUT OF SCOPE for this plan and all future implementation.

---

## 3. VISUALIZER-FIRST COCKPIT -- 8 LAYOUT OPTIONS

### Current Problem Statement

The visualizer in `CockpitScreen.kt` (line 211-226) is positioned inside a `VaibCard` after 8 preceding content blocks. On a **Pixel 6** (viewport ~780dp):

| Block | Estimated Height | Cumulative Depth |
|---|---|---|
| Header ("vAIb" 32sp + subtitle 14sp + padding) | ~92dp | 92dp |
| Status row (4 elements + padding) | ~56dp | 148dp |
| Route telemetry text (11sp) | ~28dp | 176dp |
| On Air card (5 lines + padding) | ~120dp | 296dp |
| Connector Health (header + cards + sync) | ~116dp | 412dp |
| StationCard (7 text elements + padding) | ~132dp | 544dp |
| Now Broadcasting card (5 elements + padding) | ~120dp | 664dp |
| **VISUALIZER** (64dp bars + 12sp label + padding) | ~92dp | **756dp** |

The visualizer begins at **~664dp depth** and is itself **92dp tall**. On a 780dp viewport, only the top ~16dp of the visualizer is visible at maximum scroll -- effectively invisible.

---

### Option 1: Hero Visualizer at Top

**Layout Description:**
The `VisualizerBars` composable is moved to the very first item in the `LazyColumn`, before the header. Height expanded from 64dp to **120-160dp**. Full width (`fillMaxWidth`), no card wrapping, no "Visualizer" label text. The visualizer floats directly on the `#000000` background. The Now Broadcasting card immediately follows. All other content (On Air, Connector Health, Queue, Reactions) is pushed below.

```
[LazyColumn]
|-- VisualizerBars (120-160dp, full width, no card, no label)
|-- Header ("vAIb" 32sp + subtitle 14sp) -- reduced to 24sp/12sp
|-- Status row (4 elements)
|-- Now Broadcasting card (track title 24sp + artist 18sp + agent + BPM)
|-- On Air card
|-- StationCard
|-- Queue preview
|-- (remaining content)
```

**Visible without scrolling (Pixel 6, 780dp):**
- Full visualizer (120-160dp)
- Header (~64dp reduced)
- Status row (~56dp)
- Top portion of Now Broadcasting card (~60dp)
- Total: ~300-340dp -- all primary music info visible

**Pros:**
1. Visualizer is THE dominant element -- unmistakably the app's identity
2. Zero scroll needed to see the visualizer -- problem fully solved
3. Simplest implementation: cut-paste to top of LazyColumn, adjust height
4. The "living" visualizer makes the app feel active immediately on launch
5. Matches the visual priority of the LandscapeDjDeck (center column has visualizer prominent)

**Cons:**
1. 120-160dp is a large footprint -- pushes substantial content below fold
2. Visualizer alone conveys no music information (no track title/artist)
3. Risk of visual overwhelm if visualizer is too tall (calmness violation)
4. On smaller devices (640dp viewport), visualizer + header consumes 50% of screen
5. The header below the visualizer feels inverted (logo should usually be top)

**Screen space cost:**
- On Air card pushed from 296dp to ~420dp depth (below fold on small devices)
- Connector Health pushed to ~540dp (well below fold)
- Queue section pushed to ~720dp (requires scroll on all devices)

**Info visibility:**
- Visualizer: visible immediately (GOOD)
- Track title/artist: partially visible or just below fold
- On Air, Connector Health, Queue: all require scroll

**Risk to calmness:**
- MEDIUM. A 160dp animated visualizer at top is inherently attention-grabbing.
- Mitigation: keep at lower end (120dp), use reduced color intensity

**Estimated implementation complexity:** LOW (1-2h)

---

### Option 2: Now Playing + Visualizer Combined Card

**Layout Description:**
A single large `VaibCard` with `neonGlow=true` combines track information and the visualizer. Card uses `SurfaceElevated` background. Layout within the card:

```
[VaibCard (neonGlow=true)]
|-- "Now Broadcasting" label (12sp, PrimaryNeonCyan)
|-- Track title (24sp Bold, TextPrimary)
|-- Artist name (18sp, TextSecondary)
|-- Row: AgentChip( onAirAgentId ) + BPM + outputMode
|-- Spacer (4dp)
|-- VisualizerBars (96-120dp height, 32 bars, fillMaxWidth)
```

Card has 12dp internal padding. Total card height: ~260-290dp.

This combined card is positioned at the TOP of the LazyColumn (item 1 or 2), below only a minimal header.

```
[LazyColumn]
|-- Compact header: "vAIb" 24sp + subtitle 12sp (reduced from 32sp/14sp)
|-- [COMBINED CARD: Now Playing + Visualizer] (~280dp)
|-- Status row
|-- On Air card
|-- StationCard
|-- Queue preview
|-- (remaining)
```

**Visible without scrolling (Pixel 6, 780dp):**
- Compact header (~56dp)
- Combined Now Playing card (~280dp)
- Total: ~336dp visible -- full track info + full visualizer visible

**Pros:**
1. Track info and visualizer are contextually unified -- "this music produces these visuals"
2. The card border (`neonGlow=true`) frames both elements as a single unit
3. 96-120dp visualizer is prominent without dominating the screen
4. No content is pushed further down than Option 1 (header is compact)
5. Clean information hierarchy: music identity (card) + operational details (below)

**Cons:**
1. The card is large (~280dp) -- still pushes a lot below fold
2. Visualizer inside a card loses the "floating on black" aesthetic
3. Card border competes with visualizer for visual attention
4. If track title is long (wraps 2 lines), card grows taller, compressing below-fold content
5. The label "Now Broadcasting" + label "Visualizer" are redundant -- combine into one

**Screen space cost:**
- Combined card replaces separate Now Broadcasting (~120dp) + Visualizer card (~92dp) = 212dp
- Net increase: ~68-78dp vs current layout
- On Air starts at ~340dp (visible on large devices, below fold on small)

**Info visibility:**
- Track title/artist/BPM/agent: visible immediately (GOOD)
- Visualizer: visible immediately (GOOD)
- On Air: visible on large devices, below fold on small
- Connector Health, Queue: below fold on all devices

**Risk to calmness:**
- LOW-MEDIUM. The card contains the visualizer, so the "living" element is framed. The border provides visual containment.
- Neon glow on the card adds energy but is consistent with "currently playing" importance.

**Estimated implementation complexity:** LOW (1-2h)

---

### Option 3: Full-Width Mini Visualizer Behind Now Playing

**Layout Description:**
The `VisualizerBars` is rendered as a **background layer** behind the Now Broadcasting card content. The visualizer is at **40% opacity**, height **96dp**, positioned at the bottom of the card area. Track title and artist are overlaid on top with full opacity text.

```
[Box (fillMaxWidth)]                           <- background container
|-- VisualizerBars(                           <- background layer
|     modifier = Modifier.fillMaxWidth().height(96dp).alpha(0.4f)
|   )
|-- Column (                                   <- foreground layer
|     Track title 24sp Bold (TextPrimary)
|     Artist 18sp (TextSecondary)
|     Row: AgentChip + BPM
|   )
```

The visualizer creates a "living background" effect within the Now Playing area. Bars animate behind the text, visible but subdued.

```
[LazyColumn]
|-- Header ("vAIb" 32sp + subtitle)
|-- Status row
|-- [Now Playing Card with visualizer background] (~160dp total)
|-- On Air card
|-- StationCard
|-- Queue preview
|-- (remaining)
```

**Visible without scrolling (Pixel 6, 780dp):**
- Header + status row + Now Playing card with living background all visible
- Visualizer is immediately present as atmosphere, not as a separate element

**Pros:**
1. Most space-efficient: visualizer adds ~0dp to vertical footprint (replaces card background)
2. Creates a unique "living background" aesthetic -- no other music app does this
3. Track info and visualizer are perfectly unified spatially
4. No additional scrolling penalty -- content positions unchanged
5. The reduced opacity (40%) maintains calmness while providing motion

**Cons:**
1. Text-over-visualizer requires careful contrast management
2. At 40% opacity, the visualizer may be too subtle to notice
3. Busy track titles + busy visualizer patterns = readability risk
4. Does not solve the "visualizer is invisible" problem if opacity is too low
5. Bars animating behind text can be distracting (calmness risk)

**Screen space cost:**
- Zero additional cost. Visualizer replaces the card's solid background.
- All content stays at current scroll positions.

**Info visibility:**
- All current content stays at same scroll depth
- Visualizer visible immediately (but subtle)
- Trade-off: subtlety vs. prominence

**Risk to calmness:**
- LOW. The subdued opacity and containment within the card keep it calm.
- Risk: if visualizer bars are too bright even at 40%, text readability suffers.

**Estimated implementation complexity:** MEDIUM (2-3h) -- requires Box-with-overlay layout, contrast testing

---

### Option 4: Compact Always-Visible Visualizer Strip

**Layout Description:**
The visualizer is moved **outside the LazyColumn** entirely. It lives as a **fixed strip** in a parent `Column` that wraps the LazyColumn. The strip is **32-40dp tall**, full width, pinned at the top of the screen. It is always visible regardless of scroll position. The LazyColumn contains all other content and scrolls independently underneath.

```kotlin
// Parent layout structure:
Column(modifier = Modifier.fillMaxSize()) {
    // Pinned visualizer strip (always visible)
    VisualizerBars(
        modifier = Modifier.fillMaxWidth().height(36.dp),
        barCount = 32,          // more bars for finer strip
        barSpacing = 1.dp,      // tighter spacing
        horizontalPadding = 0.dp // edge to edge
    )
    
    // Scrollable content (everything else)
    LazyColumn(modifier = Modifier.fillMaxSize().weight(1f)) {
        // Header
        // Status row
        // Now Broadcasting (without separate visualizer)
        // On Air
        // StationCard
        // Queue
        // ...
    }
}
```

**Strip specs:**
- Height: **36dp** (sweet spot between visible and unobtrusive)
- Bar count: 32 (finer bars for strip density)
- Bar spacing: 1.dp
- Horizontal padding: 0dp (edge-to-edge)
- Corner radius: 0dp (flat strip, no rounding)
- Color intensity: 0.85f (slightly more intense than default 0.75f for visibility at small size)
- Background: transparent (floats on `#000000`)

**Visible without scrolling (Pixel 6, 780dp):**
- Visualizer strip (36dp) -- ALWAYS visible, pinned
- Full LazyColumn content below, starting with header
- Even when scrolled to bottom (Queue/Reactions), visualizer strip remains visible at top

**Pros:**
1. **Visualizer is ALWAYS visible** -- solves the #1 problem permanently
2. Smallest screen space cost of all options (36dp fixed)
3. No content is pushed down -- all LazyColumn items remain at current positions
4. Creates a "status bar" feel -- the visualizer becomes a persistent ambient indicator
5. On smaller devices (640dp), only 36dp is consumed -- maximum content preservation
6. The strip format is distinctive and recognizable as vAIb's identity
7. Low cognitive load: user always knows music is playing (or not) from the strip
8. Matches the concept of a "cockpit" -- persistent instrument panel at top

**Cons:**
1. 36dp is small -- visualizer loses visual impact (it's an indicator, not a feature)
2. Fixed position above scrolling content creates a visual "seam"
3. The visualizer may feel like a "progress bar" rather than an audio visualizer at this size
4. Takes 36dp from the already-limited vertical space on small devices
5. May conflict with system status bar on some devices (need safe area handling)

**Screen space cost:**
- 36dp fixed from top of screen
- All LazyColumn content shifted down by 36dp
- Net effect: Queue section starts 36dp lower than current layout
- Minimal impact

**Info visibility:**
- Visualizer: always visible, always glanceable (GOOD)
- All other content: unchanged scroll positions (relative to each other)
- No information is pushed significantly further down

**Risk to calmness:**
- LOW. 36dp strip is subtle. The animation is confined to a narrow band.
- The persistent motion at top could be mildly distracting to some users.
- Mitigation: strip is thin enough to be peripheral vision friendly.

**Estimated implementation complexity:** LOW (1-2h) -- requires wrapping LazyColumn in Column, moving visualizer out

---

### Option 5: Expandable Visualizer Theater Mode

**Layout Description:**
The visualizer has two states: **Compact** (default) and **Theater** (expanded). User toggles between them via tap or swipe gesture.

**Compact state:**
- Height: 64dp (current size)
- Position: elevated in LazyColumn order (moved above On Air/Connector Health, below Now Broadcasting)
- Inside a VaibCard with minimal padding

**Theater state:**
- Height: 200-240dp
- Full width, no card wrapping
- Background darkens to `#0A0A0A` (SurfaceDark)
- All other content below is still visible but visually deprioritized
- Animation: `animateHeightAsState` over **300ms** with `FastOutSlowInEasing`

```
[LazyColumn]
|-- Header
|-- Status row
|-- Now Broadcasting card
|-- [VISUALIZER: 64dp compact OR 200-240dp theater] <- tap to toggle
|-- On Air card
|-- StationCard
|-- Queue preview
|-- ...
```

**Gesture:**
- Tap visualizer: toggle between compact and theater
- Vertical swipe up on visualizer: expand to theater
- Vertical swipe down on visualizer: collapse to compact

**Visible without scrolling (Pixel 6, 780dp) -- Compact:**
- Header + status + Now Broadcasting + compact visualizer all visible
- Same as current layout but with visualizer higher in order

**Visible without scrolling -- Theater:**
- Header + status + Now Broadcasting visible
- Visualizer dominates the remaining viewport
- On Air card partially visible or just below fold

**Pros:**
1. User controls visualizer prominence -- adaptive to preference
2. Default compact state preserves all current scroll positions
3. Theater mode provides immersive visualizer experience on demand
4. The expand/collapse animation is satisfying and discoverable
5. Best of both worlds: minimal default, maximum when wanted
6. Gesture-based control feels natural and tactile

**Cons:**
1. Requires gesture handling implementation (tap, vertical swipe detection)
2. Two states = more complex composable logic
3. Theater mode pushes significant content below fold
4. User may not discover the tap-to-expand gesture
5. Frequent expand/collapse could feel flickery or annoying
6. The animation (300ms) may feel slow on repeated toggles

**Screen space cost (compact):**
- Same as current visualizer position but reordered
- Net: visualizer moves up in LazyColumn, nothing pushed further down

**Screen space cost (theater):**
- 240dp visualizer pushes On Air to ~380dp, Connector Health to ~500dp
- Significant content pushed below fold

**Info visibility:**
- Compact: all info at current visibility levels
- Theater: visualizer dominates, other info deprioritized

**Risk to calmness:**
- LOW (compact) to MEDIUM (theater). Theater mode is intentionally more energetic.
- The expansion animation is smooth (FastOutSlowInEasing) which preserves calmness.

**Estimated implementation complexity:** MEDIUM (3-4h) -- requires state management, gesture detection, animation

---

### Option 6: Swipeable Visualizer Carousel

**Layout Description:**
The visualizer area is a **horizontal pager** (3 pages) that occupies the visualizer's current position (elevated in the LazyColumn order). The visualizer is inside a card that acts as the pager container.

```
[LazyColumn]
|-- Header
|-- Status row
|-- Now Broadcasting card
|-- [VISUALIZER CAROUSEL CARD] (120dp height)
|     |-- Page 1: Classic Bars (existing VisualizerBars, 24 bars)
|     |-- Page 2: Waveform Ribbon (placeholder stub)
|     |-- Page 3: Pulse Ring (placeholder stub)
|     |-- Page indicator: 3 dots, 6dp each, 4dp spacing, below pager
|-- On Air card
|-- StationCard
|-- Queue preview
|-- ...
```

**Pager specs:**
- Container height: 120dp
- Page count: 3
- Swipe: horizontal, natural gesture
- Page indicator: 3 dots, positioned at bottom of card, 6dp diameter each
- Active dot: PrimaryNeonCyan, inactive: TextMuted at 40% alpha
- Crossfade between pages: 200ms

**Page details:**
- Page 1 (Classic Bars): `VisualizerBars(barCount=24, height=96dp)` -- existing implementation
- Page 2 (Waveform Ribbon): Placeholder -- single smooth curved line, Canvas-based, stub for future
- Page 3 (Pulse Ring): Placeholder -- concentric circles with pulsing radius, Canvas-based, stub for future

**Visible without scrolling (Pixel 6, 780dp):**
- Header + status + Now Broadcasting + visualizer carousel all visible
- All primary info + visualizer choice visible without scroll

**Pros:**
1. Provides visual variety without overwhelming the user
2. The pager pattern is familiar (swipeable tabs/cards)
3. Page indicator provides clear affordance of multiple options
4. Classic Bars (page 1) works immediately; placeholders set up future styles
5. The 120dp height is a good compromise between visibility and screen cost

**Cons:**
1. Placeholder pages (Waveform, Pulse) provide no value until implemented
2. Horizontal swipe on visualizer may conflict with parent navigation gestures
3. Pager container adds complexity (HorizontalPager dependency)
4. Page indicator dots add visual noise
5. Users may not discover the swipe gesture
6. The carousel concept competes with the "calm, single focus" design principle

**Screen space cost:**
- 120dp carousel replaces the current 92dp visualizer card = +28dp
- On Air pushed down by 28dp (minor)

**Info visibility:**
- Visualizer visible immediately (GOOD)
- All other content at near-current scroll positions

**Risk to calmness:**
- MEDIUM. Swiping between visualizer styles is inherently playful/active.
- Multiple visualizer options create decision fatigue.
- The pager dots add visual clutter.

**Estimated implementation complexity:** MEDIUM (3-4h) -- requires HorizontalPager, placeholder stubs, page indicator

---

### Option 7: Lockscreen-Style Now Playing View

**Layout Description:**
The Cockpit becomes a **lockscreen-style** large-format Now Playing view. The layout is completely restructured:

```
[LazyColumn]
|-- [NOW PLAYING HERO SECTION] (400-480dp total, fills most of viewport)
|     |-- VisualizerBars (160dp, full width, no card)
|     |-- Spacer (16dp)
|     |-- Track title (28sp, Bold, centered)
|     |-- Artist (18sp, centered)
|     |-- Spacer (8dp)
|     |-- Row: [<<] [PLAY/PAUSE] [>>] (large icons, 56dp touch targets)
|     |-- Spacer (8dp)
|     |-- Station name (14sp, centered, TextSecondary)
|     |-- AgentChip (onAirAgentId, centered)
|-- [DETAILS SECTION] (collapsible, starts collapsed)
|     |-- "Show Details" toggle
|     |-- On Air card
|     |-- StationCard
|     |-- Connector Health
|-- [QUEUE SECTION]
|     |-- Queue preview
|-- [REACTIONS SECTION]
|     |-- Reactions preview
```

**Hero section specs:**
- Background: pure `#000000` (no card)
- Alignment: `Alignment.CenterHorizontally` for all elements
- Visualizer: 160dp, `fillMaxWidth`, acts as "album art" replacement
- Track title: 28sp Bold, `TextAlign.Center`, max 2 lines, ellipsize end
- Artist: 18sp, `TextAlign.Center`, max 1 line
- Playback controls: three `IconButton`s, each 56dp min touch target
- Station: 14sp, `TextSecondary`
- AgentChip: centered, uses actual `onAirAgentId` from AppState

**Visible without scrolling (Pixel 6, 780dp):**
- The entire hero section (400-480dp) fills most of the viewport
- Playback controls visible and tappable without scroll
- "Show Details" toggle at bottom edge

**Pros:**
1. Most dramatic visual transformation -- the app becomes a focused music player
2. The visualizer at 160dp centered is unmistakably the visual centerpiece
3. Large playback controls are highly touch-friendly (56dp targets)
4. The centered, lockscreen-style layout is familiar and calming
5. Track title at 28sp is the largest text on screen -- correct priority
6. AMOLED negative space is maximized (pure black around centered content)

**Cons:**
1. Radical departure from current list-based Cockpit layout
2. All operational info (On Air, Connector Health) hidden behind toggle/scroll
3. The centered layout wastes horizontal space
4. Playback controls (<< >>) require implementing skip functionality (touching music boundary?)
   - Note: Skip may require ViewModel changes. Verify against protected boundary.
5. Large visualizer (160dp) may feel overwhelming on smaller devices
6. Users who rely on operational data (connectivity, health) must scroll or toggle

**Screen space cost:**
- Hero section: 400-480dp -- consumes most of the viewport
- On Air, Connector Health: below 480dp (well below fold)
- Queue: below 600dp (requires scroll on all devices)

**Info visibility:**
- Visualizer: immediately visible, prominent (GOOD)
- Track title/artist: immediately visible, large (GOOD)
- Playback controls: immediately visible (GOOD)
- On Air, Connector Health, Queue: all require scroll (BAD for ops users)

**Risk to calmness:**
- LOW. Centered, symmetrical layouts are inherently calming.
- The large visualizer is contained by the centered composition.
- Risk: 160dp visualizer may be too active for a calm experience.

**Estimated implementation complexity:** MEDIUM-HIGH (4-6h) -- complete layout redesign, new control row

---

### Option 8: Landscape DJ Deck Variant (Portrait Adaptation)

**Layout Description:**
Reference the existing `LandscapeDjDeck.kt` (308 lines) 3-column layout, but adapt to a **3-section vertical stack** for portrait orientation. The visualizer sits in the center section, prominent.

**LandscapeDjDeck.kt current structure (for reference):**
```
[Row (3 columns)]
|-- Left Column (0.3f): Stations list + Agent chips
|-- Center Column (0.4f): Now Playing + Visualizer (32 bars) + Mini EQ
|-- Right Column (0.3f): Queue + Reactions + Session stats
```

**Portrait adaptation -- 3-section vertical stack:**
```
[LazyColumn]
|-- [SECTION 1: Now Playing + Visualizer] (center-column thinking)
|     |-- Now Broadcasting card (22sp title, centered)
|     |-- VisualizerBars (96dp, 32 bars, full width)
|     |-- Row: Playback controls (Play/Pause + output mode)
|
|-- [SECTION 2: Stations + Agents] (left-column thinking, adapted)
|     |-- "Stations" header (14sp, PrimaryNeonCyan)
|     |-- Horizontal scrolling row of StationCards (compact, 120dp wide each)
|     |-- Row of AgentChips (horizontal scroll)
|
|-- [SECTION 3: Queue + Context] (right-column thinking, adapted)
|     |-- Queue preview (3 items)
|     |-- On Air card (compact)
|     |-- Session stats
```

**Key adaptations from landscape:**
- The 3 columns become 3 sections, stacked vertically
- Section 1 (Now Playing + Visualizer) is FIRST -- music is sovereign
- Station list becomes horizontally scrollable (compact cards)
- Agent chips become a horizontally scrolling row
- Queue stays as a vertical list (but preview only, 3 items)

**Visible without scrolling (Pixel 6, 780dp):**
- Section 1: Now Playing + Visualizer + controls (~280dp) -- fully visible
- Section 2 header: "Stations" visible at bottom edge

**Pros:**
1. Builds on proven LandscapeDjDeck layout -- design already validated
2. Visualizer in Section 1 is prominent (96dp, 32 bars)
3. The 3-section structure matches the mental model: Music -> Sources -> Queue
4. Horizontal station scrolling is touch-friendly and space-efficient
5. Consistent experience between landscape and portrait orientations

**Cons:**
1. Significant departure from current LazyColumn structure
2. Horizontal scrolling station cards require new compact card design
3. On Air card moved to Section 3 -- less visible than current position
4. Connector Health not included in any section (needs addition)
5. The adaptation is complex -- landscape columns don't cleanly map to portrait sections

**Screen space cost:**
- Section 1: ~280dp (Now Playing + visualizer + controls)
- Section 2: ~160dp (stations row + agents row)
- Section 3 starts at ~440dp (below fold on smaller devices)

**Info visibility:**
- Visualizer + track info: immediately visible (GOOD)
- Stations: visible or just below fold
- Queue, On Air: below fold on most devices

**Risk to calmness:**
- LOW-MEDIUM. The structured 3-section layout is organized and calming.
- Horizontal scrolling adds a bit of visual dynamism.

**Estimated implementation complexity:** HIGH (6-8h) -- new compact cards, horizontal scrolling, layout restructuring

---

### RECOMMENDATION: Option 4 (Compact Always-Visible Strip) + Option 5 (Expandable Theater) as Enhancement

**Primary recommendation: Option 4** for the following reasons:

| Criterion | Option 4 | Others |
|---|---|---|
| Solves #1 problem (invisible visualizer) | YES -- always visible | Most solve it but with trade-offs |
| Screen space cost | 36dp (lowest) | 120-480dp (higher) |
| Content displacement | Minimal (36dp) | Significant (120-480dp) |
| Implementation risk | LOW | LOW to HIGH |
| Implementation time | 1-2h | 1-8h |
| Calmness preservation | HIGH (thin strip) | MEDIUM (large visualizer) |
| Music boundary safety | 100% safe | 100% safe |
| Backward compatibility | Easy to revert | Varies |
| User discovery | Immediate (always there) | May require gestures |
| AMOLED negative space | Preserved | Reduced (large visualizer areas) |

**The case for Option 4:**
1. It solves the core problem (invisible visualizer) with the smallest change
2. 36dp is enough to create a persistent "music is alive" signal without demanding attention
3. No content is significantly displaced -- the LazyColumn experience remains intact
4. Lowest implementation risk -- simple composable extraction
5. Easy to enhance later (add Option 5 theater mode on top)
6. The "status bar" metaphor fits the cockpit concept -- instruments are always visible

**Enhancement path: Option 5 (Expandable Theater)**
- After Option 4 is stable, add tap-to-expand on the visualizer strip
- Strip expands from 36dp to 160-200dp theater mode
- This provides the "immersive" experience when wanted, without the default cost
- The combination: always-visible strip (ambient) + expandable theater (on demand) = best UX

**Why not the others:**
- Option 1 (Hero): Too much screen real estate. Pushes too much content down.
- Option 2 (Combined card): Good but the card is large. Visualizer loses floating-on-black aesthetic.
- Option 3 (Background): Risk of text-over-visualizer readability issues. Too subtle.
- Option 6 (Carousel): Adds complexity for minimal gain. Placeholders don't add value yet.
- Option 7 (Lockscreen): Too radical a departure. Hides operational data.
- Option 8 (Portrait DJ Deck): Good long-term vision but too much scope for a first slice.

---

## 4. VISUALIZER STYLE SYSTEM

### Architecture Overview

The `VisualizerStyle` enum defines all supported visualizer rendering modes. Each style is a self-contained composable that can be swapped at runtime. The system is designed for future expansion (Phase 7+ adds advanced styles).

### Enum Definition

```kotlin
package com.xsytrance.vaib.ui.theme

/**
 * VisualizerStyle defines all supported audio visualizer rendering modes.
 * 
 * Each style maps to a distinct composable renderer. Styles are selectable
 * in Settings and can be auto-rotated. Reduced motion forces safe styles.
 * 
 * Performance tiers:
 * - LOW: Negligible GPU/battery impact
 * - MEDIUM: Low GPU, ~1%/hr battery
 * - HIGH: Medium GPU, ~2%/hr battery
 * - VERY_HIGH: High GPU, ~3-5%/hr battery
 */
enum class VisualizerStyle {
    /** Single horizontal line that breathes with the music.
     * Lowest possible motion. Used for reduced-motion accessibility.
     * Performance: LOW */
    MINIMAL_BREATHING_LINE,

    /** All bars at minimum height. Static, no animation.
     * Used when music is paused or for maximum battery.
     * Performance: LOW */
    SILENT_FIELD,

    /** 24 vertical bars with sin-wave phase animation.
     * The current implementation. Reliable, proven, calm.
     * Performance: MEDIUM */
    CLASSIC_BARS,

    /** Single line trace that draws left-to-right like an oscilloscope.
     * Smooth, continuous, scientific aesthetic.
     * Performance: MEDIUM */
    OSCILLOSCOPE_LINE,

    /** Bottom-anchored spectrum with glow bloom effect.
     * Bars grow upward from bottom with neon glow.
     * Performance: MEDIUM */
    SPECTRUM_HORIZON,

    /** Smooth connected waveform line. Continuous curve, no discrete bars.
     * Flowing, organic aesthetic.
     * Performance: HIGH */
    WAVEFORM_RIBBON,

    /** Concentric rings pulsing from center outward.
     * Radial pattern, hypnotic and calm.
     * Performance: HIGH */
    PULSE_RING,

    /** 8x4 grid of glowing blocks. Matrix-like discrete cells.
     * Structured, grid aesthetic.
     * Performance: HIGH */
    NEON_EQUALIZER_GRID,

    /** Rotating sweep line with intensity rings.
     * Sonar/radar aesthetic. Subtle rotation.
     * Performance: HIGH */
    RADAR_PULSE,

    /** Circular groove-like rings. Vinyl record-inspired.
     * Organic circular patterns.
     * Performance: HIGH */
    VINYL_ORBIT,

    /** Vertical falling columns of varying intensity.
     * Subtle, rain-like motion. Not as busy as movie Matrix.
     * Performance: VERY_HIGH */
    MATRIX_RAIN,

    /** Dots forming wave patterns. Particle-based motion.
     * Most visually complex. Premium devices only.
     * Performance: VERY_HIGH. Phase 7+ only. */
    PARTICLE_WAVE,

    /** Deterministic pattern generated from agent ID hash.
     * Same agent = same visual signature. Unique to vAIb.
     * Performance: VERY_HIGH */
    AGENT_SIGNATURE,

    /** Style automatically selected based on current genre/BPM.
     * Maps: ambient -> PULSE_RING, electronic -> CLASSIC_BARS,
     *       upbeat -> SPECTRUM_HORIZON, classical -> MINIMAL_BREATHING_LINE
     * Performance: Varies by selected style */
    GENRE_BASED
}
```

### Performance Tiering Table

| Tier | Styles | GPU Cost | Battery Impact | Recommended For |
|---|---|---|---|---|
| Low | `MINIMAL_BREATHING_LINE`, `SILENT_FIELD` | Negligible | <0.5%/hr | Reduced motion, max battery, offline |
| Medium | `CLASSIC_BARS`, `OSCILLOSCOPE_LINE`, `SPECTRUM_HORIZON` | Low | ~1%/hr | Default, balanced devices |
| High | `WAVEFORM_RIBBON`, `PULSE_RING`, `NEON_EQUALIZER_GRID`, `RADAR_PULSE`, `VINYL_ORBIT` | Medium | ~2%/hr | Premium devices, ENHANCED motion |
| Very High | `PARTICLE_WAVE`, `MATRIX_RAIN`, `AGENT_SIGNATURE` | High | ~3-5%/hr | S24 Ultra class, plugged in |

### Style-to-Composable Mapping

```kotlin
@Composable
fun VisualizerRouter(
    style: VisualizerStyle,
    isPlaying: Boolean,
    intensity: Float,
    modifier: Modifier = Modifier
) {
    when (style) {
        VisualizerStyle.CLASSIC_BARS -> 
            VisualizerBars(modifier, barCount = 24, isPlaying, intensity)
        VisualizerStyle.MINIMAL_BREATHING_LINE -> 
            MinimalBreathingLine(modifier, isPlaying, intensity)
        VisualizerStyle.SILENT_FIELD -> 
            SilentField(modifier, barCount = 24)
        VisualizerStyle.OSCILLOSCOPE_LINE -> 
            OscilloscopeLine(modifier, isPlaying, intensity)
        VisualizerStyle.SPECTRUM_HORIZON -> 
            SpectrumHorizon(modifier, isPlaying, intensity)
        VisualizerStyle.WAVEFORM_RIBBON -> 
            WaveformRibbonStub(modifier, isPlaying, intensity) // Phase 2
        VisualizerStyle.PULSE_RING -> 
            PulseRingStub(modifier, isPlaying, intensity) // Phase 2
        VisualizerStyle.NEON_EQUALIZER_GRID -> 
            EqualizerGridStub(modifier, isPlaying, intensity) // Phase 3
        VisualizerStyle.RADAR_PULSE -> 
            RadarPulseStub(modifier, isPlaying, intensity) // Phase 3
        VisualizerStyle.VINYL_ORBIT -> 
            VinylOrbitStub(modifier, isPlaying, intensity) // Phase 4
        VisualizerStyle.MATRIX_RAIN -> 
            MatrixRainStub(modifier, isPlaying, intensity) // Phase 5
        VisualizerStyle.PARTICLE_WAVE -> 
            ParticleWaveStub(modifier, isPlaying, intensity) // Phase 7
        VisualizerStyle.AGENT_SIGNATURE -> 
            AgentSignatureStub(modifier, isPlaying, intensity) // Phase 6
        VisualizerStyle.GENRE_BASED -> {
            val derivedStyle = deriveStyleFromGenre(currentGenre, currentBpm)
            VisualizerRouter(derivedStyle, isPlaying, intensity, modifier)
        }
    }
}
```

### Settings UI -- VisualizerStyle Selector

**Location:** `SettingsScreen.kt` -- new card section between "Motion" and "Agent Settings"

**Design:** Horizontal chip row (preferred) or dropdown

```kotlin
// Horizontal chip row design:
Row(
    modifier = Modifier.fillMaxWidth(),
    horizontalArrangement = Arrangement.spacedBy(8.dp)
) {
    VisualizerStyle.values().filter { it.isAvailable() }.forEach { style ->
        val selected = currentStyle == style
        FilterChip(
            selected = selected,
            onClick = { viewModel.setVisualizerStyle(style) },
            label = { Text(style.displayName) },
            colors = FilterChipDefaults.filterChipColors(
                selectedContainerColor = PrimaryNeonCyan.copy(alpha = 0.2f),
                selectedLabelColor = PrimaryNeonCyan,
                containerColor = SurfaceElevated,
                labelColor = TextSecondary
            )
        )
    }
}
```

**Chip display names:**

| Style | Display Name | Availability |
|---|---|---|
| CLASSIC_BARS | "Classic Bars" | Always |
| MINIMAL_BREATHING_LINE | "Minimal" | Always |
| SILENT_FIELD | "Silent" | Always |
| OSCILLOSCOPE_LINE | "Oscilloscope" | Phase 2+ |
| SPECTRUM_HORIZON | "Spectrum" | Phase 2+ |
| WAVEFORM_RIBBON | "Waveform" | Phase 2+ |
| PULSE_RING | "Pulse Ring" | Phase 2+ |
| NEON_EQUALIZER_GRID | "Equalizer" | Phase 3+ |
| RADAR_PULSE | "Radar" | Phase 3+ |
| VINYL_ORBIT | "Vinyl" | Phase 4+ |
| MATRIX_RAIN | "Matrix" | Phase 5+ |
| AGENT_SIGNATURE | "Agent Sig" | Phase 6+ |
| PARTICLE_WAVE | "Particles" | Phase 7+ |
| GENRE_BASED | "Auto" | Phase 2+ |

**Default:** `CLASSIC_BARS`

### Reduced Motion Compatibility

```kotlin
@Composable
fun VisualizerWithMotionSafety(
    preferredStyle: VisualizerStyle,
    motionIntensity: MotionIntensity,
    isPlaying: Boolean,
    intensity: Float,
    modifier: Modifier = Modifier
) {
    val effectiveStyle = when (motionIntensity) {
        MotionIntensity.OFF -> VisualizerStyle.SILENT_FIELD
        MotionIntensity.REDUCED -> VisualizerStyle.MINIMAL_BREATHING_LINE
        else -> preferredStyle
    }
    
    VisualizerRouter(
        style = effectiveStyle,
        isPlaying = isPlaying && motionIntensity != MotionIntensity.OFF,
        intensity = if (motionIntensity == MotionIntensity.REDUCED) 0.3f else intensity,
        modifier = modifier
    )
}
```

**Rules:**
- `MotionIntensity.OFF` -> `SILENT_FIELD` (static, no animation)
- `MotionIntensity.REDUCED` -> `MINIMAL_BREATHING_LINE` (very slow, minimal)
- `MotionIntensity.STANDARD` -> user's selected style
- `MotionIntensity.ENHANCED` -> user's selected style (may use higher default intensity)
- No `rememberInfiniteTransition` when `MotionIntensity.OFF`
- No rapid updates when `MotionIntensity.REDUCED` (cap at 500ms intervals)

### Per-Station Default

```kotlin
// StationDescriptor extension (future)
data class StationDescriptor(
    // ... existing fields ...
    val preferredVisualizerStyle: VisualizerStyle? = null
)

// When station changes:
val stationStyle = currentStation.preferredVisualizerStyle
if (stationStyle != null && userAllowsStationOverride) {
    activeVisualizerStyle = stationStyle
}
```

**Station-to-style mapping (suggested defaults):**

| Station Genre | Default Style |
|---|---|
| Ambient / Drone | `PULSE_RING` |
| Electronic / House | `CLASSIC_BARS` |
| Upbeat / Pop | `SPECTRUM_HORIZON` |
| Classical / Jazz | `MINIMAL_BREATHING_LINE` |
| Focus / Study | `SILENT_FIELD` |
| Upbeat / Workout | `NEON_EQUALIZER_GRID` |

### Per-Agent Preference (Color Tinting Only)

Agents do not select visualizer styles. They influence the **color palette** of the current style via `AgentPresence.visualSignature`:

```kotlin
// Agent color tinting (subtle -- 15-25% influence on bar colors)
fun agentTintedColor(
    baseColor: Color,
    agentSignature: String?,  // hex color from agent
    tintStrength: Float = 0.2f
): Color {
    if (agentSignature == null) return baseColor
    val agentColor = Color(android.graphics.Color.parseColor(agentSignature))
    return Color(
        red = baseColor.red * (1 - tintStrength) + agentColor.red * tintStrength,
        green = baseColor.green * (1 - tintStrength) + agentColor.green * tintStrength,
        blue = baseColor.blue * (1 - tintStrength) + agentColor.blue * tintStrength
    )
}
```

**Effect:** If `vg-god` has signature color `#FF6600`, the visualizer bars shift 20% toward orange. Subtle, not jarring.

### Random/Rotate Mode

```kotlin
// Settings toggle: "Auto-rotate visualizer"
var autoRotateVisualizer: Boolean by remember { mutableStateOf(false) }

// Rotation logic:
LaunchedEffect(autoRotateVisualizer, currentTrackId) {
    if (!autoRotateVisualizer) return@LaunchedEffect
    // Rotate every N tracks (default: 3)
    val performantStyles = listOf(
        VisualizerStyle.CLASSIC_BARS,
        VisualizerStyle.OSCILLOSCOPE_LINE,
        VisualizerStyle.SPECTRUM_HORIZON,
        VisualizerStyle.WAVEFORM_RIBBON,
        VisualizerStyle.PULSE_RING
    )
    activeStyle = performantStyles.random()
}
```

**Rotation rules:**
- Only rotates among performant styles (Medium and High tiers)
- Never rotates to `PARTICLE_WAVE`, `MATRIX_RAIN`, or `AGENT_SIGNATURE` (battery risk)
- Rotates every 3 track changes (configurable: 1-10)
- Optional: rotate every 5 minutes instead
- Crossfade between styles: 300ms
- When `GENRE_BASED` is active, auto-rotate is disabled (genre takes precedence)

---

## 5. GESTURE AND INTERACTION PLAN

### Gesture Reference Table

| Gesture | Target Area | Action | Visual Feedback | Calmness Risk | Implementation |
|---|---|---|---|---|---|
| **Tap** | Visualizer strip | Ripple pulse from tap point + bars spike | Radial ripple, 400ms | LOW | `Modifier.clickable` with custom ripple |
| **Long press** | Visualizer strip | Show Resonance Trace bottom sheet | Sheet slides up, 300ms | LOW | `Modifier.combinedClickable` |
| **Swipe left/right** | Visualizer strip | Cycle VisualizerStyles | Crossfade 300ms + haptic tick | LOW | `detectHorizontalDragGestures` |
| **Swipe up** | Visualizer strip | Expand theater mode (160dp) | `animateHeightAsState` 300ms | MEDIUM | `detectVerticalDragGestures` |
| **Swipe down** | Visualizer strip | Collapse to compact (36dp) | `animateHeightAsState` 300ms | LOW | `detectVerticalDragGestures` |
| **Swipe left/right** | Now Playing card | Skip next/previous track | Card slides + crossfade | LOW | `detectHorizontalDragGestures` |
| **Double tap** | Now Playing card | "Like" current track | Heart icon fade, 400ms | LOW | `detectTapGestures` |
| **Vertical swipe** | Cockpit (outside viz) | Standard LazyColumn scroll | Default scroll physics | NONE | Default LazyColumn behavior |
| **Long press** | Now Playing card | Show Resonance Trace bottom sheet | Sheet slides up | LOW | `Modifier.combinedClickable` |

### Detailed Gesture Specifications

#### Tap on Visualizer

```kotlin
// Spec:
// Trigger: Single tap anywhere on visualizer strip/bars
// Action: 
//   1. Radial ripple emanates from tap coordinates
//   2. Bars within 60dp of tap point briefly spike to 90% height
//   3. If auto-rotate mode ON: cycle to next VisualizerStyle
// Visual feedback: 
//   - Ripple: PrimaryNeonCyan, alpha 0.3 -> 0 over 400ms
//   - Bar spike: height 0.9f for 200ms, then decay
// Calmness risk: LOW (brief, contained)
// Implementation: Modifier.clickable with custom indication

val tapRippleRadius = 60.dp
val barSpikeDurationMs = 200
val rippleFadeDurationMs = 400
```

#### Long Press on Visualizer

```kotlin
// Spec:
// Trigger: Press and hold for 400ms on visualizer
// Action: Show ResonanceTraceBottomSheet()
// Visual feedback:
//   - Haptic feedback: light vibration at 400ms threshold
//   - Visualizer briefly dims (alpha 0.7) during hold
//   - Bottom sheet slides up from bottom (300ms, FastOutSlowInEasing)
// Calmness risk: LOW (intentional, slow-reveal)
// Implementation: Modifier.combinedClickable(onLongClick = { showTrace() })
// Conflict: none -- long press is distinct from tap and swipe

val longPressThresholdMs = 400
val hapticFeedbackType = HapticFeedbackType.LongPress
val bottomSheetSlideDurationMs = 300
```

#### Swipe Left/Right on Visualizer

```kotlin
// Spec:
// Trigger: Horizontal drag gesture on visualizer (dx > 40dp)
// Action: Cycle to next/previous VisualizerStyle
// Visual feedback:
//   - Haptic: light tick on each style change
//   - Crossfade between styles: 300ms
//   - Direction: swipe left -> next style, swipe right -> previous style
// Calmness risk: LOW (smooth crossfade, no jarring transitions)
// Implementation: detectHorizontalDragGestures with threshold
// Conflict: must not interfere with parent navigation swipe

val swipeThresholdDp = 40f
val crossfadeDurationMs = 300
val hapticTickType = HapticFeedbackType.TextHandleMove
```

#### Vertical Swipe Up on Visualizer (Theater Expand)

```kotlin
// Spec:
// Trigger: Vertical drag upward on visualizer (dy < -60dp)
// Action: Expand visualizer to theater mode (160-200dp)
// Visual feedback:
//   - Visualizer height animates: 36dp -> 160dp over 300ms
//   - Background content below slightly dims (alpha 0.8)
//   - LazyColumn scrolls down to accommodate expanded visualizer
// Calmness risk: MEDIUM (large visualizer is more visually active)
// Implementation: detectVerticalDragGestures with nested scroll
// Conflict: must cooperate with LazyColumn scroll -- visualizer consumes up-swipe, 
//           passes down-swipe to LazyColumn

val expandThresholdDp = -60f
val theaterHeightDp = 160
val expandAnimationMs = 300
val backgroundDimAlpha = 0.8f
```

#### Vertical Swipe Down on Visualizer (Theater Collapse)

```kotlin
// Spec:
// Trigger: Vertical drag downward on expanded visualizer (dy > 60dp)
// Action: Collapse visualizer to compact strip (36dp)
// Visual feedback:
//   - Visualizer height animates: 160dp -> 36dp over 300ms
//   - Background content restores full brightness
// Calmness risk: LOW (collapsing reduces visual activity)
// Implementation: detectVerticalDragGestures

val collapseThresholdDp = 60f
val compactHeightDp = 36
val collapseAnimationMs = 300
```

#### Swipe Left/Right on Now Playing Card

```kotlin
// Spec:
// Trigger: Horizontal drag on Now Playing card (dx > 50dp)
// Action: Skip to next track (swipe left) or previous track (swipe right)
// Visual feedback:
//   - Card translates horizontally with finger drag
//   - Beyond threshold: card slides off-screen in drag direction
//   - New track info slides in from opposite side
//   - Visualizer does a "whoosh" spike (all bars jump then settle)
// Calmness risk: LOW (intentional music control)
// Implementation: detectHorizontalDragGestures
// CRITICAL: Must NOT modify playback if it requires AudioBackbone changes.
//           Skip functionality requires ViewModel support. 
//           If ViewModel has no skip method, this gesture is DISABLED.

val skipThresholdDp = 50f
val cardSlideDurationMs = 250
val whooshSpikeHeight = 0.95f
val whooshDurationMs = 300
```

**SAFETY NOTE:** The skip gesture requires a `viewModel.skipNext()` / `viewModel.skipPrevious()` method. If these methods do not exist in `VaibViewModel.kt`, this gesture is **disabled** (no-op) until implemented. This plan does NOT propose adding skip methods -- that would touch the playback boundary.

#### Double Tap on Now Playing Card

```kotlin
// Spec:
// Trigger: Two taps within 300ms on Now Playing card
// Action: "Like" current track (toggle)
// Visual feedback:
//   - Heart icon (24dp) fades in at center of card, 400ms
//   - Heart color: AccentMagenta (#FF00FF)
//   - Heart fades out after 600ms
//   - Haptic: light click
// Calmness risk: LOW (subtle, centered, brief)
// Implementation: detectTapGestures(onDoubleTap = { likeTrack() })

val doubleTapTimeoutMs = 300
val heartIconSizeDp = 24
val heartFadeInDurationMs = 400
val heartDisplayDurationMs = 600
val heartFadeOutDurationMs = 300
val hapticClickType = HapticFeedbackType.ContextClick
```

#### Vertical Swipe on Cockpit (Outside Visualizer)

```kotlin
// Spec:
// Trigger: Vertical scroll anywhere on Cockpit outside visualizer area
// Action: Standard LazyColumn scroll
// Visual feedback: Default Compose scroll physics (no custom)
// Calmness risk: NONE
// Implementation: Default LazyColumn behavior -- NO custom handling
// This is the "pass-through" gesture -- all vertical scrolling outside
// the visualizer area works exactly as it does today.
```

### Station Change Gesture

```kotlin
// Spec:
// Trigger: User taps a different station (from StationCard or StationsScreen)
// Action: viewModel.selectStation(newStation) is called
// Visual feedback:
//   1. Visualizer does a brief "reset" pattern:
//      - All bars drop to 5% height over 200ms
//      - Hold at 5% for 100ms
//      - Bars rebuild to normal over 400ms
//   2. Station card transitions: crossfade 300ms
//   3. Status pill updates: color transition 300ms
// Calmness risk: LOW (brief transition, signals change clearly)

val resetDropDurationMs = 200
val resetHoldDurationMs = 100
val resetRebuildDurationMs = 400
val crossfadeDurationMs = 300
```

### Song Change Gesture

```kotlin
// Spec:
// Trigger: Track changes (from playback state sync)
// Action: Update displayed track information
// Visual feedback:
//   1. Track title crossfade:
//      - Old title fades out (alpha 1 -> 0, 200ms)
//      - New title fades in (alpha 0 -> 1, 200ms)
//      - Total: 400ms
//   2. Artist name: same crossfade pattern
//   3. Visualizer: MAINTAINS CONTINUITY -- does NOT reset
//      - Music is continuous; visualizer should be continuous
//   4. BPM display: quick fade (old fades, new appears, 300ms)
// Calmness risk: LOW (smooth transitions, no jarring resets)

val titleCrossfadeOutMs = 200
val titleCrossfadeInMs = 200
val bpmUpdateFadeMs = 300
```

### Operational Warning Gesture

```kotlin
// Spec:
// Trigger: System detects operational warning (endpoint unstable, sync failing)
// Action: Brief visual alert on visualizer + status pill
// Visual feedback:
//   1. Visualizer bars briefly tint amber (SecondaryGold, #FFD700)
//   2. Tint pulse: 2 seconds, fade in/out
//   3. Status pill changes to warning color (SecondaryGold border)
//   4. NO full-screen alert, NO dialog, NO interruption
// Calmness risk: LOW (subtle, brief, non-blocking)

val warningTintColor = SecondaryGold  // #FFD700
val warningPulseDurationMs = 2000
val warningFadeInMs = 300
val warningFadeOutMs = 500
```

### Silence/Offline State Gesture

```kotlin
// Spec:
// Trigger: Music pauses or goes offline
// Action: Visualizer gracefully reduces to minimum
// Visual feedback:
//   1. Over 3-5 seconds, bars gradually drop to minimum height (5-8%)
//   2. Style transitions to MINIMAL_BREATHING_LINE or SILENT_FIELD
//   3. NO sudden cut -- gradual thinning
//   4. When music resumes: bars gradually rebuild over 2-3 seconds
// Calmness risk: VERY LOW (gradual, calming transition)

val silenceTransitionDurationMs = 4000
val resumeTransitionDurationMs = 2500
val minimumBarHeight = 0.05f
```

---

## 6. INFORMATION LAYERING -- LEVEL 0 TO LEVEL 3

### Design Philosophy

The cockpit presents information in **4 progressive layers**. Only Level 0 is always visible. Higher levels are revealed progressively through user action. This keeps the default view calm and glanceable while making deep information accessible on demand.

The principle: **show the minimum by default, reveal the rest on intent.**

---

### Level 0 -- Glance (Always Visible, No Scroll Required)

**Design:** This is what the user sees immediately when opening the app. Maximum 50% of viewport height. Pure `#000000` background dominates.

**Contents (exact specification):**

| Element | Text/Content | Typography | Color | Position |
|---|---|---|---|---|
| App title | "vAIb" | 24sp Bold | PrimaryNeonCyan (#00E5FF) | Top center |
| Subtitle | "agent-native radio" | 12sp Regular | TextMuted (#666666) | Below title |
| Visualizer strip | VisualizerBars (36dp) | N/A | Cyan/Magenta/Violet | Full width, below header |
| Track title | `currentTrack.title` | 24sp Bold | TextPrimary (White) | Below visualizer, left-aligned |
| Artist name | `currentTrack.artist` | 18sp Regular | TextSecondary (#AAAAAA) | Below title, left-aligned |
| Agent name | `onAirAgentId` resolved name | 14sp Medium | TextSecondary | Row with play button |
| Station name | `currentStation.name` | 13sp Regular | TextMuted (#666666) | Below artist |
| Play/pause | IconButton (48dp) | N/A | SecondaryGold (#FFD700) | Right side, aligned with track info |

**Level 0 layout (visual):**
```
+------------------------------------------+
|              vAIb                        |  24sp Bold, Cyan, center
|         agent-native radio               |  12sp, Muted, center
|------------------------------------------|
| [==== VISUALIZER STRIP (36dp) =========] |  Full width, animated
|------------------------------------------|
|                                          |
|  Track Title Goes Here                   |  24sp Bold, White
|  Artist Name                             |  18sp, Secondary
|  Station Name                [PLAY/PAUSE]|  13sp + 48dp icon
|                                          |
|  -- Level 1 toggle: "Show Context ▾" --  |  (if Level 1 data exists)
|                                          |
+------------------------------------------+
| (remaining: 50%+ pure black #000000)     |
+------------------------------------------+
```

**Total Level 0 height:** ~260-300dp (fits in all viewports without scroll)

**Rules:**
- If no track is playing: show "No track playing" in TextMuted, visualizer shows SILENT_FIELD
- If no station selected: station line hidden
- If no agent on air: agent line shows "Auto-DJ"
- The visualizer strip is ALWAYS present (even when paused -- shows minimum animation)

---

### Level 1 -- Useful Context (Expandable, Default Collapsed)

**Design:** A single toggle row below Level 0. Tapping expands a compact context panel. Collapsed by default.

**Toggle:**
```
"Show Context ▾"  (collapsed)
"Hide Context ▴"  (expanded)
```
- Typography: 13sp Medium, PrimaryNeonCyan
- Position: directly below Level 0 station/agent row
- Touch target: full width, 48dp minimum height

**Expanded contents:**

| Element | Source | Typography | Color |
|---|---|---|---|
| Requester | Track metadata / queue source | 13sp | TextSecondary |
| Selection reason | Short phrase from `Track.reason` | 13sp | AccentMagenta |
| Genre tag | `currentStation.genre` | 12sp | SecondaryGold |
| Vibe tag | `currentStation.vibe` | 12sp | AccentMagenta |
| BPM | `currentTrack.bpm` | 14sp Bold | PrimaryNeonCyan |
| Up next | `queue.firstOrNull()?.title` | 13sp | TextSecondary |

**Layout (expanded):**
```
+------------------------------------------+
| Show Context ▴                          |  <- toggle (tap to collapse)
+------------------------------------------+
| Requested by: vg-god                     |  13sp
| Reason: evening ambient session          |  13sp, Magenta
|                                          |
| [Ambient]  [Neon Focus]  [BPM: 128]     |  Chips + BPM
|                                          |
| Up next: Next Track Title...             |  13sp, Secondary
+------------------------------------------+
```

**Height (expanded):** ~120-140dp

**Rules:**
- If no context data available: toggle hidden entirely
- "Requester" only shown if track was agent-requested (not auto-selected)
- "Reason" truncated to 40 characters max
- "Up next" hidden if queue is empty
- Collapse/expand animation: 200ms height animation

---

### Level 2 -- Details (Behind Tap/Expand or Bottom Sheet)

**Design:** Accessed via:
- Tapping "Details" button in Level 1 expanded panel
- Long-pressing Now Playing card
- Tapping "Queue (N)" header (navigates to QueueScreen)

**Display modes:**
1. **Bottom sheet** (preferred): Slides up from bottom, 50% screen height
2. **Expanded card** (alternative): Inline expansion below Level 1

**Bottom sheet contents:**

| Section | Contents | Action |
|---|---|---|
| **Resonance Trace** | "Why this song?" explanation | Primary action -- see Section 7 |
| **Full Queue** | All queued tracks | Tap navigates to `QueueScreen.kt` |
| **Station History** | Recently played tracks (last 10) | Read-only list |
| **Agent Taste** | Agent genre preferences, play counts | Summarized, not raw data |
| **Genre Play Count** | Top genres played today | Simple bar chart |

**Bottom sheet spec:**
```kotlin
ModalBottomSheet(
    onDismissRequest = { showDetails = false },
    sheetState = rememberModalBottomSheetState(),
    containerColor = SurfaceElevated,  // #1A1A1A
    shape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp)
) {
    // Content height: 50% of screen
    // Title: "Details" 18sp SemiBold, TextPrimary
    // Content: scrollable Column
    // Close: swipe down or tap outside
}
```

**Height:** 50% of screen (~390dp on Pixel 6)

**Rules:**
- Bottom sheet is scrollable internally
- All data is read-only (no editing in this sheet)
- Queue section has "See Full Queue >" link to `QueueScreen.kt`
- Agent taste data is summarized (e.g., "vg-god prefers ambient (62% of selections)")
- No raw logs, no sensitive data

---

### Level 3 -- Deep Debug (Not in Main UI)

**Design:** Level 3 information is **never displayed in the main Cockpit UI**. It belongs in specialized debug interfaces.

**Contents:**

| Data | Example | Location |
|---|---|---|
| Raw endpoint health | HTTP status codes, response times | Settings -> System |
| Sync telemetry | `consecutiveFailures`, `avgLatencyMs` | Settings -> System |
| Discovery diagnostics | Endpoint probing logs | Settings -> System |
| Full application logs | Logcat-style output | Settings -> System |
| Raw agent data | Full Agent objects as JSON | Settings -> System |
| Network requests | HTTP request/response details | Settings -> System |

**Access method:**
- Settings -> System (new screen or expanded Settings section)
- Developer gesture: long-press the "vAIb" title for 3 seconds
- Debug mode toggle in Settings

**Rules:**
- NEVER shown in CockpitScreen.kt
- NEVER shown in any main navigation screen
- User must explicitly navigate to Settings -> System
- Developer gesture is undocumented (easter egg)
- All data is raw/unformatted -- meant for debugging only

---

### Level Interaction Summary

```
+---------------------------------------------------+
|  LEVEL 0 (Glance) -- ALWAYS VISIBLE               |
|  - Track title, artist, station, agent, play/pause|
|  - Visualizer strip (always visible)              |
|  - Tap "Show Context ▾" to expand Level 1         |
|  - Long-press track area for Level 2              |
+---------------------------------------------------+
         | Tap toggle
         v
+---------------------------------------------------+
|  LEVEL 1 (Context) -- EXPANDABLE                  |
|  - Requester, reason, genre, vibe, BPM, up next   |
|  - Tap "Details" for Level 2 bottom sheet         |
|  - Tap "Hide Context ▴" to collapse               |
+---------------------------------------------------+
         | Tap "Details" or Long-press track
         v
+---------------------------------------------------+
|  LEVEL 2 (Details) -- BOTTOM SHEET                |
|  - Resonance Trace, full queue, history           |
|  - Agent taste, genre play count                  |
|  - Swipe down to dismiss                          |
+---------------------------------------------------+
         | Settings -> System (or dev gesture)
         v
+---------------------------------------------------+
|  LEVEL 3 (Debug) -- SETTINGS ONLY                 |
|  - Raw logs, telemetry, diagnostics               |
|  - Never in main UI                               |
+---------------------------------------------------+
```

---

## 7. RESONANCE TRACE

### Name

**"Resonance Trace"** -- as preferred by Supreme Commander.

### Purpose

Resonance Trace answers the question: **"Why is this song playing?"**

It provides a summarized, privacy-safe explanation of the operational and musical context that led to the current track selection.

### What It Answers

1. **Why this song:** What criteria led to this track being selected
2. **Why now:** What operational context influenced the timing
3. **Who/what requested it:** Which agent or system initiated the selection
4. **What influenced the selection:** Genre preferences, BPM matching, previous track correlation

### Trigger Methods

| Trigger | Gesture | Location |
|---|---|---|
| Long-press on Now Playing card | Press and hold 400ms | CockpitScreen Level 0 |
| "Why this song?" button | Tap | Level 2 bottom sheet |
| Settings toggle | Enable "Show Resonance Trace" | Settings -> Audio |

### Display: Bottom Sheet

```kotlin
ModalBottomSheet(
    onDismissRequest = { showTrace = false },
    sheetState = rememberModalBottomSheetState(),
    containerColor = SurfaceElevated,  // #1A1A1A
    shape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp)
) {
    // Height: 50% of screen
    // Background: SurfaceElevated (#1A1A1A)
}
```

**Bottom sheet contents:**

| Element | Typography | Color | Content |
|---|---|---|---|
| Title "Resonance Trace" | 18sp SemiBold | TextPrimary (White) | Fixed text |
| Trace explanation | 14sp Regular | TextSecondary (#AAAAAA) | 3-5 lines max |
| Source tag | 11sp Regular | TextMuted (#666666) | "agent • operation • time ago" |
| Close handle | N/A | TextMuted | Drag handle at top |

### Source Data

Resonance Trace draws from these data sources (all read-only):

| Source | Field | Example |
|---|---|---|
| Track | `Track.reason` | "evening ambient session" |
| AppState | `onAirAgentId` | "vg-god" |
| AppState | `onAirReason` | "One agent is always on deck." |
| Track metadata | `tags` | ["ambient", "electronic", "focus"] |
| Station | `genre` | "Ambient Electronic" |
| Historical | Play count by genre | "This genre selected 23 times today" |

### Example Traces

**Example 1 -- Agent Request:**
```
Resonance Trace

vg-god selected this track during a sync operation.
Genre preference: ambient electronic. System load: low.
The agent has chosen this genre for 62% of recent selections.

vg-god • sync operation • 2m ago
```

**Example 2 -- Auto-Selected:**
```
Resonance Trace

Auto-selected from station queue. Genre match: 87%.
Previous track: similar BPM (128 -> 132).
Station "Neon Drift" programmed this sequence.

Auto-DJ • queue rotation • 5m ago
```

**Example 3 -- User Request:**
```
Resonance Trace

You requested this track via the queue.
Added 12 minutes ago. Genre: ambient electronic.
BPM matches current station profile (130 +/- 5).

You • queue request • 12m ago
```

**Example 4 -- Agent Taste Evolution:**
```
Resonance Trace

Agent taste evolution: this genre has been selected 
23 times during evening sessions. The agent is 
developing a preference for slower tempos after 8pm.

vg-god • taste evolution • 1h ago
```

### Privacy Rules

| Rule | Enforcement |
|---|---|
| **Summarized only** | Max 5 lines. No raw data dumps. |
| **No raw logs** | Never show HTTP responses, stack traces, or internal identifiers |
| **No chat scraping** | Never reference user messages, chat content, or communications |
| **No creepy specificity** | "Because you looked sad" is BANNED. No emotional inference. |
| **Functional agent names** | "vg-god" not "VG God" or "VG God's preferences" |
| **Broad task types** | "sync", "render", "idle" -- not specific file names |
| **Opt-in** | Settings toggle: "Show Resonance Trace" (default: ON) |
| **Can be hidden** | Toggle OFF completely removes the feature from UI |
| **Time-bound** | Traces older than 24h are not shown |

### Generation Algorithm (Future)

```kotlin
fun generateResonanceTrace(
    track: Track,
    agent: Agent?,
    station: Station?,
    context: OperationalContext
): String {
    // Pseudocode for trace generation:
    // 1. Determine selection source (agent request / auto / user / system)
    // 2. Extract genre/BPM correlation
    // 3. Get agent preference profile (if agent-selected)
    // 4. Add timing context ("evening session", "focus hour")
    // 5. Summarize to 3-5 lines
    // 6. Sanitize: remove all sensitive/specific data
    // 7. Return formatted string
    
    return when (selectionSource) {
        is AgentRequest -> summarizeAgentSelection(track, agent, context)
        is AutoSelected -> summarizeAutoSelection(track, station, context)
        is UserRequest -> summarizeUserSelection(track, context)
        is SystemEvent -> summarizeSystemSelection(track, context)
    }
}
```

**Note:** The generation algorithm is NOT part of this plan. This section defines the UX only. Implementation of trace generation is a future Phase 3+ task.

### UI Mockup

```
+------------------------------------------+
| ====== (drag handle) ======              |  <- 4dp line, centered
|                                          |
|  Resonance Trace                         |  <- 18sp SemiBold
|                                          |
|  vg-god selected this track during       |  <- 14sp
|  a sync operation. Genre preference:     |
|  ambient electronic. System load: low.   |
|                                          |
|  vg-god • sync operation • 2m ago        |  <- 11sp, Muted
|                                          |
+------------------------------------------+
```

---

## 8. PRIME NEXUS COCKPIT RELATIONSHIP

### Recommendation: Option A (Now), Evolving to Option C

**Short term (now):** Option A -- Prime Nexus sends signals to vAIb only  
**Long term (Phase 4+):** Option C -- Bidirectional integration

### Option A (Current): Prime Nexus -> vAIb

```
+---------------+     NexusSignal API      +------------------+
|  Prime Nexus  |  --------------------->  |      vAIb        |
|  Cockpit      |   Summarized events      |  Music Cockpit   |
+---------------+                          +------------------+
       |                                          |
       |          NO RETURN PATH                  |
       |          (vAIb does not send             |
       |           data to Prime Nexus yet)       |
       +------------------------------------------+
```

**How it works:**
1. Prime Nexus collects operational data (endpoint health, agent activity, system load)
2. Prime Nexus publishes summarized signals via API
3. vAIb polls the signal endpoint (or subscribes via WebSocket)
4. vAIb translates signals into music atmosphere: station selection, vibe tags, visualizer tinting
5. vAIb does NOT send data back to Prime Nexus

### Shared Event Vocabulary

```kotlin
package com.xsytrance.vaib.data.nexus

/**
 * Events that Prime Nexus can send to vAIb.
 * All fields are sanitized/summarized. No raw data.
 */
sealed class NexusSignal {
    abstract val timestamp: Long
    abstract val source: String  // "prime-nexus"

    /** An agent started a task */
    data class AgentTaskStarted(
        val agentId: String,       // "vg-god" (functional name)
        val taskType: String,      // "sync", "render", "idle" (broad category)
        override val timestamp: Long = System.currentTimeMillis(),
        override val source: String = "prime-nexus"
    ) : NexusSignal()

    /** An agent completed a task */
    data class AgentTaskCompleted(
        val agentId: String,
        val taskType: String,
        val success: Boolean,
        override val timestamp: Long = System.currentTimeMillis(),
        override val source: String = "prime-nexus"
    ) : NexusSignal()

    /** System load changed significantly */
    data class SystemLoadChanged(
        val loadLevel: Float,      // 0.0f - 1.0f (normalized)
        override val timestamp: Long = System.currentTimeMillis(),
        override val source: String = "prime-nexus"
    ) : NexusSignal()

    /** An endpoint changed status */
    data class EndpointStatusChanged(
        val endpointId: String,    // "vg-api", "render-node" (functional)
        val status: String,        // "online", "offline", "degraded"
        override val timestamp: Long = System.currentTimeMillis(),
        override val source: String = "prime-nexus"
    ) : NexusSignal()

    /** A new agent was discovered */
    data class NewAgentDiscovered(
        val agentId: String,
        val name: String,          // Functional name
        val role: String,          // "worker", "coordinator", "observer"
        override val timestamp: Long = System.currentTimeMillis(),
        override val source: String = "prime-nexus"
    ) : NexusSignal()
}
```

### Privacy Boundaries

| Rule | Specification |
|---|---|
| **Summarized only** | vAIb receives ONLY `NexusSignal` sealed class instances |
| **No raw logs** | No log files, no stack traces, no error messages |
| **No chat history** | No Mattermost/Matrix/Telegram messages |
| **No file listings** | No directory contents, no file names |
| **Functional names** | "vg-god" not "VG God"; "sync" not "syncing /home/xsy/data" |
| **Broad categories** | Task types: "sync", "render", "idle" -- not specific files |
| **User controlled** | Settings toggle: "Enable Prime Nexus signals" (default: OFF) |
| **Local only** | All signal processing happens on-device |

### API Contract (Minimal)

```
# Polling endpoint (Phase 1)
GET /nexus/signals?since={timestamp}
Response: List<NexusSignal> (JSON array)

# WebSocket endpoint (Phase 2+)
POST /nexus/subscribe
Upgrade: websocket
Response: Real-time NexusSignal stream

# Health check
GET /nexus/health
Response: { "status": "ok", "version": "1.0" }
```

**Error handling:**
- If Nexus is unreachable: vAIb continues normally (music unaffected)
- If signal parsing fails: log silently, do not crash
- If signals are stale (> 5 minutes old): ignore, do not act on old data

### vAIb -> Prime Nexus (Future, Option C, Phase 4+)

```
+---------------+     NexusSignal API      +------------------+
|  Prime Nexus  |  <-------------------->  |      vAIb        |
|  Cockpit      |   Bidirectional          |  Music Cockpit   |
+---------------+                          +------------------+
```

**What vAIb would send:**

| Data | Example | Purpose |
|---|---|---|
| Current track title | "Synthetic Sunrise" | Music context display |
| Current station | "Neon Drift" | Station context |
| Current vibe | "ambient focus" | Atmosphere context |
| Agent on-air | "vg-god" | Agent context |
| BPM | 132 | Tempo context |

**Prime Nexus display:**
```
Prime Nexus Cockpit:
- VG God is on air playing "Synthetic Sunrise" (ambient electronic, 132 BPM)
- Music atmosphere: ambient focus
- Endpoint vg-api: online
```

**Privacy for reverse path:**
- vAIb sends only music metadata (track title, station name)
- No listening history, no user behavior data
- No agent internal state
- User can disable vAIb -> Nexus transmission independently

---

## 9. INTRANET / SOLAR-OPS SEARCH PLAN

### Source

**VPS:** `100.65.108.84:8088`  
**File location:** `/home/xsyvps/`  
**Network:** Tailnet-protected (no additional auth needed initially)

### Search Targets

| Target Category | Keywords |
|---|---|
| Solar Ops | solar-ops, agents, planets, services, radios |
| vAIb Related | endpoints, vAIb, Command Nexus, Prime Nexus |
| Agents | Hermes, OpenClaw, VG God, agent definitions |
| Communication | Mattermost, Matrix, Telegram, chat bridges |
| Documentation | system-map.md, service-registry.md, port-registry.md, agent-registry.md |

### How Documents Seed vAIb

| Document | Seeds vAIb With | Maps To |
|---|---|---|
| `system-map.md` | Endpoint names, network topology, node relationships | `EndpointNode` names, connectivity graph |
| `service-registry.md` | Service names, types, dependencies | `RuntimeSource` names, service type classification |
| `agent-registry.md` | Agent names, roles, capabilities | `AgentPresence` names, roles, capability flags |
| `port-registry.md` | Endpoint URLs, port numbers, protocols | `EndpointNode.url`, port configuration |
| `radio/station docs` | Station definitions, genre preferences, schedules | `StationDescriptor` metadata, genre mappings |

### Discovery Method (Phase 2)

```kotlin
package com.xsytrance.vaib.data.discovery

/**
 * IntranetDiscovery polls the Solar Ops VPS for documentation
 * and maps discovered entities to vAIb data models.
 */
class IntranetDiscovery {
    private val baseUrl = "http://100.65.108.84:8088"
    
    suspend fun fetchSystemMap(): SystemMap? {
        return try {
            val response = httpClient.get("$baseUrl/system-map.md")
            if (response.status == HttpStatusCode.OK) {
                parseSystemMap(response.bodyAsText())
            } else null
        } catch (e: Exception) {
            null // Silently fail -- discovery is optional
        }
    }
    
    suspend fun fetchServiceRegistry(): ServiceRegistry? { /* ... */ }
    suspend fun fetchAgentRegistry(): AgentRegistry? { /* ... */ }
    suspend fun fetchPortRegistry(): PortRegistry? { /* ... */ }
    
    // Mapping functions (read-only, never write to VPS)
    fun mapToEndpointNodes(registry: ServiceRegistry): List<EndpointNode> { /* ... */ }
    fun mapToRuntimeSources(registry: ServiceRegistry): List<RuntimeSource> { /* ... */ }
    fun mapToAgentPresences(registry: AgentRegistry): List<AgentPresence> { /* ... */ }
}
```

### Privacy

| Rule | Specification |
|---|---|
| **Read-only** | vAIb only reads documentation from the VPS |
| **No write access** | vAIb never writes to the VPS |
| **No sensitive data exposure** | Only functional names, no passwords, no keys |
| **User controlled** | Settings toggle: "Enable intranet discovery" (default: OFF) |
| **Local processing** | All parsing happens on-device |
| **No data transmission** | Discovered data never leaves the device |

### Fallback

If the VPS is unreachable:
- vAIb continues with existing/demo data
- No error dialogs
- Silent background retry every 5 minutes
- User can manually trigger discovery from Settings

---

## 10. VISUAL DESIGN DIRECTION UPDATE

### Key Changes from Previous Visual Overhaul Plan

| # | Change | Previous | New | Rationale |
|---|---|---|---|---|
| 1 | Visualizer priority | #5 (after layout, type, color) | **#1** | Invisible visualizer is the #1 problem |
| 2 | App title size | 32sp | **36sp** | DisplayLarge bigger for identity |
| 3 | Now Playing title | 20sp Bold | **24sp Bold** | Music is sovereign -- largest text |
| 4 | Artist name | 15sp | **18sp** | Artist nearly as important as title |
| 5 | Card hierarchy | L1-L4 only | **L0 strip + L1-L4** | Visualizer gets its own always-visible level |
| 6 | Layout metaphor | News-article list | **Big, bold, glanceable** | Music app, not news reader |
| 7 | Touch targets | 44dp minimum | **48dp minimum** | Android accessibility standard |
| 8 | Detail access | Inline expansion | **Expandable bottom sheets** | Info-rich only when requested |
| 9 | Agent presentation | RPG character sheets | **Operational, minimal** | Agents are tools, not characters |
| 10 | AMOLED negative space | 50% black | **60%+ black** | More calm, more battery efficient |

### Typography Scale Update

**File:** `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/ui/theme/Type.kt`

```kotlin
val VaibTypography = Typography(
    // App title (was 32sp -> now 36sp)
    displayLarge = TextStyle(
        fontSize = 36.sp,           // UPDATED from 32.sp
        fontWeight = FontWeight.Bold,
        color = TextPrimary
    ),
    
    // Section headers (was 28sp -> now 32sp)
    displayMedium = TextStyle(
        fontSize = 32.sp,           // NEW token
        fontWeight = FontWeight.Bold,
        color = TextPrimary
    ),
    
    // Now Playing track title (was 20sp -> now 24sp)
    headlineLarge = TextStyle(
        fontSize = 24.sp,           // UPDATED from 20.sp
        fontWeight = FontWeight.Bold,
        color = TextPrimary
    ),
    
    // Card titles (unchanged at 22sp)
    headlineMedium = TextStyle(
        fontSize = 22.sp,
        fontWeight = FontWeight.SemiBold,
        color = TextPrimary
    ),
    
    // Section labels (was 18sp -> now 20sp)
    titleLarge = TextStyle(
        fontSize = 20.sp,           // UPDATED from 18.sp
        fontWeight = FontWeight.Medium,
        color = TextPrimary
    ),
    
    // Artist name, secondary titles (was 16sp -> now 18sp)
    titleMedium = TextStyle(
        fontSize = 18.sp,           // NEW token
        fontWeight = FontWeight.Medium,
        color = TextSecondary
    ),
    
    // Body text (unchanged at 16sp)
    bodyLarge = TextStyle(
        fontSize = 16.sp,
        color = TextPrimary
    ),
    
    // Card body (unchanged at 14sp)
    bodyMedium = TextStyle(
        fontSize = 14.sp,
        color = TextSecondary
    ),
    
    // Labels, metadata (unchanged at 12sp)
    labelMedium = TextStyle(
        fontSize = 12.sp,
        color = TextMuted
    ),
    
    // Small labels (unchanged at 10sp)
    labelSmall = TextStyle(
        fontSize = 10.sp,
        color = TextMuted
    ),
    
    // NEW: Caption for telemetry (11sp)
    labelTelemetry = TextStyle(
        fontSize = 11.sp,           // NEW token
        color = TextMuted
    )
)
```

### New Additions to Visual Design

| Addition | Spec | Purpose |
|---|---|---|
| **Visualizer strip** | 32-40dp, full width, pinned above LazyColumn | Always-visible audio indicator |
| **Now Playing combined card** | 24sp title, visualizer embedded, neonGlow border | Unified music identity |
| **Resonance Trace** | Bottom sheet, 50% height, opt-in | "Why this song?" explanation |
| **Information layers** | Level 0 always visible, L1-3 progressively revealed | Progressive disclosure |
| **Gesture handlers** | Tap, long-press, swipe, double-tap on key areas | Rich interaction without clutter |
| **DEMO badge** | "DEMO" pill in SecondaryGold when `demoMode=true` | Clear demo mode indication |

### AMOLED Negative Space Target

At any point in the Cockpit, **at least 60% of the screen should be `#000000` pure black**. This is measured by pixel area, not element count.

| Screen Area | Target Black % | How Achieved |
|---|---|---|
| Level 0 (glance) | 70%+ | Large gaps between elements, no card backgrounds |
| Level 1 (context expanded) | 60%+ | Compact expansion, no full-width cards |
| Level 2 (details sheet) | 50%+ | Sheet covers half screen, background is black |
| Scrolled state | 60%+ | Cards have 12dp horizontal padding, gaps between items |

### Color Usage Rules

| Color | Hex | Usage | Max Screen % |
|---|---|---|---|
| PrimaryNeonCyan | #00E5FF | Titles, active elements, visualizer bars | 5% |
| SecondaryGold | #FFD700 | Play button, warnings, DEMO badge | 2% |
| AccentMagenta | #FF00FF | Vibe tags, highlights, peaks | 2% |
| AccentViolet | #8B5CF6 | Low visualizer bars, secondary accents | 3% |
| SurfaceCard | #111111 | Card backgrounds | 20% |
| SurfaceElevated | #1A1A1A | Sheets, elevated cards | 10% |
| TextPrimary (White) | #FFFFFF | Titles, primary text | 8% |
| TextSecondary | #AAAAAA | Artist, descriptions | 5% |
| TextMuted | #666666 | Labels, telemetry | 3% |
| BackgroundAmoled | #000000 | Background (always dominant) | 60%+ |

---

## 11. IMPLEMENTATION OPTIONS AUDIT

### Option 1: Phase A Visual Overhaul First

**Scope:**
- Typography update (Type.kt -- 6-8 tokens)
- Cockpit layout rebalance (reorder LazyColumn items)
- Visualizer-first positioning (move to top)
- Color usage refinement

**Pros:**
1. Immediate visual improvement -- user sees visualizer on launch
2. Lowest risk -- only UI changes, no networking
3. Music playback completely untouched
4. Can be completed in 3-4 hours
5. Easy to test and iterate

**Cons:**
1. Still shows fake entities ("DJinn", "neon focus", token budget)
2. Doesn't solve the authenticity problem
3. Users may not trust the app with hardcoded demo data visible
4. Limited to Cockpit -- other screens unchanged

**Effort:** 3-4 hours  
**Risk:** LOW  
**Value:** Medium (visual improvement only)

---

### Option 2: Discovery Phase 1 First

**Scope:**
- Implement IntranetDiscovery client
- Parse system-map.md, service-registry.md, agent-registry.md
- Map discovered entities to EndpointNode, RuntimeSource, AgentPresence
- Replace demo data with discovered data
- Add provenance tracking

**Pros:**
1. Solves the authenticity problem -- real entities from real infrastructure
2. Enables genuine atmosphere (real agent activity drives music)
3. Foundation for Prime Nexus integration
4. Makes the app feel "alive" with real data

**Cons:**
1. No visual improvement -- visualizer still invisible
2. Complex networking with VPS
3. Parsing markdown documentation is fragile
4. Error handling for unreachable VPS adds complexity
5. 5-7 hours of work before any visible improvement

**Effort:** 5-7 hours  
**Risk:** MEDIUM (networking complexity, parsing fragility)  
**Value:** High (authenticity) but delayed visual payoff

---

### Option 3: Hybrid Safe Slice (RECOMMENDED)

**Scope:**
The Hybrid Safe Slice combines the best of Options 1 and 2 with a deliberately limited scope.

**Included:**
1. Move visualizer to compact strip (36dp, always visible) -- Option 4
2. Redesign Cockpit layout: big Now Playing, minimal metadata
3. Remove hardcoded fake entities:
   - Remove `AgentChip("DJinn")` -- use actual `onAirAgentId`
   - Remove `"Vibe: neon focus"` hardcoded text -- use `currentStation.vibe`
   - Remove `TokenBudgetPill` (used=420, total=800, "DJinn") -- entirely
4. Add DEMO badge when `demoMode=true`
5. Add Level 0/1 information layering (expandable context)
6. Add gesture handlers (tap on visualizer, long-press for trace)
7. Typography update (displayLarge 36sp, headlineLarge 24sp, titleMedium 18sp)
8. Remove from Cockpit:
   - Connector Health card section
   - Route telemetry text ("Route: $route...")
   - Reactions preview section
   - TokenBudgetPill

**NOT Included:**
- Full discovery networking (IntranetDiscovery)
- VisualizerStyle system (14 styles -- stubs only)
- Resonance Trace implementation (UI defined, logic future)
- Prime Nexus integration (API contract defined, code future)
- Card density reduction on other screens (Stations, Agents, etc.)
- Agent sanitization across all demo data (only Cockpit cleaned)
- Skip track gesture (requires ViewModel changes -- protected boundary)

**Pros:**
1. Immediate visual improvement -- visualizer visible on launch
2. Fake entity cleanup improves trust/authenticity
3. Smallest scope of all options -- 4-5 hours
4. Music playback completely untouched
5. Easy to revert if issues arise
6. Sets foundation for future phases (gestures, styles defined)

**Cons:**
1. Doesn't solve full discovery -- other screens still have demo data
2. Limited to Cockpit -- other screens unchanged
3. May feel like "not enough" compared to full overhaul vision

**Effort:** 4-5 hours  
**Risk:** LOW  
**Value:** High (visual + authenticity, smallest scope)

---

### Hybrid Safe Slice -- Detailed File Changes

**File 1: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/ui/theme/Type.kt`**

Changes:
- Add `displayLarge: 36.sp` (new token)
- Add `displayMedium: 32.sp` (new token)
- Update `headlineLarge: 24.sp` (was 22.sp... wait, was 28.sp. Actually looking at current Type.kt, headlineLarge is 28.sp. The Now Playing title in CockpitScreen.kt is hardcoded at 20.sp. Need to update VaibTypography to have a 24.sp token for track titles.)
- Add `titleMedium: 18.sp` (new token for artist names)
- Add `labelTelemetry: 11.sp` (new token)

**File 2: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/ui/screens/CockpitScreen.kt`**

Changes (~60% of existing code reordered or removed):

REMOVE:
- Route telemetry text item (lines 99-108)
- Connector Health section item (lines 128-153)
- Reactions preview header + items (lines 259-284)
- TokenBudgetPill item (lines 288-294)
- `AgentChip("DJinn")` hardcoded -- replace with dynamic
- `"Vibe: neon focus"` hardcoded -- replace with dynamic

REORDER:
- Move visualizer to pinned strip above LazyColumn (new parent Column)
- Move Now Broadcasting card up (after status row)
- Move On Air card below Now Broadcasting

MODIFY:
- Header: "vAIb" from 32.sp to 24.sp, subtitle from 14.sp to 12.sp
- Track title: from 20.sp to 24.sp Bold
- Artist: from 15.sp to 18.sp
- Add Level 1 "Show Context" toggle
- Add DEMO badge pill when demoMode
- Add gesture detectors to visualizer and Now Playing

NEW:
- Parent Column wrapping visualizer strip + LazyColumn
- Visualizer strip: 36dp, full width, pinned
- Gesture handlers (tap, long-press)
- DEMO badge composable

**File 3: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/ui/screens/SettingsScreen.kt`**

Changes (minor):
- Add VisualizerStyle selector row (horizontal chips)
- Add "Show Resonance Trace" toggle
- Add "Enable Prime Nexus signals" toggle
- Add "Enable intranet discovery" toggle

**Files NOT touched:**
- `AudioBackbone.kt` -- PROTECTED
- `VaibViewModel.kt` -- PROTECTED (read-only access to `onAirAgentId` already available)
- `VisualizerBars.kt` -- no changes needed (reused as-is)
- `VaibCard.kt` -- no changes needed (existing L1-L4 hierarchy sufficient)
- `AgentChip.kt` -- no changes needed (reused as-is)
- All other screen files -- out of scope

---

## 12. RISKS

| Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|
| **Visualizer at top pushes content down** | Low | High | 36dp strip is minimal; content was already scrollable |
| **Pinning visualizer above LazyColumn changes scroll feel** | Medium | Medium | Test on device; can revert to in-column placement if awkward |
| **Removing Connector Health upsets operational users** | Low | Low | Moved to Settings -> System, not deleted; accessible when needed |
| **Gesture handlers conflict with existing scroll** | Medium | Medium | Only visualizer and Now Playing areas have custom gestures; rest uses default scroll |
| **Big typography breaks existing layouts** | Low | Medium | Update systematically; test each screen; wrap text with `maxLines` |
| **Hybrid slice feels too small -- not transformative** | Medium | Low | Visualizer-first + big typography IS transformative; user sees immediate difference |
| **Fake entity cleanup breaks demo mode display** | Low | Medium | Replace with dynamic fields or "Unknown" fallback; add DEMO badge for clarity |
| **Typography scale update affects other screens** | Low | High | Only Cockpit uses new tokens initially; other screens updated separately |
| **DEMO badge adds visual clutter** | Low | Low | Only shows when `demoMode=true`; 14sp pill in corner; minimal |
| **Level 1 context toggle adds interaction complexity** | Low | Low | Collapsed by default; single tap; minimal cognitive load |
| **Removing route telemetry removes debug visibility** | Medium | Low | Route info moved to Settings -> System; devs can still access |
| **Gesture discovery -- users won't find long-press trace** | Low | Medium | Also accessible via Level 2 "Why this song?" button; multiple paths |

**Overall risk assessment: LOW**  
The Hybrid Safe Slice is the lowest-risk option with the highest immediate value. All changes are UI-only and reversible.

---

## 13. RECOMMENDED NEXT SLICE

### Decision: Hybrid Safe Slice (Option 3)

### Files to Modify

| # | File | Changes | Lines Affected |
|---|---|---|---|
| 1 | `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/ui/theme/Type.kt` | 6 typography tokens: add displayLarge 36.sp, displayMedium 32.sp, update headlineLarge 24.sp, add titleMedium 18.sp, add labelTelemetry 11.sp | ~15 lines |
| 2 | `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/ui/screens/CockpitScreen.kt` | Full layout redesign: extract visualizer strip, reorder LazyColumn, remove 4 sections, update typography sizes, add Level 0/1, add DEMO badge, add gestures | ~180 lines (from 298) |
| 3 | `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/ui/screens/SettingsScreen.kt` | Add 3 toggles + 1 selector row: VisualizerStyle chips, Resonance Trace toggle, Nexus signals toggle, Intranet discovery toggle | ~40 lines |

### Files NOT Touched (Protected)

| File | Reason |
|---|---|
| `AudioBackbone.kt` | Music playback boundary -- ZERO changes |
| `VaibViewModel.kt` | Playback methods protected; read-only state access only |
| `VisualizerBars.kt` | Reused as-is, no changes needed |
| `VaibCard.kt` | Existing hierarchy sufficient |
| `AgentChip.kt` | Reused as-is |
| `StationCard.kt` | Out of scope for this slice |
| `QueueScreen.kt` | Out of scope |
| All other screens | Out of scope |

### Implementation Order

1. **Step 1:** Update Type.kt (15 min) -- new typography tokens
2. **Step 2:** Restructure CockpitScreen.kt (2-3h) -- the main work
   - Extract visualizer strip above LazyColumn
   - Remove 4 sections (route, connector health, reactions, token budget)
   - Reorder remaining items
   - Update typography sizes
   - Add DEMO badge
   - Add Level 0/1 layering
3. **Step 3:** Add gesture handlers (30 min) -- tap, long-press on visualizer
4. **Step 4:** Update SettingsScreen.kt (30 min) -- toggles and selector
5. **Step 5:** Test on device (30 min) -- verify scroll, visualizer visibility, music playback

**Total estimated time: 4-5 hours**

### Success Criteria

| # | Criterion | How Verified |
|---|---|---|
| 1 | Visualizer visible immediately on app launch | Screenshot test: visualizer strip visible at top without scroll |
| 2 | Now Playing title is 24sp Bold | Visual inspection + layout bounds check |
| 3 | No hardcoded "DJinn" visible | Text search: `"DJinn"` returns 0 results in CockpitScreen.kt |
| 4 | No hardcoded "neon focus" visible | Text search: `"neon focus"` returns 0 results |
| 5 | No token budget visible | TokenBudgetPill not referenced in CockpitScreen.kt |
| 6 | Cockpit shows <=10 text elements (down from ~30) | Manual count of visible text in Level 0 |
| 7 | Music playback completely unaffected | Play/pause, station change, auto-play all work |
| 8 | App feels calm and whisper-quiet | Visual inspection: 60%+ black, minimal animation outside visualizer |
| 9 | Gestures work on visualizer | Tap produces ripple, long-press shows trace sheet |
| 10 | DEMO badge shows when demoMode=true | Toggle demo mode, verify badge appears |

### Rollback Plan

If issues arise:
1. Revert `CockpitScreen.kt` to previous version (git revert)
2. Keep Type.kt changes (low risk, additive only)
3. Keep SettingsScreen.kt changes (behind toggles, low risk)
4. Total rollback time: < 5 minutes

---

## 14. WAITING

### Status: Planning Complete. Do Not Implement.

This document is a comprehensive UX architecture plan. It is **NOT** an implementation task list. No code should be written based on this document until explicitly authorized.

### What Happens Now

1. This plan is reviewed by stakeholders
2. Feedback is incorporated (if any)
3. A separate implementation task is created when approved
4. Implementation follows the "Hybrid Safe Slice" scope defined in Section 13

### Planning Deliverables Summary

| Section | Deliverable | Status |
|---|---|---|
| 3 | 8 visualizer layout options analyzed | Complete |
| 3 | Recommendation: Option 4 + Option 5 enhancement | Complete |
| 4 | VisualizerStyle enum (14 styles) + performance tiers | Complete |
| 4 | Settings UI design for style selector | Complete |
| 4 | Reduced motion compatibility rules | Complete |
| 5 | 11 gestures specified with exact triggers/actions/feedback | Complete |
| 6 | 4 information levels (L0-L3) with exact contents | Complete |
| 7 | Resonance Trace UX specification | Complete |
| 8 | Prime Nexus integration architecture (Option A -> C) | Complete |
| 9 | Intranet discovery plan | Complete |
| 10 | Visual design direction update (10 changes) | Complete |
| 11 | 3 implementation options audited | Complete |
| 12 | Risk matrix (12 risks) | Complete |
| 13 | Recommended next slice with file changes + success criteria | Complete |

### Open Questions for Future Resolution

1. **Skip track implementation:** The swipe-to-skip gesture requires `viewModel.skipNext()` which may not exist. Skip functionality is NOT part of this plan. Decision needed: add skip methods to ViewModel (touching protected boundary?) or disable the gesture.

2. **VisualizerStyle stubs:** 11 of 14 styles are placeholders. Priority order for implementation: CLASSIC_BARS (exists) -> MINIMAL_BREATHING_LINE -> OSCILLOSCOPE_LINE -> SPECTRUM_HORIZON -> WAVEFORM_RIBBON -> PULSE_RING -> rest.

3. **Resonance Trace generation:** The algorithm for generating traces from source data is defined in pseudocode but not implemented. This requires backend support or on-device logic. Decision needed in Phase 3.

4. **Prime Nexus API:** The `NexusSignal` API contract is defined but the actual Prime Nexus endpoint does not exist yet. This is a Phase 4+ dependency.

5. **Intranet Discovery:** The VPS at `100.65.108.84:8088` needs to be verified accessible and the markdown files confirmed to exist before implementation.

### Document Control

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | 2025-01-20 | vAIb UX Architect | Initial plan |

---

*End of Document. Planning only. Implementation awaits authorization.*
