# vAIb Auto Update Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Add an automatic update capability to vAIb that can check for newer releases, notify users, and launch update install flow without breaking or changing existing app behavior.

**Architecture:** Add a *self-contained update module* in `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/data/update/` with strict boundaries: network release check + semantic version comparison + UI state exposure through `VaibViewModel`. UI changes are limited to a new card in `SettingsScreen` and (optionally) an indicator in `UpdatesScreen`, with all existing controls/screens untouched. Runtime behavior is opt-in and guarded by default-safe feature flags (auto-check on app start and periodic check toggle), so current functionality remains unchanged unless update logic is explicitly triggered.

**Tech Stack:** Kotlin, Jetpack Compose, Android ViewModel/StateFlow, SharedPreferences, HttpURLConnection (or existing networking style), Android `DownloadManager`, `FileProvider`, Intent-based APK install handoff.

---

## Constraints and Non-Negotiables

- Do **not** change behavior of playback, polling, agents, automation, conflicts, TTS, or connectivity flows.
- Do **not** alter existing nav structure/routes.
- Do **not** regress startup time: release check must be async and non-blocking.
- All update failures must fail silent-safe (surface status text only, never crash).
- If no update endpoint is configured/reachable, app must behave exactly as today.

---

## Release Source Assumption (explicit)

This plan assumes updates are sourced from a JSON metadata endpoint (or GitHub Releases-compatible endpoint) that provides:
- latest version name (e.g., `0.3.0`)
- version code (int)
- APK URL
- optional release notes
- optional checksum

If release backend differs, only the provider adapter task changes; core flow remains the same.

---

### Task 1: Baseline discovery and safety snapshot

**Objective:** Capture baseline and verify no pre-existing update mechanism to avoid collisions.

**Files:**
- Modify: none (read-only)

**Step 1: Validate working directory and repo root**

Run:
```bash
pwd
git rev-parse --show-toplevel
```
Expected: module dir is `.../vAIb/android/vAIbAndroid`, git root `.../vAIb`.

**Step 2: Capture baseline branch/status**

Run:
```bash
git status --short --branch
```
Expected: current branch shown, no unexpected staged changes for this feature.

**Step 3: Confirm no update logic exists**

Run:
```bash
rg -n "auto.?update|in-app update|DownloadManager|FileProvider|versionCode|versionName" android/vAIbAndroid/app/src/main/java android/vAIbAndroid/app/src/main/AndroidManifest.xml
```
Expected: no complete existing auto-update pipeline found.

**Step 4: Commit**

No commit (discovery only).

---

### Task 2: Define update domain models and contract

**Objective:** Create typed contracts so update logic stays isolated and testable.

**Files:**
- Create: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/data/model/AppUpdateInfo.kt`
- Create: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/data/model/UpdateChannel.kt`
- Create: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/data/model/UpdateUiState.kt`
- Test: `android/vAIbAndroid/app/src/test/java/com/xsytrance/vaib/data/update/UpdateModelTest.kt`

**Step 1: Write failing tests for model defaults/serialization assumptions**

Add tests for:
- default `UpdateUiState` is idle/no update
- `AppUpdateInfo` requires non-empty version + URL
- optional notes/checksum remain nullable

**Step 2: Run test to verify failure**

Run:
```bash
cd android/vAIbAndroid
./gradlew testDebugUnitTest --tests "*UpdateModelTest*"
```
Expected: FAIL (new files/classes missing).

**Step 3: Write minimal model code**

Implement immutable `data class`es and enums only.

**Step 4: Re-run targeted test**

Run same command.
Expected: PASS.

**Step 5: Commit**

```bash
git add android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/data/model/AppUpdateInfo.kt android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/data/model/UpdateChannel.kt android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/data/model/UpdateUiState.kt android/vAIbAndroid/app/src/test/java/com/xsytrance/vaib/data/update/UpdateModelTest.kt
git commit -m "feat(update): add update domain models"
```

---

### Task 3: Add robust version comparator utility

**Objective:** Compare installed app version vs remote version safely.

**Files:**
- Create: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/data/update/VersionComparator.kt`
- Test: `android/vAIbAndroid/app/src/test/java/com/xsytrance/vaib/data/update/VersionComparatorTest.kt`

**Step 1: Write failing comparator tests**

Cover:
- `0.3.0 > 0.2.9`
- `1.0.0 == 1.0`
- prerelease fallback behavior (if unsupported, treat as string tie-break)
- malformed remote version returns "not newer" instead of crash

**Step 2: Run targeted tests (expect fail)**

```bash
cd android/vAIbAndroid
./gradlew testDebugUnitTest --tests "*VersionComparatorTest*"
```

**Step 3: Implement minimal comparator utility**

Ensure null/malformed handling is defensive.

**Step 4: Run tests (expect pass)**

Same command.

**Step 5: Commit**

```bash
git add android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/data/update/VersionComparator.kt android/vAIbAndroid/app/src/test/java/com/xsytrance/vaib/data/update/VersionComparatorTest.kt
git commit -m "feat(update): add semantic version comparator"
```

---

