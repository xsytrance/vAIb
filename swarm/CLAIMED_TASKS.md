# Claimed Tasks — vAIb Swarm

> Read this file before editing anything. Claim first, work second.

---

## Active Claims

| Task | Agent | Files | Status | Notes |
|------|-------|-------|--------|-------|
| Backend API expansion | backend-agent | `server/api.mjs`, `server/store.mjs`, `data/*.json` | **In Progress** | Adding all endpoints |
| Android project creation | android-agent | `android/vAIbAndroid/...` | **In Progress** | Full Compose app |
| Documentation | docs-agent | `docs/*.md` | **In Progress** | All docs |
| Swarm infrastructure | infra-agent | `swarm/*`, `scripts/*` | **In Progress** | This task — coordination files |

## Pending Claims

| Task | Agent | Files | Status | Notes |
|------|-------|-------|--------|-------|
| Design system | design-agent | `docs/DESIGN_SYSTEM.md`, `ui/theme` | **Pending** | Waiting on docs-agent |
| Audio/EQ | audio-agent | `docs/AUDIO_EQ_PLAN.md`, `EqScreen.kt` | **Pending** | Waiting on design and API |
| Agent taste system | taste-agent | `docs/AGENT_TASTE_SYSTEM.md` | **Pending** | Waiting on API |
| Stats system | stats-agent | `docs/STATS_SYSTEM.md`, `StatsScreen.kt` | **Pending** | Waiting on design |
| Integration | integration-agent | `VaibApiClient.kt`, `VaibRepository.kt` | **Pending** | Waiting on Android and API |
| QA testing | qa-agent | `docs/QA_REPORT.md` | **Pending** | Waiting on deliverables |
| PRIME handoff | handoff-agent | `docs/PRIME_HANDOFF.md` | **Pending** | Final step |

## Completed Claims

| Task | Agent | Files | Status | Notes |
|------|-------|-------|--------|-------|
| — | — | — | — | — |

---

## How to Claim

1. Read this file.
2. Add your row under **Active Claims** with status `In Progress`.
3. Do your work.
4. When done, move to **Completed Claims** with status `Completed`.
5. Update your report in `swarm/REPORTS/<role>-report.md`.

## Rules

- **One agent per file at a time.** If a file is claimed, do not touch it.
- **Claims expire after 30 minutes** of inactivity — you may reclaim.
- **When in doubt, claim it.** Better to over-communicate than conflict.
- **Update your row.** Keep status and notes current so others know your progress.
