package com.xsytrance.vaib.viewmodel

import android.app.Application
import android.content.Context
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import androidx.media3.common.Player
import com.xsytrance.vaib.data.AudioBackbone
import com.xsytrance.vaib.data.AutomationEngine
import com.xsytrance.vaib.data.ChangeFeedEngine
import com.xsytrance.vaib.data.ConflictResolver
import com.xsytrance.vaib.data.DemoData
import com.xsytrance.vaib.data.FreshnessScorer
import com.xsytrance.vaib.data.RefreshScheduler
import com.xsytrance.vaib.data.VaibRepository
import com.xsytrance.vaib.data.WeeklyRefreshOps
import com.xsytrance.vaib.data.model.*
import com.xsytrance.vaib.data.tts.BroadcastSafetyMode
import com.xsytrance.vaib.data.tts.DjScriptSanitizer
import com.xsytrance.vaib.data.tts.ElevenLabsClient
import com.xsytrance.vaib.data.tts.NarrationService
import java.io.File
import java.util.Calendar
import kotlin.collections.emptyMap
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.roundToInt
import kotlin.random.Random

class VaibViewModel(application: Application) : AndroidViewModel(application) {

    private val _appState = MutableStateFlow(DemoData.getDefaultAppState())
    val appState: StateFlow<AppState> = _appState

    private val repository = VaibRepository()
    private val prefs = application.getSharedPreferences("vaib_state", Context.MODE_PRIVATE)
    private val strictModePrefKey = "strict_broadcast_mode"
    private val statsPrefKey = "listening_stats_json"
    private var elevenLabsApiKey: String = ""
    private val elevenLabsClient = ElevenLabsClient { elevenLabsApiKey }
    private val narrationService = NarrationService(
        elevenLabsClient = elevenLabsClient,
        cacheDir = File(application.cacheDir, "narration")
    )
    private val audioBackbone = AudioBackbone(application.applicationContext)
    private val refreshScheduler = RefreshScheduler()
    private val changeFeedEngine = ChangeFeedEngine()
    private val freshnessScorer = FreshnessScorer()
    private val automationEngine = AutomationEngine()
    private val conflictResolver = ConflictResolver()
    private val weeklyRefreshOps = WeeklyRefreshOps()
    private var pollingJob: Job? = null
    private var backendUrl: String = "http://100.110.224.126:4014"
    private var tailnetHostname: String = ""
    private var tailnetPort: Int = 4014
    private var useDemoMode: Boolean = false
    private var pollIntervalSeconds: Int = 5
    private var backendEndpoints: List<BackendEndpoint> = emptyList()
    private var pulseTicks: Int = 0
    private var consecutiveSyncFailures: Int = 0
    private var averageSyncLatencyMs: Long? = null
    private var currentOnAirAgentId: String? = null
    private var onAirSlotEndsAtMillis: Long = 0L
    private var onAirRecentHistory: List<String> = emptyList()
    private var pendingStationAfterInterstitial: Station? = null
    private var inInterstitial: Boolean = false

    private val _refreshMode = MutableStateFlow(RefreshMode.BALANCED)
    val refreshMode: StateFlow<RefreshMode> = _refreshMode.asStateFlow()

    private val _nextRefreshAtMillis = MutableStateFlow<Long?>(null)
    val nextRefreshAtMillis: StateFlow<Long?> = _nextRefreshAtMillis.asStateFlow()

    private val _tasteProfiles = MutableStateFlow<Map<String, TasteProfile>>(DemoData.tasteProfiles)
    val tasteProfiles: StateFlow<Map<String, TasteProfile>> = _tasteProfiles

    private val _listeningStats = MutableStateFlow<ListeningStats>(DemoData.listeningStats)
    val listeningStats: StateFlow<ListeningStats> = _listeningStats

    private val _voiceId = MutableStateFlow("")
    val voiceId: StateFlow<String> = _voiceId

    private val _agentVoiceDrafts = MutableStateFlow<Map<String, String>>(emptyMap())
    val agentVoiceDrafts: StateFlow<Map<String, String>> = _agentVoiceDrafts.asStateFlow()

    private val _djHostAgentId = MutableStateFlow<String?>(null)
    val djHostAgentId: StateFlow<String?> = _djHostAgentId.asStateFlow()

    private val _agentLiveSignals = MutableStateFlow<Map<String, AgentLiveSignal>>(emptyMap())
    val agentLiveSignals: StateFlow<Map<String, AgentLiveSignal>> = _agentLiveSignals

    private val _cockpitPressure = MutableStateFlow<Int?>(null)
    val cockpitPressure: StateFlow<Int?> = _cockpitPressure

    private val _voiceSaveState = MutableStateFlow<String?>(null)
    val voiceSaveState: StateFlow<String?> = _voiceSaveState

    private val _elevenLabsApiKeyState = MutableStateFlow("")
    val elevenLabsApiKeyState: StateFlow<String> = _elevenLabsApiKeyState.asStateFlow()

    private val _djNarrationPreviewState = MutableStateFlow<String?>(null)
    val djNarrationPreviewState: StateFlow<String?> = _djNarrationPreviewState.asStateFlow()

    private val _strictBroadcastModeState = MutableStateFlow(false)
    val strictBroadcastModeState: StateFlow<Boolean> = _strictBroadcastModeState.asStateFlow()

    private val _backendUrlState = MutableStateFlow(backendUrl)
    val backendUrlState: StateFlow<String> = _backendUrlState.asStateFlow()

    private val _tailnetHostnameState = MutableStateFlow(tailnetHostname)
    val tailnetHostnameState: StateFlow<String> = _tailnetHostnameState.asStateFlow()

    private val _tailnetPortState = MutableStateFlow(tailnetPort.toString())
    val tailnetPortState: StateFlow<String> = _tailnetPortState.asStateFlow()

    private val _changeFeed = MutableStateFlow<List<ChangeEvent>>(emptyList())
    val changeFeed: StateFlow<List<ChangeEvent>> = _changeFeed.asStateFlow()

    private val _freshnessScore = MutableStateFlow(100)
    val freshnessScore: StateFlow<Int> = _freshnessScore.asStateFlow()

    private val _automationRules = MutableStateFlow(
        listOf(
            AutomationRule(
                id = "rule-connector-offline",
                name = "Notify on connector offline",
                enabled = true,
                trigger = AutomationTriggerType.CONNECTOR_OFFLINE,
                action = AutomationActionType.LOCAL_NOTIFICATION
            ),
            AutomationRule(
                id = "rule-low-freshness",
                name = "Force refresh on low freshness",
                enabled = true,
                trigger = AutomationTriggerType.FRESHNESS_BELOW_THRESHOLD,
                action = AutomationActionType.FORCE_REFRESH,
                freshnessThreshold = 45
            ),
            AutomationRule(
                id = "rule-reaction-burst",
                name = "Pin update on activity burst",
                enabled = true,
                trigger = AutomationTriggerType.REACTION_BURST,
                action = AutomationActionType.PIN_UPDATE,
                reactionBurstThreshold = 3
            )
        )
    )
    val automationRules: StateFlow<List<AutomationRule>> = _automationRules.asStateFlow()

