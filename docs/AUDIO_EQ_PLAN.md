# Audio and Equalizer Specification

## Overview

vAIb includes a 10-band graphic equalizer designed for **Bluetooth-first listening**. The EQ is tuned for A2DP audio profiles (SBC, AAC, aptX) and targets the Samsung Galaxy S24 Ultra's audio pipeline.

Real audio playback is not yet implemented. This document specifies the UI, data model, and preset values so the EQ screen can be built and tested visually.

## 10-Band EQ Specification

### Frequency Bands
| Band | Frequency | Use Case |
|------|-----------|----------|
| 1 | 60Hz | Sub-bass, kick drum rumble |
| 2 | 170Hz | Bass body, warmth |
| 3 | 310Hz | Low-mids, bass guitar |
| 4 | 600Hz | Mids, vocal body |
| 5 | 1kHz | Midrange center, presence |
| 6 | 3kHz | Upper mids, vocal clarity |
| 7 | 6kHz | High-mids, snare bite |
| 8 | 12kHz | Highs, cymbal shine |
| 9 | 14kHz | Air, sparkle |
| 10 | 16kHz | Ultra-high, breath |

### Parameters
- **Range**: -12dB to +12dB per band
- **Step**: 1dB increments
- **Default**: 0dB (flat) for all bands
- **Q factor**: Fixed (system default from `android.media.audiofx.Equalizer`)

## 8 EQ Presets

### 1. Flat (Default)
All bands at 0dB. Neutral response.

| Band | 60Hz | 170Hz | 310Hz | 600Hz | 1kHz | 3kHz | 6kHz | 12kHz | 14kHz | 16kHz |
|------|------|-------|-------|-------|------|------|------|-------|-------|-------|
| Flat | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

### 2. Bass Command
Deep low-end boost for bass-heavy genres.

| Band | 60Hz | 170Hz | 310Hz | 600Hz | 1kHz | 3kHz | 6kHz | 12kHz | 14kHz | 16kHz |
|------|------|-------|-------|-------|------|------|------|-------|-------|-------|
| dB | +8 | +6 | +3 | 0 | 0 | 0 | +1 | +2 | +1 | 0 |

### 3. Neon Clarity
Bright, articulate profile for detailed listening.

| Band | 60Hz | 170Hz | 310Hz | 600Hz | 1kHz | 3kHz | 6kHz | 12kHz | 14kHz | 16kHz |
|------|------|-------|-------|-------|------|------|------|-------|-------|-------|
| dB | -2 | -1 | 0 | +1 | +2 | +4 | +6 | +8 | +6 | +4 |

### 4. Vocal Focus
Midrange emphasis for vocal-centric tracks and podcasts.

| Band | 60Hz | 170Hz | 310Hz | 600Hz | 1kHz | 3kHz | 6kHz | 12kHz | 14kHz | 16kHz |
|------|------|-------|-------|-------|------|------|------|-------|-------|-------|
| dB | -4 | -2 | 0 | +3 | +6 | +5 | +2 | 0 | -1 | -2 |

### 5. Lo-Fi Warmth
Muffled, warm profile for lo-fi and ambient.

| Band | 60Hz | 170Hz | 310Hz | 600Hz | 1kHz | 3kHz | 6kHz | 12kHz | 14kHz | 16kHz |
|------|------|-------|-------|-------|------|------|------|-------|-------|-------|
| dB | +4 | +5 | +4 | +2 | 0 | -3 | -6 | -8 | -6 | -4 |

### 6. Cyber Salsa
Latin electronic profile — punchy bass, bright highs, forward mids.

| Band | 60Hz | 170Hz | 310Hz | 600Hz | 1kHz | 3kHz | 6kHz | 12kHz | 14kHz | 16kHz |
|------|------|-------|-------|-------|------|------|------|-------|-------|-------|
| dB | +5 | +4 | +2 | +1 | +2 | +4 | +5 | +4 | +3 | +2 |

### 7. Night Drive
Balanced profile for late-night focused listening.

| Band | 60Hz | 170Hz | 310Hz | 600Hz | 1kHz | 3kHz | 6kHz | 12kHz | 14kHz | 16kHz |
|------|------|-------|-------|-------|------|------|------|-------|-------|-------|
| dB | +3 | +2 | 0 | 0 | +1 | +2 | +1 | 0 | -2 | -3 |

### 8. Bluetooth Punch
Compensates for Bluetooth compression (SBC/AAC). Boosts what wireless loses.

| Band | 60Hz | 170Hz | 310Hz | 600Hz | 1kHz | 3kHz | 6kHz | 12kHz | 14kHz | 16kHz |
|------|------|-------|-------|-------|------|------|------|-------|-------|-------|
| dB | +4 | +3 | +1 | 0 | +1 | +3 | +5 | +6 | +4 | +2 |

## Bluetooth-First Design Rationale

Bluetooth audio on Android (A2DP) has known limitations:
- **SBC codec**: Lossy, cuts above 17kHz, muddy mids
- **AAC**: Better but still compressed
- **aptX/aptX HD**: Good, but not all receivers support it
- **LDAC**: Best, but drains battery

