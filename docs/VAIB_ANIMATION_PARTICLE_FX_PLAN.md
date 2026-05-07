# VAIB Animation & Particle FX System — Technical Plan

**Branch:** `prime-stabilization`  
**Commit:** `f6572b8` — "feat(android): add isolated app auto-update flow"  
**Date:** 2026-05-07  
**Package:** `com.xsytrance.vaib`  
**Target SDK:** 34 / Compose BOM: 2024.02.00 / Kotlin: 1.9.22  
**Document Owner:** Animation Architecture Workstream  
**Status:** DRAFT — pending Supreme Commander approval

---

## 1. Executive Summary

### Mission
Introduce a tiered animation and ambient particle FX layer into the vAIb Android codebase that enhances the "neon cockpit" aesthetic without regressing playback stability, battery life, or accessibility. The system must be toggleable, respect reduced-motion preferences, and degrade gracefully across device tiers.

### Scope (In)
- Core animation infrastructure (`VaibMotion.kt`, timing/easing tokens, intensity enum)
- SharedPreferences integration for user-facing FX toggle
- Ambient particle overlay (`AmbientParticleLayer.kt`) behind `CockpitScreen` header
- `VisualizerBars.kt` enhancement (color reactivity, smoother interpolation)
- Card glow pulse on `On Air` card via `VaibCard.neonGlow`
- Button press micro-animations across `CockpitScreen`, `LandscapeDjDeck`, `SettingsScreen`
- Track-change crossfade in `Now Broadcasting` card area
- Audio-reactive particle intensity mapping from `PlaybackState`
- Performance caps and lifecycle-aware particle systems

### Scope (Out)
- No changes to `AudioBackbone.kt` / ExoPlayer pipeline
- No new ViewModel state beyond `motionIntensity` and `fxEnabled` flags
- No changes to navigation graph (`VaibNavHost.kt`)
- No changes to data layer (stations, queue, agents)
- No new screens or routes

### Success Criteria
- [ ] FX toggle visible in `SettingsScreen.kt` with immediate apply
- [ ] `AmbientParticleLayer.kt` renders ≤80 particles at `MotionIntensity.ENHANCED` without dropping below 55 FPS on Samsung Galaxy S24 Ultra
- [ ] `MotionIntensity.REDUCED` disables particles, limits all transitions to 150ms fades
- [ ] `MotionIntensity.OFF` strips all animation overhead (zero `animate*AsState` calls)
- [ ] Battery drain delta ≤3% per hour at `STANDARD` intensity during active playback
- [ ] No regression in `AudioBackbone` playback state flow or `strict_broadcast_mode` behavior
- [ ] All changes guarded by `BuildConfig` feature flag for rollback

---

## 2. Current Repo Findings

### 2.1 Commit & Build Context
- HEAD: `f6572b8`, branch `prime-stabilization`, clean tree
- Min SDK 28 / Target 34 / Compile 34 — covers 97%+ active devices
- Compose BOM 2024.02.00 gives us `AnimatedVisibility`, `animateColorAsState`, `AnimatedContent`, `rememberInfiniteTransition` stable APIs
- `androidx.compose.animation:animation` is pulled in by BOM — no new Gradle dependencies required

### 2.2 Screen Inventory (14 screens, confirmed)
| File | Path | Animation Exposure |
|---|---|---|
| `CockpitScreen.kt` | `.../ui/screens/CockpitScreen.kt` | HIGH — LazyColumn header, On Air, visualizer, cards |
| `LandscapeDjDeck.kt` | `.../ui/screens/LandscapeDjDeck.kt` | HIGH — 3-column layout, visualizer, EQ, session area |
| `StationsScreen.kt` | `.../ui/screens/StationsScreen.kt` | LOW — list items |
| `QueueScreen.kt` | `.../ui/screens/QueueScreen.kt` | LOW — list items |
| `AgentsScreen.kt` | `.../ui/screens/AgentsScreen.kt` | LOW — chip grid |
| `MoreScreen.kt` | `.../ui/screens/MoreScreen.kt` | LOW — navigation grid |
| `StatsScreen.kt` | `.../ui/screens/StatsScreen.kt` | LOW — stat tiles |
| `EqScreen.kt` | `.../ui/screens/EqScreen.kt` | LOW — static bands |
| `ApiScreen.kt` | `.../ui/screens/ApiScreen.kt` | NONE |
| `SettingsScreen.kt` | `.../ui/screens/SettingsScreen.kt` | MEDIUM — toggle row needed |
| `UpdatesScreen.kt` | `.../ui/screens/UpdatesScreen.kt` | LOW |
| `AutomationScreen.kt` | `.../ui/screens/AutomationScreen.kt` | LOW — toggle rows |
| `IntegrityScreen.kt` | `.../ui/screens/IntegrityScreen.kt` | NONE |
| `VaibNavHost.kt` | `.../ui/navigation/VaibNavHost.kt` | LOW — bottom bar, transitions |

