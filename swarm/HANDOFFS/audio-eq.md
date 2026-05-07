# Handoff: Audio-EQ Agent

## Role
Equalizer architecture, audio presets, Bluetooth audio routing, audio pipeline design.

## Current Status

- [ ] EQ architecture documented
- [ ] Preset system designed
- [ ] Bluetooth output detection planned
- [ ] EqScreen.kt created
- [ ] Audio pipeline defined
- [ ] Handoff complete

## EQ Architecture

### Preset System

| Preset | Frequency Bands | Use Case | Status |
|--------|----------------|----------|--------|
| Flat | All 0dB | Neutral reference | Pending |
| Bass Boost | Low +, High 0 | Bass-heavy genres | Pending |
| Vocal Clarity | Mid +, Low/High - | Podcasts, vocals | Pending |
| Electronic | Custom curve | Synth, electronic | Pending |
| Custom | User-defined | Personal preference | Pending |

### Frequency Bands (Standard 5-Band)

| Band | Frequency | Range |
|------|-----------|-------|
| Low | 60Hz | +/- 12dB |
| Low-Mid | 230Hz | +/- 12dB |
| Mid | 910Hz | +/- 12dB |
| High-Mid | 3.6kHz | +/- 12dB |
| High | 14kHz | +/- 12dB |

## Bluetooth Considerations

- Detect Bluetooth A2DP output route
- Adjust presets for Bluetooth audio profile
- Handle Bluetooth disconnect/reconnect
- Support for multiple Bluetooth device profiles

## Files Owned

| File | Purpose | Status |
|------|---------|--------|
| `docs/AUDIO_EQ_PLAN.md` | Full EQ documentation | Pending |
| `EqScreen.kt` | EQ UI screen | Pending |
| `EqViewModel.kt` | EQ logic and state | Pending |

## Dependencies

- `androidx.media3:media3-exoplayer`
- `androidx.media3:media3-effect`
- AudioEffect API (system EQ)
- Visualizer API (for spectrum display)

## Open Questions

1. Real-time EQ or preset-only?
2. Per-track EQ memory?
3. Spectrum visualizer scope?

## Handoff Notes

<!-- What android-ui-agent needs to know about EQ screen integration -->

## Report

See `swarm/REPORTS/audio-eq-report.md` for full progress report.