    private val _automationLog = MutableStateFlow<List<AutomationDecision>>(emptyList())
    val automationLog: StateFlow<List<AutomationDecision>> = _automationLog.asStateFlow()

    private val _conflicts = MutableStateFlow<List<ConflictItem>>(emptyList())
    val conflicts: StateFlow<List<ConflictItem>> = _conflicts.asStateFlow()

    private val _weeklySummary = MutableStateFlow(
        WeeklyRefreshSummary(
            generatedAtMillis = System.currentTimeMillis(),
            staleSourceCount = 0,
            unresolvedConflictCount = 0,
            lowFreshnessWindowCount = 0,
            notes = listOf("Waiting for next refresh cycle")
        )
    )
    val weeklySummary: StateFlow<WeeklyRefreshSummary> = _weeklySummary.asStateFlow()

    private var lastForceRefreshAtMillis: Long = 0L

    private var lastSnapshot: AppState? = null

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
        backendEndpoints = repository.buildDefaultEndpoints(backendUrl, tailnetHostname, tailnetPort)
        bindPlayer()
        loadDemoData()
        _strictBroadcastModeState.value = prefs.getBoolean(strictModePrefKey, false)
        hydrateListeningStatsFromPrefs()
        startPolling()
        loadVoiceId()
        _appState.value.playback.currentStation?.let { playStation(it) }
        enforceOnAirContinuity(trigger = "startup", forceRotate = true)
    }

    private fun bindPlayer() {
        audioBackbone.bindListener(object : Player.Listener {
            override fun onIsPlayingChanged(isPlaying: Boolean) = syncPlaybackState()
            override fun onPlaybackStateChanged(playbackState: Int) {
                syncPlaybackState()
                if (playbackState == Player.STATE_ENDED) {
                    if (inInterstitial) {
                        inInterstitial = false
                        val target = pendingStationAfterInterstitial
                        pendingStationAfterInterstitial = null
                        if (target != null) {
                            playStation(target)
                        } else {
                            enforceOnAirContinuity(trigger = "interstitial-ended", forceRotate = false)
                        }
                    } else {
                        enforceOnAirContinuity(trigger = "track-ended", forceRotate = false)
                    }
                }
            }
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
        syncAgentVoiceStateFromApp()
        publishSnapshot(_appState.value, now)
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
                syncAgentVoiceStateFromApp()
                enforceOnAirContinuity(trigger = "refresh-demo", forceRotate = false)
                publishSnapshot(_appState.value, now)
                applyPresencePulse(force = true)
                _appState.value.playback.currentStation?.let { playStation(it) }
                return@launch
            }
            val consensus = repository.checkConnectionAny(backendEndpoints)
            applyConnectionConsensus(consensus)
            consensus.activeEndpoint?.let { repository.updateBaseUrl(it.baseUrl) }

            val result = repository.fetchState()
            result.fold(
                onSuccess = { state ->
                    val now = System.currentTimeMillis()
                    registerSyncSuccess(latencyMs = now - attemptStarted, atMillis = now)
                    val newState = state.copy(
                        isLoading = false,
                        isBackendConnected = consensus.isConnected,
                        connectivityLabel = if (consensus.isConnected) "Connected • Tailnet" else "Offline • no endpoint healthy",
                        activeEndpointLabel = consensus.activeEndpoint?.label,
                        endpointAttempted = consensus.attempted,
                        endpointTotal = backendEndpoints.size,
                        activeEndpointLatencyMs = consensus.activeLatencyMs
                    )
                    _appState.value = newState
                    syncAgentVoiceStateFromApp()
                    enforceOnAirContinuity(trigger = "refresh", forceRotate = false)
                    publishSnapshot(newState, now)
                    refreshLiveSignals()
                    applyPresencePulse(force = true)
                    _appState.value.playback.currentStation?.let { playStation(it) }
                },
                onFailure = { error ->
                    val now = System.currentTimeMillis()
                    registerSyncFailure(error = error.message ?: "Unknown sync error", atMillis = now)
                    _appState.update {
                        it.copy(
                            isLoading = false,
                            isBackendConnected = false,
                            connectivityLabel = "Offline • no endpoint healthy",
                            error = "Backend unavailable: ${error.message}"
                        )
                    }
                    publishSnapshot(_appState.value, now)
                }
            )
        }
    }

    fun startPolling() {
        stopPolling()
        pollingJob = viewModelScope.launch {
            while (true) {
                var policy = RefreshPolicy.forMode(_refreshMode.value)
                if (policy.mode != RefreshMode.MANUAL) {
                    val clampedBase = pollIntervalSeconds.coerceAtLeast(1)
                    policy = policy.copy(baseIntervalSeconds = clampedBase, maxIntervalSeconds = maxOf(clampedBase, policy.maxIntervalSeconds))
                }
                if (policy.mode == RefreshMode.MANUAL) {
                    _nextRefreshAtMillis.value = null
                    delay(1000L)
                    syncPlaybackState()
                    continue
                }

                val waitMs = refreshScheduler.nextDelayMillis(policy, consecutiveSyncFailures)
                _nextRefreshAtMillis.value = System.currentTimeMillis() + waitMs
                delay(waitMs)

                pulseTicks += 1
                syncPlaybackState()
                enforceOnAirContinuity(trigger = "poll-tick", forceRotate = false)
                if (!useDemoMode) {
                    val attemptStarted = System.currentTimeMillis()
                    val consensus = repository.checkConnectionAny(backendEndpoints)
                    applyConnectionConsensus(consensus)
                    consensus.activeEndpoint?.let { repository.updateBaseUrl(it.baseUrl) }

                    repository.fetchState().onSuccess { state ->
                        val now = System.currentTimeMillis()
                        registerSyncSuccess(latencyMs = now - attemptStarted, atMillis = now)
                        val newState = state.copy(
                            isBackendConnected = consensus.isConnected,
                            connectivityLabel = if (consensus.isConnected) "Connected • Tailnet" else "Offline • no endpoint healthy",
                            activeEndpointLabel = consensus.activeEndpoint?.label,
                            endpointAttempted = consensus.attempted,
                            endpointTotal = backendEndpoints.size,
                            activeEndpointLatencyMs = consensus.activeLatencyMs
                        )
                        _appState.value = newState
                        enforceOnAirContinuity(trigger = "poll-sync", forceRotate = false)
                        publishSnapshot(newState, now)
                        if (pulseTicks % 2 == 0) refreshLiveSignals()
                        if (pulseTicks % 3 == 0 && Random.nextFloat() > 0.35f) applyPresencePulse(force = false)
                    }.onFailure {
                        val now = System.currentTimeMillis()
                        registerSyncFailure(error = it.message ?: "Polling sync failed", atMillis = now)
                        _appState.update { current ->
                            current.copy(
                                isBackendConnected = false,
                                connectivityLabel = "Offline • no endpoint healthy",
                                connectorHealth = current.connectorHealth.map { connector ->
                                    if (connector.id == "backend-api") {
                                        connector.copy(status = ConnectorStatus.OFFLINE)
                                    } else connector
                                }
                            )
                        }
                        _agentLiveSignals.value = emptyMap()
                        _cockpitPressure.value = null
                        publishSnapshot(_appState.value, now)
                    }
                } else {
                    _appState.update {
                        it.copy(
                            isBackendConnected = true,
                            connectivityLabel = "Connected • Demo",
                            endpointAttempted = 0,
                            endpointTotal = 0
                        )
                    }
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

    private fun publishSnapshot(newState: AppState, atMillis: Long = System.currentTimeMillis()) {
        val deltaEvents = changeFeedEngine.compute(lastSnapshot, newState, atMillis)
        if (deltaEvents.isNotEmpty()) {
            _changeFeed.update { existing -> (deltaEvents + existing).take(100) }
        }
        _freshnessScore.value = freshnessScorer.score(newState, atMillis)

        val decisions = automationEngine.evaluate(
            rules = _automationRules.value,
            events = deltaEvents,
            freshnessScore = _freshnessScore.value,
            atMillis = atMillis
        )
        if (decisions.isNotEmpty()) {
            _automationLog.update { existing -> (decisions + existing).take(120) }
            applyAutomationDecisions(decisions, atMillis)
        }

        val detectedConflicts = conflictResolver.detect(newState)
        _conflicts.value = detectedConflicts
        _weeklySummary.value = weeklyRefreshOps.generate(
            state = newState,
            conflicts = detectedConflicts,
            freshnessScore = _freshnessScore.value,
            atMillis = atMillis
        )

        lastSnapshot = newState
    }

    private fun applyAutomationDecisions(decisions: List<AutomationDecision>, atMillis: Long) {
        decisions.forEach { decision ->
            when (decision.action) {
                AutomationActionType.LOCAL_NOTIFICATION -> {
                    _appState.update { state ->
                        val row = VaibEvent(
                            id = "auto-${decision.ruleId}-${decision.atMillis}",
                            type = "automation.notify",
                            description = "[AUTO] ${decision.ruleName}: ${decision.detail}",
                            createdAt = decision.atMillis.toString()
                        )
                        state.copy(events = listOf(row) + state.events.take(19))
                    }
                }
                AutomationActionType.PIN_UPDATE -> {
                    _appState.update { state ->
                        val row = VaibEvent(
                            id = "pin-${decision.ruleId}-${decision.atMillis}",
                            type = "automation.pin",
                            description = "[PIN] ${decision.detail}",
                            createdAt = decision.atMillis.toString()
                        )
                        state.copy(events = listOf(row) + state.events.take(19))
                    }
                }
                AutomationActionType.FORCE_REFRESH -> {
                    val cooldownMs = 30_000L
                    if (atMillis - lastForceRefreshAtMillis >= cooldownMs) {
                        lastForceRefreshAtMillis = atMillis
                        refresh()
                    }
                }
            }
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
        publishSnapshot(_appState.value)

        updateStatsPulse(switchedStation.name, pickedAgent.name)
    }

    private fun enforceOnAirContinuity(trigger: String, forceRotate: Boolean) {
        val now = System.currentTimeMillis()
        val state = _appState.value
        if (state.agents.isEmpty()) return

        val needsRotation = forceRotate || currentOnAirAgentId == null || now >= onAirSlotEndsAtMillis
        val onAirAgent = if (needsRotation) pickNextOnAirAgent(state) else state.agents.firstOrNull { it.id == currentOnAirAgentId }
            ?: pickNextOnAirAgent(state)

        val selectedAgent = onAirAgent ?: return
        currentOnAirAgentId = selectedAgent.id

        if (needsRotation) {
            val bonusMinutes = computeWorkloadBonusMinutes(selectedAgent.id)
            val slotMinutes = 9 + bonusMinutes
            onAirSlotEndsAtMillis = now + (slotMinutes * 60_000L)
            onAirRecentHistory = (listOf(selectedAgent.id) + onAirRecentHistory).distinct().take(3)
        }

        val nextAgent = pickNextOnAirAgent(state, exclude = selectedAgent.id)
        val station = state.stations.firstOrNull { it.id == selectedAgent.currentStationId }
            ?: state.playback.currentStation
            ?: state.stations.firstOrNull()

        val showName = themedShowName(selectedAgent)
        val reason = buildOnAirReason(trigger, selectedAgent.name, needsRotation)
        val lineup = buildTonightLineup(state, selectedAgent.id, nextAgent?.id)

        _appState.update {
            it.copy(
                djHostAgentId = it.djHostAgentId ?: _djHostAgentId.value ?: it.agents.firstOrNull { a -> a.isDjHost }?.id,
                onAirAgentId = selectedAgent.id,
                nextOnAirAgentId = nextAgent?.id,
                onAirReason = reason,
                onAirShowName = showName,
                tonightLineup = lineup
            )
        }

        if (station != null && (needsRotation || state.playback.currentStation?.id != station.id || !audioBackbone.isPlaying())) {
            if (needsRotation) {
                playDjInterstitial(selectedAgent = selectedAgent, nextAgent = nextAgent, station = station, trigger = trigger)
            } else {
                playStation(station)
            }
            updateStatsPulse(station.name, selectedAgent.name)
        }
    }

    private fun pickNextOnAirAgent(state: AppState, exclude: String? = null): Agent? {
        val candidates = state.agents.filter { it.id != exclude }
        if (candidates.isEmpty()) return null

        val weighted = candidates.maxByOrNull { agent ->
            val leaderboard = _listeningStats.value.agentLeaderboard.firstOrNull { it.agentId == agent.id }
            val queueWeight = leaderboard?.tracksQueued ?: 0
            val recentlyUsedPenalty = if (onAirRecentHistory.contains(agent.id)) 8 else 0
            val randomLift = Random.nextInt(0, 4)
            queueWeight + randomLift - recentlyUsedPenalty
        }
        return weighted ?: candidates.random()
    }

    private fun computeWorkloadBonusMinutes(agentId: String): Int {
        val stats = _listeningStats.value.agentLeaderboard.firstOrNull { it.agentId == agentId } ?: return 0
        return when {
            stats.tracksQueued >= 20 -> 4
            stats.tracksQueued >= 12 -> 3
            stats.tracksQueued >= 6 -> 2
            stats.tracksQueued >= 3 -> 1
            else -> 0
        }
    }

    private fun buildOnAirReason(trigger: String, agentName: String, switched: Boolean): String {
        val base = when (trigger) {
            "startup" -> "Kickoff spotlight"
            "track-ended" -> "Seamless continuity"
            "poll-tick" -> "Steady groove lock"
            else -> "Agent-driven flow"
        }
        return if (switched) "$base • $agentName claimed the next slot" else "$base • $agentName holds the deck"
    }

    private fun themedShowName(agent: Agent): String {
        val themes = listOf("Neon Drift Hour", "Pulse Cathedral", "Midnight Compile", "Chaos Garden", "Signal Bloom")
        val idx = kotlin.math.abs(agent.id.hashCode()) % themes.size
        return "${themes[idx]} • ${agent.name}"
    }

    private fun buildTonightLineup(state: AppState, onAirId: String, nextId: String?): List<String> {
        val ordered = mutableListOf<String>()
        val onAir = state.agents.firstOrNull { it.id == onAirId }
        val next = state.agents.firstOrNull { it.id == nextId }
        if (onAir != null) ordered += "Now: ${onAir.name}"
        if (next != null) ordered += "Next: ${next.name}"
        state.agents.filter { it.id != onAirId && it.id != nextId }.shuffled().take(2).forEachIndexed { index, agent ->
            ordered += "Later ${index + 1}: ${agent.name}"
        }
        return ordered
    }

    private fun playDjInterstitial(selectedAgent: Agent, nextAgent: Agent?, station: Station, trigger: String) {
        val djId = _djHostAgentId.value ?: _appState.value.djHostAgentId
        val djAgent = _appState.value.agents.firstOrNull { it.id == djId } ?: selectedAgent
        val voiceId = djAgent.voiceId
        if (voiceId.isNullOrBlank()) {
            playStation(station)
            return
        }

        val scriptRaw = "Welcome to ${themedShowName(selectedAgent)}. ${selectedAgent.name} is now in control on ${station.name}. " +
            (nextAgent?.let { "Next up: ${it.name}." } ?: "Lineup is adapting live.") +
            " Trigger: $trigger. Keep it locked to vAIb."
        val mode = if (_strictBroadcastModeState.value) BroadcastSafetyMode.STRICT else BroadcastSafetyMode.BALANCED
        val safeScript = DjScriptSanitizer.sanitize(scriptRaw, mode = mode)

        viewModelScope.launch {
            val file = narrationService.synthesizeNarration(
                voiceId = voiceId,
                text = safeScript.text,
                style = "dj-interstitial",
                maxDurationSeconds = 14,
                safetyMode = mode
            )
            if (file != null) {
                pendingStationAfterInterstitial = station
                inInterstitial = true
                audioBackbone.playNarrationFile(file, announcer = djAgent.name)
            } else {
                inInterstitial = false
                pendingStationAfterInterstitial = null
                playStation(station)
            }
        }
    }

    private fun updateStatsPulse(stationName: String, agentName: String) {
        val state = _appState.value
        val agent = state.agents.firstOrNull { it.name == agentName || it.id == agentName }
        val agentId = agent?.id ?: agentName.lowercase().replace(" ", "-")
        val currentTrack = state.playback.currentTrack ?: state.library.randomOrNull()
        val durationSeconds = Random.nextInt(160, 341)
        val liked = Random.nextFloat() > 0.28f
        val disliked = !liked && Random.nextFloat() > 0.45f

        _listeningStats.update { stats ->
            val play = SongPlayRecord(
                id = "play-${System.currentTimeMillis()}-${Random.nextInt(1000, 9999)}",
                stationName = stationName,
                trackTitle = currentTrack?.title ?: "Unknown Signal",
                artist = currentTrack?.artist ?: "vAIb System",
                agentId = agentId,
                agentName = agent?.name ?: agentName,
                durationSeconds = durationSeconds,
                liked = liked,
                disliked = disliked,
                playedAtMillis = System.currentTimeMillis()
            )

            val updatedLeaderboard = stats.agentLeaderboard.map { a ->
                if (a.agentId == agentId || a.agentName == agentName) {
                    val nextQueued = a.tracksQueued + 1
                    val nextLiked = a.tracksLiked + if (liked) 1 else 0
                    val nextDisliked = a.tracksDisliked + if (disliked) 1 else 0
                    val score = (nextLiked * 5f - nextDisliked * 2f).coerceAtLeast(0f)
                    val avg = ((score / nextQueued.coerceAtLeast(1)) * 10).roundToInt() / 10f
                    a.copy(tracksQueued = nextQueued, tracksLiked = nextLiked, tracksDisliked = nextDisliked, averageRating = avg)
                } else a
            }

            val rewards = updateAgentRewards(stats.agentRewards, agentId, agent?.name ?: agentName, liked, disliked)
            val badges = computeGlobalBadges(stats.unlockedBadges, stats.totalTracksPlayed + 1, stats.totalLikes + if (liked) 1 else 0)
            val trophies = computeTrophies(stats.trophyCase, updatedLeaderboard)
            val title = computeListenerTitle(stats.totalTracksPlayed + 1, badges.size, trophies.size)
            val season = updateSeasonProgress(
                season = stats.season,
                agentId = agentId,
                agentName = agent?.name ?: agentName,
                fanScore = rewards.firstOrNull { it.agentId == agentId }?.fanScore ?: 0,
                liked = liked,
                totalTracks = stats.totalTracksPlayed + 1,
                totalLikes = stats.totalLikes + if (liked) 1 else 0
            )

            stats.copy(
                totalListeningMinutes = (stats.totalListeningMinutes + (durationSeconds / 60).coerceAtLeast(1)).coerceAtMost(24 * 60 * 30),
                sessionsToday = (stats.sessionsToday + if (Random.nextFloat() > 0.94f) 1 else 0).coerceAtMost(64),
                mostPlayedStation = stationName,
                favoriteVibe = state.playback.currentStation?.vibe ?: stats.favoriteVibe,
                topBpmZone = state.playback.currentStation?.bpmRange ?: stats.topBpmZone,
                totalTracksPlayed = stats.totalTracksPlayed + 1,
                totalPlaySeconds = stats.totalPlaySeconds + durationSeconds,
                totalLikes = stats.totalLikes + if (liked) 1 else 0,
                totalDislikes = stats.totalDislikes + if (disliked) 1 else 0,
                achievementsUnlocked = (badges.size + trophies.size),
                listenerTitle = title,
                unlockedBadges = badges,
                trophyCase = trophies,
                recentPlays = listOf(play) + stats.recentPlays.take(249),
                agentRewards = rewards,
                agentLeaderboard = updatedLeaderboard,
                tokenUsageByAgent = stats.tokenUsageByAgent.map { t ->
                    val bump = if (t.agentId == agentId || t.agentName == agentName) Random.nextInt(8, 24) else Random.nextInt(0, 5)
                    t.copy(tokensUsed = (t.tokensUsed + bump).coerceAtMost(t.tokensBudget))
                },
                stationStats = stats.stationStats.map { s ->
                    val extra = if (s.stationName == stationName) 1 else 0
                    val newListens = s.totalListens + extra
                    val newRatio = (s.likeRatio * s.totalListens + if (liked && s.stationName == stationName) 1f else 0f) /
                        newListens.coerceAtLeast(1)
                    s.copy(totalListens = newListens, likeRatio = newRatio.coerceIn(0f, 1f))
                },
                season = season
            )
        }
        persistListeningStats()
    }

    private fun updateAgentRewards(current: List<AgentReward>, agentId: String, agentName: String, liked: Boolean, disliked: Boolean): List<AgentReward> {
        val existing = current.firstOrNull { it.agentId == agentId } ?: AgentReward(agentId = agentId, agentName = agentName)
        val nextFan = (existing.fanScore + if (liked) 6 else if (disliked) -3 else 1).coerceIn(0, 999)
        val nextStreak = if (liked) existing.streak + 1 else 0
        val nextTrophies = existing.trophies + if (nextStreak > 0 && nextStreak % 5 == 0) 1 else 0
        val nextBadges = buildSet {
            addAll(existing.badges)
            if (nextFan >= 50) add("Crowd Pleaser")
            if (nextFan >= 120) add("Legendary Selector")
            if (nextStreak >= 3) add("Hot Streak")
            if (nextTrophies >= 3) add("Trophy Hunter")
        }.toList()
        val nextTitle = when {
            nextFan >= 160 -> "Stadium Oracle"
            nextFan >= 100 -> "Neon Commander"
            nextFan >= 60 -> "Vibe Captain"
            else -> "Warmup Selector"
        }
        val updated = existing.copy(title = nextTitle, trophies = nextTrophies, badges = nextBadges, fanScore = nextFan, streak = nextStreak)
        return (current.filterNot { it.agentId == agentId } + updated).sortedByDescending { it.fanScore }
    }

    private fun computeGlobalBadges(existing: List<String>, totalTracks: Int, totalLikes: Int): List<String> {
        val badges = existing.toMutableSet()
        if (totalTracks >= 1) badges += "First Spin"
        if (totalTracks >= 25) badges += "Night Shift"
        if (totalTracks >= 100) badges += "Centurion Ears"
        if (totalLikes >= 30) badges += "Taste Maker"
        if (totalLikes >= 80) badges += "Crowd Magnet"
        return badges.toList().sorted()
    }

    private fun computeTrophies(existing: List<String>, leaderboard: List<AgentStats>): List<String> {
        val trophies = existing.toMutableSet()
        val top = leaderboard.maxByOrNull { it.tracksLiked - it.tracksDisliked }
        if (top != null) trophies += "🏆 ${top.agentName} MVP Mixmaster"
        if (leaderboard.sumOf { it.tracksQueued } >= 150) trophies += "🥇 Marathon Session"
        return trophies.toList().take(12)
    }

    private fun computeListenerTitle(totalTracks: Int, badgeCount: Int, trophyCount: Int): String = when {
        totalTracks >= 180 && trophyCount >= 4 -> "Galactic Program Director"
        totalTracks >= 100 && badgeCount >= 5 -> "Legendary Wave Rider"
        totalTracks >= 50 -> "Neon Curator"
        totalTracks >= 20 -> "Signal Scout"
        else -> "Rookie Listener"
    }

    private fun updateSeasonProgress(
        season: SeasonProgress,
        agentId: String,
        agentName: String,
        fanScore: Int,
        liked: Boolean,
        totalTracks: Int,
        totalLikes: Int
    ): SeasonProgress {
        val now = System.currentTimeMillis()
        val week = Calendar.getInstance().get(Calendar.WEEK_OF_YEAR)
        val seasonId = "S$week"
        val rotatedEvent = when (week % 4) {
            0 -> "Midnight Momentum"
            1 -> "Neon Night Shift"
            2 -> "Bassline Boss Battle"
            else -> "Sunrise Comeback"
        }
        val eventGoal = when (week % 4) {
            0 -> "Reach 30 likes this week"
            1 -> "Keep like ratio above 70% for 20 tracks"
            2 -> "Hit 10 streak plays without a dislike"
            else -> "Get 15 positive crowd reactions"
        }

        val resetForWeek = season.weekOfYear != week
        val crowns = if (resetForWeek) emptyMap() else season.crownsByAgent
        val factionSeed = if (resetForWeek) FactionWarProgress(callToArmsEndsAtMillis = now + 20 * 60 * 1000L) else season.factionWar
        val baseHall = if (resetForWeek) {
            val champion = season.crownsByAgent.maxByOrNull { it.value }
            if (champion != null && champion.value > 0) {
                (listOf(
                    HallOfFameEntry(
                        seasonId = season.seasonId,
                        championAgentId = champion.key,
                        championAgentName = season.hallOfFame.firstOrNull { it.championAgentId == champion.key }?.championAgentName ?: agentName,
                        trophyTitle = "Crowned Crowd Controller",
                        fanScore = champion.value,
                        completedAtMillis = System.currentTimeMillis()
                    )
                ) + season.hallOfFame).take(20)
            } else season.hallOfFame
        } else season.hallOfFame

        val currentProgress = if (resetForWeek) 0 else season.activeEventProgress
        val target = 20
        val nextProgress = (currentProgress + if (liked) 1 else 0).coerceAtMost(target)
        val eventComplete = nextProgress >= target

        val nextCrowns = crowns.toMutableMap().apply {
            this[agentId] = (this[agentId] ?: 0) + if (liked) 2 else 1
        }

        val faction = factionForAgent(agentId)
        val callToArms = buildCallToArms(now = now, base = factionSeed)
        val nextFactionWar = factionSeed.run {
            val points = factionPoints.toMutableMap()
            val momentum = factionMomentum.toMutableMap()
            val basePoints = if (liked) 5 else 2
            val boostedPoints = if (faction == callToArms.callToArmsFaction) basePoints * callToArms.callToArmsMultiplier else basePoints
            points[faction] = (points[faction] ?: 0) + boostedPoints
            momentum[faction] = (momentum[faction] ?: 0) + if (liked) (if (faction == callToArms.callToArmsFaction) 3 else 2) else 0

            val leader = points.maxByOrNull { it.value }?.key ?: faction
            val banners = factionBannersUnlocked.toMutableSet().apply {
                if ((points[leader] ?: 0) >= 150) add("$leader Uprising")
                if ((momentum[leader] ?: 0) >= 40) add("$leader Overdrive")
                if ((points.values.sum()) >= 320) add("Tri-Faction Grand Finals")
            }

            val streaks = factionWinStreak.toMutableMap().apply {
                keys.forEach { key ->
                    this[key] = if (key == leader) (this[key] ?: 0) + 1 else 0
                }
            }

            val blurb = when (leader) {
                "Neon" -> "Neon lasers cut the skyline — crowd is glowing."
                "Orbit" -> "Orbit bends gravity and steals the late-night crowd."
                else -> "Pulse slams the floor — bassline troops are marching."
            }

            val nextRecruitmentCodes = recruitmentCodes.toMutableMap().apply {
                this["Neon"] = rotatingRecruitmentCode("Neon", week, now)
                this["Orbit"] = rotatingRecruitmentCode("Orbit", week, now)
                this["Pulse"] = rotatingRecruitmentCode("Pulse", week, now)
            }

            copy(
                activeFaction = leader,
                factionPoints = points,
                factionMomentum = momentum,
                factionBannersUnlocked = banners.toList().sorted(),
                factionWinStreak = streaks,
                currentWarBlurb = blurb,
                recruitmentCodes = nextRecruitmentCodes,
                activeCallToArms = callToArms.activeCallToArms,
                callToArmsFaction = callToArms.callToArmsFaction,
                callToArmsMultiplier = callToArms.callToArmsMultiplier,
                callToArmsEndsAtMillis = callToArms.callToArmsEndsAtMillis,
                totalRaidsTriggered = callToArms.totalRaidsTriggered
            )
        }

        val eventBadges = (if (resetForWeek) emptyList() else season.eventBadgesUnlocked).toMutableSet().apply {
            if (eventComplete) add("Event Victor • $rotatedEvent")
            if (totalLikes >= 50) add("Crowd Favorite")
            if (fanScore >= 150) add("Headliner Supreme")
            if (totalTracks >= 120) add("Season Grinder")
            if (nextFactionWar.factionBannersUnlocked.isNotEmpty()) add("Faction General")
            if (nextFactionWar.totalRaidsTriggered >= 3) add("Raid Commander")
        }

        return SeasonProgress(
            seasonId = seasonId,
            weekOfYear = week,
            activeEventName = rotatedEvent,
            activeEventGoal = eventGoal,
            activeEventProgress = nextProgress,
            activeEventTarget = target,
            crownsByAgent = nextCrowns,
            hallOfFame = baseHall,
            eventBadgesUnlocked = eventBadges.toList().sorted(),
            factionWar = nextFactionWar
        )
    }

    private fun factionForAgent(agentId: String): String = when (agentId) {
        "djinn", "ayumi", "harmony" -> "Neon"
        "vg-god", "ultron", "echo" -> "Orbit"
        else -> "Pulse"
    }

    private fun buildCallToArms(now: Long, base: FactionWarProgress): FactionWarProgress {
        if (base.callToArmsEndsAtMillis > now) return base
        val windowMs = 20 * 60 * 1000L
        val window = now / windowMs
        val targetFaction = listOf("Neon", "Orbit", "Pulse")[(window % 3).toInt()]
        val vibe = listOf("Night Raid", "Signal Surge", "Bass Blitz", "Skyline Push")[(window % 4).toInt()]
        return base.copy(
            activeCallToArms = "$targetFaction $vibe",
            callToArmsFaction = targetFaction,
            callToArmsMultiplier = if (targetFaction == base.activeFaction) 2 else 3,
            callToArmsEndsAtMillis = now + windowMs,
            totalRaidsTriggered = base.totalRaidsTriggered + 1
        )
    }

    private fun rotatingRecruitmentCode(faction: String, week: Int, now: Long): String {
        val phase = ((now / (60 * 60 * 1000L)) % 24).toInt()
        val suffix = phase.toString().padStart(2, '0')
        return when (faction) {
            "Neon" -> "NEON-$week-$suffix"
            "Orbit" -> "ORBIT-$week-$suffix"
            else -> "PULSE-$week-$suffix"
        }
    }

    private fun persistListeningStats() {
        val stats = _listeningStats.value
        val json = JSONObject().apply {
            put("totalListeningMinutes", stats.totalListeningMinutes)
            put("sessionsToday", stats.sessionsToday)
            put("mostPlayedStation", stats.mostPlayedStation)
            put("favoriteVibe", stats.favoriteVibe)
            put("topBpmZone", stats.topBpmZone)
            put("totalTracksPlayed", stats.totalTracksPlayed)
            put("totalPlaySeconds", stats.totalPlaySeconds)
            put("totalLikes", stats.totalLikes)
            put("totalDislikes", stats.totalDislikes)
            put("achievementsUnlocked", stats.achievementsUnlocked)
            put("listenerTitle", stats.listenerTitle)
            put("unlockedBadges", JSONArray(stats.unlockedBadges))
            put("trophyCase", JSONArray(stats.trophyCase))
            put("recentPlays", JSONArray(stats.recentPlays.map { play -> JSONObject().apply {
                put("id", play.id); put("stationName", play.stationName); put("trackTitle", play.trackTitle)
                put("artist", play.artist); put("agentId", play.agentId); put("agentName", play.agentName)
                put("durationSeconds", play.durationSeconds); put("liked", play.liked); put("disliked", play.disliked)
                put("playedAtMillis", play.playedAtMillis)
            }}))
            put("agentRewards", JSONArray(stats.agentRewards.map { reward -> JSONObject().apply {
                put("agentId", reward.agentId); put("agentName", reward.agentName); put("title", reward.title)
                put("trophies", reward.trophies); put("badges", JSONArray(reward.badges)); put("fanScore", reward.fanScore); put("streak", reward.streak)
            }}))
            put("agentLeaderboard", JSONArray(stats.agentLeaderboard.map { a -> JSONObject().apply {
                put("agentId", a.agentId); put("agentName", a.agentName); put("tracksQueued", a.tracksQueued)
                put("tracksLiked", a.tracksLiked); put("tracksDisliked", a.tracksDisliked); put("averageRating", a.averageRating.toDouble())
            }}))
            put("season", JSONObject().apply {
                put("seasonId", stats.season.seasonId)
                put("weekOfYear", stats.season.weekOfYear)
                put("activeEventName", stats.season.activeEventName)
                put("activeEventGoal", stats.season.activeEventGoal)
                put("activeEventProgress", stats.season.activeEventProgress)
                put("activeEventTarget", stats.season.activeEventTarget)
                put("crownsByAgent", JSONObject(stats.season.crownsByAgent))
                put("eventBadgesUnlocked", JSONArray(stats.season.eventBadgesUnlocked))
                put("factionWar", JSONObject().apply {
                    put("activeFaction", stats.season.factionWar.activeFaction)
                    put("factionPoints", JSONObject(stats.season.factionWar.factionPoints))
                    put("factionMomentum", JSONObject(stats.season.factionWar.factionMomentum))
                    put("factionBannersUnlocked", JSONArray(stats.season.factionWar.factionBannersUnlocked))
                    put("factionWinStreak", JSONObject(stats.season.factionWar.factionWinStreak))
                    put("currentWarBlurb", stats.season.factionWar.currentWarBlurb)
                    put("recruitmentCodes", JSONObject(stats.season.factionWar.recruitmentCodes))
                    put("activeCallToArms", stats.season.factionWar.activeCallToArms)
                    put("callToArmsFaction", stats.season.factionWar.callToArmsFaction)
                    put("callToArmsMultiplier", stats.season.factionWar.callToArmsMultiplier)
                    put("callToArmsEndsAtMillis", stats.season.factionWar.callToArmsEndsAtMillis)
                    put("totalRaidsTriggered", stats.season.factionWar.totalRaidsTriggered)
                })
                put("hallOfFame", JSONArray(stats.season.hallOfFame.map { h -> JSONObject().apply {
                    put("seasonId", h.seasonId)
                    put("championAgentId", h.championAgentId)
                    put("championAgentName", h.championAgentName)
                    put("trophyTitle", h.trophyTitle)
                    put("fanScore", h.fanScore)
                    put("completedAtMillis", h.completedAtMillis)
                }}))
            })
        }
        prefs.edit().putString(statsPrefKey, json.toString()).apply()
    }

    private fun hydrateListeningStatsFromPrefs() {
        val raw = prefs.getString(statsPrefKey, null) ?: return
        runCatching {
            val j = JSONObject(raw)
            _listeningStats.update { base ->
                base.copy(
                    totalListeningMinutes = j.optInt("totalListeningMinutes", base.totalListeningMinutes),
                    sessionsToday = j.optInt("sessionsToday", base.sessionsToday),
                    mostPlayedStation = j.optString("mostPlayedStation", base.mostPlayedStation),
                    favoriteVibe = j.optString("favoriteVibe", base.favoriteVibe),
                    topBpmZone = j.optString("topBpmZone", base.topBpmZone),
                    totalTracksPlayed = j.optInt("totalTracksPlayed", base.totalTracksPlayed),
                    totalPlaySeconds = j.optLong("totalPlaySeconds", base.totalPlaySeconds),
                    totalLikes = j.optInt("totalLikes", base.totalLikes),
                    totalDislikes = j.optInt("totalDislikes", base.totalDislikes),
                    achievementsUnlocked = j.optInt("achievementsUnlocked", base.achievementsUnlocked),
                    listenerTitle = j.optString("listenerTitle", base.listenerTitle),
                    unlockedBadges = (0 until j.optJSONArray("unlockedBadges")?.length().orZero()).mapNotNull { idx -> j.optJSONArray("unlockedBadges")?.optString(idx) },
                    trophyCase = (0 until j.optJSONArray("trophyCase")?.length().orZero()).mapNotNull { idx -> j.optJSONArray("trophyCase")?.optString(idx) },
                    recentPlays = (0 until j.optJSONArray("recentPlays")?.length().orZero()).mapNotNull { idx ->
                        val p = j.optJSONArray("recentPlays")?.optJSONObject(idx) ?: return@mapNotNull null
                        SongPlayRecord(
                            id = p.optString("id"), stationName = p.optString("stationName"), trackTitle = p.optString("trackTitle"),
                            artist = p.optString("artist"), agentId = p.optString("agentId"), agentName = p.optString("agentName"),
                            durationSeconds = p.optInt("durationSeconds"), liked = p.optBoolean("liked"), disliked = p.optBoolean("disliked"),
                            playedAtMillis = p.optLong("playedAtMillis")
                        )
                    },
                    agentRewards = (0 until j.optJSONArray("agentRewards")?.length().orZero()).mapNotNull { idx ->
                        val r = j.optJSONArray("agentRewards")?.optJSONObject(idx) ?: return@mapNotNull null
                        AgentReward(
                            agentId = r.optString("agentId"),
                            agentName = r.optString("agentName"),
                            title = r.optString("title", "Warmup Selector"),
                            trophies = r.optInt("trophies"),
                            badges = (0 until r.optJSONArray("badges")?.length().orZero()).mapNotNull { i -> r.optJSONArray("badges")?.optString(i) },
                            fanScore = r.optInt("fanScore"),
                            streak = r.optInt("streak")
                        )
                    },
                    agentLeaderboard = (0 until j.optJSONArray("agentLeaderboard")?.length().orZero()).mapNotNull { idx ->
                        val a = j.optJSONArray("agentLeaderboard")?.optJSONObject(idx) ?: return@mapNotNull null
                        AgentStats(
                            agentId = a.optString("agentId"),
                            agentName = a.optString("agentName"),
                            tracksQueued = a.optInt("tracksQueued"),
                            tracksLiked = a.optInt("tracksLiked"),
                            tracksDisliked = a.optInt("tracksDisliked"),
                            averageRating = a.optDouble("averageRating", 0.0).toFloat()
                        )
                    },
                    season = j.optJSONObject("season")?.let { s ->
                        val crowns = mutableMapOf<String, Int>()
                        s.optJSONObject("crownsByAgent")?.keys()?.forEach { key ->
                            crowns[key] = s.optJSONObject("crownsByAgent")?.optInt(key) ?: 0
                        }
                        SeasonProgress(
                            seasonId = s.optString("seasonId", base.season.seasonId),
                            weekOfYear = s.optInt("weekOfYear", base.season.weekOfYear),
                            activeEventName = s.optString("activeEventName", base.season.activeEventName),
                            activeEventGoal = s.optString("activeEventGoal", base.season.activeEventGoal),
                            activeEventProgress = s.optInt("activeEventProgress", base.season.activeEventProgress),
                            activeEventTarget = s.optInt("activeEventTarget", base.season.activeEventTarget),
                            crownsByAgent = crowns,
                            eventBadgesUnlocked = (0 until s.optJSONArray("eventBadgesUnlocked")?.length().orZero()).mapNotNull { i ->
                                s.optJSONArray("eventBadgesUnlocked")?.optString(i)
                            },
                            hallOfFame = (0 until s.optJSONArray("hallOfFame")?.length().orZero()).mapNotNull { i ->
                                val h = s.optJSONArray("hallOfFame")?.optJSONObject(i) ?: return@mapNotNull null
                                HallOfFameEntry(
                                    seasonId = h.optString("seasonId"),
                                    championAgentId = h.optString("championAgentId"),
                                    championAgentName = h.optString("championAgentName"),
                                    trophyTitle = h.optString("trophyTitle"),
                                    fanScore = h.optInt("fanScore"),
                                    completedAtMillis = h.optLong("completedAtMillis")
                                )
                            },
                            factionWar = s.optJSONObject("factionWar")?.let { f ->
                                fun parseMap(key: String): Map<String, Int> {
                                    val rawMap = mutableMapOf<String, Int>()
                                    f.optJSONObject(key)?.keys()?.forEach { mapKey ->
                                        rawMap[mapKey] = f.optJSONObject(key)?.optInt(mapKey) ?: 0
                                    }
                                    return rawMap
                                }
                                fun parseStringMap(key: String): Map<String, String> {
                                    val rawMap = mutableMapOf<String, String>()
                                    f.optJSONObject(key)?.keys()?.forEach { mapKey ->
                                        rawMap[mapKey] = f.optJSONObject(key)?.optString(mapKey).orEmpty()
                                    }
                                    return rawMap
                                }
                                FactionWarProgress(
                                    activeFaction = f.optString("activeFaction", base.season.factionWar.activeFaction),
                                    factionPoints = parseMap("factionPoints").ifEmpty { base.season.factionWar.factionPoints },
                                    factionMomentum = parseMap("factionMomentum").ifEmpty { base.season.factionWar.factionMomentum },
                                    factionBannersUnlocked = (0 until f.optJSONArray("factionBannersUnlocked")?.length().orZero()).mapNotNull { b ->
                                        f.optJSONArray("factionBannersUnlocked")?.optString(b)
                                    },
                                    factionWinStreak = parseMap("factionWinStreak").ifEmpty { base.season.factionWar.factionWinStreak },
                                    currentWarBlurb = f.optString("currentWarBlurb", base.season.factionWar.currentWarBlurb),
                                    recruitmentCodes = parseStringMap("recruitmentCodes").ifEmpty { base.season.factionWar.recruitmentCodes },
                                    activeCallToArms = f.optString("activeCallToArms", base.season.factionWar.activeCallToArms),
                                    callToArmsFaction = f.optString("callToArmsFaction", base.season.factionWar.callToArmsFaction),
                                    callToArmsMultiplier = f.optInt("callToArmsMultiplier", base.season.factionWar.callToArmsMultiplier),
                                    callToArmsEndsAtMillis = f.optLong("callToArmsEndsAtMillis", base.season.factionWar.callToArmsEndsAtMillis),
                                    totalRaidsTriggered = f.optInt("totalRaidsTriggered", base.season.factionWar.totalRaidsTriggered)
                                )
                            } ?: base.season.factionWar
                        )
                    } ?: base.season
                )
            }
        }
    }

    private fun Int?.orZero(): Int = this ?: 0

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
        _backendUrlState.value = url
        rebuildEndpoints()
    }

    fun setTailnetHostname(hostname: String) {
        tailnetHostname = hostname.trim()
        _tailnetHostnameState.value = tailnetHostname
        rebuildEndpoints()
    }

    fun setTailnetPort(portText: String) {
        _tailnetPortState.value = portText.filter { it.isDigit() }
        tailnetPort = _tailnetPortState.value.toIntOrNull()?.coerceIn(1, 65535) ?: 4014
        rebuildEndpoints()
    }

    fun testAllTailnetRoutes() {
        viewModelScope.launch {
            val consensus = repository.checkConnectionAny(backendEndpoints)
            applyConnectionConsensus(consensus)
            consensus.activeEndpoint?.let { repository.updateBaseUrl(it.baseUrl) }
        }
    }

    fun setDemoMode(enabled: Boolean) {
        useDemoMode = enabled
        repository.useDemoMode = enabled
        if (enabled) {
            _appState.update { it.copy(isBackendConnected = true, connectivityLabel = "Connected • Demo") }
            loadDemoData()
        } else {
            refresh()
        }
    }

    fun setPollInterval(seconds: Int) {
        pollIntervalSeconds = seconds.coerceIn(2, 30)
        startPolling()
    }

    fun setRefreshMode(mode: RefreshMode) {
        _refreshMode.value = mode
        startPolling()
    }

    fun setRuleEnabled(ruleId: String, enabled: Boolean) {
        _automationRules.update { rules ->
            rules.map { rule -> if (rule.id == ruleId) rule.copy(enabled = enabled) else rule }
        }
    }

    fun applySafeConflictFixes() {
        val now = System.currentTimeMillis()
        val fixed = conflictResolver.applySafeFixes(_appState.value)
        _appState.value = fixed
        publishSnapshot(fixed, now)
        _automationLog.update { existing ->
            listOf(
                AutomationDecision(
                    ruleId = "integrity-safe-fix",
                    ruleName = "Integrity Safe Fixes",
                    trigger = AutomationTriggerType.CONNECTOR_OFFLINE,
                    action = AutomationActionType.PIN_UPDATE,
                    detail = "Applied safe conflict fixes",
                    atMillis = now
                )
            ) + existing.take(119)
        }
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

    private fun syncAgentVoiceStateFromApp() {
        val state = _appState.value
        _djHostAgentId.value = state.djHostAgentId ?: state.agents.firstOrNull { it.isDjHost }?.id
        _agentVoiceDrafts.value = state.agents.associate { it.id to (it.voiceId ?: "") }
    }

    fun setAgentVoiceDraft(agentId: String, voiceId: String) {
        _agentVoiceDrafts.update { current -> current + (agentId to voiceId.trim()) }
    }

    fun setDjHostAgent(agentId: String) {
        _djHostAgentId.value = agentId
    }

    fun setElevenLabsApiKey(apiKey: String) {
        elevenLabsApiKey = apiKey.trim()
        _elevenLabsApiKeyState.value = elevenLabsApiKey
    }

    fun setStrictBroadcastMode(enabled: Boolean) {
        _strictBroadcastModeState.value = enabled
        prefs.edit().putBoolean(strictModePrefKey, enabled).apply()
    }

    fun generateDjNarrationPreview(script: String) {
        val djId = _djHostAgentId.value
        val voiceId = _appState.value.agents.firstOrNull { it.id == djId }?.voiceId
        if (voiceId.isNullOrBlank()) {
            _djNarrationPreviewState.value = "No DJ voice assigned"
            return
        }

        _djNarrationPreviewState.value = "rendering"
        viewModelScope.launch {
            val mode = if (_strictBroadcastModeState.value) BroadcastSafetyMode.STRICT else BroadcastSafetyMode.BALANCED
            val safeScript = DjScriptSanitizer.sanitize(script, mode = mode)
            val file = narrationService.synthesizeNarration(
                voiceId = voiceId,
                text = safeScript.text,
                style = "dj",
                safetyMode = mode
            )
            _djNarrationPreviewState.value = if (file != null) {
                val suffix = if (safeScript.blocked) " (strict safe message)" else ""
                "ready:${file.absolutePath}$suffix"
            } else {
                "error"
            }
        }
    }

    fun saveAgentVoiceAssignments() {
        val voiceMap = _agentVoiceDrafts.value
        val selectedDj = _djHostAgentId.value
        _voiceSaveState.value = "saving"

        viewModelScope.launch {
            val voicesSaved = repository.saveAgentVoices(voiceMap)
            val djSaved = selectedDj?.let { repository.saveDjHostAgent(it) } ?: true
            if (voicesSaved && djSaved) {
                _appState.update { state ->
                    val djId = selectedDj ?: state.agents.firstOrNull { it.isDjHost }?.id
                    state.copy(
                        djHostAgentId = djId,
                        agents = state.agents.map { agent ->
                            agent.copy(
                                voiceId = voiceMap[agent.id]?.takeIf { it.isNotBlank() } ?: agent.voiceId,
                                isDjHost = agent.id == djId
                            )
                        }
                    )
                }
                _voiceSaveState.value = "saved"
            } else {
                _voiceSaveState.value = "error"
            }
        }
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

    private fun rebuildEndpoints() {
        backendEndpoints = repository.buildDefaultEndpoints(backendUrl, tailnetHostname, tailnetPort)
        repository.updateBaseUrl(backendEndpoints.firstOrNull()?.baseUrl ?: backendUrl)
    }

    private fun applyConnectionConsensus(consensus: ConnectionConsensus) {
        val label = when {
            consensus.isConnected -> "Connected • Tailnet"
            consensus.attempted > 0 && consensus.attempted < backendEndpoints.size -> "Reconnecting • trying ${consensus.attempted}/${backendEndpoints.size}"
            backendEndpoints.isNotEmpty() -> "Offline • no endpoint healthy"
            else -> "Offline • no endpoint configured"
        }

        _appState.update {
            it.copy(
                isBackendConnected = consensus.isConnected,
                connectivityLabel = label,
                activeEndpointLabel = consensus.activeEndpoint?.label,
                endpointAttempted = consensus.attempted,
                endpointTotal = backendEndpoints.size,
                activeEndpointLatencyMs = consensus.activeLatencyMs
            )
        }
    }

    override fun onCleared() {
        super.onCleared()
        stopPolling()
        audioBackbone.release()
    }
}