### 2.3 Component Inventory (12 components, confirmed)
| Component | File | Current Animation State |
|---|---|---|
| `VisualizerBars` | `VisualizerBars.kt` | **ONLY active animation** — `rememberInfiniteTransition`, sin wave, 24 bars, 160ms loop |
| `VaibCard` | `VaibCard.kt` | Static — `neonGlow: Boolean` param draws border, no animation |
| `StatusPill` | `StatusPill.kt` | Static |
| `StationCard` | `StationCard.kt` | Static |
| `TrackCard` | `TrackCard.kt` | Static |
| `QueueTrackCard` | `QueueTrackCard.kt` | Static |
| `AgentChip` | `AgentChip.kt` | Static |
| `ConnectorHealthCard` | `ConnectorHealthCard.kt` | Static |
| `StatTile` | `StatTile.kt` | Static |
| `EqualizerBand` | `EqualizerBand.kt` | Gesture-driven (drag), no animation |
| `ReactionBadge` | `ReactionBadge.kt` | Static |
| `TokenBudgetPill` | `TokenBudgetPill.kt` | Static |

### 2.4 Theme Tokens (Confirmed from `Color.kt`)
```
PrimaryNeonCyan    (#00E5FF) — accent, neonGlow borders
SecondaryGold      (#FFD700) — highlights, rewards
AccentMagenta      (#FF00FF) — visualizer tier 1, particles
AccentViolet       (#8B5CF6) — visualizer tier 2, particles
LiveGreen          (#00FF88) — on-air, live indicators
ErrorRed           (#FFFF4444) — errors, health down
BackgroundAmoled   (#FF000000) — root background
SurfaceDark        (#FF0A0A0A) — screen base
SurfaceCard        (#FF111111) — card fill
SurfaceElevated    (#FF1A1A1A) — elevated cards
TextPrimary        (White) — headlines
TextSecondary      (#FFAAAAAA) — body
TextMuted          (#FF666666) — captions
BorderSubtle       (#FF222222) — dividers
```

### 2.5 State Flow (Confirmed)
```
AudioBackbone (ExoPlayer)
  → Player.Listener.onPlaybackStateChanged()
  → VaibViewModel.syncPlaybackState()
  → _appState.update { it.copy(playback = newPlayback) }
  → UI: val state by viewModel.appState.collectAsStateWithLifecycle()
```

Relevant state shapes:
- `AppState.playback: PlaybackState` — contains `isPlaying, isBuffering, currentTrack, progress, volume`
- `AppState` is the single source of truth, emitted by `VaibViewModel._appState: MutableStateFlow<AppState>`

### 2.6 Settings / Preferences (Confirmed)
- File: `VaibViewModel.kt` — reads/writes `SharedPreferences` (name: `"vaib_state"`)
- Existing keys: `strict_broadcast_mode`, `listening_stats_json`, `update_auto_check`, `update_endpoint`
- `SettingsScreen.kt` has Switch controls for: Demo Mode, Bluetooth Mode, Strict Broadcast Mode, Auto-check updates
- **No existing animation/FX preference key**
- **No existing `MotionIntensity` concept**

---

## 3. Proposed Animation Architecture

### 3.1 `VaibMotion.kt` — Timing / Easing / Intensity Tokens

**Location:** `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/ui/theme/VaibMotion.kt`

