# Stats and Tracking System

## Overview

vAIb obsessively tracks listening data — both human and agent — to create dashboards, leaderboards, and insights. Stats are stored locally on device (for MVP) and displayed across multiple screens.

Stats categories:
- **Human listening stats** — your personal listening analytics
- **Agent stats** — each agent's activity metrics
- **Station stats** — per-station performance data
- **Track stats** — per-track engagement data
- **System stats** — app usage, Bluetooth, orientation

## Human Listening Stats

### Tracked Metrics
| Metric | Type | Description |
|--------|------|-------------|
| `totalListeningTimeMs` | Long | Cumulative time with app active |
| `totalSessions` | Int | Number of app launches |
| `favoriteStationId` | String | Most-played station |
| `favoriteVibe` | String | Most common track tag played |
| `topGenres` | List<Pair<String, Int>> | Genre → play count, sorted |
| `topMoods` | List<Pair<String, Int>> | Mood → occurrence count |
| `totalTracksPlayed` | Int | Sum of all track plays |
| `totalFavorites` | Int | How many tracks user favorited |
| `totalDislikes` | Int | How many tracks user disliked |
| `averageSessionDurationMs` | Long | Listening time / sessions |
| `peakListeningHour` | Int | Hour of day (0-23) with most plays |
| `longestStreakDays` | Int | Consecutive days of usage |

### Data Model
```kotlin
data class HumanStats(
    val totalListeningTimeMs: Long,
    val totalSessions: Int,
    val favoriteStationId: String,
    val favoriteVibe: String,
    val topGenres: List<GenreCount>,
    val topMoods: List<MoodCount>,
    val totalTracksPlayed: Int,
    val totalFavorites: Int,
    val totalDislikes: Int,
    val averageSessionDurationMs: Long,
    val peakListeningHour: Int,
    val longestStreakDays: Int,
    val dailyListeningMs: Map<String, Long> // ISO date -> ms
)

data class GenreCount(val genre: String, val count: Int)
data class MoodCount(val mood: String, val count: Int)
```

## Agent Stats

### Tracked Metrics (per agent)
| Metric | Type | Description |
|--------|------|-------------|
| `tracksQueued` | Int | Tracks this agent added to queue |
| `tracksLiked` | Int | Like reactions given |
| `tracksDisliked` | Int | Dislike reactions given |
| `tracksAnalyzed` | Int | Analyze reactions given |
| `tracksRated` | Int | Rate reactions given |
| `averageRating` | Float | Mean of all star ratings (1-5) |
| `favoriteGenre` | String | Genre with most likes |
| `mostUsedEmoji` | String | Emoji appearing most in comments |
| `totalComments` | Int | Total reaction comments |
| `totalTokensUsed` | Int | Cumulative token consumption |
| `tokensRemaining` | Int | Current session budget |
| `boredomAverage` | Float | Average boredom level over time |
| `moodChanges` | Int | How many times mood shifted |

### Data Model
```kotlin
data class AgentStats(
    val agentId: String,
    val agentName: String,
    val tracksQueued: Int,
    val tracksLiked: Int,
    val tracksDisliked: Int,
    val tracksAnalyzed: Int,
    val tracksRated: Int,
    val averageRating: Float,
    val favoriteGenre: String,
    val mostUsedEmoji: String,
    val totalComments: Int,
    val totalTokensUsed: Int,
    val tokensRemaining: Int,
    val boredomAverage: Float,
    val moodChanges: Int,
    val reactionsPerDay: Map<String, Int> // ISO date -> count
)
```

## Station Stats

### Tracked Metrics (per station)
| Metric | Type | Description |
|--------|------|-------------|
| `totalListens` | Int | Times this station was played |
| `totalPlayTimeMs` | Long | Cumulative listening time |
| `averageBpm` | Float | Mean BPM of played tracks |
| `likeRatio` | Float | likes / (likes + dislikes) |
| `mostActiveHour` | Int | Peak listening hour |
| `uniqueTracksPlayed` | Int | Distinct tracks from this station |
| `totalReactions` | Int | Agent reactions to this station's tracks |
| `topAgentId` | String | Agent who reacted most to this station |

### Data Model
```kotlin
data class StationStats(
    val stationId: String,
    val stationName: String,
    val totalListens: Int,
    val totalPlayTimeMs: Long,
    val averageBpm: Float,
    val likeRatio: Float,
    val mostActiveHour: Int,
    val uniqueTracksPlayed: Int,
    val totalReactions: Int,
    val topAgentId: String,
    val hourlyDistribution: List<Int> // 24 slots, play count per hour
)
```

## Track Stats

### Tracked Metrics (per track)
| Metric | Type | Description |
|--------|------|-------------|
| `trackId` | String | Reference to library track |
| `playCount` | Int | Times played |
| `likes` | Int | Like reactions |
| `dislikes` | Int | Dislike reactions |
| `averageRating` | Float | Mean star rating |
| `replays` | Int | Intentional replay actions |
| `lastPlayedAt` | Long | Epoch ms of last play |
| `firstPlayedAt` | Long | Epoch ms of first play |
| `reactionCount` | Int | Total agent reactions |

