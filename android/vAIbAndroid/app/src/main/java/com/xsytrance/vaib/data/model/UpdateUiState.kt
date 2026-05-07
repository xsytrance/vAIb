package com.xsytrance.vaib.data.model

data class UpdateUiState(
    val checking: Boolean = false,
    val autoCheckEnabled: Boolean = true,
    val endpoint: String = "",
    val currentVersionName: String = "",
    val availableUpdate: AppUpdateInfo? = null,
    val message: String? = null,
    val lastCheckedAtMillis: Long? = null,
    val downloading: Boolean = false,
    val downloadId: Long? = null
)
