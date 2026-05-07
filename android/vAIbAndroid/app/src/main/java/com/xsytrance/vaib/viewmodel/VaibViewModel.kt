package com.xsytrance.vaib.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import androidx.media3.common.Player
import com.xsytrance.vaib.data.AudioBackbone
import com.xsytrance.vaib.data.DemoData
import com.xsytrance.vaib.data.VaibRepository
import com.xsytrance.vaib.data.model.*
import kotlin.collections.emptyMap
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlin.math.roundToInt
import kotlin.random.Random

class VaibViewModel(application: Application) : AndroidViewModel(application) {

    private val _appState = MutableStateFlow(DemoData.getDefaultAppState())
    val appState: StateFlow<AppState> = _appState

    private val repository = VaibRepository()
    private val audioBackbone = AudioBackbone(application.applicationContext)
    private var pollingJob: Job? = null
    private var backendUrl: String = "http://192.168.1.147:4014"
    private var useDemoMode: Boolean = false
    private var pollIntervalSeconds: Int = 5
    private var pulseTicks: Int = 0
    private var consecutiveSyncFailures: Int = 0
    private var averageSyncLatencyMs: Long? = null

    private val _tasteProfiles = MutableStateFlow<Map<String, TasteProfile>>(DemoData.tasteProfiles)
    val tasteProfiles: StateFlow<Map<String, TasteProfile>> = _tasteProfiles

    private val _listeningStats = MutableStateFlow<ListeningStats>(DemoData.listeningStats)
    val listeningStats: StateFlow<ListeningStats> = _listeningStats

    private val _voiceId = MutableStateFlow("")
    val voiceId: StateFlow<String> = _voiceId

    private val _agentLiveSignals = MutableStateFlow<Map<String, AgentLiveSignal>>(emptyMap())
    val agentLiveSignals: StateFlow<Map<String, AgentLiveSignal>> = _agentLiveSignals

    private val _cockpitPressure = MutableStateFlow<Int?>(null)
    val cockpitPressure: StateFlow<Int?> = _cockpitPressure

    private val _voiceSaveState = MutableStateFlow<String?>(null)
    val voiceSaveState: StateFlow<String?> = _voiceSaveState

    private val reactionVoices = mapOf(
        "vg-god" to listOf("Signal approved. Hold formation.", "Command greenlights this lane.", "Broadcast discipline is solid."),
        "djinn" to listOf("Phase lock clean.", "Transients crisp. Synth bus aligned.", "High-BPM lane is stable."),
        "ultron" to listOf("Latency acceptable.", "Inefficiency reduced.", "Tactical mix passes."),
        "ayumi" to listOf("Cute groove. Keep it rolling ✨", "This one sparkles. Love it.", "Big city-pop heart 💖"),
        "hackermouth" to listOf("Signal goblin approves 💀", "glitch gremlin dancing 📡", "chaos clean enough 🔥")
    )

    private val reactionEmoji = mapOf(
        "vg-god" to listOf("👑", "🟡", "🎖️"),
        "djinn" to listOf("⚡", "🌀", "🎛️"),
        "ultron" to listOf("🔴", "⚙️", "🧊"),
        "ayumi" to listOf("✨", "💖", "🎧"),
        "hackermouth" to listOf("💀", "📡", "🔥")
    )

    init {
        repository.updateBaseUrl(backendUrl)
        repository.useDemoMode = useDemoMode
        bindPlayer()
        loadDemoData()
        startPolling()
        loadVoiceId()
        _appState.value.playback.currentStation?.let { playStation(it) }
    }

    private fun bindPlayer() {
        audioBackbone.bindListener(object : Player.Listener {
            override fun onIsPlayingChanged(isPlaying: Boolean) = syncPlaybackState()
            override fun onPlaybackStateChanged(playbackState: Int) = syncPlaybackState()
        })
    }

    private fun syncPlaybackState() {
        _appState.update { state ->
            val station = state.playback.currentStation
            state.copy(
                playback = state.playback.copy(
                    isPlaying = audioBackbone.isPlaying(),
                    isBuffering = audioBackbone.isBuffering(),
                    progress = audioBackbone.progress(),
                    outputMode = audioBackbone.outputMode(),
                    playbackSource = if (station != null) audioBackbone.sourceFor(station) else state.playback.playbackSource
                )
            )
        }
    }

