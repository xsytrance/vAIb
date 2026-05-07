package com.xsytrance.vaib.data.model

data class QueueItem(
    val id: String,
    val title: String,
    val artist: String,
    val requestedBy: String,
    val stationId: String,
    val mood: String,
    val bpm: Int,
    val duration: String,
    val agentReactions: Int = 0,
    val likes: Int = 0,
    val dislikes: Int = 0,
    val addedAt: String = ""
)
