# VAIB Visual Design Overhaul Plan
## AMOLED Broadcast Cockpit Redesign

**Version:** 1.0 | **Scope:** Planning-only | **Constraint:** Music pipeline protected

---

## 1. STATUS

**Mission:** Transform VAIB from a data-dense monitoring dashboard into an AMOLED-optimized music cockpit where the track is sovereign, system status is whisper-quiet, and every pixel earns its place.

**Protected (MUST NOT TOUCH):**
- `AudioBackbone.kt` — ExoPlayer, playback, TTS
- `VaibViewModel.kt` lines 246, 250, 279, 294 — auto-play, binding, sync, demo init
- `playStation()`, `togglePlayPause()`, `playNarrationFile()` — all playback methods
- Station/Track/Queue model data class structure

**Files touched by this plan:** Type.kt, CockpitScreen.kt, StationsScreen.kt, AgentsScreen.kt, QueueScreen.kt, StationCard.kt, TrackCard.kt, QueueTrackCard.kt, AgentDetailCard.kt, VaibCard.kt, EmptyState.kt, DemoData.kt, VaibViewModel.kt (reactions/show names only)

---

## 2. MUSIC SOURCE AUDIT

### 2.1 Music Resolution Priority

| Priority | Source | URI Pattern |
|----------|--------|-------------|
| 1 | Remote HTTP stream | `station.streamUrl` e.g. `http://100.110.224.126:4014` |
| 2 | Local device file | `station.fallbackLocalTrack` e.g. `/sdcard/Music/vaib/` |
| 3 | Bundled APK asset | `asset:///audio/${station.id}.mp3` |

`playbackMode` ("local" | "stream" | "hybrid") controls source priority.

### 2.2 Playback Flow

```
User taps station → playStation(station) → AudioBackbone.playStation(station)
  → Resolves URI (stream → local → asset) → ExoPlayer.setMediaItem() → prepare() + play()
    → Player.Listener → syncPlaybackState() → _appState.playback → CockpitScreen recomposes
```

### 2.3 Auto-Play Behavior

`init` block (line 246): `currentStation?.let { playStation(it) }` — auto-plays on startup. Do not alter.

### 2.4 DJ Interstitials

`playDjInterstitial()` → ElevenLabs TTS → temp file → `audioBackbone.playNarrationFile(File)` → pauses music → plays narration → resumes. Do not alter.

### 2.5 Station Model — Display-Relevant Fields

```kotlin
data class Station(
    val id: String,              // Asset URI, card key
    val name: String,            // PRIMARY: Station name
    val hostAgent: String,       // SECONDARY: Agent name
    val description: String,     // TERTIARY: Flavor text — remove from cards
    val vibe: String,            // DISPLAY: Mood descriptor
    val genre: String,           // DISPLAY: Genre — overlaps with vibe, remove
    val bpmRange: String,        // DISPLAY: "128-140"
    val isLive: Boolean,         // UI: Live badge trigger
    val listeners: Int,          // UI: Hide when 0 (demo)
    val streamUrl: String?,      // MUSIC PIPELINE: Do not touch
    val playbackMode: String,    // MUSIC PIPELINE: Do not touch
    val fallbackLocalTrack: String?  // MUSIC PIPELINE: Do not touch
)
```

---

## 3. VISUAL AUDIT

### 3.1 Typography

#### Current Scale (Type.kt)

| Token | Size | Weight | Used For |
|-------|------|--------|----------|
| headlineLarge | 28sp | Bold | App title ("vAIb") |
| headlineMedium | 22sp | SemiBold | Screen headers (inconsistently) |
| titleLarge | 18sp | Medium | Station names, card titles |
| bodyLarge | 16sp | Regular | Primary body — too large for cockpit |
| bodyMedium | 14sp | Regular | Descriptions |
| labelMedium | 12sp | Regular | Captions, badges |
| labelSmall | 10sp | Regular | Timestamps — below readability threshold |

**Problems:** bodyLarge at 16sp competes with headers. labelSmall at 10sp unreadable on AMOLED. No display token. No caption token. Screen headers use ad-hoc 24sp. Card titles at 18sp have insufficient gap from headers at 22sp.

#### Proposed VaibTypography v2

```kotlin
// File: ui/theme/Type.kt
val VaibTypography = Typography(
    displayLarge = TextStyle(       // App title "vAIb"
        fontSize = 32.sp, fontWeight = Bold, color = PrimaryNeonCyan, letterSpacing = (-0.5).sp
    ),
    headlineLarge = TextStyle(      // Screen headers: "Stations", "Agents"
        fontSize = 24.sp, fontWeight = SemiBold, color = TextPrimary, letterSpacing = (-0.3).sp
    ),
    headlineMedium = TextStyle(     // Card titles: station names
        fontSize = 20.sp, fontWeight = SemiBold, color = TextPrimary, letterSpacing = (-0.2).sp
    ),
    headlineSmall = TextStyle(      // Track titles, sub-headlines
        fontSize = 18.sp, fontWeight = Medium, color = TextPrimary, letterSpacing = (-0.1).sp
    ),
    titleLarge = TextStyle(         // Section headers within screens
        fontSize = 16.sp, fontWeight = Medium, color = TextPrimary
    ),
    titleMedium = TextStyle(        // Card section labels: "On Air"
        fontSize = 14.sp, fontWeight = Medium, color = TextSecondary, letterSpacing = 0.1.sp
    ),
    bodyLarge = TextStyle(          // Primary reading text
        fontSize = 15.sp, fontWeight = Normal, color = TextPrimary, lineHeight = 22.sp
    ),
    bodyMedium = TextStyle(         // Secondary text: artist names, descriptions
        fontSize = 14.sp, fontWeight = Normal, color = TextSecondary, lineHeight = 20.sp
    ),
    bodySmall = TextStyle(          // Metadata: BPM, vibe
        fontSize = 13.sp, fontWeight = Normal, color = TextSecondary, letterSpacing = 0.1.sp
    ),
    labelMedium = TextStyle(        // Captions, badges, pills
        fontSize = 12.sp, fontWeight = Medium, color = TextMuted, letterSpacing = 0.2.sp
    ),
    labelSmall = TextStyle(         // Fine print, timestamps, counts
        fontSize = 11.sp, fontWeight = Normal, color = TextMuted, letterSpacing = 0.2.sp
    ),
    labelXSmall = TextStyle(        // Minimal indicators only
        fontSize = 10.sp, fontWeight = Normal, color = TextMuted, letterSpacing = 0.3.sp
    )
)
```

