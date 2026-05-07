# Handoff: Design Agent

## Role
Design system, color palette, typography, component specifications, visual identity.

## Current Status

- [ ] Color palette defined
- [ ] Typography system set
- [ ] Component library spec'd
- [ ] Theme tokens created
- [ ] Dark mode defined
- [ ] Handoff complete

## Color Palette

### Primary Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-primary` | `#TBD` | Primary brand color |
| `--color-primary-variant` | `#TBD` | Primary variant |
| `--color-secondary` | `#TBD` | Accent color |

### Background Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-background` | `#TBD` | App background |
| `--color-surface` | `#TBD` | Cards, panels |
| `--color-surface-elevated` | `#TBD` | Elevated surfaces |

### Text Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-text-primary` | `#TBD` | Headlines, primary text |
| `--color-text-secondary` | `#TBD` | Body, secondary text |
| `--color-text-tertiary` | `#TBD` | Hints, disabled |

### Agent Colors

| Agent | Color Token | Hex |
|-------|-------------|-----|
| VG God | `--color-agent-vg` | `#TBD` |
| DJinn | `--color-agent-djinn` | `#TBD` |

## Typography

| Scale | Font | Size | Weight | Usage |
|-------|------|------|--------|-------|
| Display | TBD | 32sp | Bold | Screen titles |
| Headline | TBD | 24sp | SemiBold | Section headers |
| Title | TBD | 18sp | Medium | Card titles |
| Body | TBD | 14sp | Regular | Main content |
| Caption | TBD | 12sp | Regular | Labels, timestamps |

## Component Specifications

### Cards

| Variant | Corner Radius | Elevation | Padding |
|---------|--------------|-----------|---------|
| Standard | 12dp | 2dp | 16dp |
| Elevated | 16dp | 8dp | 16dp |

### Buttons

| Variant | Height | Corner Radius | Padding |
|---------|--------|--------------|---------|
| Filled | 48dp | 24dp | 24dp horizontal |
| Outlined | 48dp | 24dp | 24dp horizontal |
| Text | 36dp | 8dp | 12dp horizontal |

## Theme Integration

### Material You / Dynamic Colors
- Support dynamic theming: TBD
- Fallback palette: Defined above

### Dark Mode
- All colors have dark variants
- Automatic switching based on system

## Files Owned

| File | Purpose | Status |
|------|---------|--------|
| `docs/DESIGN_SYSTEM.md` | Complete design system documentation | Pending |
| `ui/theme/Color.kt` | Color definitions (Android) | Pending |
| `ui/theme/Type.kt` | Typography definitions (Android) | Pending |
| `ui/theme/Theme.kt` | Theme composition (Android) | Pending |
| `ui/theme/Shape.kt` | Shape definitions (Android) | Pending |

## Open Questions

1. Material You dynamic colors or fixed palette?
2. Animation duration standard?
3. Haptic feedback design?

## Handoff Notes

<!-- What android-ui-agent needs to know about applying the design system -->

## Report

See `swarm/REPORTS/design-report.md` for full progress report.
