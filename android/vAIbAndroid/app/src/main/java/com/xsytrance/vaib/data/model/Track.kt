package com.xsytrance.vaib.data.model

data class Track(
    val id: String,
    val title: String,
    val artist: String,
    val energy: Int = 50,
    val warmth: Int = 50,
    val bpm: Int = 120,
    val length: String = "0:00",
    val tags: List<String> = emptyList(),
    val reason: String = ""
)
