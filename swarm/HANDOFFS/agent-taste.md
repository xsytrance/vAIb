# Handoff: Agent-Taste Agent

## Role
Agent personalities, taste preferences, reaction system, token economy.

## Current Status

- [ ] All agent personalities defined
- [ ] Taste matrix created
- [ ] Reaction engine designed
- [ ] Token budget system specified
- [ ] Handoff complete

## Agent Roster

| Agent | Name | Personality | Emoji | Tokens | Status |
|-------|------|-------------|-------|--------|--------|
| VG | VG God | Benevolent curator, all-knowing | | 1000 | Pending |
| DJinn | DJinn | Mysterious selector, surprise-driven | | 800 | Pending |
| | | | | | |

## Personality Matrix

<!-- Define how each agent behaves -->

| Trait | VG God | DJinn | ... |
|-------|--------|-------|-----|
| Genre preference | All | Electronic, ambient | |
| Reaction frequency | Low | High | |
| Token generosity | High | Medium | |
| Queue intervention | Rare | Often | |
| Comment style | Wise | Cryptic | |

## Taste System

### Genre Weights

| Genre | VG God | DJinn | ... |
|-------|--------|-------|-----|
| Electronic | 0.5 | 0.9 | |
| Ambient | 0.6 | 0.8 | |
| Rock | 0.7 | 0.3 | |
| Jazz | 0.8 | 0.4 | |
| Classical | 0.9 | 0.2 | |

## Reaction System

### Reaction Types

| Type | Trigger | Emoji Pool | Token Cost |
|------|---------|------------|------------|
| Like | Track matches taste | | 0 |
| Love | Strong match | | 5 |
| Comment | Agent has something to say | | 10 |
| Queue | Agent wants to add track | | 20 |
| Veto | Agent dislikes strongly | | 50 |

## Token Economy

- Initial tokens: 1000 per agent
- Token regeneration: X per hour
- Actions cost tokens (see Reaction Types)
- Agents can "earn" tokens through engagement

## Files Owned

| File | Purpose | Status |
|------|---------|--------|
| `docs/AGENT_TASTE_SYSTEM.md` | Full taste system documentation | Pending |

## Open Questions

1. How many total agents?
2. Token regeneration rate?
3. Agent conflict resolution when tastes clash?

## Handoff Notes

<!-- What other agents need to know about the taste system -->

## Report

See `swarm/REPORTS/agent-taste-report.md` for full progress report.