#### Typography Migration

| Element | Current | New Token | New Size |
|---------|---------|-----------|----------|
| App title "vAIb" | headlineLarge 28sp | displayLarge | 32sp |
| Screen header "Stations" | ad-hoc 24sp | headlineLarge | 24sp |
| Station name | titleLarge 18sp | headlineMedium | 20sp |
| Track title (list) | ad-hoc 15-16sp | headlineSmall | 18sp |
| Track title (now playing) | ad-hoc 20sp | headlineMedium | 20sp |
| Artist name | ad-hoc 13-15sp | bodyMedium | 14sp |
| Section header "Queue" | titleLarge 18sp | titleLarge | 16sp |
| Description | bodyLarge 16sp | bodyLarge | 15sp |
| Host agent | bodyMedium 14sp | bodyMedium | 14sp |
| BPM / vibe / genre | mixed 11-13sp | bodySmall | 13sp |
| Status pills "LIVE" | labelMedium 12sp | labelMedium | 12sp |
| Listener count | labelMedium 12sp | labelSmall | 11sp |
| Tags | labelSmall 11sp | labelSmall | 11sp |
| Timestamp | labelSmall 10sp | labelXSmall | 10sp |

### 3.2 Card Density Audit

| Card | File | Current Elements | Problem |
|------|------|-----------------|---------|
| StationCard | StationCard.kt | 8 (name,host,desc,status,listeners,BPM,genre,vibe) | Genre+vibe overlap, desc is flavor text |
| TrackCard | TrackCard.kt | 5 (title,artist,BPM,tags,reason) | Reason empty, tags at 11sp unreadable |
| QueueTrackCard | QueueTrackCard.kt | 8 (title,artist,reqBy,mood,BPM,dur,likes,dislikes) | Densest card, mood redundant |
| AgentDetailCard | AgentDetailCard.kt | 10+ | Character sheet: mood,comment style,emoji,token budget |

**Target: 4-5 visible elements per card.** Strategy: remove duplicates (genre+vibe→vibe only), hide metadata behind expansion, remove empty fields (reason), consolidate (BPM+vibe→single line), remove gamification (like/dislike counts→icon only).

### 3.3 Screen-by-Screen Audit

#### CockpitScreen.kt (HIGHEST PRIORITY) — ~30 text elements

| Element | Size | Verdict |
|---------|------|---------|
| "vAIb" | 32sp Bold Cyan | **Keep** |
| "Agent-native music cockpit" | 14sp | **Remove** — wrong metaphor |
| connectivityLabel | 12sp | **Keep** in simplified status row |
| outputMode | 12sp | **Move** to Settings |
| Play/Pause + Refresh | icons | **Keep** |
| Route text, probe count, latency | 11sp | **Remove** — dev telemetry → Settings |
| On Air: agent name + show name | 18+14sp | **Keep** — collapse to 2 lines |
| On Air: next slot + reason + lineup | 12+12+11sp | **Move** to expandable / Agents tab |
| Connector Health card | full card | **Remove** from Cockpit → Settings |
| "Now Broadcasting" | 16sp | **Rename** to "Now Playing" 16sp |
| Track title | 20sp | **Keep** — most prominent text |
| Track artist | 15sp | **Standardize** to 14sp bodyMedium |
| AgentChip("DJinn") | chip | **Remove** — hardcoded fake |
| "Vibe: neon focus" | 13sp | **Replace** with dynamic station.vibe |
| BPM | 12sp | **Merge** with vibe → "128 BPM • focus" |
| VisualizerBars | 24 bars | **Keep** — only animation, fine |
| Queue preview | header + 3 cards | **Keep** — reduce card density |
| Reactions header + 3 badges | 16+12sp | **Remove** — theatrical |
| TokenBudgetPill("DJinn") | 12sp | **Remove** → Agent details |

**Proposed Cockpit v2: ~14 text elements (53% reduction)**

```
[ "vAIb" 32sp Cyan ]
[ StatusPill + Play/Pause + Refresh ]
[ On Air Card: agent 18sp + show 14sp ]
[ Now Playing Card L1 GLOW: title 20sp + artist 14sp + BPM•vibe 13sp + Visualizer ]
[ "Queue" 16sp + 3 reduced cards ]
[ 80dp nav spacer ]
```

#### StationsScreen.kt

| Element | Current | Proposed |
|---------|---------|----------|
| "Stations" header | 24sp ad-hoc | headlineLarge 24sp |
| Live count | 12sp | Keep, only when >0 |
| Listener count | 12sp | Hide when 0 |
| StationCard | 8 elements | 5 elements (Section 5.1) |
| Empty state | None | Add EmptyState |

#### AgentsScreen.kt

| Element | Current | Proposed |
|---------|---------|----------|
| "Agents" header | 24sp ad-hoc | headlineLarge 24sp |
| AgentDetailCard | 10+ visible | 4 visible + expandable chevron |
| Role | "Signal Architect" | "sync-controller" (sanitized) |
| workMood | Visible 12sp | **Remove** — theatrical |
| commentStyle | Visible 11sp | **Remove** — theatrical |
| emojiStyle | Visible 11sp | **Remove** — theatrical |
| TokenBudgetPill | Visible | Behind expandable |

#### QueueScreen.kt

