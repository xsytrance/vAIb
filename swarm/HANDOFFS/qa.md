# Handoff: QA Agent

## Role
Testing strategy, test execution, bug tracking, verification checklist.

## Current Status

- [ ] Test plan written
- [ ] Unit test strategy defined
- [ ] Integration tests planned
- [ ] UI tests scoped
- [ ] Known issues documented
- [ ] Verification checklist complete
- [ ] Handoff complete

## Test Plan

### Unit Tests

| Component | What to Test | Priority |
|-----------|-------------|----------|
| API client | Request/response parsing | High |
| Repository | Cache behavior, error handling | High |
| ViewModels | State management, UI logic | High |
| EQ engine | Preset application, calculations | Medium |
| Token system | Spend/calculation logic | Medium |

### Integration Tests

| Flow | Steps | Priority |
|------|-------|----------|
| Full play flow | Queue -> Play -> React -> Stats | High |
| Agent reaction flow | Event -> Reaction -> Display | High |
| EQ preset flow | Select -> Apply -> Verify | Medium |
| Offline fallback | Disconnect -> Verify cache -> Reconnect | Medium |

### UI Tests

| Screen | Test Coverage | Priority |
|--------|--------------|----------|
| Home | Player controls, track display | High |
| Queue | Add, remove, reorder | Medium |
| Agents | List, detail, reactions | Medium |
| EQ | Preset selection, slider control | Medium |
| Stats | Data display, refresh | Low |

## Verification Checklist

### Backend

- [ ] Server starts without errors
- [ ] All endpoints return 200 OK with valid JSON
- [ ] Data persists across restarts
- [ ] Error responses have proper status codes
- [ ] CORS configured if needed

### Android

- [ ] App compiles without errors
- [ ] All screens render without crashes
- [ ] Navigation works between all screens
- [ ] Theme applied consistently
- [ ] No memory leaks

### Integration

- [ ] Android reads data from backend
- [ ] Polling updates UI
- [ ] Fallback mode works offline
- [ ] Error states handled gracefully
- [ ] Real-time events display

## Known Issues

| ID | Issue | Severity | Status |
|----|-------|----------|--------|
| — | — | — | — |

## Files Owned

| File | Purpose | Status |
|------|---------|--------|
| `docs/QA_REPORT.md` | Full QA report | Pending |

## Open Questions

1. Test framework: JUnit4 or JUnit5?
2. UI testing: Compose Testing or Espresso?
3. CI pipeline for automated tests?

## Handoff Notes

<!-- What PRIME needs to know about quality status -->

## Report

See `swarm/REPORTS/qa-report.md` for full progress report.
