package com.xsytrance.vaib.data.model

enum class RefreshMode {
    AGGRESSIVE,
    BALANCED,
    BATTERY_SAVER,
    MANUAL
}

data class RefreshPolicy(
    val mode: RefreshMode,
    val baseIntervalSeconds: Int,
    val maxIntervalSeconds: Int,
    val backoffMultiplier: Double,
    val jitterSeconds: Int
) {
    companion object {
        fun forMode(mode: RefreshMode): RefreshPolicy = when (mode) {
            RefreshMode.AGGRESSIVE -> RefreshPolicy(mode, baseIntervalSeconds = 3, maxIntervalSeconds = 12, backoffMultiplier = 1.5, jitterSeconds = 1)
            RefreshMode.BALANCED -> RefreshPolicy(mode, baseIntervalSeconds = 6, maxIntervalSeconds = 24, backoffMultiplier = 1.7, jitterSeconds = 2)
            RefreshMode.BATTERY_SAVER -> RefreshPolicy(mode, baseIntervalSeconds = 12, maxIntervalSeconds = 45, backoffMultiplier = 2.0, jitterSeconds = 3)
            RefreshMode.MANUAL -> RefreshPolicy(mode, baseIntervalSeconds = 0, maxIntervalSeconds = 0, backoffMultiplier = 1.0, jitterSeconds = 0)
        }
    }
}
