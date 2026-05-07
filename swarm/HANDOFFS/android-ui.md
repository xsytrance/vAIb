# Handoff: Android-UI Agent

## Role
Android screens, Jetpack Compose UI, navigation, reusable components.

## Current Status

- [ ] Project structure created
- [ ] All screens defined
- [ ] Navigation wired
- [ ] Theme applied
- [ ] Preview functions added
- [ ] Handoff complete

## Screen Inventory

| Screen | Composable | Status | Notes |
|--------|-----------|--------|-------|
| Home / Player | `HomeScreen` | Pending | Main player view |
| Queue | `QueueScreen` | Pending | Track queue management |
| Agents | `AgentsScreen` | Pending | Agent list and status |
| Agent Reactions | `ReactionsScreen` | Pending | Agent reaction feed |
| EQ | `EqScreen` | Pending | Equalizer (audio-agent owns logic) |
| Stats | `StatsScreen` | Pending | Stats display (stats-agent owns data) |
| Settings | `SettingsScreen` | Pending | App settings |

## Navigation Structure

```
Home (start)
  ├── Queue
  ├── Agents
  │     └── Agent Detail / Reactions
  ├── EQ
  ├── Stats
  └── Settings
```

## Components

<!-- List reusable components created -->

| Component | File | Used By | Status |
|-----------|------|---------|--------|
| | | | Pending |

## Theme Integration

- Design system: `docs/DESIGN_SYSTEM.md`
- Colors: From design-agent
- Typography: From design-agent
- Dark mode support: TBD

## Open Questions

1. Bottom nav or drawer navigation?
2. Tablet / landscape support?
3. Animation preferences?

## Handoff Notes

<!-- What integration-agent needs to know about UI structure -->

## Report

See `swarm/REPORTS/android-ui-report.md` for full progress report.