```
sealed class MotionIntensity : OFF, REDUCED, STANDARD, ENHANCED
  → OFF:       zero animations, all durations = 0ms
  → REDUCED:   150ms fades only, no particles, no infinite transitions
  → STANDARD:  300ms default, particles capped at 40
  → ENHANCED:  500ms default, particles capped at 80, full infinite transitions

object VaibMotionTokens:
  - durationFast:      150ms / 300ms / 300ms / 300ms   (OFF/REDUCED/STANDARD/ENHANCED)
  - durationNormal:    0ms / 150ms / 300ms / 500ms
  - durationSlow:      0ms / 150ms / 450ms / 700ms
  - easingStandard:    FastOutSlowInEasing
  - easingEnter:       FastOutLinearInEasing
  - easingExit:        LinearOutSlowInEasing
  - easingBounce:      { if intensity >= STANDARD Spring(dampingRatio=0.6) else LinearEasing }
  - glowPulsePeriod:   0ms / 2000ms / 2000ms / 1500ms
  - particleCap:       0 / 0 / 40 / 80
```

**Derivation rule:** All token values are computed from a single `MotionIntensity` value. No hardcoded durations anywhere else in the animation layer.

### 3.2 `MotionIntensity` Enum

```kotlin
enum class MotionIntensity { OFF, REDUCED, STANDARD, ENHANCED }
```

Storage:
- SharedPreferences key: `motion_intensity` (string, stores enum name)
- Default value: `STANDARD`
- Read at app startup in `MainActivity.kt` before `setContent`
- Exposed via `VaibViewModel.motionIntensity: StateFlow<MotionIntensity>`

### 3.3 Accessibility Integration

```
Check LocalAccessibilityManager.current?.isEnabledForAccessibility
If true → force MotionIntensity.REDUCED (regardless of user preference)
Surface this override in SettingsScreen with a non-interactive info row
```

### 3.4 `VaibMotionController` (object)

**Location:** `.../ui/theme/VaibMotionController.kt`

Reusable helpers that consume `MotionIntensity` and return animation specs:

| Helper | Returns | Behavior by Intensity |
|---|---|---|
| `animatedCardGlow(intensity, isActive)` | `AnimationSpec<Color>` + `AnimationSpec<Float>` | OFF=static cyan, REDUCED=static, STANDARD+=pulsing glow + alpha oscillation |
| `pulseAnimation(intensity, periodMs)` | `InfiniteRepeatableSpec<Float>` | OFF= null, REDUCED= null, STANDARD+= repeating pulse |
| `slideTransition(intensity, direction)` | `EnterTransition` / `ExitTransition` | OFF=none, REDUCED=fade 150ms, STANDARD+= slide + fade |
| `buttonPressEffect(intensity)` | `Modifier.pointerInput` scale spring | OFF=identity, REDUCED=opacity flash, STANDARD+= scale 0.95 spring |
| `crossfadeSpec(intensity)` | `ContentTransform` | OFF=cut, REDUCED=fade 150ms, STANDARD+= crossfade 300ms |

All helpers are pure functions: `(MotionIntensity, ...) → AnimationSpec<?>`. No side effects, no coroutine scope required.

### 3.5 CompositionLocal Provider

```kotlin
// VaibMotion.kt
val LocalMotionIntensity = staticCompositionLocalOf { MotionIntensity.STANDARD }
```

Set once in `MainActivity.kt` `setContent`:
```kotlin
CompositionLocalProvider(LocalMotionIntensity provides motionIntensity) {
    VaibTheme { ... }
}
```

Any composable deep in the tree reads: `val intensity = LocalMotionIntensity.current`

---

## 4. Proposed Particle Architecture

### 4.1 `Particle.kt` — Data Model

**Location:** `.../ui/fx/particle/Particle.kt`

```kotlin
data class Particle(
    val id: Long,           // deterministic seed-derived ID
    val x: Float,           // 0..1 normalized canvas space
    val y: Float,           // 0..1 normalized canvas space
    val vx: Float,          // velocity x (normalized/sec)
    val vy: Float,          // velocity y (normalized/sec)
    val life: Float,        // 0..1 remaining life ratio
    val maxLife: Float,     // seconds this particle lives
    val size: Float,        // dp radius
    val color: Color,       // derived from palette + audio state
    val alpha: Float,       // 0..1, modulated by life
    val shape: ParticleShape // CIRCLE, DIAMOND, SOFT_GLOW
)

enum class ParticleShape { CIRCLE, DIAMOND, SOFT_GLOW }
```

