package com.xsytrance.vaib.data.update

import com.xsytrance.vaib.data.model.AppUpdateInfo
import java.net.HttpURLConnection
import java.net.URL

class UpdateReleaseClient {
    fun fetchLatest(endpoint: String): Result<AppUpdateInfo?> = runCatching {
        if (endpoint.isBlank()) return@runCatching null
        val conn = (URL(endpoint).openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = 4000
            readTimeout = 4000
            setRequestProperty("Accept", "application/json")
        }
        conn.inputStream.bufferedReader().use { reader ->
            val payload = reader.readText()
            UpdateReleaseParser.parse(payload)
        }
    }
}
