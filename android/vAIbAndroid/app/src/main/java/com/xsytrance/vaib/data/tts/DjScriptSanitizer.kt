package com.xsytrance.vaib.data.tts

enum class BroadcastSafetyMode {
    BALANCED,
    STRICT
}

data class SanitizationResult(
    val text: String,
    val blocked: Boolean,
    val hadRiskMarkers: Boolean
)

object DjScriptSanitizer {
    private val secretPatterns = listOf(
        Regex("(?i)\\b(api[_-]?key|secret|token|password|passwd|private\\s*key|bearer)\\b\\s*[:=]\\s*[^\\s,;]+"),
        Regex("(?i)\\b[A-Za-z0-9_\\-]{24,}\\b"),
        Regex("(?i)\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b"),
        Regex("(?i)\\b[\\w.+-]+@[\\w.-]+\\.[A-Za-z]{2,}\\b"),
        Regex("(?i)https?://\\S+")
    )

    private val forbiddenTerms = listOf(
        "api key", "password", "private key", "secret", "token", "seed phrase", "ssh", "credential"
    )

    private const val SAFE_FALLBACK_BALANCED =
        "Live on vAIb: no private data on air, just pure energy. Next up, a handoff to the next agent in the lineup."

    private const val SAFE_FALLBACK_STRICT =
        "vAIb Secure Broadcast Mode is active. Private data is never announced. Enjoy the mix."

    fun sanitize(raw: String, mode: BroadcastSafetyMode = BroadcastSafetyMode.BALANCED): SanitizationResult {
        if (raw.isBlank()) {
            return SanitizationResult(
                text = if (mode == BroadcastSafetyMode.STRICT) SAFE_FALLBACK_STRICT else SAFE_FALLBACK_BALANCED,
                blocked = true,
                hadRiskMarkers = false
            )
        }

        var redacted = raw
        secretPatterns.forEach { pattern ->
            redacted = pattern.replace(redacted, "[REDACTED]")
        }

        val compact = redacted
            .replace(Regex("\\s+"), " ")
            .trim()
            .take(420)

        val lower = compact.lowercase()
        val hasForbidden = forbiddenTerms.any { lower.contains(it) }
        val hasRedactions = compact.contains("[REDACTED]")
        val risky = hasForbidden || hasRedactions

        return when (mode) {
            BroadcastSafetyMode.STRICT -> {
                if (risky) {
                    SanitizationResult(SAFE_FALLBACK_STRICT, blocked = true, hadRiskMarkers = true)
                } else {
                    SanitizationResult(compact, blocked = false, hadRiskMarkers = false)
                }
            }
            BroadcastSafetyMode.BALANCED -> {
                if (hasForbidden) {
                    SanitizationResult(SAFE_FALLBACK_BALANCED, blocked = true, hadRiskMarkers = true)
                } else {
                    SanitizationResult(compact, blocked = hasRedactions, hadRiskMarkers = hasRedactions)
                }
            }
        }
    }
}
