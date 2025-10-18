# Royaltics Error Tracker - Kotlin

> Kotlin client for Royaltics Error Tracker

## Features

- ✅ **Kotlin Coroutines**: Async/await support
- ✅ **Thread-Safe**: Concurrent queue implementation
- ✅ **OkHttp**: Reliable HTTP client
- ✅ **Kotlinx Serialization**: Fast JSON serialization
- ✅ **Type-Safe**: Full Kotlin type safety
- ✅ **Production Ready**: Comprehensive error handling

## Installation

### Gradle (Kotlin DSL)

```kotlin
dependencies {
    implementation("com.royaltics:tracker-kotlin:1.0.0")
}
```

### Gradle (Groovy)

```groovy
dependencies {
    implementation 'com.royaltics:tracker-kotlin:1.0.0'
}
```

### Maven

```xml
<dependency>
    <groupId>com.royaltics</groupId>
    <artifactId>tracker-kotlin</artifactId>
    <version>1.0.0</version>
</dependency>
```

## Quick Start

```kotlin
import com.royaltics.errortracker.Tracker
import com.royaltics.errortracker.types.ClientConfig
import com.royaltics.errortracker.types.EventLevel

fun main() {
    // Initialize tracker
    val config = ClientConfig(
        webhookUrl = "https://api.example.com/webhook",
        licenseId = "your-license-id",
        licenseDevice = "server-01",
        app = "my-kotlin-app",
        version = "1.0.0"
    )
    
    Tracker.create(config)
    
    // Track errors
    try {
        // Your code
    } catch (e: Exception) {
        Tracker.error(e, EventLevel.ERROR, mapOf(
            "userId" to "123",
            "action" to "processPayment"
        ))
    }
    
    // Track events
    Tracker.event("User logged in", EventLevel.INFO, mapOf(
        "userId" to "123"
    ))
}
```

## Configuration

```kotlin
import com.royaltics.errortracker.types.ClientConfig

val config = ClientConfig(
    // Required
    webhookUrl = "https://api.example.com/webhook",
    licenseId = "your-license-id",
    licenseDevice = "server-01",
    
    // Optional
    licenseName = "My Company",
    app = "my-app",
    version = "1.0.0",
    platform = "kotlin-jvm",
    enabled = true,
    maxRetries = 3,
    timeout = 10000L,
    flushInterval = 5000L,
    maxQueueSize = 50,
    headers = mapOf(
        "X-Custom-Header" to "value"
    )
)
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `webhookUrl` | `String` | **required** | HTTP/HTTPS webhook URL |
| `licenseId` | `String` | **required** | Your license ID |
| `licenseDevice` | `String` | **required** | Device identifier |
| `licenseName` | `String?` | `null` | License name |
| `app` | `String?` | `null` | Application name |
| `version` | `String?` | `null` | Application version |
| `platform` | `String?` | `null` | Platform identifier |
| `enabled` | `Boolean` | `true` | Enable/disable tracking |
| `maxRetries` | `Int` | `3` | Max retry attempts (0-10) |
| `timeout` | `Long` | `10000` | Request timeout in ms |
| `flushInterval` | `Long` | `5000` | Batch flush interval in ms |
| `maxQueueSize` | `Int` | `50` | Max events before auto-flush |
| `headers` | `Map<String, String>` | `emptyMap()` | Custom HTTP headers |

## Usage

### Basic Error Tracking

```kotlin
import com.royaltics.errortracker.Tracker
import com.royaltics.errortracker.types.EventLevel

fun processOrder(orderId: String) {
    try {
        // Your code
        throw IllegalStateException("Order not found")
    } catch (e: Exception) {
        Tracker.error(e, EventLevel.ERROR, mapOf(
            "orderId" to orderId,
            "action" to "processOrder"
        ))
        throw e
    }
}
```

### Event Levels

```kotlin
Tracker.event("Debug message", EventLevel.DEBUG)
Tracker.event("Info message", EventLevel.INFO)
Tracker.event("Warning message", EventLevel.WARNING)
Tracker.error(Exception("Error"), EventLevel.ERROR)
Tracker.error(Exception("Fatal"), EventLevel.FATAL)
```

### Using ErrorTrackerClient Directly

```kotlin
import com.royaltics.errortracker.ErrorTrackerClient
import com.royaltics.errortracker.types.ClientConfig
import kotlinx.coroutines.runBlocking

fun main() = runBlocking {
    val client = ErrorTrackerClient(config).start()
    
    client.error(
        Exception("Test error"),
        EventLevel.ERROR,
        mapOf("context" to "test")
    )
    
    client.event("Test event", EventLevel.INFO)
    
    // Force flush
    client.forceFlush()
    
    // Shutdown
    client.shutdown()
}
```

### Multiple Instances

```kotlin
// Create named instances
Tracker.create(productionConfig, "production")
Tracker.create(stagingConfig, "staging")

// Use specific instance
Tracker.get("production").error(error)
Tracker.get("staging").event("Test event")

