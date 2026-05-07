package com.xsytrance.vaib.data.model

data class Station(
    val id: String,
    val name: String,
    val hostAgent: String,
    val description: String,
    val vibe: String,
    val genre: String,
    val bpmRange: String,
    val isLive: Boolean,
    val listeners: Int = 0,
    val streamUrl: String? = null,
    val fallbackLocalTrack: String? = null,
    val playbackMode: String = "hybrid"
)
