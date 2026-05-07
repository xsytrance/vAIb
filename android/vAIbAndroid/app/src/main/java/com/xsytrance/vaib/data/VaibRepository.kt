package com.xsytrance.vaib.data

import com.xsytrance.vaib.data.model.AgentLiveSignal
import com.xsytrance.vaib.data.model.AppState
import com.xsytrance.vaib.data.model.ListeningStats
import com.xsytrance.vaib.data.model.TasteProfile
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject

class VaibRepository(
    private val apiClient: VaibApiClient = VaibApiClient()
) {

    var useDemoMode: Boolean = true

    fun updateBaseUrl(url: String) {
        apiClient.baseUrl = url
    }

    suspend fun checkConnection(): Boolean = withContext(Dispatchers.IO) {
        apiClient.checkConnection()
    }

    suspend fun fetchState(): Result<AppState> = withContext(Dispatchers.IO) {
        if (useDemoMode) {
            return@withContext Result.success(DemoData.getDefaultAppState())
        }

        try {
            val response = apiClient.get("/state")
            if (response != null) {
                val state = parseAppState(response)
                Result.success(state)
            } else {
                Result.failure(Exception("Failed to fetch state, using demo data"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun fetchListeningStats(): ListeningStats = withContext(Dispatchers.IO) {
        if (useDemoMode) {
            return@withContext DemoData.listeningStats
        }
        DemoData.listeningStats
    }

    suspend fun fetchTasteProfiles(): Map<String, TasteProfile> = withContext(Dispatchers.IO) {
        DemoData.tasteProfiles
    }

    suspend fun postReaction(
        agentId: String,
        trackId: String,
        type: String,
        rating: Int,
        emojis: List<String>,
        comment: String
    ): Boolean = withContext(Dispatchers.IO) {
        val body = JSONObject().apply {
            put("agentId", agentId)
            put("trackId", trackId)
            put("type", type)
            put("rating", rating)
            put("emojis", org.json.JSONArray(emojis))
            put("comment", comment)
        }
        apiClient.post("/agent/reaction", body.toString()) != null
    }

    suspend fun addToQueue(
        stationId: String,
        agent: String,
        title: String,
        artist: String,
        mood: String,
        bpm: Int
    ): Boolean = withContext(Dispatchers.IO) {
        val body = JSONObject().apply {
            put("stationId", stationId)
            put("agent", agent)
            put("title", title)
            put("artist", artist)
            put("mood", mood)
            put("bpm", bpm)
        }
        apiClient.post("/queue/add", body.toString()) != null
    }

    suspend fun fetchVoiceId(): String? = withContext(Dispatchers.IO) {
        if (useDemoMode) return@withContext null
        val state = apiClient.get("/state") ?: return@withContext null
        state.optJSONObject("preferences")
            ?.optJSONObject("humanView")
            ?.optString("voiceId", "")
            ?.takeIf { it.isNotBlank() }
    }

    suspend fun saveVoiceId(voiceId: String): Boolean = withContext(Dispatchers.IO) {
        if (useDemoMode) return@withContext false
        val body = JSONObject().apply {
            put("action", "preferences")
            put("payload", JSONObject().apply {
                put("humanView", JSONObject().apply {
                    put("voiceId", voiceId)
                })
            })
        }
        apiClient.post("/action", body.toString()) != null
    }

    suspend fun fetchAgentLiveSignals(): Map<String, AgentLiveSignal> = withContext(Dispatchers.IO) {
        if (useDemoMode) return@withContext emptyMap()
        val payload = apiClient.get("/agents") ?: return@withContext emptyMap()
        val arr = payload.optJSONArray("agents") ?: return@withContext emptyMap()
        buildMap {
            for (i in 0 until arr.length()) {
                val o = arr.optJSONObject(i) ?: continue
                val id = o.optString("id", "")
                if (id.isBlank()) continue
                val genres = mutableListOf<String>()
                val genresArr = o.optJSONArray("genres")
                if (genresArr != null) {
                    for (g in 0 until genresArr.length()) {
                        val v = genresArr.optString(g, "")
                        if (v.isNotBlank()) genres.add(v)
                    }
                }
                put(
                    id,
                    AgentLiveSignal(
                        moodFromWork = o.optString("mood", ""),
                        workload = o.optInt("workload", 0),
                        preferredGenresNow = genres
                    )
                )
            }
        }
    }

    suspend fun fetchCockpitPressure(): Int? = withContext(Dispatchers.IO) {
        if (useDemoMode) return@withContext null
        val stats = apiClient.get("/stats") ?: return@withContext null
        stats.optInt("cockpitPressure", -1).takeIf { it >= 0 }
    }

    private fun parseAppState(json: JSONObject): AppState {
        return DemoData.getDefaultAppState()
    }
}
