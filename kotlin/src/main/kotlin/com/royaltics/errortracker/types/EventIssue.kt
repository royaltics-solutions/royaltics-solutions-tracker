package com.royaltics.errortracker.types

import kotlinx.serialization.Serializable

@Serializable
data class EventContext(
    val culprit: String,
    val extra: Map<String, String>? = null,
    val platform: String? = null,
    val app: String? = null,
    val version: String? = null,
    val device: String? = null,
    val tags: List<String>? = null
)

@Serializable
data class SerializedError(
    val name: String,
    val message: String,
    val stack: String? = null,
    val additionalData: Map<String, String>? = null
)

@Serializable
data class EventIssue(
    val eventId: String,
    val title: String,
    val level: String,
    val event: SerializedError,
    val context: EventContext,
    val timestamp: String
)

@Serializable
data class TransportPayload(
    val event: String,
    val licenseId: String,
    val licenseName: String? = null,
    val licenseDevice: String
)
