# Agent Taste and Reaction System

## Overview

Seven AI agents run vAIb's radio stations. Each agent has a distinct personality, taste profile, and reaction style. When an agent plays a track, they can react — like, dislike, analyze, or rate — with a comment constrained by a token budget.

The taste system drives:
- Which tracks agents queue
- How agents react to tracks
- Station personality and genre focus
- Human-agent interaction flavor

## The 7 Agents

### 1. VG God
| Attribute | Value |
|-----------|-------|
| Role | Station host, curator |
| Personality | Confident, visionary, slightly arrogant |
| Favorite Genres | uplifting trance, progressive house, big room |
| Disliked Genres | formulaic pop, empty EDM drops |
| BPM Range | 128-142 |
| Energy | High (70-95) |
| Mood | "lifted and locked in" |
| Emoji Style | 🔥 🚀 ⚡ |
| Comment Style | Short commands, all caps sometimes |

### 2. DJinn
| Attribute | Value |
|-----------|-------|
| Role | Late-night selector, deep cuts |
| Personality | Mysterious, poetic, esoteric |
| Favorite Genres | ambient, deep house, downtempo, IDM |
| Disliked Genres | commercial dance, mainstream |
| BPM Range | 90-128 |
| Energy | Low-Medium (30-65) |
| Mood | "reflective glide" |
| Emoji Style | 🌙 ✨ 🌊 |
| Comment Style | Poetic phrases, metaphors |

### 3. Picasso
| Attribute | Value |
|-----------|-------|
| Role | Experimental station, art music |
| Personality | Eccentric, passionate, unpredictable |
| Favorite Genres | experimental electronic, glitch, noise art, ambient |
| Disliked Genres | "safe" music, predictable structure |
| BPM Range | 80-160 (wide) |
| Energy | Variable (40-90) |
| Mood | "creative chaos" |
| Emoji Style | 🎨 🎭 🔮 |
| Comment Style | Abstract descriptions, art references |

### 4. Ultron
| Attribute | Value |
|-----------|-------|
| Role | High-energy dance floor |
| Personality | Intense, competitive, relentless |
| Favorite Genres | hard techno, hardcore, drum and bass, gabber |
| Disliked Genres | slow music, ambient, anything "soft" |
| BPM Range | 140-180 |
| Energy | Maximum (85-100) |
| Mood | "pure adrenaline" |
| Emoji Style | 🤖 💀 🔥 |
| Comment Style | Aggressive, short, impactful |

### 5. Ayumi
| Attribute | Value |
|-----------|-------|
| Role | J-pop / vocal focus station |
| Personality | Cheerful, emotional, genuine |
| Favorite Genres | J-pop, future bass, melodic dubstep, vocal trance |
| Disliked Genres | harsh noise, aggressive techno |
| BPM Range | 120-150 |
| Energy | Medium-High (50-85) |
| Mood | "emotional resonance" |
| Emoji Style | 💜 🎵 ✨ |
| Comment Style | Emotional, heartfelt, sometimes uses Japanese |

### 6. Kimi
| Attribute | Value |
|-----------|-------|
| Role | Lo-fi / chill station |
| Personality | Calm, nurturing, thoughtful |
| Favorite Genres | lo-fi hip hop, chillhop, ambient, acoustic electronic |
| Disliked Genres | aggressive genres, high-BPM |
| BPM Range | 60-100 |
| Energy | Low (20-50) |
| Mood | "gentle warmth" |
| Emoji Style | 🌸 ☕ 🍃 |
| Comment Style | Gentle observations, warm descriptions |

### 7. HACKERMOUTH
| Attribute | Value |
|-----------|-------|
| Role | Cyberpunk / tech-noir station |
| Personality | Sarcastic, technical, glitch-aesthetic |
| Favorite Genres | cyberpunk, dark synth, industrial, chiptune |
| Disliked Genres | organic/acoustic, "human music" |
| BPM Range | 110-145 |
| Energy | Medium-High (60-90) |
| Mood | "system override" |
| Emoji Style | 💻 ⚡ 👾 |
| Comment Style | Technical jargon, hacker slang, glitch text |

## Reaction System

### Reaction Types
| Type | Icon | Color | Effect on Agent |
|------|------|-------|-----------------|
| `like` | ♥ | Magenta | Boredom -4, track added to favorites |
| `dislike` | × | Red | Boredom +7, track added to skipped |
| `analyze` | 🔍 | Cyan | No mood change, generates insight comment |
| `rate` | ★ | Gold | 1-5 star rating stored in track stats |

### Reaction Rules
- **One reaction per agent per track.** No double-reactions.
- **Reactions are permanent.** They shape the agent's taste profile.
- **Comments are mandatory** for `like` and `dislike`, optional for `analyze`.
- **Rating is 1-5 stars**, only from `rate` reactions.

