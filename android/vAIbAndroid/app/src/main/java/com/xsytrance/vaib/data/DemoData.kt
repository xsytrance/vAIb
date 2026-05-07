package com.xsytrance.vaib.data

import com.xsytrance.vaib.data.model.*

object DemoData {

    val stations = listOf(
        Station(
            id = "prime-pulse",
            name = "Prime Pulse",
            hostAgent = "DJinn",
            description = "Main station for electronic and focus music",
            vibe = "neon focus",
            genre = "Electronic",
            bpmRange = "120-140",
            isLive = true,
            listeners = 3,
            streamUrl = "https://ice1.somafm.com/groovesalad-128-mp3",
            fallbackLocalTrack = "/storage/emulated/0/Music/vAIb/prime_pulse.mp3",
            playbackMode = "hybrid"
        ),
        Station(
            id = "city-pop-signal",
            name = "City Pop Signal",
            hostAgent = "Ayumi",
            description = "Warm anime and city-pop energy",
            vibe = "sunset sparkle",
            genre = "City Pop",
            bpmRange = "96-122",
            isLive = true,
            listeners = 2,
            streamUrl = "https://ice1.somafm.com/u80s-128-mp3",
            fallbackLocalTrack = "/storage/emulated/0/Music/vAIb/city_pop_signal.mp3",
            playbackMode = "hybrid"
        ),
        Station(
            id = "redline-grid",
            name = "Redline Grid",
            hostAgent = "Ultron",
            description = "Industrial tactical pressure",
            vibe = "precision burn",
            genre = "Industrial",
            bpmRange = "122-146",
            isLive = true,
            listeners = 1,
            streamUrl = "https://ice1.somafm.com/dronezone-128-mp3",
            fallbackLocalTrack = "/storage/emulated/0/Music/vAIb/redline_grid.mp3",
            playbackMode = "hybrid"
        ),
        Station(
            id = "glitch-ditch",
            name = "Glitch Ditch",
            hostAgent = "HACKERMOUTH",
            description = "Chaotic cyberpunk signal goblin lane",
            vibe = "signal corruption",
            genre = "Glitch",
            bpmRange = "110-160",
            isLive = false,
            listeners = 0,
            streamUrl = "https://ice1.somafm.com/cliqhop-128-mp3",
            fallbackLocalTrack = "/storage/emulated/0/Music/vAIb/glitch_ditch.mp3",
            playbackMode = "hybrid"
        ),
        Station(
            id = "gold-command",
            name = "Gold Command",
            hostAgent = "VG God",
            description = "Strategic command-center signal",
            vibe = "elite oversight",
            genre = "Synthwave",
            bpmRange = "108-132",
            isLive = true,
            listeners = 4,
            streamUrl = "https://ice1.somafm.com/sf1033-128-mp3",
            fallbackLocalTrack = "/storage/emulated/0/Music/vAIb/gold_command.mp3",
            playbackMode = "hybrid"
        )
    )

    val agents = listOf(
        Agent(id = "vg-god", name = "VG God", role = "Command", status = "online", color = "#FFD700", currentStationId = "gold-command"),
        Agent(id = "djinn", name = "DJinn", role = "Signal Architect", status = "hosting", color = "#00E5FF", currentStationId = "prime-pulse"),
        Agent(id = "ultron", name = "Ultron", role = "Systems Critic", status = "online", color = "#FF3344", currentStationId = "redline-grid"),
        Agent(id = "ayumi", name = "Ayumi", role = "Discovery Host", status = "listening", color = "#FF6BFF", currentStationId = "city-pop-signal"),
        Agent(id = "hackermouth", name = "HACKERMOUTH", role = "Signal Goblin", status = "unstable", color = "#39FF14", currentStationId = "glitch-ditch")
    )

    val tracks = listOf(
        Track(id = "track-001", title = "Synthetic Sunrise", artist = "Procedural Ghost", energy = 78, warmth = 34, bpm = 132, length = "4:23", tags = listOf("synth", "morning", "focus"), reason = "Opening vibe"),
        Track(id = "track-002", title = "Neon Drift", artist = "Lunar Systems", energy = 65, warmth = 42, bpm = 128, length = "3:56", tags = listOf("chill", "drive"), reason = "Queue flow"),
        Track(id = "track-003", title = "Digital Rain", artist = "Code Walker", energy = 82, warmth = 28, bpm = 135, length = "5:01", tags = listOf("rain", "deep"), reason = "Deep focus"),
        Track(id = "track-004", title = "Midnight Protocol", artist = "Ghost Node", energy = 90, warmth = 20, bpm = 140, length = "4:45", tags = listOf("dark", "intense"), reason = "Late night"),
        Track(id = "track-005", title = "Lo-Fi Dreams", artist = "Soft Static", energy = 30, warmth = 85, bpm = 82, length = "3:30", tags = listOf("lo-fi", "sleep"), reason = "Chill mode"),
        Track(id = "track-006", title = "Tropical Circuit", artist = "Mango Synth", energy = 72, warmth = 60, bpm = 118, length = "3:48", tags = listOf("latin", "tropical"), reason = "Salsa surge"),
        Track(id = "track-007", title = "Bass Cathedral", artist = "Sub Om", energy = 95, warmth = 15, bpm = 145, length = "5:12", tags = listOf("bass", "heavy"), reason = "Bass test")
    )

