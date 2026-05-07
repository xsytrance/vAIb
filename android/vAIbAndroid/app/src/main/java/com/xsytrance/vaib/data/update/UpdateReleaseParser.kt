package com.xsytrance.vaib.data.update

import com.xsytrance.vaib.data.model.AppUpdateInfo
import org.json.JSONObject

object UpdateReleaseParser {
    fun parse(json: String): AppUpdateInfo? {
        val obj = JSONObject(json)
        val versionName = obj.optString("versionName").ifBlank { obj.optString("tag_name") }
        val apkUrl = obj.optString("apkUrl").ifBlank {
            val assets = obj.optJSONArray("assets")
            if (assets != null && assets.length() > 0) {
                assets.optJSONObject(0)?.optString("browser_download_url").orEmpty()
            } else ""
        }

        if (versionName.isBlank() || apkUrl.isBlank()) return null

        return AppUpdateInfo(
            versionName = versionName.removePrefix("v"),
            versionCode = obj.optInt("versionCode").takeIf { it > 0 },
            apkUrl = apkUrl,
            releaseNotes = obj.optString("releaseNotes").ifBlank { obj.optString("body").ifBlank { null } },
            checksumSha256 = obj.optString("checksumSha256").ifBlank { null }
        )
    }
}
