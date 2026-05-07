package com.xsytrance.vaib.data

import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class VaibApiClient(var baseUrl: String = "http://10.0.2.2:4014") {

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
        } catch (e: Exception) {
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
        } catch (e: Exception) {
            null
        }
    }

    fun checkConnection(): Boolean {
        return try {
            val url = URL("$baseUrl/health")
            val connection = url.openConnection() as HttpURLConnection
            connection.apply {
                requestMethod = "GET"
                connectTimeout = 3000
                readTimeout = 3000
            }
            val responseCode = connection.responseCode
            connection.disconnect()
            responseCode == HttpURLConnection.HTTP_OK
        } catch (e: Exception) {
            false
        }
    }
}
