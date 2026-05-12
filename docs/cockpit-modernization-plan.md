# vAIb Cockpit Modernization Plan

## Objective
Modernize the cockpit into a premium tactical HUD while preserving fast readability and top-of-screen visualizer focus.

## Non-negotiables
- Keep visualizer at top as hero element.
- Keep existing modes and add more over time.
- Add touch and swipe-reactive visual behavior.
- Maintain performant UX on Android.

## Phase 1 (now)
- Touch-reactive visualizer controls:
  - Swipe left/right: change visualizer mode
  - Swipe up/down: tune sensitivity
  - Tap: pulse boost + ripple feedback
- Add on-screen gesture hint and sensitivity readout.

## Phase 2 (layout polish)
- Hero visualizer card with cleaner chrome and contrast hierarchy.
- Rebalance cockpit sections:
  1. Now Broadcasting
  2. Live signal stats
  3. Quick actions
- Reduce clutter with progressive disclosure (collapsed advanced controls).

## Phase 3 (new visualizer modes)
- Add: Particle Flow, Ribbon Field, Neon Tunnel, Constellation Pulse.
- Add mode carousel and optional auto-rotate.

## Phase 4 (motion + accessibility)
- Micro-transitions (spring-based), subtle parallax.
- Reduce Motion option.
- Quality modes: High / Balanced / Battery.

## Release Gate (cockpit visual changes)
Before shipping APK:
1. Verify gesture interactions on device.
2. Verify no accidental scroll/gesture conflicts.
3. Verify stable 55–60fps in Balanced mode.
4. Verify all controls remain reachable with one hand.