| Element | Current | Proposed |
|---------|---------|----------|
| "Queue" header | 24sp ad-hoc | headlineLarge 24sp |
| QueueTrackCard | 8 elements | 5 elements (Section 5.3) |
| Empty state | None | Add EmptyState |

#### Other Components

| Component | Assessment |
|-----------|------------|
| VisualizerBars.kt | **Keep as-is** — only animation, not distracting |
| StatusPill.kt | **Keep as-is** — well-designed, appropriate |
| AgentChip.kt | **Keep component** — fix usage to dynamic agent |

---

## 4. DESIGN LANGUAGE — "AMOLED Broadcast Cockpit"

### 4.1 Principles

1. **AMOLED First** — Unused pixels are #000000. Surfaces only where content exists.
2. **Typography as Structure** — Size hierarchy replaces visual clutter. No divider lines.
3. **Restraint** — Fewer elements, each more important. If it doesn't help now, it's gone or hidden.
4. **Music Sovereignty** — Track title is always the largest, most prominent text when playing.
5. **Calm** — No celebration animations. No bouncing. Visualizer only.
6. **Operational Clarity** — Status indicators, not dashboards. Telemetry → Settings.
7. **Authenticity** — No fake data in main UI. Functional names and roles only.
8. **Whisper, Not Shout** — Cyan accent is 1px borders. Glow reserved for now playing only.

### 4.2 Spacing System

```kotlin
object VaibSpacing {
    const val minimal = 4.dp      // Icon + text gap
    const val tight = 8.dp        // Related items
    const val cardPadding = 12.dp // Card internal
    const val screenEdge = 16.dp  // Screen horizontal
    const val sectionGap = 20.dp  // Section separator
    const val majorBreak = 24.dp  // Major regions
    const val navSpacer = 80.dp   // Bottom nav clearance
}
```

### 4.3 Card Hierarchy (4 Levels)

```kotlin
enum class CardLevel { NOW_PLAYING, ACTIVE, PASSIVE, PREVIEW }
```

| Level | Background | Border | Corner | Usage |
|-------|------------|--------|--------|-------|
| L1 NOW_PLAYING | SurfaceElevated #1A1A1A | 1.5dp Cyan 60% | 12dp | Currently playing item only |
| L2 ACTIVE | SurfaceCard #111111 | None | 10dp | Station cards, queue, agents |
| L3 PASSIVE | SurfaceDark #0A0A0A | 0.5dp #222222 | 8dp | Expandable details, metadata |
| L4 PREVIEW | Transparent | None | 6dp | Inline preview items |

**Glow Discipline:** Cyan border only on L1. No `neonGlow` param. No exceptions.

### 4.4 Color Rules

| Color | Hex | Used For | Never For |
|-------|-----|----------|-----------|
| PrimaryNeonCyan | #00E5FF | L1 borders, play icon, BPM text | Card fills, body text |
| SecondaryGold | #FFD700 | Token bars, genre tags | Primary actions |
| AccentMagenta | #FF00FF | Vibe text, station flavor | Status indicators |
| LiveGreen | #00FF88 | LIVE badge dot only | Nothing else |
| ErrorRed | #FFFF4444 | Error/offline states | Decorative |
| BackgroundAmoled | #000000 | Screen background | Any surface |
| SurfaceDark | #0A0A0A | L3 card bg | Primary content |
| SurfaceCard | #111111 | L2 card bg | Now playing |
| SurfaceElevated | #1A1A1A | L1 card bg | General cards |
| TextPrimary | #FFFFFF | Headlines, titles | Muted info |
| TextSecondary | #AAAAAA | Body, descriptions | Headlines |
| TextMuted | #666666 | Captions, timestamps | Body text |
| BorderSubtle | #222222 | L3 borders | Emphasis |

---

## 5. CONCRETE UI CHANGES

### 5.1 StationCard.kt

**Current:** 8 text elements — name(18sp) + host+desc(13sp) + status + listeners(12sp) + BPM(12sp Cyan) + genre(12sp Gold) + vibe(12sp Magenta) + "LIVE" badge.

**Proposed (5 elements):**

```kotlin
@Composable
fun StationCard(station: Station, isLive: Boolean, isPlaying: Boolean, onClick: () -> Unit) {
    Card(
        modifier = if (isPlaying) CardHierarchy.nowPlayingModifier()
                   else CardHierarchy.activeModifier(),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        onClick = onClick
    ) {
        Column(Modifier.padding(VaibSpacing.cardPadding).fillMaxWidth()) {
            // ROW 1: Name + LIVE badge + playing indicator
            Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween, Alignment.CenterVertically) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(station.name, style = VaibTypography.headlineMedium) // 20sp SemiBold
                    if (isLive) { Spacer(Modifier.width(8.dp)); LiveBadge() }
                }
                if (isPlaying) PlayingIndicator(size = 16.dp, color = PrimaryNeonCyan)
            }
            Spacer(Modifier.height(4.dp))
            // ROW 2: Host agent only (description REMOVED)
            Text(station.hostAgent.lowercase(), style = VaibTypography.bodyMedium) // 14sp
            Spacer(Modifier.height(8.dp))
            // ROW 3: Status pill + BPM/vibe consolidated
            Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween, Alignment.CenterVertically) {
                StatusPill(status = if (isLive) "on-air" else station.status)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Speed, null, Modifier.size(14.dp), PrimaryNeonCyan.copy(0.7f))
                    Spacer(Modifier.width(4.dp))
                    Text("${station.bpmRange} BPM", style = VaibTypography.bodySmall,
                         color = PrimaryNeonCyan.copy(0.8f))
                    if (station.vibe.isNotBlank()) {
                        Text(" • ${station.vibe}", style = VaibTypography.bodySmall,
                             color = AccentMagenta.copy(0.7f))
                    }
                }
            }
            // Listeners: only when > 0
            if (station.listeners > 0) {
                Spacer(Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Headset, null, Modifier.size(12.dp), TextMuted)
                    Spacer(Modifier.width(4.dp))
                    Text("${station.listeners}", style = VaibTypography.labelSmall) // 11sp
                }
            }
        }
    }
}
```

