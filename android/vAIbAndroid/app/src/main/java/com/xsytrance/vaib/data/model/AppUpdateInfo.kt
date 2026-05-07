package com.xsytrance.vaib.data.model

data class AppUpdateInfo(
    val versionName: String,
    val versionCode: Int? = null,
    val apkUrl: String,
    val releaseNotes: String? = null,
    val checksumSha256: String? = null
)