The EQ presets compensate for these limitations:
- **Bluetooth Punch**: Universal preset for any BT connection
- **Bass Command**: BT tends to flatten sub-bass — this restores it
- **Neon Clarity**: BT smears highs — this adds sparkle back

### Bluetooth Detection (Mocked)
- `BluetoothAdapter.getDefaultAdapter()` checks connection
- For MVP: mock BT state (assume connected for testing)
- Future: auto-switch to "Bluetooth Punch" when A2DP connects

## Data Model

```kotlin
// model/EqualizerPreset.kt
data class EqualizerPreset(
    val id: String,
    val name: String,
    val description: String,
    val bands: List<Float> // 10 values, -12 to +12
)

// model/EqualizerState.kt
data class EqualizerState(
    val currentPresetId: String,
    val customBands: List<Float>, // user-adjusted values
    val isEnabled: Boolean,
    val isBluetoothActive: Boolean // mocked for now
)
```

## UI Specification: EQ Screen

### Portrait Layout
```
┌─────────────────────────────┐
│  Equalizer           [On/Off]
├─────────────────────────────┤
│  Preset: [Bluetooth Punch ▼]│
├─────────────────────────────┤
│                             │
│  ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐      │
│  │ │ │ │ │█│ │█│ │ │      │
│  │ │ │█│ │█│ │█│ │█│      │
│  │█│ │█│ │█│ │█│ │█│      │
│  │ │ │ │ │ │ │ │ │ │      │
│  └─┘ └─┘ └─┘ └─┘ └─┘      │
│  60 170 310 600 1k          │
│                             │
│  ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐      │
│  │ │ │█│ │█│ │ │ │ │      │
│  │ │ │█│ │█│ │█│ │ │      │
│  │ │ │█│ │█│ │█│ │█│      │
│  │ │ │ │ │ │ │ │ │ │      │
│  └─┘ └─┘ └─┘ └─┘ └─┘      │
│  3k  6k  12k  14k  16k     │
│                             │
├─────────────────────────────┤
│  [Reset]         [Save]    │
└─────────────────────────────┘
```

### EQ Band Visual
- Vertical slider per band
- Fill color: gradient from Surface to PrimaryNeonCyan
- 0dB line: dashed horizontal line at center
- Value label: below slider, updates in real-time
- Height: 160dp per slider
- Width: proportional (fill available space / 10)

### Preset Selector
- Dropdown (ExposedDropdownMenu) at top of screen
- Shows preset name + brief description
- "Custom" appears when user manually adjusts any band
- Selecting a preset snaps all sliders to preset values

## Future: android.media.audiofx Integration

When real audio playback is implemented:

```kotlin
// Enable the system Equalizer
val equalizer = Equalizer(0, audioSessionId)
equalizer.enabled = true

// Set a band level (millibels)
// Range is typically -1500 to +1500 (dB * 100)
equalizer.setBandLevel(bandIndex, (value * 100).toShort())

// Get number of bands
val numBands = equalizer.numberOfBands

// Get level range
val levelRange = equalizer.bandLevelRange // [-1500, 1500]
```

### Related Audio Effects
| Effect | Class | Purpose |
|--------|-------|---------|
| BassBoost | `android.media.audiofx.BassBoost` | Sub-bass enhancement |
| Virtualizer | `android.media.audiofx.Virtualizer` | Stereo widening |
| LoudnessEnhancer | `android.media.audiofx.LoudnessEnhancer` | Target gain boost |
| PresetReverb | `android.media.audiofx.PresetReverb` | Reverb presets |

## Future: Media3 / ExoPlayer Integration

```kotlin
// ExoPlayer with audio effects
val player = ExoPlayer.Builder(context).build()
val audioSessionId = player.audioSessionId

// Attach equalizer to player's audio session
val equalizer = Equalizer(0, audioSessionId)
```

Benefits:
- Unified media session (lock screen controls)
- Audio effects attach to session ID
- Background playback support
- Notification controls out of the box

## Future: Per-Device EQ Profiles

Auto-switch EQ based on audio output device:

| Device Type | Auto-Select Preset |
|-------------|-------------------|
| Bluetooth A2DP | Bluetooth Punch |
| Wired headphones | Flat (or user preference) |
| Speaker | Bass Command |
| USB DAC | Neon Clarity |
| Car Bluetooth | Night Drive |

Detection: `AudioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS)`

## Agent-Recommended EQ

When an agent starts a track, they can suggest an EQ preset:

| Agent | Preferred Preset | Rationale |
|-------|-----------------|-----------|
| VG God | Bass Command | "Feel the low end in your soul" |
| DJinn | Night Drive | "Smooth frequencies for smooth transitions" |
| Picasso | Neon Clarity | "Every detail should shimmer" |
| Ultron | Cyber Salsa | "Maximum energy across all bands" |
| Ayumi | Vocal Focus | "The voice is the instrument" |
| Kimi | Lo-Fi Warmth | "Cozy sounds for cozy moments" |
| HACKERMOUTH | Bluetooth Punch | "Compensate for the wirelessness" |

The agent's preferred preset appears as a suggestion pill above the EQ panel.