| Change | Before | After |
|--------|--------|-------|
| Name | 18sp SemiBold | 20sp SemiBold |
| Description | Visible 13sp | **Removed** |
| Host | "DJinn • desc" | "djinn" 14sp |
| Genre | 12sp Gold | **Removed** |
| BPM | 12sp standalone | 13sp merged with vibe |
| Vibe | 12sp standalone | 13sp merged with BPM |
| Listeners | Always visible | Only when > 0 |
| Border | Optional neonGlow param | isPlaying → L1 glow |

### 5.2 TrackCard.kt

**Current:** 5 elements — title(15sp) + artist(13sp) + BPM(12sp) + tags(11sp) + reason(11sp).

**Proposed (3-4 elements):**

```kotlin
@Composable
fun TrackCard(track: Track) {
    Card(Modifier = CardHierarchy.activeModifier(),
         colors = CardDefaults.cardColors(containerColor = Color.Transparent)) {
        Row(Modifier.padding(VaibSpacing.cardPadding).fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(track.title, style = VaibTypography.headlineSmall, maxLines = 1) // 18sp
                Spacer(Modifier.height(2.dp))
                Text(track.artist, style = VaibTypography.bodyMedium, maxLines = 1) // 14sp
            }
            if (track.bpm > 0) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Speed, null, Modifier.size(14.dp), PrimaryNeonCyan.copy(0.6f))
                    Spacer(Modifier.width(4.dp))
                    Text("${track.bpm}", style = VaibTypography.bodySmall, color = PrimaryNeonCyan.copy(0.8f))
                }
            }
        }
        if (track.tags.isNotEmpty()) {
            Spacer(Modifier.height(4.dp))
            Text(track.tags.first(), style = VaibTypography.labelSmall, color = AccentMagenta.copy(0.6f))
        }
    }
}
```

| Change | Before | After |
|--------|--------|-------|
| Title | 15sp Medium | 18sp Medium |
| Artist | 13sp | 14sp bodyMedium |
| Tags | All tags 11sp | First tag only |
| Reason | Visible | **Removed** (often empty) |

### 5.3 QueueTrackCard.kt

**Current:** 8 elements — title(16sp) + artist(13sp) + requestedBy(12sp) + mood(12sp) + BPM(12sp) + duration(12sp) + likes(12sp) + dislikes(12sp).

**Proposed (5 elements):**

```kotlin
@Composable
fun QueueTrackCard(item: QueueItem) {
    Card(Modifier = CardHierarchy.activeModifier(),
         colors = CardDefaults.cardColors(containerColor = Color.Transparent)) {
        Column(Modifier.padding(VaibSpacing.cardPadding).fillMaxWidth()) {
            Text(item.title, style = VaibTypography.headlineSmall, maxLines = 1,
                 overflow = TextOverflow.Ellipsis) // 18sp
            Spacer(Modifier.height(2.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(item.artist, style = VaibTypography.bodyMedium, maxLines = 1,
                     overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f)) // 14sp
                if (item.duration.isNotBlank()) {
                    Spacer(Modifier.width(8.dp))
                    Text(item.duration, style = VaibTypography.labelSmall, color = TextMuted) // 11sp
                }
            }
            Spacer(Modifier.height(8.dp))
            Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween, Alignment.CenterVertically) {
                Text(item.requestedBy.lowercase(), style = VaibTypography.bodySmall,
                     color = TextSecondary.copy(0.7f)) // 13sp
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.ThumbUp, null, Modifier.size(14.dp),
                         if (item.likes > 0) LiveGreen.copy(0.7f) else TextMuted.copy(0.4f))
                    Spacer(Modifier.width(4.dp))
                    Text("${item.likes}", style = VaibTypography.labelSmall,
                         color = if (item.likes > 0) LiveGreen.copy(0.7f) else TextMuted)
                    Spacer(Modifier.width(8.dp))
                    Icon(Icons.Default.ThumbDown, null, Modifier.size(14.dp),
                         if (item.dislikes > 0) ErrorRed.copy(0.7f) else TextMuted.copy(0.4f))
                }
            }
        }
    }
}
```

| Change | Before | After |
|--------|--------|-------|
| Layout | All stacked | Title / Artist+Duration / RequestedBy+Likes |
| Title | 16sp SemiBold | 18sp Medium |
| RequestedBy | "by X" 12sp | "x" lowercase 13sp |
| Mood | 12sp Cyan | **Removed** |
| BPM | 12sp Cyan | **Removed** (redundant with station) |
| Duration | 12sp TextSecondary | 11sp TextMuted, right-aligned |
| Likes | Icons + 12sp count | Icons + 11sp count |

### 5.4 AgentDetailCard.kt

**Current:** 10+ visible elements — name(18sp) + role(13sp) + status + chip + workload(12sp) + mood(12sp) + genres(12sp) + taste profile(11sp) + comment style(11sp) + emoji style(11sp) + token budget.

**Proposed (4 visible + expandable):**