Immutable. Updated by copying in `ParticleSystem.tick()`.

### 4.2 `ParticleSystem.kt` — Controller

**Location:** `.../ui/fx/particle/ParticleSystem.kt`

```
class ParticleSystem(
    val intensity: MotionIntensity,
    val maxParticles: Int = intensity.particleCap(),
    val seed: Long = System.currentTimeMillis(),
    val palette: List<Color> = defaultParticlePalette
) {
    fun tick(dtSeconds: Float, audioIntensity: Float = 0f): List<Particle>
    fun spawn(count: Int, region: Rect = fullCanvas): List<Particle>
    fun cullDead(): List<Particle>
}
```

- `tick()` called from `withFrameNanos` loop
- `audioIntensity: Float` (0..1) drives spawn rate and velocity boost
- Deterministic: same `seed` + same `audioIntensity` sequence = same particle positions (reproducible)
- `dtSeconds` capped at 0.1s to prevent explosion on frame drops

### 4.3 `AmbientParticleLayer.kt` — Composable Overlay

**Location:** `.../ui/fx/particle/AmbientParticleLayer.kt`

```kotlin
@Composable
fun AmbientParticleLayer(
    modifier: Modifier = Modifier,
    intensity: MotionIntensity = LocalMotionIntensity.current,
    audioIntensity: Float = 0f,          // driven by PlaybackState.progress / isPlaying
    colorPalette: List<Color> = listOf(PrimaryNeonCyan, AccentMagenta, AccentViolet, SecondaryGold),
    seed: Long = 42L
)
```

Implementation:
- Uses `Canvas(modifier = modifier.fillMaxSize().pointerInput(Unit) {})`
- `rememberParticleSystem(intensity, seed, palette)` — see 4.4
- `LaunchedEffect(Unit)` + `withFrameNanos { }` loop for frame-driven updates
- Renders particles as `drawCircle()` / `drawRect()` (DIAMOND) with `BlendMode.Screen` for neon additive effect
- Particle count capped by `intensity.particleCap()`
- If `intensity == MotionIntensity.OFF || intensity == MotionIntensity.REDUCED` → composable returns early (no Canvas, no allocation)

### 4.4 `rememberParticleSystem()` — Composable

```kotlin
@Composable
fun rememberParticleSystem(
    intensity: MotionIntensity,
    seed: Long,
    palette: List<Color>
): ParticleSystem = remember(intensity, seed) {
    ParticleSystem(intensity = intensity, seed = seed, palette = palette)
}
```

Auto-cleanup: `DisposableEffect` on the `ParticleSystem` instance to clear particle list on dispose. No memory leaks on configuration change (survives via `rememberSaveable` for seed only; particle list is transient).

### 4.5 Performance Caps by Tier

| Tier | Max Particles | Max Updates/sec | Spawn Rate | Velocity Boost |
|---|---|---|---|---|
| OFF | 0 | N/A | 0 | 0 |
| REDUCED | 0 | N/A | 0 | 0 |
| STANDARD | 40 | 60fps | 3/sec baseline | 1.0x |
| ENHANCED | 80 | 60fps | 8/sec baseline | 1.5x |

Enforced in `ParticleSystem.tick()` — hard cap, no override.

### 4.6 Background Lifecycle

```
LifecycleEventEffect.ON_PAUSE:
  → particleSystem.setPaused(true)
  → spawn rate drops to 0, existing particles drift/fade naturally
  → Canvas still renders but tick rate throttled to 10fps

LifecycleEventEffect.ON_STOP:
  → particleSystem.clearAll()
  → Canvas draws nothing
  → releases all particle allocations

LifecycleEventEffect.ON_RESUME:
  → particleSystem.setPaused(false)
  → full 60fps tick resumes
```

Implemented via `AmbientParticleLayer` observing `LocalLifecycleOwner.current.lifecycle`.

---

## 5. Phase Plan

### Phase 0: Infrastructure — VaibMotion.kt + Settings Toggle
**Goal:** Animation system exists but produces zero visual change. Feature flag installed.

