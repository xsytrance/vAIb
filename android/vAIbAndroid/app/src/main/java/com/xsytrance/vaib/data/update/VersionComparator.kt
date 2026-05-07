package com.xsytrance.vaib.data.update

object VersionComparator {
    fun isRemoteNewer(current: String, remote: String): Boolean {
        val currentParts = parse(current)
        val remoteParts = parse(remote)
        val max = maxOf(currentParts.size, remoteParts.size)
        for (i in 0 until max) {
            val c = currentParts.getOrElse(i) { 0 }
            val r = remoteParts.getOrElse(i) { 0 }
            if (r > c) return true
            if (r < c) return false
        }
        return false
    }

    private fun parse(version: String): List<Int> {
        return version
            .trim()
            .split('.')
            .mapNotNull { token -> token.takeWhile { it.isDigit() }.toIntOrNull() }
            .ifEmpty { listOf(0) }
    }
}