// Check if instance exists
if (Tracker.has("production")) {
    // ...
}
```

### Coroutines Support

```kotlin
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking

fun main() = runBlocking {
    Tracker.create(config)
    
    launch {
        try {
            // Async operation
        } catch (e: Exception) {
            Tracker.error(e)
        }
    }
    
    // Flush before exit
    Tracker.flush()
}
```

### Spring Boot Integration

```kotlin
import com.royaltics.errortracker.Tracker
import com.royaltics.errortracker.types.ClientConfig
import org.springframework.boot.context.event.ApplicationReadyEvent
import org.springframework.context.event.EventListener
import org.springframework.stereotype.Component
import javax.annotation.PreDestroy

@Component
class ErrorTrackerConfig(
    @Value("\${error.tracker.webhook.url}") private val webhookUrl: String,
    @Value("\${error.tracker.license.id}") private val licenseId: String,
    @Value("\${error.tracker.license.device}") private val licenseDevice: String
) {
    
    @EventListener(ApplicationReadyEvent::class)
    fun initialize() {
        Tracker.create(ClientConfig(
            webhookUrl = webhookUrl,
            licenseId = licenseId,
            licenseDevice = licenseDevice,
            app = "spring-boot-app",
            version = "1.0.0"
        ))
    }
    
    @PreDestroy
    fun shutdown() {
        Tracker.shutdown()
    }
}
```

### Exception Handler

```kotlin
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

@RestControllerAdvice
class GlobalExceptionHandler {
    
    @ExceptionHandler(Exception::class)
    fun handleException(e: Exception): ResponseEntity<ErrorResponse> {
        Tracker.error(e, EventLevel.ERROR, mapOf(
            "handler" to "GlobalExceptionHandler"
        ))
        
        return ResponseEntity
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ErrorResponse(e.message ?: "Unknown error"))
    }
}
```

## Examples

### Ktor Integration

```kotlin
import io.ktor.server.application.*
import io.ktor.server.plugins.*

fun Application.configureErrorTracking() {
    Tracker.create(ClientConfig(
        webhookUrl = environment.config.property("error.tracker.url").getString(),
        licenseId = environment.config.property("error.tracker.license").getString(),
        licenseDevice = "ktor-server"
    ))
    
    install(StatusPages) {
        exception<Throwable> { call, cause ->
            Tracker.error(cause, EventLevel.ERROR, mapOf(
                "path" to call.request.path(),
                "method" to call.request.httpMethod.value
            ))
            throw cause
        }
    }
}
```

### Android Integration

```kotlin
import android.app.Application
import com.royaltics.errortracker.Tracker
import com.royaltics.errortracker.types.ClientConfig

class MyApplication : Application() {
    
    override fun onCreate() {
        super.onCreate()
        
        Tracker.create(ClientConfig(
            webhookUrl = BuildConfig.ERROR_TRACKER_URL,
            licenseId = BuildConfig.LICENSE_ID,
            licenseDevice = "android-${Build.MODEL}",
            app = "my-android-app",
            version = BuildConfig.VERSION_NAME
        ))
        
        // Set uncaught exception handler
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            Tracker.error(throwable, EventLevel.FATAL, mapOf(
                "thread" to thread.name
            ))
            Tracker.get().shutdown()
        }
    }
}
```

## API Reference

### Tracker Object

```kotlin
object Tracker {
    fun create(config: ClientConfig, name: String? = null): ErrorTrackerClient
    fun get(name: String? = null): ErrorTrackerClient
    fun error(error: Throwable, level: EventLevel = EventLevel.ERROR, metadata: Map<String, String>? = null): ErrorTrackerClient
    fun event(title: String, level: EventLevel = EventLevel.INFO, metadata: Map<String, String>? = null): ErrorTrackerClient
    suspend fun flush()
    fun pause(): ErrorTrackerClient
    fun resume(): ErrorTrackerClient
    fun shutdown()
    fun has(name: String? = null): Boolean
}
```

### ErrorTrackerClient

```kotlin
class ErrorTrackerClient(config: ClientConfig) {
    fun start(): ErrorTrackerClient
    fun error(error: Throwable, level: EventLevel = EventLevel.ERROR, metadata: Map<String, String>? = null): ErrorTrackerClient
    fun event(title: String, level: EventLevel = EventLevel.INFO, metadata: Map<String, String>? = null): ErrorTrackerClient
    suspend fun forceFlush()
    fun pause(): ErrorTrackerClient
    fun resume(): ErrorTrackerClient
    fun shutdown()
}
```

## Testing

```kotlin
import org.junit.jupiter.api.Test
import com.royaltics.errortracker.Tracker
import kotlinx.coroutines.runBlocking

class ErrorTrackerTest {
    
    @Test
    fun `should track error`() = runBlocking {
        Tracker.create(testConfig)
        
        val error = Exception("Test error")
        Tracker.error(error, EventLevel.ERROR)
        
        Tracker.flush()
        Tracker.shutdown()
    }
}
```

## License

MIT