```kotlin
@Composable
fun AgentDetailCard(agent: Agent, liveSignal: LiveSignal?, initiallyExpanded: Boolean = false) {
    var expanded by remember { mutableStateOf(initiallyExpanded) }
    Card(Modifier = CardHierarchy.activeModifier(),
         colors = CardDefaults.cardColors(containerColor = Color.Transparent)) {
        Column(Modifier.padding(VaibSpacing.cardPadding).fillMaxWidth()) {
            // === VISIBLE: 4 elements ===
            Text(agent.name.lowercase(), style = VaibTypography.headlineMedium) // 20sp
            Spacer(Modifier.height(2.dp))
            Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween, Alignment.CenterVertically) {
                Text(sanitizeRole(agent.role), style = VaibTypography.bodyMedium) // 14sp
                StatusPill(status = agent.status)
            }
            Spacer(Modifier.height(8.dp))
            AgentChip(name = agent.name.lowercase(), colorHex = agent.color)
            Spacer(Modifier.height(8.dp))
            // Expand toggle
            Row(Modifier.fillMaxWidth().clickable { expanded = !expanded },
                Arrangement.Center, Alignment.CenterVertically) {
                Text(if (expanded) "Less" else "Details", style = VaibTypography.labelMedium,
                     color = PrimaryNeonCyan.copy(0.6f))
                Icon(if (expanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                     null, tint = PrimaryNeonCyan.copy(0.6f), modifier = Modifier.size(16.dp))
            }
            // === EXPANDED ===
            AnimatedVisibility(expanded) {
                Column {
                    Spacer(Modifier.height(8.dp))
                    Divider(color = BorderSubtle, thickness = 0.5.dp)
                    Spacer(Modifier.height(8.dp))
                    liveSignal?.let { DetailRow("Workload", "${it.workload}%", SecondaryGold) }
                    if (tasteProfile.preferredGenres.isNotEmpty())
                        DetailRow("Genres", tasteProfile.preferredGenres.take(3).joinToString(", "), AccentMagenta)
                    DetailRow("BPM", tasteProfile.bpmRange, PrimaryNeonCyan)
                    if (tokenBudget.total > 0) {
                        Spacer(Modifier.height(8.dp))
                        TokenBudgetPill(tokenBudget.used, tokenBudget.total, "Token Budget")
                    }
                }
            }
        }
    }
}

private fun sanitizeRole(role: String) = when (role.lowercase()) {
    "signal architect" -> "sync-controller"
    "signal goblin" -> "discovery-agent"
    "signal bloom" -> "playlist-curator"
    else -> role.lowercase().replace(" ", "-")
}
```

**Removed from default view:** workMood, commentStyle, emojiStyle. **Moved to expandable:** workload, genres, taste profile, token budget.

### 5.5 CockpitScreen.kt — Full Redesign

**Before (~30 elements):**
```
"vAIb" 32sp + "Agent-native music cockpit" 14sp
[connection 12sp][outputMode 12sp][play][refresh]
"Route: $route • probe $n/$total • latency ${ms}ms" 11sp
On Air Card: agent + show + next + reason + lineup (5 elements)
Connector Health Card: header + health cards + sync (3 elements)
Now Broadcasting Card: title 20sp + artist 15sp + chip("DJinn") + vibe + BPM (5 elements)
VisualizerBars (keep)
"Queue (N)" 16sp + 3 QueueTrackCards
"Recent Reactions (N)" 16sp + 3 ReactionBadges
TokenBudgetPill("DJinn", 420/800)
```

**After (~14 elements):**
```kotlin
@Composable
fun CockpitScreen(appState: AppState, onPlayPause: () -> Unit,
                  onRefresh: () -> Unit, onNavigateToQueue: () -> Unit) {
    val scrollState = rememberScrollState()
    Column(Modifier.fillMaxSize().background(BackgroundAmoled)
             .verticalScroll(scrollState)
             .padding(horizontal = VaibSpacing.screenEdge)
             .padding(bottom = VaibSpacing.navSpacer)) {

        Spacer(Modifier.height(20.dp))
        // HEADER: "vAIb" only — subtitle REMOVED
        Text("vAIb", style = VaibTypography.displayLarge) // 32sp Bold Cyan
        Spacer(Modifier.height(8.dp))

        // STATUS ROW: connection pill + play/pause + refresh
        Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween, Alignment.CenterVertically) {
            StatusPill(status = appState.connectivity.label.lowercase(),
                       dotColor = if (appState.connectivity.isConnected) LiveGreen else ErrorRed)
            Row {
                IconButton(onClick = onPlayPause) {
                    Icon(if (appState.playback.isPlaying) Icons.Default.Pause
                         else Icons.Default.PlayArrow, null,
                         tint = PrimaryNeonCyan, modifier = Modifier.size(28.dp))
                }
                Spacer(Modifier.width(8.dp))
                IconButton(onClick = onRefresh) {
                    Icon(Icons.Default.Refresh, null, tint = TextSecondary, modifier = Modifier.size(24.dp))
                }
            }
        }
        // Route/probe/latency — REMOVED
        Spacer(Modifier.height(20.dp))

        // ON AIR CARD (L2)
        Card(Modifier = CardHierarchy.activeModifier(),
             colors = CardDefaults.cardColors(containerColor = Color.Transparent)) {
            Column(Modifier.padding(VaibSpacing.cardPadding)) {
                Text("On Air", style = VaibTypography.titleMedium) // 14sp TextSecondary
                Spacer(Modifier.height(4.dp))
                Text(appState.onAirAgentId.lowercase(), style = VaibTypography.headlineSmall) // 18sp
                Spacer(Modifier.height(2.dp))
                val showName = appState.currentStation?.let { "${it.hostAgent} — ${it.name}" } ?: "Off air"
                Text(showName, style = VaibTypography.bodyMedium) // 14sp TextSecondary
                // Next slot, reason, lineup — REMOVED
            }
        }
        Spacer(Modifier.height(20.dp))

        // NOW PLAYING CARD (L1 — cyan border glow)
        val track = appState.currentTrack
        Card(Modifier = CardHierarchy.nowPlayingModifier(),
             colors = CardDefaults.cardColors(containerColor = Color.Transparent)) {
            Column(Modifier.padding(VaibSpacing.cardPadding).fillMaxWidth()) {
                Text("Now Playing", style = VaibTypography.titleLarge) // 16sp — renamed from "Now Broadcasting"
                Spacer(Modifier.height(8.dp))
                if (track != null) {
                    Text(track.title, style = VaibTypography.headlineMedium, maxLines = 2,
                         overflow = TextOverflow.Ellipsis) // 20sp — LARGEST TEXT ON SCREEN
                    Spacer(Modifier.height(4.dp))
                    Text(track.artist, style = VaibTypography.bodyMedium, maxLines = 1,
                         overflow = TextOverflow.Ellipsis) // 14sp
                    Spacer(Modifier.height(8.dp))
                    // BPM + vibe merged — NOT hardcoded "neon focus"
                    val vibe = appState.currentStation?.vibe ?: ""
                    val bpmLine = buildString {
                        if (track.bpm > 0) append("${track.bpm} BPM")
                        if (track.bpm > 0 && vibe.isNotBlank()) append(" • ")
                        if (vibe.isNotBlank()) append(vibe)
                    }
                    if (bpmLine.isNotBlank()) {
                        Text(bpmLine, style = VaibTypography.bodySmall,
                             color = if (vibe.isNotBlank()) AccentMagenta.copy(0.7f) else TextSecondary)
                    }
                    // AgentChip("DJinn") — REMOVED
                    Spacer(Modifier.height(8.dp))
                    VisualizerBars(appState.playback.isPlaying,
                                   Modifier.fillMaxWidth().height(48.dp))
                } else {
                    Text("No track playing", style = VaibTypography.bodyMedium, color = TextMuted)
                }
            }
        }
        Spacer(Modifier.height(20.dp))

        // QUEUE PREVIEW (L4 cards)
        Row(Modifier.fillMaxWidth().clickable { onNavigateToQueue() },
            Arrangement.SpaceBetween, Alignment.CenterVertically) {
            Text("Queue", style = VaibTypography.titleLarge) // 16sp
            if (appState.queue.isNotEmpty())
                Text("${appState.queue.size}", style = VaibTypography.labelMedium, color = TextMuted)
        }
        Spacer(Modifier.height(8.dp))
        appState.queue.take(3).forEach { item ->
            QueueTrackCardPreview(item, Modifier = CardHierarchy.previewModifier())
        }
        if (appState.queue.isEmpty())
            Text("Queue empty", style = VaibTypography.bodySmall, color = TextMuted,
                 modifier = Modifier.padding(vertical = 8.dp))

        // RECENT REACTIONS — REMOVED
        // TOKEN BUDGET — REMOVED
        // CONNECTOR HEALTH — REMOVED

        Spacer(Modifier.height(80.dp)) // nav spacer
    }
}
```

