package com.xsytrance.vaib.data

import com.xsytrance.vaib.data.model.BackendEndpoint
import com.xsytrance.vaib.data.model.BackendEndpointType
import com.xsytrance.vaib.data.model.ConnectionConsensus
import com.xsytrance.vaib.data.model.EndpointHealthResult
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class VaibApiClient(var baseUrl: String = "http://192.168.1.147:4014") {

    companion object {
        private const val CONNECT_TIMEOUT = 5000
        private const val READ_TIMEOUT = 5000
    }

    fun get(endpoint: String): JSONObject? {
        return try {
            val url = URL("$baseUrl$endpoint")
            val connection = url.openConnection() as HttpURLConnection
            connection.apply {
                requestMethod = "GET"
                connectTimeout = CONNECT_TIMEOUT
                readTimeout = READ_TIMEOUT
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("Accept", "application/json")
            }

            val responseCode = connection.responseCode
            if (responseCode == HttpURLConnection.HTTP_OK) {
                val response = connection.inputStream.bufferedReader().use { it.readText() }
                connection.disconnect()
                JSONObject(response)
            } else {
                connection.disconnect()
                null
            }
        } catch (_: Exception) {
            null
        }
    }

    fun post(endpoint: String, jsonBody: String): JSONObject? {
        return try {
            val url = URL("$baseUrl$endpoint")
            val connection = url.openConnection() as HttpURLConnection
            connection.apply {
                requestMethod = "POST"
                doOutput = true
                connectTimeout = CONNECT_TIMEOUT
                readTimeout = READ_TIMEOUT
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("Accept", "application/json")
            }

            connection.outputStream.use { os ->
                val input = jsonBody.toByteArray(Charsets.UTF_8)
                os.write(input, 0, input.size)
            }

            val responseCode = connection.responseCode
            if (responseCode == HttpURLConnection.HTTP_OK || responseCode == HttpURLConnection.HTTP_CREATED) {
                val response = connection.inputStream.bufferedReader().use { it.readText() }
                connection.disconnect()
                JSONObject(response)
            } else {
                connection.disconnect()
                null
            }
        } catch (_: Exception) {
            null
        }
    }

    fun checkConnection(): Boolean {
        return checkConnectionForBaseUrl(baseUrl).healthy
    }

    fun checkConnectionAny(endpoints: List<BackendEndpoint>): ConnectionConsensus {
        if (endpoints.isEmpty()) {
            return ConnectionConsensus(isConnected = false)
        }

        val ordered = endpoints.sortedBy { it.priority }
        val results = mutableListOf<EndpointHealthResult>()
        var attempted = 0
        var active: EndpointHealthResult? = null

        for (endpoint in ordered) {
            attempted += 1
            val result = checkConnectionForBaseUrl(endpoint.baseUrl, endpoint)
            results.add(result)
            if (active == null && result.healthy) {
                active = result
                break
            }
        }

        val healthyCount = results.count { it.healthy }
        return ConnectionConsensus(
            isConnected = active != null,
            activeEndpoint = active?.endpoint,
            activeLatencyMs = active?.latencyMs,
            attempted = attempted,
            healthyCount = healthyCount,
            results = results
        )
    }

    fun buildDefaultEndpoints(
        baseUrl: String,
        tailnetHostname: String?,
        tailnetPort: Int
    ): List<BackendEndpoint> {
        val endpoints = mutableListOf<BackendEndpoint>()
        val cleanHostname = tailnetHostname?.trim().orEmpty()
        val cleanBaseUrl = baseUrl.trim()

        if (cleanHostname.isNotBlank()) {
            endpoints += BackendEndpoint(
                id = "tailnet-dns",
                label = "Tailnet DNS",
                baseUrl = "http://$cleanHostname:$tailnetPort",
                type = BackendEndpointType.TAILNET_DNS,
                priority = 1
            )
        }

        if (cleanBaseUrl.isNotBlank() && isTailnetUrl(cleanBaseUrl) && endpoints.none { it.baseUrl == cleanBaseUrl }) {
            endpoints += BackendEndpoint(
                id = "tailnet-direct",
                label = "Tailnet Direct",
                baseUrl = cleanBaseUrl,
                type = BackendEndpointType.CUSTOM,
                priority = 2
            )
        }

        return endpoints
    }

    private fun isTailnetUrl(rawUrl: String): Boolean {
        return try {
            val host = URL(rawUrl).host.trim().lowercase()
            if (host.endsWith(".ts.net")) return true
            isTailnet100Range(host)
        } catch (_: Exception) {
            false
        }
    }

    private fun isTailnet100Range(host: String): Boolean {
        val parts = host.split('.')
        if (parts.size != 4) return false
        val octets = parts.map { it.toIntOrNull() ?: return false }
        val first = octets[0]
        val second = octets[1]
        return first == 100 && second in 64..127
    }

    private fun checkConnectionForBaseUrl(baseUrl: String, endpoint: BackendEndpoint? = null): EndpointHealthResult {
        val resolvedEndpoint = endpoint ?: BackendEndpoint(
            id = "adhoc",
            label = baseUrl,
            baseUrl = baseUrl,
            type = BackendEndpointType.CUSTOM,
            priority = Int.MAX_VALUE
        )
        return try {
            val started = System.currentTimeMillis()
            val url = URL("$baseUrl/health")
            val connection = url.openConnection() as HttpURLConnection
            connection.apply {
                requestMethod = "GET"
                connectTimeout = 3000
                readTimeout = 3000
            }
            val responseCode = connection.responseCode
            connection.disconnect()
            EndpointHealthResult(
                endpoint = resolvedEndpoint,
                healthy = responseCode == HttpURLConnection.HTTP_OK,
                latencyMs = System.currentTimeMillis() - started,
                error = if (responseCode == HttpURLConnection.HTTP_OK) null else "HTTP $responseCode"
            )
        } catch (e: Exception) {
            EndpointHealthResult(
                endpoint = resolvedEndpoint,
                healthy = false,
                error = e.message
            )
        }
    }
}