**Files to create:**
- `.../ui/theme/VaibMotion.kt` — `MotionIntensity` enum, `VaibMotionTokens` object, `LocalMotionIntensity` CompositionLocal
- `.../ui/theme/VaibMotionController.kt` — helper functions (all return identity/no-op for now)
- `.../ui/fx/particle/Particle.kt` — data class
- `.../ui/fx/particle/ParticleSystem.kt` — controller class
- `.../ui/fx/particle/AmbientParticleLayer.kt` — composable (returns `Spacer` stub)
- `.../ui/fx/particle/rememberParticleSystem.kt` — composable helper

**Files to modify:**
- `.../ui/screens/SettingsScreen.kt` — add "Visual Effects" row with 4-segment slider (Off / Reduced / Standard / Enhanced)
- `.../VaibViewModel.kt` — add `motionIntensity` StateFlow, read/write `SharedPreferences` key `motion_intensity`
- `.../MainActivity.kt` — add `CompositionLocalProvider(LocalMotionIntensity)` wrapper around `setContent`

**Feature flag:** Add `ENABLE_FX_SYSTEM = false` to `BuildConfig` (or `gradle.properties` → `BuildConfigField`). When false, `LocalMotionIntensity` always returns `OFF` and `AmbientParticleLayer` is a no-op.

**Exit criteria:** App builds, SettingsScreen shows new slider, preference persists across restart, zero visual delta.

---

### Phase 1: Ambient Cockpit — Particles + Visualizer + Glow Pulse
**Goal:** Cockpit screen has ambient particle background and enhanced visualizer.

**Files to modify:**

1. `.../ui/screens/CockpitScreen.kt`:
   - Wrap LazyColumn with `Box` + `AmbientParticleLayer` at `zIndex = 0f`
   - `audioIntensity` bound to `if (playback.isPlaying) playback.volume.coerceIn(0f,1f) else 0f`
   - `colorPalette = [PrimaryNeonCyan, AccentMagenta, LiveGreen]`, confined to header region (top 30%)

2. `.../ui/components/VisualizerBars.kt`:
   - Replace 160ms hardcoded loop with `VaibMotionController.pulseAnimation(intensity)` timing
   - Color reactivity: playing → `SecondaryGold` peaks; buffering → `AccentViolet`
   - Spring physics via `VaibMotionController.animatedBarHeight()` instead of linear `animateFloatAsState`
   - `OFF` → freeze bars at mid-height, no infinite transition

3. `.../ui/components/VaibCard.kt`:
   - `neonGlow=true` + intensity >= STANDARD → `animatedCardGlow()` pulsing border (alpha 0.6→1.0)
   - `shadowElevation` 8dp→12dp synced to pulse; REDUCED → static glow (current behavior)

4. `.../ui/screens/CockpitScreen.kt` (On Air card): pass `neonGlow = playback.isPlaying`

**Exit criteria:** Particles behind header, smoother visualizer, pulsing On Air card. S24 Ultra ≥55 FPS.

---

### Phase 2: Interactive Micro-Motion — Buttons, Cards, Transitions
**Goal:** All interactive elements have press/enter/exit animations.

**`VaibMotionController.kt` — `buttonPressEffect()` implementation:**
- OFF: identity modifier
- REDUCED: `Modifier.alpha(0.7f)` on press
- STANDARD+: scale 0.95 with `Spring(DampingRatioMediumBouncy)` + alpha 0.8
- Applied via `Modifier.pointerInput { detectTapGestures(...) }`

**Files to modify:**

| File | Animation Applied | Target Element |
|---|---|---|
| `CockpitScreen.kt` | `buttonPressEffect()` | station, On Air, Now Broadcasting cards |
| `CockpitScreen.kt` | `slideTransition()` | queue preview row entrance |
| `CockpitScreen.kt` | `crossfadeSpec()` | Now Broadcasting on `currentTrack` change |
| `LandscapeDjDeck.kt` | `buttonPressEffect()` | booth controls, reaction buttons |
| `LandscapeDjDeck.kt` | `crossfadeSpec()` | Now Playing track info |
| `LandscapeDjDeck.kt` | `slideTransition()` | session stats panel entrance |
| `SettingsScreen.kt` | `buttonPressEffect()` | all `OutlinedTextField`, `Button` |
| `TrackCard.kt` | `buttonPressEffect()` + `crossfadeSpec()` | press effect, like/dislike count |
| `QueueTrackCard.kt` | `buttonPressEffect()` + `crossfadeSpec()` | press effect, track data |
| `AgentChip.kt` | `buttonPressEffect()` | scale 1.0→0.92 spring |

