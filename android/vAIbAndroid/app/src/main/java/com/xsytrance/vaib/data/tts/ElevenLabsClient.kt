package com.xsytrance.vaib.data.tts

import java.io.ByteArrayOutputStream
import java.net.HttpURLConnection
import java.net.URL

class ElevenLabsClient(
    private val apiKeyProvider: () -> String?
) {
    companion object {
        private const val BASE_URL = "https://api.elevenlabs.io/v1"
    }

    fun synthesize(
        voiceId: String,
        text: String,
        modelId: String = "eleven_multilingual_v2"
    ): ByteArray? {
        val apiKey = apiKeyProvider()?.trim().orEmpty()
        if (apiKey.isBlank() || voiceId.isBlank() || text.isBlank()) return null

        return try {
            val endpoint = URL("$BASE_URL/text-to-speech/$voiceId")
            val connection = (endpoint.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                doOutput = true
                connectTimeout = 8000
                readTimeout = 15000
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("Accept", "audio/mpeg")
                setRequestProperty("xi-api-key", apiKey)
            }

            val payload = """
                {
                  "text": ${jsonString(text)},
                  "model_id": ${jsonString(modelId)}
                }
            """.trimIndent()

            connection.outputStream.use { it.write(payload.toByteArray()) }
            val code = connection.responseCode
            if (code !in 200..299) {
                connection.disconnect()
                return null
            }

            val bytes = ByteArrayOutputStream().use { output ->
                connection.inputStream.use { input -> input.copyTo(output) }
                output.toByteArray()
            }
            connection.disconnect()
            bytes
        } catch (_: Exception) {
            null
        }
    }

    private fun jsonString(value: String): String {
        return "\"" + value
            .replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\n", "\\n") + "\""
    }
}
