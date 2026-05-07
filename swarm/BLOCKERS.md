# Blockers — vAIb Swarm

> Blockers kill momentum. Document them immediately.

---

## Active Blockers

None currently.

---

## Resolved Blockers

None yet.

---

## Potential Future Blockers

1. **Android SDK availability for APK build** — May need specific SDK versions or build tools.
2. **Gradle version compatibility** — Android project may require specific Gradle wrapper version.
3. **Media3/ExoPlayer for real audio playback** — Audio agent depends on Media3; verify dependency availability.
4. **Bluetooth output route detection** — EQ agent needs Bluetooth state; verify permissions and APIs.
5. **Tailscale network configuration on PRIME** — PRIME handoff agent needs Tailscale IPs to be stable.

---

## How to Add a Blocker

1. Copy the template below into **Active Blockers**.
2. Fill in all fields.
3. Update `swarm/HANDOFFS/<role>.md` to reference the blocker.
4. Work on something else while waiting.
5. When resolved, move to **Resolved Blockers** with resolution timestamp.

### Blocker Template

```markdown
### B-XXX: <Short description>
- **Blocked Agent**: <which agent is stuck>
- **Blocking File/Agent**: <what/who is causing it>
- **Impact**: <what work cannot proceed>
- **Since**: <timestamp, e.g. 2026-05-07T22:00Z>
- **Need**: <what would unblock this>
- **Workaround**: <any temporary workaround, or "None">
```

### Example

```markdown
### B-001: Android project needs API contract
- **Blocked Agent**: integration-agent
- **Blocking File/Agent**: backend-agent (api.mjs)
- **Impact**: Cannot write VaibApiClient.kt without knowing endpoint shapes
- **Since**: 2026-05-07T22:15Z
- **Need**: Finalized API endpoint list with request/response schemas
- **Workaround**: Using placeholder data models; will refactor when API is ready
```

---

## Blocker History Log

| ID | Description | Status | Resolved By |
|----|-------------|--------|-------------|
| — | — | — | — |
