package com.xsytrance.vaib.data.update

import android.content.SharedPreferences
import com.xsytrance.vaib.data.model.UpdateUiState

class AppUpdateCoordinator(
    private val releaseClient: UpdateReleaseClient,
    private val prefs: SharedPreferences,
    private val currentVersionNameProvider: () -> String
) {
    companion object {
        private const val KEY_LAST_CHECK = "update_last_check_at"
        private const val KEY_DISMISSED_VERSION = "update_dismissed_version"
        private const val COOLDOWN_MS = 6 * 60 * 60 * 1000L
    }

    fun initialState(endpoint: String, autoCheckEnabled: Boolean): UpdateUiState {
        return UpdateUiState(
            endpoint = endpoint,
            autoCheckEnabled = autoCheckEnabled,
            currentVersionName = currentVersionNameProvider(),
            lastCheckedAtMillis = prefs.getLong(KEY_LAST_CHECK, 0L).takeIf { it > 0L }
        )
    }

    fun isEligibleForScheduledCheck(nowMillis: Long): Boolean {
        val last = prefs.getLong(KEY_LAST_CHECK, 0L)
        return (nowMillis - last) >= COOLDOWN_MS
    }

    fun dismissVersion(versionName: String) {
        prefs.edit().putString(KEY_DISMISSED_VERSION, versionName).apply()
    }

    fun checkNow(endpoint: String): UpdateUiState {
        val now = System.currentTimeMillis()
        prefs.edit().putLong(KEY_LAST_CHECK, now).apply()
        val currentVersion = currentVersionNameProvider()
        val result = releaseClient.fetchLatest(endpoint)

        return result.fold(
            onSuccess = { remote ->
                if (remote == null) {
                    UpdateUiState(
                        endpoint = endpoint,
                        currentVersionName = currentVersion,
                        message = "No update feed configured",
                        lastCheckedAtMillis = now
                    )
                } else {
                    val dismissed = prefs.getString(KEY_DISMISSED_VERSION, null)
                    val newer = VersionComparator.isRemoteNewer(currentVersion, remote.versionName)
                    val shouldShow = newer && dismissed != remote.versionName
                    UpdateUiState(
                        endpoint = endpoint,
                        currentVersionName = currentVersion,
                        availableUpdate = if (shouldShow) remote else null,
                        message = if (shouldShow) "Update available: ${remote.versionName}" else "You are up to date",
                        lastCheckedAtMillis = now
                    )
                }
            },
            onFailure = { err ->
                UpdateUiState(
                    endpoint = endpoint,
                    currentVersionName = currentVersion,
                    message = "Update check failed: ${err.message}",
                    lastCheckedAtMillis = now
                )
            }
        )
    }
}
