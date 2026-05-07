package com.xsytrance.vaib.data

import com.xsytrance.vaib.data.model.RefreshPolicy
import kotlin.math.pow
import kotlin.random.Random

class RefreshScheduler {

    fun nextDelayMillis(policy: RefreshPolicy, consecutiveFailures: Int): Long {
        if (policy.baseIntervalSeconds <= 0) return 1000L

        val backoffFactor = policy.backoffMultiplier.pow(consecutiveFailures.coerceAtLeast(0).toDouble())
        val scaled = (policy.baseIntervalSeconds * backoffFactor).toInt().coerceAtMost(policy.maxIntervalSeconds)
        val jitter = if (policy.jitterSeconds <= 0) 0 else Random.nextInt(0, policy.jitterSeconds + 1)
        return (scaled + jitter).coerceAtLeast(1).toLong() * 1000L
    }
}
