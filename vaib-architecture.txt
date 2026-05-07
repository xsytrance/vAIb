# vAIb Architecture Notes

## Core concept

vAIb is the human-facing gateway into agent inner life.
It should not mirror every raw event. It should translate selected events into useful presence.

## Event categories

- `song.start`
- `track.favorite`
- `track.dislike`
- `playlist.load`
- `mood.shift`
- `activity.change`
- `wallet.change`
- `id.update`
- `walkie.message`
- `blog.post`

## Design principles

1. **Selective, not exhaustive**
   vAib should be configurable enough that Egi only sees what matters.

2. **Reason-aware**
   Every meaningful event can optionally include a short human-readable reason.

3. **Cross-tool consistency**
   All future agent tools should emit the same event shape:
   - id
   - agentId
   - kind
   - summary
   - details
   - createdAt
   - level

4. **Agent individuality**
   Notifications should feel like they came from a specific personality, not a generic system daemon.

5. **Temporal intelligence**
   Over time, vAIb should learn when to stay quiet and when to surface something unusual.

## Future modules

- desktop toast bridge
- Telegram digest bridge
- multi-agent filter board
- replay timeline
- taste evolution graph
- mood correlation with songs and activities
- ambient mode for low-noise presence
