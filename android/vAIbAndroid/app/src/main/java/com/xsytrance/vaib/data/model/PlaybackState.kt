package com.xsytrance.vaib.data.model

data class PlaybackState(
    val isPlaying: Boolean = false,
    val isBuffering: Boolean = false,
    val currentTrack: Track? = null,
    val currentStation: Station? = null,
    val progress: Float = 0f,
    val volume: Int = 75,
    val outputMode: String = "bluetooth",
    val playbackSource: String = "local"
)