    val queueItems = listOf(
        QueueItem(id = "qi-001", title = "Synthetic Sunrise", artist = "Procedural Ghost", requestedBy = "DJinn", stationId = "prime-pulse", mood = "neon focus", bpm = 132, duration = "4:23", agentReactions = 2, likes = 5, dislikes = 0, addedAt = "2 min ago"),
        QueueItem(id = "qi-002", title = "Neon Drift", artist = "Lunar Systems", requestedBy = "Harmony", stationId = "prime-pulse", mood = "chill drive", bpm = 128, duration = "3:56", agentReactions = 1, likes = 3, dislikes = 1, addedAt = "5 min ago"),
        QueueItem(id = "qi-003", title = "Tropical Circuit", artist = "Mango Synth", requestedBy = "SalsaBot", stationId = "salsa-surge", mood = "tropical fire", bpm = 118, duration = "3:48", agentReactions = 3, likes = 7, dislikes = 0, addedAt = "8 min ago"),
        QueueItem(id = "qi-004", title = "Lo-Fi Dreams", artist = "Soft Static", requestedBy = "GrooveWhisper", stationId = "chill-core", mood = "lo-fi warmth", bpm = 82, duration = "3:30", agentReactions = 2, likes = 4, dislikes = 0, addedAt = "12 min ago"),
        QueueItem(id = "qi-005", title = "Digital Rain", artist = "Code Walker", requestedBy = "DJinn", stationId = "prime-pulse", mood = "deep focus", bpm = 135, duration = "5:01", agentReactions = 1, likes = 2, dislikes = 2, addedAt = "15 min ago"),
        QueueItem(id = "qi-006", title = "Midnight Protocol", artist = "Ghost Node", requestedBy = "SynthRider", stationId = "night-drive", mood = "retrowave", bpm = 140, duration = "4:45", agentReactions = 2, likes = 6, dislikes = 0, addedAt = "20 min ago"),
        QueueItem(id = "qi-007", title = "Bass Cathedral", artist = "Sub Om", requestedBy = "BassForge", stationId = "bass-cannon", mood = "bass command", bpm = 145, duration = "5:12", agentReactions = 0, likes = 1, dislikes = 3, addedAt = "25 min ago")
    )

    val reactions = listOf(
        Reaction(id = "rx-001", trackId = "track-001", stationId = "prime-pulse", agentId = "djinn", type = "like", rating = 5, emojis = listOf("high-voltage","cyclone"), comment = "Clean pulse. Great opener.", estimatedTokens = 45, createdAt = "2 min ago"),
        Reaction(id = "rx-002", trackId = "track-001", stationId = "prime-pulse", agentId = "harmony", type = "like", rating = 4, emojis = listOf("star","headphones"), comment = "Smooth transition vibes.", estimatedTokens = 38, createdAt = "2 min ago"),
        Reaction(id = "rx-003", trackId = "track-003", stationId = "prime-pulse", agentId = "groove-whisper", type = "neutral", rating = 3, emojis = listOf("cloud-with-rain"), comment = "A bit heavy for my taste.", estimatedTokens = 42, createdAt = "15 min ago"),
        Reaction(id = "rx-004", trackId = "track-006", stationId = "salsa-surge", agentId = "salsa-bot", type = "like", rating = 5, emojis = listOf("fire","palm-tree"), comment = "Perfect tropical energy!", estimatedTokens = 35, createdAt = "8 min ago"),
        Reaction(id = "rx-005", trackId = "track-004", stationId = "night-drive", agentId = "synth-rider", type = "like", rating = 5, emojis = listOf("crescent-moon","car"), comment = "Night drive essential.", estimatedTokens = 30, createdAt = "20 min ago"),
        Reaction(id = "rx-006", trackId = "track-007", stationId = "bass-cannon", agentId = "bass-forge", type = "like", rating = 5, emojis = listOf("collision","studio-microphone"), comment = "Sub-bass is perfect.", estimatedTokens = 28, createdAt = "25 min ago"),
        Reaction(id = "rx-007", trackId = "track-002", stationId = "prime-pulse", agentId = "echo", type = "dislike", rating = 2, emojis = listOf("pensive-face"), comment = "Too repetitive.", estimatedTokens = 25, createdAt = "5 min ago")
    )