### Task 4: Implement release metadata client

**Objective:** Fetch latest release metadata from configured endpoint without touching existing API clients.

**Files:**
- Create: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/data/update/UpdateReleaseClient.kt`
- Create: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/data/update/UpdateReleaseParser.kt`
- Test: `android/vAIbAndroid/app/src/test/java/com/xsytrance/vaib/data/update/UpdateReleaseParserTest.kt`

**Step 1: Write failing parser tests**

Test valid payload, missing required fields, invalid URL.

**Step 2: Run parser tests (expect fail)**

```bash
cd android/vAIbAndroid
./gradlew testDebugUnitTest --tests "*UpdateReleaseParserTest*"
```

**Step 3: Implement parser and client**

- client returns `Result<AppUpdateInfo?>`
- parse strict required fields
- network timeout + error mapping

**Step 4: Run parser tests (expect pass)**

Same command.

**Step 5: Commit**

```bash
git add android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/data/update/UpdateReleaseClient.kt android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/data/update/UpdateReleaseParser.kt android/vAIbAndroid/app/src/test/java/com/xsytrance/vaib/data/update/UpdateReleaseParserTest.kt
git commit -m "feat(update): add release metadata client"
```

---

### Task 5: Build update coordinator service

**Objective:** Centralize update checks, decisioning, and state transitions.

**Files:**
- Create: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/data/update/AppUpdateCoordinator.kt`
- Test: `android/vAIbAndroid/app/src/test/java/com/xsytrance/vaib/data/update/AppUpdateCoordinatorTest.kt`

**Step 1: Write failing coordinator tests**

Cover:
- no update when same/older version
- update available when newer
- network error maps to non-fatal UI state
- cooldown/last-check timestamp respected

**Step 2: Run tests (expect fail)**

```bash
cd android/vAIbAndroid
./gradlew testDebugUnitTest --tests "*AppUpdateCoordinatorTest*"
```

**Step 3: Implement coordinator**

Expose functions:
- `checkNow(force: Boolean = false)`
- `scheduleEligibleCheck(nowMillis)`
- `markDismissed(version)`

**Step 4: Run tests (expect pass)**

Same command.

**Step 5: Commit**

```bash
git add android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/data/update/AppUpdateCoordinator.kt android/vAIbAndroid/app/src/test/java/com/xsytrance/vaib/data/update/AppUpdateCoordinatorTest.kt
git commit -m "feat(update): add coordinator with safe check lifecycle"
```

---

### Task 6: Add APK download/install handoff utility

**Objective:** Download APK and open Android installer flow safely.

**Files:**
- Create: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/data/update/ApkInstallBridge.kt`
- Modify: `android/vAIbAndroid/app/src/main/AndroidManifest.xml`
- Create: `android/vAIbAndroid/app/src/main/res/xml/file_paths.xml`

**Step 1: Add failing instrumented/unit shim test (if feasible) or compile assertion**

At minimum, add a test/smoke check that `Intent` has grant read URI permission and correct MIME type.

**Step 2: Run test/build (expect fail before implementation)**

```bash
cd android/vAIbAndroid
./gradlew :app:assembleDebug
```
Expected: fail before missing provider/resources are added.

**Step 3: Implement bridge + provider plumbing**

- register `FileProvider` in manifest
- add `res/xml/file_paths.xml`
- use `DownloadManager` destination in app external files dir
- construct install intent with URI grants

**Step 4: Rebuild app**

Run same assemble command.
Expected: PASS.

**Step 5: Commit**

```bash
git add android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/data/update/ApkInstallBridge.kt android/vAIbAndroid/app/src/main/AndroidManifest.xml android/vAIbAndroid/app/src/main/res/xml/file_paths.xml
git commit -m "feat(update): add APK download and install bridge"
```

---

### Task 7: Integrate update state into VaibViewModel (non-invasive)

**Objective:** Surface update state/actions without changing existing flows.

**Files:**
- Modify: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/viewmodel/VaibViewModel.kt`
- Test: `android/vAIbAndroid/app/src/test/java/com/xsytrance/vaib/viewmodel/VaibViewModelUpdateTest.kt`

**Step 1: Write failing ViewModel tests**

Validate:
- existing refresh/poll behavior unchanged
- new `updateUiState` stateflow exposed
- `checkForUpdates()` calls coordinator asynchronously

**Step 2: Run targeted tests (expect fail)**

```bash
cd android/vAIbAndroid
./gradlew testDebugUnitTest --tests "*VaibViewModelUpdateTest*"
```

**Step 3: Add minimal ViewModel wiring**

- new private coordinator dependency
- expose immutable update state
- trigger optional startup check after existing init tasks (non-blocking)

**Step 4: Re-run tests (expect pass)**

Same command.

**Step 5: Commit**

```bash
git add android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/viewmodel/VaibViewModel.kt android/vAIbAndroid/app/src/test/java/com/xsytrance/vaib/viewmodel/VaibViewModelUpdateTest.kt
git commit -m "feat(update): wire coordinator into viewmodel"
```

---

### Task 8: Add Settings UI for update controls

**Objective:** Provide user-facing controls without changing existing settings behavior.

**Files:**
- Modify: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/ui/screens/SettingsScreen.kt`
- (Optional) Modify: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/ui/screens/UpdatesScreen.kt`
- (Optional) Create: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/ui/components/UpdateStatusCard.kt`