**Exit criteria:** All clickable elements have press effects; card entrances animate; track changes crossfade.

---

### Phase 3: Audio-Reactive Layer — Playback-Driven FX
**Goal:** Particles, HUD, and visualizer respond to live playback state.

**Files to modify:**

1. `.../ui/fx/particle/ParticleSystem.kt`:
   - `tick(dt, audioIntensity)` — `audioIntensity` derived from `PlaybackState`
   - Formula: `if (!isPlaying) 0f else if (isBuffering) 0.15f else (volume*0.7f + progress*0.3f).coerceIn(0f,1f)`
   - High → increased spawn rate, higher `vy`, brighter colors; low → ambient downward drift

2. `.../ui/fx/particle/AmbientParticleLayer.kt`:
   - `audioIntensity` bound via `collectAsStateWithLifecycle()`
   - HUD sweep: 1px `PrimaryNeonCyan` scan line (alpha 0.3), top-to-bottom every 4s when `isPlaying`; disabled when `< STANDARD`

3. `.../ui/components/VisualizerBars.kt`:
   - Bar heights modulated by `audioIntensity`; buffering → 1Hz unison sine pulse
   - Colors: playing → magenta/cyan/violet; buffering → `AccentViolet`; stopped → `TextMuted`

4. `.../ui/screens/CockpitScreen.kt`:
   - `TokenBudgetPill`: subtle pulse (scale 1.0→1.02, 3s) when `isPlaying`
   - `StatusPill`: green dot pulse (`LiveGreen` alpha oscillation)
   - `ConnectorHealthCard`: animated border via `animateColorAsState`

5. `.../ui/screens/LandscapeDjDeck.kt`:
   - Full-deck `AmbientParticleLayer`; mini EQ bands with spring animation

**Exit criteria:** Pause reduces particles, buffering triggers unified pulse, all state changes have visual feedback.

---

## 6. File-by-File Implementation Map

### New Files (6)

| # | File Path | Description | Phase |
|---|---|---|---|
| 1 | `.../ui/theme/VaibMotion.kt` | `MotionIntensity` enum, `VaibMotionTokens`, `LocalMotionIntensity` | 0 |
| 2 | `.../ui/theme/VaibMotionController.kt` | Animation helper functions | 0 (stubs), 1-3 (impl) |
| 3 | `.../ui/fx/particle/Particle.kt` | `Particle` data class, `ParticleShape` enum | 0 |
| 4 | `.../ui/fx/particle/ParticleSystem.kt` | Frame-update controller with deterministic seed | 0 (stub), 3 (full) |
| 5 | `.../ui/fx/particle/AmbientParticleLayer.kt` | Canvas-based composable overlay | 0 (stub), 1 (impl) |
| 6 | `.../ui/fx/particle/rememberParticleSystem.kt` | `rememberParticleSystem()` + cleanup | 0 |

### Modified Files (12)

| # | File Path | What to Change | Phase |
|---|---|---|---|
| 1 | `.../MainActivity.kt` | `CompositionLocalProvider(LocalMotionIntensity)` around `setContent` | 0 |
| 2 | `.../VaibViewModel.kt` | `motionIntensity: StateFlow<MotionIntensity>`, read/write `motion_intensity` pref | 0 |
| 3 | `.../ui/screens/SettingsScreen.kt` | "Visual Effects" 4-segment slider row | 0 |
| 4 | `.../ui/screens/CockpitScreen.kt` | `AmbientParticleLayer` in Box; bind `audioIntensity`; apply glow/press/enter FX | 1-3 |
| 5 | `.../ui/components/VisualizerBars.kt` | `VaibMotionController` timing; color reactivity; buffering mode | 1, 3 |
| 6 | `.../ui/components/VaibCard.kt` | `animatedCardGlow()` when `neonGlow=true` + intensity >= STANDARD | 1 |
| 7 | `.../ui/screens/LandscapeDjDeck.kt` | Full-screen `AmbientParticleLayer`; press/crossfade FX; mini EQ spring | 2, 3 |
| 8 | `.../ui/components/TrackCard.kt` | `buttonPressEffect()` + `crossfadeSpec()` | 2 |
| 9 | `.../ui/components/QueueTrackCard.kt` | `buttonPressEffect()` + `crossfadeSpec()` | 2 |
| 10 | `.../ui/components/AgentChip.kt` | `buttonPressEffect()` with spring scale 0.92 | 2 |
| 11 | `.../ui/screens/SettingsScreen.kt` (again) | `buttonPressEffect()` on interactive elements | 2 |
| 12 | `app/build.gradle.kts` | `BuildConfig` field `ENABLE_FX_SYSTEM` | 0 |

