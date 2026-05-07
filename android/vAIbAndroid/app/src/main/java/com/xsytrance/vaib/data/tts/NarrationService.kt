package com.xsytrance.vaib.data.tts

import java.io.File
import java.security.MessageDigest

class NarrationService(
    private val elevenLabsClient: ElevenLabsClient,
    private val cacheDir: File
) {
    init {
        if (!cacheDir.exists()) cacheDir.mkdirs()
    }

    fun synthesizeNarration(
        voiceId: String,
        text: String,
        style: String? = null,
        maxDurationSeconds: Int = 25,
        safetyMode: BroadcastSafetyMode = BroadcastSafetyMode.BALANCED
    ): File? {
        if (text.isBlank() || voiceId.isBlank()) return null
        val sanitized = DjScriptSanitizer.sanitize(text, mode = safetyMode)
        val boundedText = sanitized.text.take(maxDurationSeconds * 20)
        val cacheKey = sha256("$voiceId|${style.orEmpty()}|$boundedText")
        val outputFile = File(cacheDir, "$cacheKey.mp3")

        if (outputFile.exists() && outputFile.length() > 0L) return outputFile

        val bytes = elevenLabsClient.synthesize(voiceId = voiceId, text = boundedText) ?: return null
        return try {
            outputFile.writeBytes(bytes)
            outputFile
        } catch (_: Exception) {
            null
        }
    }

    private fun sha256(value: String): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(value.toByteArray())
        return digest.joinToString("") { "%02x".format(it) }
    }
}