    fun loadDemoData() {
        val now = System.currentTimeMillis()
        _appState.value = DemoData.getDefaultAppState().copy(
            connectorHealth = listOf(
                ConnectorHealth(
                    id = "backend-api",
                    name = "Backend API",
                    status = ConnectorStatus.DEGRADED,
                    lastSyncAtMillis = now,
                    lastError = "Demo mode enabled",
                    latencyMs = 0,
                    staleAfterSeconds = 20
                ),
                ConnectorHealth(
                    id = "local-state",
                    name = "Local State",
                    status = ConnectorStatus.ONLINE,
                    lastSyncAtMillis = now,
                    latencyMs = 0,
                    staleAfterSeconds = 60
                )
            ),
            syncTelemetry = SyncTelemetry(
                lastSuccessfulSyncAtMillis = now,
                lastAttemptAtMillis = now,
                consecutiveFailures = 0,
                avgLatencyMs = 0
            )
        )
        _tasteProfiles.value = DemoData.tasteProfiles
        _listeningStats.value = DemoData.listeningStats
    }

    fun refresh() {
        viewModelScope.launch {
            _appState.update { it.copy(isLoading = true, error = null) }
            val attemptStarted = System.currentTimeMillis()
            if (useDemoMode) {
                delay(250)
                val now = System.currentTimeMillis()
                registerSyncSuccess(latencyMs = now - attemptStarted, atMillis = now)
                _appState.value = DemoData.getDefaultAppState().copy(isLoading = false, isBackendConnected = true)
                applyPresencePulse(force = true)
                _appState.value.playback.currentStation?.let { playStation(it) }
                return@launch
            }
            val result = repository.fetchState()
            result.fold(
                onSuccess = { state ->
                    val now = System.currentTimeMillis()
                    registerSyncSuccess(latencyMs = now - attemptStarted, atMillis = now)
                    _appState.value = state.copy(isLoading = false, isBackendConnected = true)
                    refreshLiveSignals()
                    applyPresencePulse(force = true)
                    _appState.value.playback.currentStation?.let { playStation(it) }
                },
                onFailure = { error ->
                    val now = System.currentTimeMillis()
                    registerSyncFailure(error = error.message ?: "Unknown sync error", atMillis = now)
                    _appState.update {
                        it.copy(isLoading = false, isBackendConnected = false, error = "Backend unavailable: ${error.message}")
                    }
                }
            )
        }
    }

    fun startPolling() {
        stopPolling()
        pollingJob = viewModelScope.launch {
            while (true) {
                delay(pollIntervalSeconds * 1000L)
                pulseTicks += 1
                syncPlaybackState()
                if (!useDemoMode) {
                    val attemptStarted = System.currentTimeMillis()
                    repository.fetchState().onSuccess { state ->
                        val now = System.currentTimeMillis()
                        registerSyncSuccess(latencyMs = now - attemptStarted, atMillis = now)
                        _appState.value = state.copy(isBackendConnected = true)
                        if (pulseTicks % 2 == 0) refreshLiveSignals()
                        if (pulseTicks % 3 == 0 && Random.nextFloat() > 0.35f) applyPresencePulse(force = false)
                    }.onFailure {
                        val now = System.currentTimeMillis()
                        registerSyncFailure(error = it.message ?: "Polling sync failed", atMillis = now)
                        _appState.update { current ->
                            current.copy(
                                isBackendConnected = false,
                                connectorHealth = current.connectorHealth.map { connector ->
                                    if (connector.id == "backend-api") {
                                        connector.copy(status = ConnectorStatus.OFFLINE)
                                    } else connector
                                }
                            )
                        }
                        _agentLiveSignals.value = emptyMap()
                        _cockpitPressure.value = null
                    }
                } else {
                    _appState.update { it.copy(isBackendConnected = repository.checkConnection()) }
                    if (pulseTicks % 2 == 0 && Random.nextFloat() > 0.45f) applyPresencePulse(force = false)
                }
            }
        }
    }

    private fun refreshLiveSignals() {
        viewModelScope.launch {
            _agentLiveSignals.value = repository.fetchAgentLiveSignals()
            _cockpitPressure.value = repository.fetchCockpitPressure()
        }
    }