### 5.6 VaibCard.kt — Card Hierarchy

Replace `neonGlow` param with `CardLevel` enum:

```kotlin
enum class CardLevel { NOW_PLAYING, ACTIVE, PASSIVE, PREVIEW }

@Composable
fun VaibCard(level: CardLevel = CardLevel.ACTIVE, onClick: (() -> Unit)? = null,
             content: @Composable ColumnScope.() -> Unit) {
    val (bg, border, borderColor, corner, pad) = when (level) {
        NOW_PLAYING -> Quint(SurfaceElevated, 1.5.dp, PrimaryNeonCyan.copy(0.6f), 12.dp, 12.dp)
        ACTIVE -> Quint(SurfaceCard, 0.dp, Color.Transparent, 10.dp, 12.dp)
        PASSIVE -> Quint(SurfaceDark, 0.5.dp, BorderSubtle, 8.dp, 8.dp)
        PREVIEW -> Quint(Color.Transparent, 0.dp, Color.Transparent, 6.dp, 4.dp)
    }
    val mod = Modifier.fillMaxWidth().then(
        if (border > 0.dp) Modifier.border(border, borderColor, RoundedCornerShape(corner)) else Modifier
    ).background(bg, RoundedCornerShape(corner))
    val innerPad = if (level == PREVIEW) PaddingValues(horizontal = 4.dp, vertical = 4.dp)
                   else PaddingValues(pad)
    if (onClick != null) Card(modifier = mod, onClick = onClick,
         colors = CardDefaults.cardColors(Color.Transparent)) {
        Column(Modifier.padding(innerPad)) { content() }
    } else Card(modifier = mod,
         colors = CardDefaults.cardColors(Color.Transparent)) {
        Column(Modifier.padding(innerPad)) { content() }
    }
}
data class Quint<A,B,C,D,E>(val a:A,val b:B,val c:C,val d:D,val e:E)
```

**Migration:**

| Old | New Level |
|-----|-----------|
| `neonGlow = true` (any) | `NOW_PLAYING` only if actually playing |
| Default card usage | `ACTIVE` |
| Connector health (if kept) | `PASSIVE` |
| Queue preview | `PREVIEW` |

### 5.7 Screen Headers + Empty States

All headers use `headlineLarge` (24sp SemiBold). No ad-hoc sizes.

```kotlin
@Composable
fun ScreenHeader(title: String, count: Int? = null, countLabel: String? = null) {
    Row(Modifier.fillMaxWidth().padding(vertical = 8.dp),
        Arrangement.SpaceBetween, Alignment.CenterVertically) {
        Text(title, style = VaibTypography.headlineLarge)
        if (count != null && count > 0)
            Text("$count ${countLabel ?: ""}".trim(), style = VaibTypography.labelMedium, color = TextMuted)
    }
}
```

Empty state component (new):

```kotlin
@Composable
fun EmptyState(icon: ImageVector, title: String, subtitle: String,
               iconTint: Color = TextMuted) {
    Column(Modifier.fillMaxWidth().padding(vertical = 48.dp),
           horizontalAlignment = Alignment.CenterHorizontally) {
        Icon(icon, null, Modifier.size(48.dp), iconTint.copy(0.5f))
        Spacer(Modifier.height(8.dp))
        Text(title, style = VaibTypography.bodyLarge, color = TextSecondary) // 15sp
        Spacer(Modifier.height(4.dp))
        Text(subtitle, style = VaibTypography.labelMedium, color = TextMuted, textAlign = TextAlign.Center)
    }
}
```

**Empty state assignments:**

| Screen | Icon | Title | Subtitle |
|--------|------|-------|----------|
| Stations | `Icons.Default.Radio` | No stations | Stations appear when agents are on air |
| Agents | `Icons.Default.Group` | No agents | Agents initialize when the system starts |
| Queue | `Icons.Default.QueueMusic` | Queue empty | Tracks appear when agents add them |

