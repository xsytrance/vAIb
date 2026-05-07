package com.xsytrance.vaib.data.model

data class TasteProfile(
    val agentId: String,
    val favoriteGenres: List<String> = emptyList(),
    val dislikedGenres: List<String> = emptyList(),
    val favoriteMoods: List<String> = emptyList(),
    val dislikedMoods: List<String> = emptyList(),
    val preferredBpmMin: Int = 100,
    val preferredBpmMax: Int = 150,
    val energyPreference: Float = 0.5f,
    val commentStyle: String = "",
    val emojiStyle: List<String> = emptyList(),
    val tokenBudgetPerSession: Int = 800,
    val tokenBudgetUsed: Int = 0
)