    private fun registerSyncSuccess(latencyMs: Long, atMillis: Long) {
        consecutiveSyncFailures = 0
        averageSyncLatencyMs = when (val prev = averageSyncLatencyMs) {
            null -> latencyMs
            else -> ((prev * 3L) + latencyMs) / 4L
        }

        _appState.update { state ->
            state.copy(
                syncTelemetry = SyncTelemetry(
                    lastSuccessfulSyncAtMillis = atMillis,
                    lastAttemptAtMillis = atMillis,
                    consecutiveFailures = consecutiveSyncFailures,
                    avgLatencyMs = averageSyncLatencyMs
                ),
                connectorHealth = listOf(
                    ConnectorHealth(
                        id = "backend-api",
                        name = "Backend API",
                        status = ConnectorStatus.ONLINE,
                        lastSyncAtMillis = atMillis,
                        latencyMs = latencyMs,
                        staleAfterSeconds = 20
                    ),
                    ConnectorHealth(
                        id = "local-state",
                        name = "Local State",
                        status = ConnectorStatus.ONLINE,
                        lastSyncAtMillis = atMillis,
                        latencyMs = 0,
                        staleAfterSeconds = 60
                    )
                )
            )
        }
    }

    private fun registerSyncFailure(error: String, atMillis: Long) {
        consecutiveSyncFailures += 1
        val backendStatus = if (consecutiveSyncFailures >= 3) ConnectorStatus.OFFLINE else ConnectorStatus.DEGRADED
        _appState.update { state ->
            val prevSuccess = state.syncTelemetry.lastSuccessfulSyncAtMillis
            state.copy(
                syncTelemetry = state.syncTelemetry.copy(
                    lastAttemptAtMillis = atMillis,
                    consecutiveFailures = consecutiveSyncFailures,
                    avgLatencyMs = averageSyncLatencyMs
                ),
                connectorHealth = listOf(
                    ConnectorHealth(
                        id = "backend-api",
                        name = "Backend API",
                        status = backendStatus,
                        lastSyncAtMillis = prevSuccess,
                        latencyMs = averageSyncLatencyMs,
                        lastError = error,
                        staleAfterSeconds = 20
                    ),
                    ConnectorHealth(
                        id = "local-state",
                        name = "Local State",
                        status = ConnectorStatus.ONLINE,
                        lastSyncAtMillis = atMillis,
                        latencyMs = 0,
                        staleAfterSeconds = 60
                    )
                )
            )
        }
    }

    private fun applyPresencePulse(force: Boolean) {
        val current = _appState.value
        if (current.queue.isEmpty() || current.stations.isEmpty()) return

        val updatedStations = current.stations.map { station ->
            val delta = if (station.isLive) Random.nextInt(-1, 3) else Random.nextInt(-1, 2)
            station.copy(listeners = (station.listeners + delta).coerceIn(0, 220))
        }

        val switchedStation = if (force || Random.nextFloat() > 0.80f) {
            updatedStations.filter { it.isLive }.randomOrNull() ?: updatedStations.first()
        } else {
            current.playback.currentStation ?: updatedStations.first()
        }

        val pickedAgent = current.agents.filter { it.currentStationId == switchedStation.id }.randomOrNull()
            ?: current.agents.randomOrNull() ?: return
        val pickedTrack = current.queue.randomOrNull() ?: return
        val voice = reactionVoices[pickedAgent.id]?.randomOrNull() ?: "Signal is live."
        val emojis = reactionEmoji[pickedAgent.id]?.shuffled()?.take(Random.nextInt(1, 3)) ?: listOf("🎧")

        val reactionPool = current.reactions.toMutableList()
        if (force || Random.nextFloat() > 0.40f) {
            reactionPool.add(
                0,
                Reaction(
                    id = "rx-live-${System.currentTimeMillis()}",
                    trackId = pickedTrack.id,
                    stationId = switchedStation.id,
                    agentId = pickedAgent.id,
                    type = if (Random.nextFloat() > 0.3f) "like" else "neutral",
                    rating = Random.nextInt(3, 6),
                    emojis = emojis,
                    comment = voice,
                    estimatedTokens = Random.nextInt(16, 48),
                    createdAt = "now"
                )
            )
            if (reactionPool.size > 24) reactionPool.removeLast()
        }

        val queuePool = current.queue.toMutableList()
        if (Random.nextFloat() > 0.60f) {
            val seed = DemoData.tracks.random()
            queuePool.add(
                0,
                QueueItem(
                    id = "qi-live-${System.currentTimeMillis()}",
                    title = seed.title,
                    artist = seed.artist,
                    requestedBy = pickedAgent.name,
                    stationId = switchedStation.id,
                    mood = switchedStation.vibe,
                    bpm = seed.bpm,
                    duration = seed.length,
                    agentReactions = Random.nextInt(0, 3),
                    likes = Random.nextInt(0, 8),
                    dislikes = Random.nextInt(0, 3),
                    addedAt = "now"
                )
            )
            if (queuePool.size > 28) queuePool.removeLast()
        }

        _appState.value = current.copy(
            playback = current.playback.copy(
                currentStation = switchedStation,
                currentTrack = DemoData.tracks.random(),
                outputMode = audioBackbone.outputMode()
            ),
            stations = updatedStations,
            queue = queuePool,
            reactions = reactionPool,
            events = current.events.take(20)
        )

        updateStatsPulse(switchedStation.name, pickedAgent.name)
    }

