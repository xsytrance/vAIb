package com.xsytrance.vaib.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.xsytrance.vaib.data.DemoData
import com.xsytrance.vaib.data.VaibApiClient
import com.xsytrance.vaib.data.VaibRepository
import com.xsytrance.vaib.data.model.*
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class VaibViewModel : ViewModel() {

    private val _appState = MutableStateFlow(DemoData.getDefaultAppState())
    val appState: StateFlow<AppState> = _appState

    private val repository = VaibRepository()
    private var pollingJob: Job? = null
    private var backendUrl: String = "http://10.0.2.2:4014"
    private var useDemoMode: Boolean = true
    private var pollIntervalSeconds: Int = 5

    private val _tasteProfiles = MutableStateFlow<Map<String, TasteProfile>>(DemoData.tasteProfiles)
    val tasteProfiles: StateFlow<Map<String, TasteProfile>> = _tasteProfiles

    private val _listeningStats = MutableStateFlow<ListeningStats>(DemoData.listeningStats)
    val listeningStats: StateFlow<ListeningStats> = _listeningStats

    init {
        loadDemoData()
        startPolling()
    }

    fun loadDemoData() {
        _appState.value = DemoData.getDefaultAppState()
        _tasteProfiles.value = DemoData.tasteProfiles
        _listeningStats.value = DemoData.listeningStats
    }

    fun refresh() {
        viewModelScope.launch {
            _appState.update { it.copy(isLoading = true, error = null) }

            if (useDemoMode) {
                delay(500)
                _appState.value = DemoData.getDefaultAppState().copy(isLoading = false)
                _tasteProfiles.value = DemoData.tasteProfiles
                _listeningStats.value = DemoData.listeningStats
                return@launch
            }

            val result = repository.fetchState()
            result.fold(
                onSuccess = { state ->
                    _appState.value = state.copy(isLoading = false, isBackendConnected = true)
                },
                onFailure = { error ->
                    _appState.update {
                        it.copy(
                            isLoading = false,
                            isBackendConnected = false,
                            error = "Backend unavailable: ${'$'}{error.message}"
                        )
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
                if (!useDemoMode) {
                    val result = repository.fetchState()
                    result.onSuccess { state ->
                        _appState.value = state.copy(isBackendConnected = true)
                    }
                } else {
                    val connected = try {
                        repository.checkConnection()
                    } catch (_: Exception) {
                        false
                    }
                    _appState.update { it.copy(isBackendConnected = connected) }
                }
            }
        }
    }

    fun stopPolling() {
        pollingJob?.cancel()
        pollingJob = null
    }

    fun setBackendUrl(url: String) {
        backendUrl = url
        repository.updateBaseUrl(url)
        val apiClient = VaibApiClient(url)
        repository.updateBaseUrl(url)
    }

    fun setDemoMode(enabled: Boolean) {
        useDemoMode = enabled
        repository.useDemoMode = enabled
        if (enabled) {
            loadDemoData()
        }
    }

    fun setPollInterval(seconds: Int) {
        pollIntervalSeconds = seconds.coerceIn(1, 60)
        startPolling()
    }

    fun togglePlayPause() {
        _appState.update { currentState ->
            val currentPlayback = currentState.playback
            currentState.copy(
                playback = currentPlayback.copy(isPlaying = !currentPlayback.isPlaying)
            )
        }
    }

    fun setVolume(volume: Int) {
        _appState.update { currentState ->
            currentState.copy(
                playback = currentState.playback.copy(volume = volume.coerceIn(0, 100))
            )
        }
    }

    fun selectStation(station: Station) {
        _appState.update { currentState ->
            currentState.copy(
                playback = currentState.playback.copy(currentStation = station)
            )
        }
    }

    override fun onCleared() {
        super.onCleared()
        stopPolling()
    }
}
