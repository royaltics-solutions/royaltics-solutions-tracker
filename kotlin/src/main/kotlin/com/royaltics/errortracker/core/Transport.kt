package com.royaltics.errortracker.core

import com.royaltics.errortracker.types.ClientConfig
import com.royaltics.errortracker.types.TransportPayload
import kotlinx.coroutines.delay
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.util.concurrent.TimeUnit

class Transport(private val config: ClientConfig) {
    private val json = Json { ignoreUnknownKeys = true }
    
    private val client = OkHttpClient.Builder()
        .connectTimeout(config.timeout, TimeUnit.MILLISECONDS)
        .writeTimeout(config.timeout, TimeUnit.MILLISECONDS)
        .readTimeout(config.timeout, TimeUnit.MILLISECONDS)
        .build()

    suspend fun send(compressedEvent: String) {
        val payload = TransportPayload(
            event = compressedEvent,
            licenseId = config.licenseId,
            licenseName = config.licenseName,
            licenseDevice = config.licenseDevice
        )

        var lastError: Exception? = null

        repeat(config.maxRetries + 1) { attempt ->
            try {
                makeRequest(payload)
                return
            } catch (e: Exception) {
                lastError = e
                if (attempt < config.maxRetries) {
                    delay(calculateBackoff(attempt))
                }
            }
        }

        throw lastError ?: IOException("Transport failed with unknown error")
    }

    private fun makeRequest(payload: TransportPayload) {
        val jsonPayload = json.encodeToString(payload)
        val mediaType = "application/json; charset=utf-8".toMediaType()
        val requestBody = jsonPayload.toRequestBody(mediaType)

        val requestBuilder = Request.Builder()
            .url(config.webhookUrl)
            .post(requestBody)
            .addHeader("Content-Type", "application/json")
            .addHeader("User-Agent", "Royaltics-ErrorTracker-Kotlin/1.0")

        config.headers.forEach { (key, value) ->
            requestBuilder.addHeader(key, value)
        }

        val request = requestBuilder.build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                throw IOException("HTTP ${response.code}: ${response.message}")
            }
        }
    }

    private fun calculateBackoff(attempt: Int): Long {
        val baseDelay = 1000L
        val maxDelay = 30000L
        return minOf(baseDelay * (1L shl attempt), maxDelay)
    }
}
