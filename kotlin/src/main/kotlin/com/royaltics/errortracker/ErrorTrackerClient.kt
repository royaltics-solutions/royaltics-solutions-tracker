package com.royaltics.errortracker

import com.royaltics.errortracker.core.EventBuilder
import com.royaltics.errortracker.core.Transport
import com.royaltics.errortracker.types.ClientConfig
import com.royaltics.errortracker.types.EventIssue
import com.royaltics.errortracker.types.EventLevel
import com.royaltics.errortracker.utils.Compression
import kotlinx.coroutines.*
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.atomic.AtomicBoolean

class ErrorTrackerClient(private val config: ClientConfig) {
    private val eventBuilder = EventBuilder(
        app = config.app,
        version = config.version,
        platform = config.platform,
        device = config.licenseDevice
    )
    
    private val transport = Transport(config)
    private val eventQueue = ConcurrentLinkedQueue<EventIssue>()
    private val isActive = AtomicBoolean(false)
    private val isEnabled = AtomicBoolean(config.enabled)
    private val isProcessing = AtomicBoolean(false)
    
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var flushJob: Job? = null

    fun start(): ErrorTrackerClient {
        if (isActive.compareAndSet(false, true)) {
            attachErrorHandlers()
            startBatchProcessor()
        }
        return this
    }

    fun error(
        error: Throwable,
        level: EventLevel = EventLevel.ERROR,
        metadata: Map<String, String>? = null
    ): ErrorTrackerClient {
        if (!isEnabled.get()) return this

        try {
            val title = error.message ?: "Unknown error"
            val event = eventBuilder.build(title, error, level, metadata)
            enqueue(event)
        } catch (e: Exception) {
            handleInternalError("Failed to track error", e)
        }

        return this
    }

    fun event(
        title: String,
        level: EventLevel = EventLevel.INFO,
        metadata: Map<String, String>? = null
    ): ErrorTrackerClient {
        if (!isEnabled.get()) return this

        try {
            val error = Exception(title)
            val event = eventBuilder.build(title, error, level, metadata)
            enqueue(event)
        } catch (e: Exception) {
            handleInternalError("Failed to track event", e)
        }

        return this
    }

    suspend fun forceFlush() {
        while (eventQueue.isNotEmpty()) {
            processBatch()
        }
    }

    fun pause(): ErrorTrackerClient {
        isEnabled.set(false)
        return this
    }

    fun resume(): ErrorTrackerClient {
        isEnabled.set(true)
        return this
    }

    fun shutdown() {
        isEnabled.set(false)
        isActive.set(false)
        
        flushJob?.cancel()
        
        runBlocking {
            forceFlush()
        }
        
        scope.cancel()
    }

    private fun attachErrorHandlers() {
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            error(throwable, EventLevel.FATAL, mapOf("thread" to thread.name))
            runBlocking {
                forceFlush()
            }
        }
    }

    private fun startBatchProcessor() {
        flushJob = scope.launch {
            while (isActive.get()) {
                delay(config.flushInterval)
                try {
                    processBatch()
                } catch (e: Exception) {
                    handleInternalError("Batch processing failed", e)
                }
            }
        }
    }

    private fun enqueue(event: EventIssue) {
        eventQueue.offer(event)

        if (eventQueue.size >= config.maxQueueSize) {
            scope.launch {
                processBatch()
            }
        }
    }

    private suspend fun processBatch() {
        if (eventQueue.isEmpty() || !isProcessing.compareAndSet(false, true)) {
            return
        }

        try {
            val batch = mutableListOf<EventIssue>()
            repeat(config.maxQueueSize) {
                eventQueue.poll()?.let { batch.add(it) }
            }

            batch.map { event ->
                async {
                    try {
                        dispatchEvent(event)
                    } catch (e: Exception) {
                        handleInternalError("Failed to dispatch event", e)
                    }
                }
            }.awaitAll()
        } finally {
            isProcessing.set(false)
        }
    }

    private suspend fun dispatchEvent(event: EventIssue) {
        val eventString = eventBuilder.stringify(event)
        val compressed = Compression.compressAndEncode(eventString)
        transport.send(compressed)
    }

    private fun handleInternalError(context: String, error: Exception) {
        System.err.println("[ErrorTracker] $context: ${error.message}")
    }
}