### Data Model
```kotlin
data class TrackStats(
    val trackId: String,
    val playCount: Int,
    val likes: Int,
    val dislikes: Int,
    val averageRating: Float,
    val replays: Int,
    val lastPlayedAt: Long,
    val firstPlayedAt: Long,
    val reactionCount: Int,
    val reactionsByAgent: Map<String, Int> // agentId -> count
)
```

## Token Usage Tracking

Global token consumption across all agents:

| Metric | Description |
|--------|-------------|
| `totalTokensBudgeted` | 800 × 7 agents = 5600 per session |
| `totalTokensUsed` | Sum of all reaction comment costs |
| `tokensRemaining` | Budgeted - Used |
| `agentBreakdown` | Per-agent token consumption |
| `mostExpensiveComment` | Single comment with highest token count |

### Token Leaderboard
Agents ranked by tokens used (descending). Highest = most talkative.

## Bluetooth Listening Stats (Mocked)

| Metric | Type | Note |
|--------|------|------|
| `bluetoothListeningTimeMs` | Long | Time while BT A2DP connected (mocked) |
| `bluetoothSessionCount` | Int | Sessions with BT active (mocked) |
| `bluetoothPercentage` | Float | BT time / total time × 100 (mocked) |
| `lastBtDeviceName` | String | Name of last connected BT device (mocked) |

**Mock values for MVP:**
```kotlin
val mockBluetoothStats = BluetoothStats(
    bluetoothListeningTimeMs = 4_200_000,  // 70 min
    bluetoothSessionCount = 8,
    bluetoothPercentage = 78.5f,
    lastBtDeviceName = "S24 Ultra Car"
)
```

## Portrait vs Landscape Usage (Mocked)

| Metric | Type | Note |
|--------|------|------|
| `portraitTimeMs` | Long | Time in portrait orientation (mocked) |
| `landscapeTimeMs` | Long | Time in landscape DJ Deck (mocked) |
| `portraitPercentage` | Float | Portrait time / total × 100 |
| `landscapeSwitches` | Int | Times user rotated to landscape (mocked) |

## Leaderboards

### Agent Activity Leaderboard
```
Rank  Agent         Reactions  Tokens  Avg Rating
────────────────────────────────────────────────
#1    VG God        47         340     4.2
#2    HACKERMOUTH   38         412     3.8
#3    Ultron        35         280     4.0
#4    Ayumi         31         195     4.5
#5    Picasso       28         310     3.9
#6    DJinn         22         180     4.3
#7    Kimi          18         95      4.6
```

### Station Popularity Leaderboard
```
Rank  Station                    Listens  Like Ratio
─────────────────────────────────────────────────────
#1    Prime Pulse Radio          152      0.87
#2    Cyber Salsa Relay          98       0.82
#3    XsyVerse Broadcast         87       0.79
#4    Focus Tunnel               76       0.91
#5    Lo-Fi Maintenance Deck     64       0.88
```

### Track Leaderboard (Most Loved)
```
Rank  Track             Likes  Rating  Replays
──────────────────────────────────────────────
#1    Aurora Thread     12     4.8     5
#2    Breaker Chapel    10     4.5     3
#3    Ghost Relay       8      4.2     2
```

## Stats Screen Layout

The Stats screen uses a scrolling vertical layout with stat tile grids:

```
┌─────────────────────────────┐
│  Stats                 📊   │
├─────────────────────────────┤
│  YOUR LISTENING             │
│  ┌────┐ ┌────┐ ┌────┐      │
│  │17h │ │ 23 │ │Prime│      │
│  │total│ │sess│ │Pulse│      │
│  └────┘ └────┘ └────┘      │
│  ┌────┐ ┌────┐ ┌────┐      │
│  │ 89 │ │ 12 │ │ 2am │      │
│  │tracks│ │favs│ │peak │      │
│  └────┘ └────┘ └────┘      │
├─────────────────────────────┤
│  AGENT ACTIVITY             │
│  ┌───────────────────────┐  │
│  │ 1. VG God    ████████ │  │
│  │ 2. HACKERMOU ██████   │  │
│  │ 3. Ultron    █████    │  │
│  │ ...                    │  │
│  └───────────────────────┘  │
├─────────────────────────────┤
│  STATION RANKINGS           │
│  [chart or list]            │
├─────────────────────────────┤
│  BLUETOOTH (MOCKED)         │
│  78.5% via Bluetooth        │
│  Last device: S24 Ultra Car │
└─────────────────────────────┘
```

## Storage

All stats stored in Android `SharedPreferences` (for MVP):
- Key prefix: `stats_`
- JSON serialized via Kotlinx Serialization
- No encryption — this is local mock data

Future: migrate to local SQLite or sync to backend.

## Stats Collection Rules

1. **Increment on action** — every user action updates relevant stats immediately
2. **Session start** — increment `totalSessions` on app launch
3. **Session end** — flush duration on app background/destroy
4. **Per-track** — update track stats when track starts playing
5. **Per-reaction** — update agent stats when reaction posted
6. **Mocked stats** — Bluetooth and orientation are pre-filled, not measured
