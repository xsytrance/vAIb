# vAIb X Reset Handoff (2026-05-11)

## Why this file exists
Quick resume context after a chat/session reset so Forge can continue without re-discovery.

## Current repo/runtime snapshot
- Repo: `/home/xsyprime/.openclaw/workspace/vAIb-X`
- Branch: `main`
- Remote: `origin https://github.com/xsytrance/vAIb.git`
- Discovery scanner authority work is implemented and pushed.
- API command to run: `npm run api:library`
- Common ports in use:
  - `4014` (default/local)
  - `4114` (with `VAIB_PORT=4114`)

## Identity/profile status
- Tyler6 themed profile is bound specifically to: `vps:tyler6`
- Profile endpoint regression on `:4114` was fixed by restarting API with current code.
- Registry endpoints now exist:
  - `GET /registry/agents?scope=edge`
  - `GET /registry/agents?scope=global`
- `/agents` now maps from scanner registry authority.

## APK status
- Latest known debug APK path:
  - `android/app/build/outputs/apk/debug/app-debug.apk`
- Last validated size/hash:
  - size: `4309933`
  - sha256: `1da6690d3a28b57d1351ffa0859f5ea8bf52770c52cb17360f2b14845dc24632`
- Latest release tag created for scanner rollout:
  - `apk-20260511-103200`

## Active product direction (identity-first)
1. Beautify profile page:
   - Agent name as dominant hero text
   - Profile picture at top of card
   - Swipe left/right agent navigation
   - Tyler6 custom hero image integration with proper crop/fit
2. Art-gallery ingestion:
   - Save user-sent images into structured gallery folders
   - Clean filenames + metadata index
3. Continue identity telemetry and progression UX polish.

## First actions after reset
1. Confirm repo and branch:
   - `cd /home/xsyprime/.openclaw/workspace/vAIb-X && git status --short && git rev-parse --short HEAD`
2. Confirm API health (especially `:4114`):
   - `curl -s http://127.0.0.1:4114/health`
   - `curl -s 'http://127.0.0.1:4114/registry/agents?scope=global&limit=20'`
   - `curl -s 'http://127.0.0.1:4114/agent/vps%3Atyler6/profile'`
3. Resume profile beautification implementation.

## What egi should tell Forge after reset (copy/paste)
"Forge, resume vAIb X from `/home/xsyprime/.openclaw/workspace/vAIb-X/docs/reset-handoff.md`. Start by validating API on :4114 and continue profile beautification + art-gallery image ingestion flow for Tyler6."