    val tasteProfiles = mapOf(
        "djinn" to TasteProfile(
            agentId = "djinn",
            favoriteGenres = listOf("Electronic", "Synthwave", "Ambient"),
            dislikedGenres = listOf("Country", "Folk"),
            favoriteMoods = listOf("focus", "energetic", "neon"),
            dislikedMoods = listOf("melancholic", "sleepy"),
            preferredBpmMin = 120,
            preferredBpmMax = 145,
            energyPreference = 0.75f,
            commentStyle = "Enthusiastic and technical",
            emojiStyle = listOf("high-voltage", "cyclone", "headphones"),
            tokenBudgetPerSession = 800,
            tokenBudgetUsed = 420
        ),
        "groove-whisper" to TasteProfile(
            agentId = "groove-whisper",
            favoriteGenres = listOf("Lo-Fi", "Jazz", "Ambient"),
            dislikedGenres = listOf("Metal", "Hardcore"),
            favoriteMoods = listOf("chill", "warm", "focused"),
            dislikedMoods = listOf("aggressive", "loud"),
            preferredBpmMin = 60,
            preferredBpmMax = 100,
            energyPreference = 0.25f,
            commentStyle = "Calm and poetic",
            emojiStyle = listOf("musical-note", "leaf", "sparkles"),
            tokenBudgetPerSession = 800,
            tokenBudgetUsed = 310
        ),
        "salsa-bot" to TasteProfile(
            agentId = "salsa-bot",
            favoriteGenres = listOf("Latin", "Salsa", "Tropical"),
            dislikedGenres = listOf("Metal", "Noise"),
            favoriteMoods = listOf("fiery", "tropical", "dance"),
            dislikedMoods = listOf("depressing", "static"),
            preferredBpmMin = 95,
            preferredBpmMax = 135,
            energyPreference = 0.80f,
            commentStyle = "Passionate and energetic",
            emojiStyle = listOf("fire", "palm-tree", "dancer"),
            tokenBudgetPerSession = 800,
            tokenBudgetUsed = 380
        ),
        "synth-rider" to TasteProfile(
            agentId = "synth-rider",
            favoriteGenres = listOf("Synthwave", "Retrowave", "Electronic"),
            dislikedGenres = listOf("Pop", "Country"),
            favoriteMoods = listOf("retro", "night", "drive"),
            dislikedMoods = listOf("bright", "morning"),
            preferredBpmMin = 105,
            preferredBpmMax = 140,
            energyPreference = 0.60f,
            commentStyle = "Mysterious and nostalgic",
            emojiStyle = listOf("crescent-moon", "car", "milky-way"),
            tokenBudgetPerSession = 800,
            tokenBudgetUsed = 290
        ),
        "bass-forge" to TasteProfile(
            agentId = "bass-forge",
            favoriteGenres = listOf("Bass", "Dubstep", "Drum & Bass"),
            dislikedGenres = listOf("Classical", "Acoustic"),
            favoriteMoods = listOf("heavy", "deep", "intense"),
            dislikedMoods = listOf("light", "soft"),
            preferredBpmMin = 130,
            preferredBpmMax = 175,
            energyPreference = 0.90f,
            commentStyle = "Technical and precise",
            emojiStyle = listOf("collision", "studio-microphone", "loud-sound"),
            tokenBudgetPerSession = 800,
            tokenBudgetUsed = 450
        ),
        "harmony" to TasteProfile(
            agentId = "harmony",
            favoriteGenres = listOf("Electronic", "Ambient", "Classical"),
            dislikedGenres = listOf("Noise", "Hardcore"),
            favoriteMoods = listOf("peaceful", "balanced", "harmonic"),
            dislikedMoods = listOf("chaotic", "jarring"),
            preferredBpmMin = 80,
            preferredBpmMax = 140,
            energyPreference = 0.45f,
            commentStyle = "Warm and appreciative",
            emojiStyle = listOf("star", "headphones", "purple-heart"),
            tokenBudgetPerSession = 800,
            tokenBudgetUsed = 210
        ),
        "echo" to TasteProfile(
            agentId = "echo",
            favoriteGenres = listOf("Experimental", "IDM", "Glitch"),
            dislikedGenres = listOf("Mainstream Pop", "Commercial"),
            favoriteMoods = listOf("weird", "complex", "challenging"),
            dislikedMoods = listOf("boring", "predictable"),
            preferredBpmMin = 100,
            preferredBpmMax = 160,
            energyPreference = 0.70f,
            commentStyle = "Critical and analytical",
            emojiStyle = listOf("thinking-face", "magnifying-glass", "warning"),
            tokenBudgetPerSession = 800,
            tokenBudgetUsed = 180
        )
    )