### Untouched Files (Confirmed)

| File | Reason |
|---|---|
| `AudioBackbone.kt` / `VaibNavHost.kt` | Out of scope — playback/nav unchanged |
| `StationsScreen.kt` / `QueueScreen.kt` / `AgentsScreen.kt` / `MoreScreen.kt` / `StatsScreen.kt` | Low exposure — deferred |
| `EqScreen.kt` / `ApiScreen.kt` / `UpdatesScreen.kt` / `AutomationScreen.kt` / `IntegrityScreen.kt` | Static / no exposure |
| `StatusPill.kt` / `StationCard.kt` / `ConnectorHealthCard.kt` / `TokenBudgetPill.kt` | Modified via parent screens |
| `StatTile.kt` / `ReactionBadge.kt` / `FreshnessBadge.kt` / `RefreshControlCard.kt` / `EqualizerBand.kt` | No changes needed |
| `Color.kt` / `Theme.kt` / `Type.kt` | No new tokens needed |

---

## 7. Testing Checklist

### 7.1 Performance
- [ ] **FPS Benchmark:** `CockpitScreen` at ENHANCED/80 particles → 60s average; target S24 Ultra ≥55, Pixel 6 ≥50, low-end emulator ≥30
- [ ] **Method:** Android Studio Profiler → CPU flamegraph; confirm `AmbientParticleLayer.drawCircle()` not top hitter
- [ ] **Allocation check:** Zero allocations per frame in `ParticleSystem.tick()` (pre-allocated particle pool)

### 7.2 Battery
- [ ] **Drain test:** 1-hour playback at STANDARD vs OFF on physical device; target delta ≤3%/hour
- [ ] **ANR check:** 4-hour soak with FX toggling every 15 minutes → zero ANRs

### 7.3 Reduced Motion / Accessibility
- [ ] System "Remove animations" ON → `LocalAccessibilityManager` forces REDUCED
- [ ] REDUCED → `AmbientParticleLayer` returns `Spacer`, transitions ≤150ms, press = opacity only, visualizer frozen
- [ ] TalkBack navigation through SettingsScreen FX slider works

### 7.4 Playback Regression
- [ ] Toggle FX on/off 10x during playback → no audio drop
- [ ] Background → foreground → particles resume, playback uninterrupted
- [ ] Phone call interrupt → return → playback + particles resume
- [ ] Strict broadcast ON + ENHANCED → no state corruption
- [ ] 24-hour uptime → no `ParticleSystem` memory leak (heap dump verification)

### 7.5 Device Matrix
| Device | API | Intensity | Particles | Target FPS |
|---|---|---|---|---|
| Samsung S24 Ultra | 34 | ENHANCED | 80 | ≥55 |
| Samsung S24 Ultra | 34 | STANDARD | 40 | ≥58 |
| Samsung S24 Ultra | 34 | REDUCED | 0 | ≥60 |
| Pixel 6 | 33 | ENHANCED | 80 | ≥50 |
| Pixel 6 | 33 | STANDARD | 40 | ≥55 |
| Emulator (2GB) | 28 | STANDARD | 40 | ≥30 |
| Emulator (2GB) | 28 | REDUCED | 0 | ≥60 |

---

## 8. Rollback Checklist

### 8.1 Feature Flag
- `ENABLE_FX_SYSTEM` in `app/build.gradle.kts` (BuildConfig field)
- When `false`: `LocalMotionIntensity` always emits `OFF`, `AmbientParticleLayer` draws nothing, all `VaibMotionController` helpers return identity specs
- **This flag alone disables 100% of visual delta** — no revert needed for hotfix

### 8.2 Graduated Rollback Levels