    private fun updateStatsPulse(stationName: String, agentName: String) {
        _listeningStats.update { stats ->
            val total = (stats.totalListeningMinutes + Random.nextInt(1, 4)).coerceAtMost(1440)
            val sessions = (stats.sessionsToday + if (Random.nextFloat() > 0.92f) 1 else 0).coerceAtMost(24)
            ListeningStats(
                totalListeningMinutes = total,
                sessionsToday = sessions,
                mostPlayedStation = stationName,
                favoriteVibe = _appState.value.playback.currentStation?.vibe ?: stats.favoriteVibe,
                topBpmZone = _appState.value.playback.currentStation?.bpmRange ?: stats.topBpmZone,
                agentLeaderboard = stats.agentLeaderboard.map { a ->
                    if (a.agentName == agentName) a.copy(
                        tracksQueued = a.tracksQueued + if (Random.nextFloat() > 0.55f) 1 else 0,
                        tracksLiked = a.tracksLiked + if (Random.nextFloat() > 0.3f) 1 else 0,
                        averageRating = ((a.averageRating * 0.85f + 4.4f * 0.15f) * 10).roundToInt() / 10f
                    ) else a
                },
                tokenUsageByAgent = stats.tokenUsageByAgent.map { t ->
                    val bump = if (t.agentName == agentName) Random.nextInt(4, 16) else Random.nextInt(0, 4)
                    t.copy(tokensUsed = (t.tokensUsed + bump).coerceAtMost(t.tokensBudget))
                },
                stationStats = stats.stationStats.map { s ->
                    val drift = Random.nextInt(0, 3)
                    if (s.stationName == stationName) s.copy(totalListens = s.totalListens + drift + 1) else s.copy(totalListens = s.totalListens + drift)
                }
            )
        }
    }

    fun playStation(station: Station) {
        audioBackbone.playStation(station)
        _appState.update {
            it.copy(
                playback = it.playback.copy(
                    currentStation = station,
                    isBuffering = true,
                    playbackSource = audioBackbone.sourceFor(station),
                    outputMode = audioBackbone.outputMode()
                )
            )
        }
    }

    fun stopPolling() {
        pollingJob?.cancel()
        pollingJob = null
    }

    fun setBackendUrl(url: String) {
        backendUrl = url
        repository.updateBaseUrl(url)
    }

    fun setDemoMode(enabled: Boolean) {
        useDemoMode = enabled
        repository.useDemoMode = enabled
        if (enabled) loadDemoData() else refresh()
    }

    fun setPollInterval(seconds: Int) {
        pollIntervalSeconds = seconds.coerceIn(2, 30)
        startPolling()
    }

    fun loadVoiceId() {
        viewModelScope.launch {
            val fetched = repository.fetchVoiceId() ?: ""
            _voiceId.value = fetched
            _voiceSaveState.value = null
        }
    }

    fun saveVoiceId(voiceId: String) {
        val clean = voiceId.trim()
        _voiceSaveState.value = "saving"
        viewModelScope.launch {
            val ok = repository.saveVoiceId(clean)
            if (ok) {
                _voiceId.value = clean
                _voiceSaveState.value = "saved"
            } else {
                _voiceSaveState.value = "error"
            }
        }
    }

    fun clearVoiceSaveState() {
        _voiceSaveState.value = null
    }

    fun togglePlayPause() {
        audioBackbone.togglePlayPause()
        syncPlaybackState()
    }

    fun setVolume(volume: Int) {
        _appState.update { currentState ->
            currentState.copy(playback = currentState.playback.copy(volume = volume.coerceIn(0, 100)))
        }
    }

    fun selectStation(station: Station) {
        _appState.update { currentState ->
            currentState.copy(playback = currentState.playback.copy(currentStation = station))
        }
        playStation(station)
        updateStatsPulse(station.name, station.hostAgent)
    }

    override fun onCleared() {
        super.onCleared()
        stopPolling()
        audioBackbone.release()
    }
}