### 5.8 CockpitScreen Element Count Summary

| Section | Before | After |
|---------|--------|-------|
| Header | 2 | 1 |
| Status row | 4 | 3 |
| Route text | 1 | 0 |
| On Air card | 5 | 2 |
| Connector Health | 3 | 0 |
| Now Playing | 6 | 4 |
| Queue | 4 | 4 |
| Reactions | 4 | 0 |
| Token Budget | 1 | 0 |
| **TOTAL** | **~30** | **~14** |

---

## 6. AUTHENTICITY FIX PLAN

### 6.1 CockpitScreen — Immediate (Phase A)

| # | Current | Proposed | File |
|---|---------|----------|------|
| 1 | `AgentChip(name = "DJinn", colorHex = "#00E5FF")` | `AgentChip(name = appState.onAirAgentId.lowercase(), colorHex = agent?.color ?: "#00E5FF")` | CockpitScreen.kt |
| 2 | `TokenBudgetPill(used = 420, total = 800, label = "Session Token Budget (DJinn)")` | **Remove** from Cockpit → AgentDetailCard expandable | CockpitScreen.kt |
| 3 | `appState.currentTrack ?: Track("demo-001", "Synthetic Sunrise", "Procedural Ghost", 132)` | `appState.currentTrack` + empty state "No track playing" | CockpitScreen.kt |
| 4 | `Text("Vibe: neon focus")` | `appState.currentStation?.vibe ?: ""` merged with BPM | CockpitScreen.kt |

### 6.2 DemoData.kt — Role Sanitization (Phase D)

| Name | Old Role | New Role |
|------|----------|----------|
| djinn | Signal Architect | sync-controller |
| signal-goblin | Signal Goblin | discovery-agent |
| signal-bloom | Signal Bloom | playlist-curator |

```kotlin
// DemoData.kt
val djinnAgent = Agent(name = "djinn", role = "sync-controller", ...)
```

### 6.3 ViewModel Cleanup (Phase D)

| Item | Current | Proposed |
|------|---------|----------|
| `reactionVoices` map | "Signal goblin approves 💀" — theatrical | Remove or operational summaries only |
| `reactionEmoji` map | Per-agent emoji sets ✨🔥🎧 | **Remove entirely** |
| `themedShowName()` | "Neon Drift Hour", "Pulse Cathedral" — hardcoded list | Derive: `${agent.name} — ${station.name}` |
| Show names | Theatrical made-up names | Factual: "djinn — Prime Pulse" |

### 6.4 Authenticity Checklist

| # | Item | Phase |
|---|------|-------|
| 1 | Replace `AgentChip("DJinn")` with dynamic `onAirAgentId` | A |
| 2 | Remove `TokenBudgetPill` from Cockpit | A |
| 3 | Replace hardcoded track fallback with null-safe state | A |
| 4 | Replace hardcoded vibe with `station.vibe` | A |
| 5 | Sanitize agent names to lowercase | D |
| 6 | Sanitize agent roles to functional descriptors | D |
| 7 | Remove theatrical `reactionVoices` | D |
| 8 | Replace `themedShowName()` with derivation | D |
| 9 | Remove `reactionEmoji` map | D |
| 10 | Remove hardcoded show name list | D |

---

## 7. AVATAR PLAN (Future Only)

**Status:** Not Phase A. Implement only after Phases A-E complete and stable.

### Constraints
- No DALL-E generation. No photos. No illustrated characters. No faces.
- Deterministic: same agent ID → same glyph. Minimal geometric shapes.

### Proposal: Hash-Derived Geometric Glyphs

```kotlin
@Composable
fun AgentGlyph(agentId: String, size: Dp = 40.dp) {
    val hash = agentId.hashCode().absoluteValue
    val hue = remember(agentId) { (hash % 360).toFloat() }
    val baseColor = Color.hsl(hue, 0.6f, 0.5f)
    val sides = remember(agentId) { 6 + (hash % 7) } // 6-12 sides
    Canvas(Modifier.size(size)) {
        val r = size.toPx() / 2 * 0.8f
        val cx = size.toPx() / 2; val cy = size.toPx() / 2
        val path = Path()
        for (i in 0 until sides) {
            val a = (2 * PI * i / sides - PI / 2).toFloat()
            val x = cx + r * cos(a); val y = cy + r * sin(a)
            if (i == 0) path.moveTo(x, y) else path.lineTo(x, y)
        }
        path.close()
        drawPath(path, baseColor.copy(0.7f))
    }
}
```

**Decision gate:** Only implement if user testing shows agents are indistinguishable without visual markers. `AgentChip` (colored dot + name) is sufficient until then.

---

## 8. IMPLEMENTATION STAGING

### Phase A — Typography + Cockpit Rebalance
**Priority:** HIGHEST | **Files:** Type.kt, CockpitScreen.kt | **Effort:** 2-3h | **Risk:** Low

| Task | Details |
|------|---------|
| Update typography scale | 7→11 tokens (Section 3.1) |
| Redesign Cockpit layout | Remove ~16 elements (Section 5.5) |
| Remove hardcoded fake entities | "DJinn", fake track, fake vibe, token budget |
| Add empty states | Stations, Agents, Queue screens |
| Apply L1 glow | Now Playing card only |

### Phase B — Card Density Reduction
**Priority:** HIGH | **Files:** *Card.kt | **Effort:** 3-4h | **Risk:** Low

| Task | Details |
|------|---------|
| StationCard v2 | 8→5 elements |
| TrackCard v2 | 5→4 elements |
| QueueTrackCard v2 | 8→5 elements |
| AgentDetailCard v2 | 10→4 visible + expandable |
| CardLevel migration | Replace neonGlow param |

### Phase C — Headers + Empty States
**Priority:** MEDIUM | **Files:** *Screen.kt, VaibCard.kt | **Effort:** 2h | **Risk:** Very Low