**Step 1: Write UI tests/snapshot expectations (if test infra available); otherwise add compile + manual verification checklist**

Checklist assertions:
- existing Connection/Audio/Agent/App Info sections still render
- new update section has: Check now, auto-check toggle, status text, install CTA only when update available

**Step 2: Build app (baseline fail if new refs unresolved)**

```bash
cd android/vAIbAndroid
./gradlew :app:assembleDebug
```

**Step 3: Implement UI additions minimally**

- keep existing layout order stable
- append update card near App Info
- no nav changes

**Step 4: Build and smoke-run**

Run assemble again and install debug apk for manual check.
Expected: PASS + no crashes entering Settings.

**Step 5: Commit**

```bash
git add android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/ui/screens/SettingsScreen.kt android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/ui/screens/UpdatesScreen.kt android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/ui/components/UpdateStatusCard.kt
git commit -m "feat(update): add settings update controls"
```

---

### Task 9: Persistence + safeguards for non-disruptive behavior

**Objective:** Persist update preferences/state and ensure no repetitive prompts.

**Files:**
- Modify: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/viewmodel/VaibViewModel.kt`
- Modify: `android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/data/update/AppUpdateCoordinator.kt`
- Test: `android/vAIbAndroid/app/src/test/java/com/xsytrance/vaib/data/update/UpdatePreferenceTest.kt`

**Step 1: Write failing tests**

Cover:
- auto-check enabled default (or disabled if product preference says so)
- dismissed version not re-prompted in same session window
- last-check cooldown enforced

**Step 2: Run tests (expect fail)**

```bash
cd android/vAIbAndroid
./gradlew testDebugUnitTest --tests "*UpdatePreferenceTest*"
```

**Step 3: Implement preference persistence**

Use dedicated pref keys namespace (`update_*`) to avoid collisions.

**Step 4: Re-run tests**

Expected: PASS.

**Step 5: Commit**

```bash
git add android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/viewmodel/VaibViewModel.kt android/vAIbAndroid/app/src/main/java/com/xsytrance/vaib/data/update/AppUpdateCoordinator.kt android/vAIbAndroid/app/src/test/java/com/xsytrance/vaib/data/update/UpdatePreferenceTest.kt
git commit -m "feat(update): persist update prefs and cooldown guards"
```

---

### Task 10: End-to-end verification and regression gate

**Objective:** Prove no regressions and validate update happy/failure paths.

**Files:**
- Create: `docs/qa/auto-update-regression-checklist.md`
- Modify: `docs/CHANGELOG_CONNECTED_REFRESH.md` (or preferred changelog)

**Step 1: Run unit tests + build**

```bash
cd android/vAIbAndroid
./gradlew testDebugUnitTest :app:assembleDebug
```
Expected: PASS.

**Step 2: Manual regression sweep**

Verify unchanged behavior for:
- playback controls
- station switching
- queue/reactions
- agent screens
- refresh scheduler/automation/integrity flows
- settings existing fields and saves

**Step 3: Manual update-path checks**

- no endpoint configured → no crash, status visible
- endpoint with newer version → update available, download/install CTA works
- endpoint unreachable → non-blocking error status only

**Step 4: Stage safety check before final commit**

```bash
git diff --cached --name-only
git status --short --branch
```
Expected: only in-scope update/doc files staged.

**Step 5: Final commit**

```bash
git add docs/qa/auto-update-regression-checklist.md docs/CHANGELOG_CONNECTED_REFRESH.md
git commit -m "docs(update): add auto-update regression coverage"
```

---

## Phase Checkpoints

- **Phase 1:** Domain + comparator + metadata client (Tasks 2-4)
- **Phase 2:** Coordinator + install bridge (Tasks 5-6)
- **Phase 3:** ViewModel + UI + persistence (Tasks 7-9)
- **Phase 4:** Full verification/docs (Task 10)

Checkpoint report template:
- `phase completed: <phase>`
- `commit: <hash> — <message>`
- `build/test verification: <command> (<pass/fail>)`

---

## Risk Register and Mitigations

- **Risk:** Android install restrictions differ by OS version.
  - **Mitigation:** Use `FileProvider`, URI grant flags, and fallback error message.
- **Risk:** Network metadata schema drift.
  - **Mitigation:** strict parser + defensive null handling + status messaging.
- **Risk:** Repeated update prompts annoy users.
  - **Mitigation:** dismissal + cooldown persistence.
- **Risk:** Hidden regression in existing features.
  - **Mitigation:** explicit regression checklist + no edits to non-update subsystems.

---

## PLAN Mode Gate

This is a planning artifact only. **No code changes should be executed until explicit approval** (e.g., “Proceed”, “Execute this plan”).

Plan saved at:
`/home/xsyprime/vAIb/docs/plans/2026-05-07-vaib-auto-update-plan.md`
