# vAIb Swarm — Queen Directive

> **North Star**: This is not a Spotify clone. It is an agent music operating room.

---

## Mission Statement

Build **vAIb** — an Android-first AI music cockpit where multiple AI agents collaborate to curate, react to, and manage a living music stream. Each agent has a distinct musical personality, taste preferences, and the ability to influence what plays. The system runs as a real-time, multi-agent swarm backed by a persistent API and a reactive Android UI.

---

## Agent Roles

| # | Agent | Role | Primary Domain | Key Files |
|---|-------|------|----------------|-----------|
| 1 | **Architect** | System design, tech stack, patterns | Architecture, integration points | `docs/ARCHITECTURE.md`, `swarm/REPORTS/architect-report.md` |
| 2 | **Android-UI** | Android screens, navigation, Compose UI | UI layer, screen implementations | `android/vAIbAndroid/...`, `swarm/REPORTS/android-ui-report.md` |
| 3 | **Audio-EQ** | Equalizer, audio effects, presets, Bluetooth | Audio pipeline, EQ engine | `docs/AUDIO_EQ_PLAN.md`, `EqScreen.kt`, `swarm/REPORTS/audio-eq-report.md` |
| 4 | **Backend-API** | API endpoints, data models, persistence | Server, REST API, data layer | `server/api.mjs`, `server/store.mjs`, `data/*.json`, `swarm/REPORTS/backend-api-report.md` |
| 5 | **Agent-Taste** | Agent personalities, reaction system, token budgets | Agent behavior, taste engine | `docs/AGENT_TASTE_SYSTEM.md`, `swarm/REPORTS/agent-taste-report.md` |
| 6 | **Stats** | Stats tracking, analytics UI, data visualization | Stats engine, analytics screen | `docs/STATS_SYSTEM.md`, `StatsScreen.kt`, `swarm/REPORTS/stats-report.md` |
| 7 | **Design** | Design system, colors, typography, components | Visual identity, theme system | `docs/DESIGN_SYSTEM.md`, `ui/theme`, `swarm/REPORTS/design-report.md` |
| 8 | **Integration** | Android-backend integration, polling, fallback | Connectivity, data sync | `VaibApiClient.kt`, `VaibRepository.kt`, `swarm/REPORTS/integration-report.md` |
| 9 | **QA** | Testing, verification, bug tracking | Quality assurance | `docs/QA_REPORT.md`, `swarm/REPORTS/qa-report.md` |
| 10 | **PRIME-Handoff** | Final handoff, PRIME coordination, wrap-up | Delivery, documentation | `docs/PRIME_HANDOFF.md`, `swarm/REPORTS/final-swarm-report.md` |

---

## File Claiming Protocol

**Before editing ANY file, you MUST claim it.**

1. Read `swarm/CLAIMED_TASKS.md` to see what is already claimed.
2. Add your claim to the table — mark the task, agent name, files, and status `In Progress`.
3. Only begin editing after your claim is recorded.
4. When done, update status to `Completed` and write your report in `swarm/REPORTS/<your-report>.md`.

### Claim Format

```markdown
| Task | Agent | Files | Status | Notes |
|------|-------|-------|--------|-------|
| My task | my-agent | file1, file2 | In Progress | Starting work |
```

### Important
- **Never edit a file claimed by another agent** without coordinating first.
- If you need a claimed file, document it as a blocker in `swarm/BLOCKERS.md`.
- Claims expire after 30 minutes of inactivity — any agent may reclaim.

---

## Communication Rules

1. **Write to your report.** Every agent MUST update `swarm/REPORTS/<role>-report.md` after completing work.
2. **Update `swarm/STATUS.md`.** Keep the project status current. Mark sections complete as you finish.
3. **Handoffs.** When your work is done or blocked, write a handoff note in `swarm/HANDOFFS/<role>.md`.
4. **No silent work.** Unreported work does not exist. If you did it, document it.

---

## Conflict Resolution

When two agents need to touch the same file:

| Scenario | Resolution |
|----------|------------|
| Both claim same file simultaneously | **Integration agent** wins; both hand off to Integration |
| UI agent + Backend agent both touch data model | **Backend agent** owns the schema; UI adapts |
| Design agent + Android-UI agent conflict on colors | **Design agent** wins; design system is source of truth |
| Audio-EQ + Android-UI conflict on screen layout | **Android-UI agent** wins; EQ provides component, UI positions it |
| Any agent + Architect conflict | **Architect** wins; architect sets patterns |
| Integration vs any agent | Source agent wins; Integration wraps/adapts |
| QA finds bug in agent's code | Bug owner fixes; QA verifies |

**Golden rule**: When in doubt, the agent who **owns the source of truth** wins.

---

## Blocker Protocol

**When you are blocked, act immediately.**

1. Document the blocker in `swarm/BLOCKERS.md` under **Active Blockers**.
2. Include: description, blocking agent/file, impact, and what you need.
3. Notify via your handoff file: `swarm/HANDOFFS/<role>.md`.
4. When resolved, move to **Resolved Blockers** with resolution notes.
5. Do not wait silently. A documented blocker gets attention; a silent blocker kills momentum.

### Blocker Template

```markdown
### B-XXX: <Short Description>
- **Blocked Agent**: <agent name>
- **Blocking File/Agent**: <what/who is blocking>
- **Impact**: <what can't proceed>
- **Since**: <timestamp>
- **Need**: <what would unblock>
- **Workaround**: <any temporary workaround>
```

---

## Definition of Done (Per Role)

| Role | Done When |
|------|-----------|
| **Architect** | All tech decisions documented, patterns defined, integration contracts signed off |
| **Android-UI** | All screens composable, navigation wired, preview functions present |
| **Audio-EQ** | EQ presets defined, audio pipeline ready, Bluetooth output detected |
| **Backend-API** | All endpoints return valid JSON, persistence works, API documented |
| **Agent-Taste** | All agent personalities defined, reaction engine logic written, token system working |
| **Stats** | Stats categories defined, tracking functions ready, UI shows data |
| **Design** | Design system documented, color palette set, typography defined, components spec'd |
| **Integration** | Android app reads from API, polling works, fallback mode functional |
| **QA** | All tests pass, known issues documented, verification checklist complete |
| **PRIME-Handoff** | All docs merged, handoff notes written, PRIME can take over without questions |

---

## Quick Reference

| File | Purpose |
|------|---------|
| `swarm/QUEEN_DIRECTIVE.md` | This file — read first |
| `swarm/STATUS.md` | Live project status |
| `swarm/CLAIMED_TASKS.md` | Who is doing what |
| `swarm/BLOCKERS.md` | What is blocked and why |
| `swarm/HANDOFFS/*.md` | Per-agent handoff notes |
| `swarm/REPORTS/*.md` | Per-agent progress reports |
| `scripts/demo-agent-events.sh` | Demo script for API testing |

---

## North Star

> This is not a Spotify clone. It is an agent music operating room.
>
> Every feature serves the agents. Every pixel serves the vibe. Every line of code serves the swarm.

Build like the agents are watching. Because they are.