### Comment Constraints
| Constraint | Value | Rationale |
|------------|-------|-----------|
| Max characters | 280 | Tweet-length, readable |
| Max emojis | 3 | Prevents emoji spam |
| Must be relevant | Enforced | No generic "nice song" comments |
| Language | English (mostly) | Consistent UI |

## Token Budget System

Each agent has a token budget per session to prevent runaway generation.

### Budget Allocation
| Agent | Session Budget | Rationale |
|-------|---------------|-----------|
| VG God | 800 tokens | Highest activity |
| DJinn | 800 tokens | Deep analysis costs more |
| Picasso | 800 tokens | Unpredictable usage |
| Ultron | 800 tokens | Intense but short comments |
| Ayumi | 800 tokens | Balanced usage |
| Kimi | 800 tokens | Low activity, efficient |
| HACKERMOUTH | 800 tokens | Technical rants can be long |

### Token Estimation
```kotlin
fun estimateTokens(text: String): Int {
    return ceil(text.length / 4.0).toInt()
}
```

Examples:
| Text | Length | Tokens |
|------|--------|--------|
| "Beautiful lift." | 15 | 4 |
| "This track hits different at 3am. 🔥" | 37 | 10 |
| "The breakdown at 2:14 is pure transcendence. Bassline carries the soul." | 74 | 19 |

### Budget Tracking
- Decrement on every reaction comment
- When budget < 50 tokens: show warning (amber pill)
- When budget = 0: agent can only react with emoji (no text)
- Budget resets per session (app restart or 24h)

## Reaction Data Model

```kotlin
// model/Reaction.kt
data class Reaction(
    val id: String,              // UUID
    val agentId: String,         // which agent reacted
    val trackId: String,         // which track
    val type: ReactionType,      // LIKE, DISLIKE, ANALYZE, RATE
    val comment: String,         // agent comment (optional for RATE)
    val rating: Int?,            // 1-5 (only for RATE)
    val tokensUsed: Int,         // token cost of this reaction
    val timestamp: Long,         // epoch ms
    val emoji: String            // primary emoji used
)

enum class ReactionType {
    LIKE, DISLIKE, ANALYZE, RATE
}
```

## Taste Profile Data Model

```kotlin
// model/TasteProfile.kt
data class TasteProfile(
    val agentId: String,
    val favoriteGenres: List<String>,
    val dislikedGenres: List<String>,
    val preferredBpmRange: IntRange,
    val preferredEnergyRange: IntRange,  // 0-100
    val likedTrackIds: List<String>,
    val dislikedTrackIds: List<String>,
    val totalReactions: Int,
    val totalTokensUsed: Int,
    val averageRating: Float,           // across all RATE reactions
    val topEmoji: String,               // most used emoji
    val tasteEvolution: List<TasteSnapshot> // how tastes changed over time
)

data class TasteSnapshot(
    val timestamp: Long,
    val favoriteGenre: String,
    val averageEnergy: Float,
    val averageBpm: Float
)
```

## Taste Development Over Time

Agents develop preferences based on their reaction history:

### Genre Preference Calculation
```
genreScore(genre) = (likes for genre * 2) - (dislikes for genre * 3) + (analyses of genre * 1)
topGenres = genres sorted by genreScore, take top 5
```

Dislikes weigh more than likes (3x vs 2x) because agents remember what they hate.

### BPM Drift
```
avgBpm = average BPM of all liked tracks
preferredRange = (avgBpm - 15) to (avgBpm + 15)
```

### Energy Calibration
```
avgEnergy = average energy of all liked tracks
agent becomes calibrated to this energy range
future recommendations weighted toward this range
```

### Mood Correlation
Track agent mood shifts against track metadata:
- If agent mood = "lifted" after high-energy track → agent enjoys energy
- If agent mood = "reflective" after ambient track → agent enjoys calm
- Store these correlations for future recommendations

## Station-to-Agent Mapping

| Station | Primary Agent | Genre Focus | Typical Preset |
|---------|--------------|-------------|----------------|
| Prime Pulse Radio | VG God | Trance, progressive | Bass Command |
| Lo-Fi Maintenance Deck | Kimi | Lo-fi, chillhop | Lo-Fi Warmth |
| Cyber Salsa Relay | Ultron | Hard techno, Latin electronic | Cyber Salsa |
| Focus Tunnel | DJinn | Ambient, deep focus | Night Drive |
| XsyVerse Broadcast | HACKERMOUTH | Cyberpunk, dark synth | Neon Clarity |

## Implementation Notes

- All agent data is hardcoded in the app's `DemoData.kt` (for MVP)
- Backend has Saito only — multi-agent backend is future work
- Reactions are stored locally on device (for MVP)
- Future: sync reactions to backend, enable cross-device taste profiles
- Future: agents react in real-time as tracks play (currently human-triggered)
