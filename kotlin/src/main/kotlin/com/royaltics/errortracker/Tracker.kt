package com.royaltics.errortracker

import com.royaltics.errortracker.types.ClientConfig
import com.royaltics.errortracker.types.EventLevel
import java.util.concurrent.ConcurrentHashMap

object Tracker {
    private val instances = ConcurrentHashMap<String, ErrorTrackerClient>()
    private var defaultInstance: ErrorTrackerClient? = null

    fun create(config: ClientConfig, name: String? = null): ErrorTrackerClient {
        val client = ErrorTrackerClient(config)

        if (name != null) {
            instances[name] = client
        } else if (defaultInstance == null) {
            defaultInstance = client
        }

        return client.start()
    }

    fun get(name: String? = null): ErrorTrackerClient {
        return if (name != null) {
            instances[name] ?: throw IllegalStateException("Tracker instance \"$name\" not found")
        } else {
            defaultInstance ?: throw IllegalStateException("No default tracker initialized. Call Tracker.create() first.")
        }
    }

    fun error(
        error: Throwable,
        level: EventLevel = EventLevel.ERROR,
        metadata: Map<String, String>? = null
    ): ErrorTrackerClient {
        return get().error(error, level, metadata)
    }

    fun event(
        title: String,
        level: EventLevel = EventLevel.INFO,
        metadata: Map<String, String>? = null
    ): ErrorTrackerClient {
        return get().event(title, level, metadata)
    }

    suspend fun flush() {
        get().forceFlush()
    }

    fun pause(): ErrorTrackerClient {
        return get().pause()
    }

    fun resume(): ErrorTrackerClient {
        return get().resume()
    }

    fun shutdown() {
        defaultInstance?.shutdown()
        instances.values.forEach { it.shutdown() }
        instances.clear()
        defaultInstance = null
    }

    fun has(name: String? = null): Boolean {
        return if (name != null) {
            instances.containsKey(name)
        } else {
            defaultInstance != null
        }
    }
}