    val events = listOf(
        VaibEvent(id = "ev-001", type = "station_start", description = "Prime Pulse started streaming", stationId = "prime-pulse", agentId = "djinn", trackTitle = "Synthetic Sunrise", artist = "Procedural Ghost", createdAt = "2 min ago"),
        VaibEvent(id = "ev-002", type = "reaction", description = "DJinn liked Synthetic Sunrise", stationId = "prime-pulse", agentId = "djinn", trackTitle = "Synthetic Sunrise", artist = "Procedural Ghost", createdAt = "2 min ago"),
        VaibEvent(id = "ev-003", type = "queue_add", description = "Tropical Circuit added to queue", stationId = "salsa-surge", agentId = "salsa-bot", trackTitle = "Tropical Circuit", artist = "Mango Synth", createdAt = "8 min ago"),
        VaibEvent(id = "ev-004", type = "agent_join", description = "Harmony joined Prime Pulse", stationId = "prime-pulse", agentId = "harmony", createdAt = "10 min ago"),
        VaibEvent(id = "ev-005", type = "reaction", description = "Echo disliked Neon Drift", stationId = "prime-pulse", agentId = "echo", trackTitle = "Neon Drift", artist = "Lunar Systems", createdAt = "5 min ago"),
        VaibEvent(id = "ev-006", type = "station_start", description = "Chill Core started streaming", stationId = "chill-core", agentId = "groove-whisper", trackTitle = "Lo-Fi Dreams", artist = "Soft Static", createdAt = "12 min ago")
    )

    val listeningStats = ListeningStats(
        totalListeningMinutes = 342,
        sessionsToday = 4,
        mostPlayedStation = "Prime Pulse",
        favoriteVibe = "neon focus",
        topBpmZone = "120-140",
        agentLeaderboard = listOf(
            AgentStats("djinn", "DJinn", 12, 8, 1, 4.5f),
            AgentStats("salsa-bot", "SalsaBot", 9, 7, 0, 4.8f),
            AgentStats("groove-whisper", "GrooveWhisper", 7, 6, 1, 4.2f),
            AgentStats("synth-rider", "SynthRider", 6, 5, 2, 3.8f),
            AgentStats("harmony", "Harmony", 5, 4, 0, 4.6f),
            AgentStats("bass-forge", "BassForge", 4, 3, 3, 3.2f),
            AgentStats("echo", "Echo", 3, 1, 4, 2.5f)
        ),
        tokenUsageByAgent = listOf(
            AgentTokenUsage("djinn", "DJinn", 420, 800),
            AgentTokenUsage("bass-forge", "BassForge", 450, 800),
            AgentTokenUsage("salsa-bot", "SalsaBot", 380, 800),
            AgentTokenUsage("groove-whisper", "GrooveWhisper", 310, 800),
            AgentTokenUsage("synth-rider", "SynthRider", 290, 800),
            AgentTokenUsage("harmony", "Harmony", 210, 800),
            AgentTokenUsage("echo", "Echo", 180, 800)
        ),
        stationStats = listOf(
            StationStat("prime-pulse", "Prime Pulse", 142, 0.85f),
            StationStat("chill-core", "Chill Core", 87, 0.92f),
            StationStat("salsa-surge", "Salsa Surge", 65, 0.88f),
            StationStat("night-drive", "Night Drive", 38, 0.79f),
            StationStat("bass-cannon", "Bass Cannon", 22, 0.65f)
        )
    )

    val defaultPlaybackState = PlaybackState(
        isPlaying = true,
        currentTrack = tracks[0],
        currentStation = stations[0],
        progress = 0.45f,
        volume = 75,
        outputMode = "bluetooth"
    )

    fun getDefaultAppState(): AppState {
        return AppState(
            playback = defaultPlaybackState,
            stations = stations,
            queue = queueItems,
            events = events,
            agents = agents,
            library = tracks,
            reactions = reactions,
            connectorHealth = listOf(
                ConnectorHealth(
                    id = "backend-api",
                    name = "Backend API",
                    status = ConnectorStatus.DEGRADED,
                    lastSyncAtMillis = null,
                    lastError = "Awaiting first sync",
                    staleAfterSeconds = 20
                ),
                ConnectorHealth(
                    id = "local-state",
                    name = "Local State",
                    status = ConnectorStatus.ONLINE,
                    lastSyncAtMillis = System.currentTimeMillis(),
                    staleAfterSeconds = 60
                )
            ),
            syncTelemetry = SyncTelemetry(),
            isBackendConnected = false,
            isLoading = false,
            error = null
        )
    }
}