| Level | Action | Files |
|---|---|---|
| L1 — Disable | `ENABLE_FX_SYSTEM = false` | None |
| L2 — Remove overlay | Delete `AmbientParticleLayer` from `CockpitScreen`, `LandscapeDjDeck` | 2 |
| L3 — Remove FX code | Delete 6 new files; revert 9 modified files | 15 |
| L4 — Full revert | `git revert <merge-commit>` | Entire PR |

### 8.3 Per-Phase Revert Points
- Phase 0: remove 6 new files + Settings row + ViewModel field + MainActivity wrapper
- Phase 1: remove `AmbientParticleLayer` from CockpitScreen; revert `VisualizerBars` + `VaibCard`
- Phase 2: remove press/transition effects from all targets
- Phase 3: remove `audioIntensity` binding; revert `ParticleSystem.tick()` reactivity

### 8.4 Safety Rules
- Phases merge as independent PRs — never squash
- Phase N requires Phase N-1 baked ≥48 hours on `prime-stabilization`
- Playback regression triggers L1 rollback (flag flip) within 1 hour

---

## 9. Open Questions for Supreme Commander

### Q1 — Device Tiering Granularity
The plan caps particles at 40 (STANDARD) and 80 (ENHANCED). Should we add a runtime auto-detect tier that samples FPS for 5 seconds on first launch and caps ENHANCED to 60 or 100 accordingly? Or keep manual 4-level control only?

### Q2 — LandscapeDjDeck Particle Coverage
The plan adds `AmbientParticleLayer` full-screen behind `LandscapeDjDeck.kt`. This is the most complex screen (3-column, 7 sub-panels). Should Phase 3 particles be confined to the center column (Now Playing + Visualizer) only, or full-deck as proposed?

### Q3 — Battery vs. Visuals Tradeoff
STANDARD tier (40 particles) targets ≤3%/hour delta. If profiling shows 5%/hour, do we: (a) drop STANDARD cap to 25 particles, (b) throttle tick to 30fps, or (c) accept 5% and document it?

### Q4 — Feature Flag Default
The plan sets `ENABLE_FX_SYSTEM = false` for Phase 0 merge safety. When do we flip to `true`? After Phase 4 complete? After 1 week stability on `prime-stabilization`? Or gated by a remote config value?

### Q5 — EqualizerBand Animation Scope
`EqualizerBand.kt` is gesture-driven with no animation. Should Phase 2 add snap-back spring animation when the user releases a drag? This would require touching the gesture detector — potential regression risk for the EQ interaction model.

---

## Appendix A: Dependency Check

No new Gradle dependencies required. All APIs are in Compose BOM 2024.02.00:

| API | Module | Present? |
|---|---|---|
| `rememberInfiniteTransition` | `animation-core` | Yes — used in `VisualizerBars.kt` |
| `animateFloatAsState` | `animation-core` | Yes — used in `VisualizerBars.kt` |
| `AnimatedVisibility` / `AnimatedContent` | `animation` | Yes — pulled by BOM |
| `withFrameNanos` / `Canvas` / `LocalAccessibilityManager` / `detectTapGestures` | `ui` / `runtime` | Yes — core Compose |
| `LifecycleEventEffect` | `lifecycle-runtime-compose` | Yes — used in `MainActivity.kt` |

## Appendix B: Color Mapping for Particles by Playback State

| Playback State | Dominant Particle Color | Secondary | Visualizer Tint |
|---|---|---|---|
| `isPlaying`, high volume | `AccentMagenta` | `PrimaryNeonCyan` | Magenta/Cyan tiers |
| `isPlaying`, low volume | `PrimaryNeonCyan` | `AccentViolet` | Cyan/Violet tiers |
| `isBuffering` | `AccentViolet` | `SecondaryGold` | All `AccentViolet` |
| `!isPlaying` | `TextMuted` | `BorderSubtle` | All `TextMuted` |
| Station changed (event) | `SecondaryGold` burst | — | Gold flash 500ms |

## Appendix C: SharedPreferences Key Registry

| Key | Type | Default | Written By | Read By |
|---|---|---|---|---|
| `motion_intensity` | String (enum name) | `"STANDARD"` | `SettingsScreen` slider | `MainActivity`, `VaibViewModel` |

---

*End of Document — VAIB Animation & Particle FX System Technical Plan*
*Version 1.0 — 2026-05-07 — Animation Architecture Workstream*
