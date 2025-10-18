package com.royaltics.errortracker.types

data class ClientConfig(
    val webhookUrl: String,
    val licenseId: String,
    val licenseName: String? = null,
    val licenseDevice: String,
    val app: String? = null,
    val version: String? = null,
    val platform: String? = null,
    val enabled: Boolean = true,
    val maxRetries: Int = 3,
    val timeout: Long = 10000L,
    val flushInterval: Long = 5000L,
    val maxQueueSize: Int = 50,
    val headers: Map<String, String> = emptyMap()
) {
    init {
        require(webhookUrl.isNotBlank()) { "webhookUrl cannot be blank" }
        require(webhookUrl.startsWith("http://") || webhookUrl.startsWith("https://")) {
            "webhookUrl must be a valid HTTP/HTTPS URL"
        }
        require(licenseId.isNotBlank()) { "licenseId cannot be blank" }
        require(licenseDevice.isNotBlank()) { "licenseDevice cannot be blank" }
        require(maxRetries in 0..10) { "maxRetries must be between 0 and 10" }
        require(timeout in 1000..60000) { "timeout must be between 1000 and 60000ms" }
        require(flushInterval >= 100) { "flushInterval must be at least 100ms" }
        require(maxQueueSize >= 1) { "maxQueueSize must be at least 1" }
    }
}
