# vAIb-X Service Autostart + Keepalive

This repo includes user-level systemd units to keep vAIb-X online:

- API: `4014` (`node server/api.mjs`)
- UI: `4013` (`npm run dev -- --host 0.0.0.0 --port 4013`)
- Probe timer: every 2 minutes (`scripts/vaib-ensure-up.sh`)

## Files

- `systemd/vaib-api.service`
- `systemd/vaib-ui.service`
- `systemd/vaib-probe.service`
- `systemd/vaib-probe.timer`
- `scripts/vaib-ensure-up.sh`

## Install (current user)

```bash
mkdir -p ~/.config/systemd/user
cp systemd/vaib-*.service ~/.config/systemd/user/
cp systemd/vaib-probe.timer ~/.config/systemd/user/
chmod +x scripts/vaib-ensure-up.sh
systemctl --user daemon-reload
systemctl --user enable --now vaib-api.service vaib-ui.service vaib-probe.timer
```

## Verify

```bash
systemctl --user status vaib-api.service --no-pager
systemctl --user status vaib-ui.service --no-pager
systemctl --user status vaib-probe.timer --no-pager
lsof -nP -iTCP:4013 -sTCP:LISTEN
lsof -nP -iTCP:4014 -sTCP:LISTEN
```

## Notes

- Services auto-restart on crash (`Restart=always`).
- Probe is intentionally lightweight and only performs local HTTP checks.
- No secrets are stored in the unit files or docs.