| Task | Details |
|------|---------|
| Header standardization | All screens → headlineLarge 24sp |
| Empty state deployment | Add EmptyState component |
| Card hierarchy polish | Consistent L1-L4 usage |

### Phase D — Authenticity Cleanup
**Priority:** MEDIUM-HIGH | **Files:** DemoData.kt, VaibViewModel.kt | **Effort:** 1-2h | **Risk:** Medium

| Task | Details |
|------|---------|
| Agent name sanitization | Lowercase: "DJinn" → "djinn" |
| Agent role sanitization | "Signal Architect" → "sync-controller" |
| Remove theatrical reactions | reactionVoices, reactionEmoji |
| Show name derivation | `${agent} — ${station}` |

### Phase E — Polish
**Priority:** LOW | **Files:** All UI | **Effort:** 1-2h | **Risk:** Very Low

| Task | Details |
|------|---------|
| Glow audit | Only L1 has cyan border |
| Surface audit | Correct SurfaceDark/Card/Elevated per level |
| Spacing audit | All dp values use VaibSpacing |
| Typography audit | All Text() uses theme token |

### Staging Summary

| Phase | Files | Effort | Risk | Impact |
|-------|-------|--------|------|--------|
| A — Typography + Cockpit | 2 | 2-3h | Low | Very High |
| B — Card Density | 4 | 3-4h | Low | High |
| C — Headers + Empty | 4 | 2h | Very Low | Medium |
| D — Authenticity | 2 | 1-2h | Medium | Medium |
| E — Polish | All UI | 1-2h | Very Low | Low-Med |
| **Total** | **~12** | **10-13h** | **Low** | **Very High** |

---

## 9. RISK LIST

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| 1 | Element removal breaks workflow | Medium | Phase A reversible — old elements commented, not deleted |
| 2 | Typography hurts small-screen readability | Low | Body only 16→15sp. All text ≥11sp. Test on 5" device |
| 3 | Demo sanitization breaks reactions | Medium | Reactions removed in Phase A. Update test assertions in D |
| 4 | Card collapse hides needed info | Low | All data preserved behind expandable chevron |
| 5 | Cockpit redesign too opinionated | Medium | Phase A self-contained. Preview before full commit |
| 6 | Card hierarchy adds complexity | Low | Clear naming. Enforced in Phase E audit |
| 7 | Glow discipline breaks existing usage | Low | Remove neonGlow param. Compiler catches misses |
| 8 | Removing connector health hides problems | Medium | StatusPill shows connection. Details in Settings |
| 9 | Queue BPM removal hurts DJs | Low | BPM in Now Playing card. Station BPM range covers queue |
| 10 | Typography 7→11 tokens confuses devs | Low | Migration table maps old→new clearly |

### Contingency

- **Phase A negative feedback:** Revert CockpitScreen.kt (elements commented). Keep typography.
- **Demo sanitization breaks tests:** Mechanical string replacement, ~15min fix.
- **Expandable cards feel clunky:** Replace with navigation to detail screen.

---

## 10. FIRST SLICE RECOMMENDATION

### Phase A — Typography + Cockpit Rebalance

**Why Phase A first:**

| Criterion | Score | Rationale |
|-----------|-------|-----------|
| Visual impact | 10/10 | Home screen. 53% element reduction. Immediate. |
| Risk | 1/10 | Zero music code. Purely visual. Reversible. |
| Effort | Low | 2-3 hours. |
| Proves direction | Yes | Validates design before full overhaul. |
| Rollback cost | Near-zero | Single file to revert. |

### Phase A Execution

1. Update Type.kt with v2 scale (30 min)
2. Cockpit header: "vAIb" 32sp, remove subtitle (15 min)
3. Simplify status row: connection + play + refresh only (15 min)
4. Remove route/probe/latency text (15 min)
5. On Air card: agent name + show name only (20 min)
6. Remove Connector Health card (10 min)
7. Now Playing card: title 20sp + artist 14sp + merged BPM/vibe (20 min)
8. Replace AgentChip("DJinn") with dynamic agent (15 min)
9. Remove Reactions section (10 min)
10. Remove TokenBudgetPill (5 min)
11. Add null-safe track empty state (15 min)
12. Apply L1 glow to Now Playing (10 min)
13. Build + verify (20 min)

### Phase A Success Criteria

| # | Criterion |
|---|-----------|
| 1 | Cockpit shows ≤14 text elements |
| 2 | No hardcoded "DJinn" visible |
| 3 | No hardcoded track fallback |
| 4 | Typography tokens used consistently |
| 5 | Music playback unaffected |
| 6 | `./gradlew assembleDebug` passes |

### Phase A → B Gate

Proceed to Phase B only after: 24h runtime, no negative feedback, music confirmed working, Supreme Commander approval.

---

## APPENDIX: File Inventory

| File | Path | Phase(s) |
|------|------|----------|
| Type.kt | `ui/theme/Type.kt` | A |
| CockpitScreen.kt | `ui/screens/CockpitScreen.kt` | A |
| StationsScreen.kt | `ui/screens/StationsScreen.kt` | A, C |
| AgentsScreen.kt | `ui/screens/AgentsScreen.kt` | A, C |
| QueueScreen.kt | `ui/screens/QueueScreen.kt` | A, C |
| StationCard.kt | `ui/components/StationCard.kt` | B |
| TrackCard.kt | `ui/components/TrackCard.kt` | B |
| QueueTrackCard.kt | `ui/components/QueueTrackCard.kt` | B |
| AgentDetailCard.kt | `ui/components/AgentDetailCard.kt` | B |
| VaibCard.kt | `ui/components/VaibCard.kt` | C, E |
| EmptyState.kt | `ui/components/EmptyState.kt` | A (new) |
| DemoData.kt | `data/DemoData.kt` | D |
| VaibViewModel.kt | `viewmodel/VaibViewModel.kt` | D (reactions/show names only) |

*Planning only. No implementation. Music pipeline protected.*
