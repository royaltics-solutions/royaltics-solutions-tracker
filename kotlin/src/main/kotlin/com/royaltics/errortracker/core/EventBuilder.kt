package com.royaltics.errortracker.core

import com.royaltics.errortracker.types.*
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.time.Instant
import java.util.UUID

class EventBuilder(
    private val app: String?,
    private val version: String?,
    private val platform: String?,
    private val device: String?
) {
    private val json = Json { 
        prettyPrint = false
        ignoreUnknownKeys = true
    }

    fun build(
        title: String,
        error: Throwable,
        level: EventLevel = EventLevel.ERROR,
        extra: Map<String, String>? = null
    ): EventIssue {
        val culprit = extractCulprit(error)
        val serializedError = serializeError(error)
        val tags = extractTags(error)

        return EventIssue(
            eventId = UUID.randomUUID().toString(),
            title = title,
            level = level.name,
            event = serializedError,
            timestamp = Instant.now().toString(),
            context = EventContext(
                culprit = culprit,
                extra = extra,
                platform = platform ?: System.getProperty("os.name"),
                app = app,
                version = version,
                device = device ?: System.getenv("HOSTNAME") ?: "unknown",
                tags = tags
            )
        )
    }

    fun stringify(event: EventIssue): String {
        return json.encodeToString(event)
    }

    private fun extractCulprit(error: Throwable): String {
        val stackTrace = error.stackTrace
        if (stackTrace.isNotEmpty()) {
            val firstElement = stackTrace[0]
            return "${firstElement.className}.${firstElement.methodName}"
        }
        return error.javaClass.simpleName
    }

    private fun serializeError(error: Throwable): SerializedError {
        val stackTraceString = error.stackTrace.joinToString("\n") { element ->
            "at ${element.className}.${element.methodName}(${element.fileName}:${element.lineNumber})"
        }

        return SerializedError(
            name = error.javaClass.simpleName,
            message = error.message ?: "Unknown error",
            stack = stackTraceString,
            additionalData = null
        )
    }

    private fun extractTags(error: Throwable): List<String> {
        val tags = mutableListOf<String>()
        tags.add("error:${error.javaClass.simpleName}")
        
        if (error.cause != null) {
            tags.add("has_cause:true")
        }
        
        return tags
    }
}
