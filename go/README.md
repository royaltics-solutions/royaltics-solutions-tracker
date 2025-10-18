# Royaltics Error Tracker - Go

> Go client for Royaltics Error Tracker

## Features

- ✅ **Goroutines**: Concurrent event processing
- ✅ **Context Support**: Cancellation and timeouts
- ✅ **Thread-Safe**: Safe for concurrent use
- ✅ **Standard Library**: Minimal dependencies
- ✅ **Type-Safe**: Full Go type safety
- ✅ **Production Ready**: Comprehensive error handling

## Installation

```bash
go get github.com/royaltics/tracker-go
```

## Quick Start

```go
package main

import (
    "log"
    "time"
    
    errortracker "github.com/royaltics/tracker-go"
    "github.com/royaltics/tracker-go/types"
)

func main() {
    // Initialize tracker
    config := &types.ClientConfig{
        WebhookURL:    "https://api.example.com/webhook",
        LicenseID:     "your-license-id",
        LicenseDevice: "server-01",
        App:           "my-go-app",
        Version:       "1.0.0",
        Enabled:       true,
        MaxRetries:    3,
        Timeout:       10 * time.Second,
        FlushInterval: 5 * time.Second,
        MaxQueueSize:  50,
    }
    
    client, err := errortracker.Create(config)
    if err != nil {
        log.Fatal(err)
    }
    defer errortracker.Shutdown()
    
    // Track errors
    if err := someOperation(); err != nil {
        errortracker.Error(err, types.LevelError, map[string]string{
            "userId": "123",
            "action": "someOperation",
        })
    }
    
    // Track events
    errortracker.Event("User logged in", types.LevelInfo, map[string]string{
        "userId": "123",
    })
}
```

## Configuration

```go
import (
    "time"
    "github.com/royaltics/tracker-go/types"
)

config := &types.ClientConfig{
    // Required
    WebhookURL:    "https://api.example.com/webhook",
    LicenseID:     "your-license-id",
    LicenseDevice: "server-01",
    
    // Optional
    LicenseName:   "My Company",
    App:           "my-app",
    Version:       "1.0.0",
    Platform:      "linux",
    Enabled:       true,
    MaxRetries:    3,
    Timeout:       10 * time.Second,
    FlushInterval: 5 * time.Second,
    MaxQueueSize:  50,
    Headers: map[string]string{
        "X-Custom-Header": "value",
    },
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `WebhookURL` | `string` | **required** | HTTP/HTTPS webhook URL |
| `LicenseID` | `string` | **required** | Your license ID |
| `LicenseDevice` | `string` | **required** | Device identifier |
| `LicenseName` | `string` | `""` | License name |
| `App` | `string` | `""` | Application name |
| `Version` | `string` | `""` | Application version |
| `Platform` | `string` | `runtime.GOOS` | Platform identifier |
| `Enabled` | `bool` | `true` | Enable/disable tracking |
| `MaxRetries` | `int` | `3` | Max retry attempts (0-10) |
| `Timeout` | `time.Duration` | `10s` | Request timeout |
| `FlushInterval` | `time.Duration` | `5s` | Batch flush interval |
| `MaxQueueSize` | `int` | `50` | Max events before auto-flush |
| `Headers` | `map[string]string` | `nil` | Custom HTTP headers |

## Usage

### Basic Error Tracking

```go
import (
    errortracker "github.com/royaltics/tracker-go"
    "github.com/royaltics/tracker-go/types"
)

func processOrder(orderID string) error {
    if err := validateOrder(orderID); err != nil {
        errortracker.Error(err, types.LevelError, map[string]string{
            "orderID": orderID,
            "action":  "processOrder",
        })
        return err
    }
    return nil
}
```

### Event Levels

```go
import "github.com/royaltics/tracker-go/types"

errortracker.Event("Debug message", types.LevelDebug, nil)
errortracker.Event("Info message", types.LevelInfo, nil)
errortracker.Event("Warning message", types.LevelWarning, nil)
errortracker.Error(err, types.LevelError, nil)
errortracker.Error(err, types.LevelFatal, nil)
```

### Using Client Directly

```go
import (
    errortracker "github.com/royaltics/tracker-go"
    "github.com/royaltics/tracker-go/types"
)

func main() {
    client, err := errortracker.NewClient(config)
    if err != nil {
        log.Fatal(err)
    }
    
    client.Start()
    defer client.Shutdown()
    
    client.Error(
        errors.New("test error"),
        types.LevelError,
        map[string]string{"context": "test"},
    )
    
    client.Event("Test event", types.LevelInfo, nil)
    
    // Force flush
    if err := client.ForceFlush(); err != nil {
        log.Printf("Flush error: %v", err)
    }
}
```

### Multiple Instances

```go
// Create named instances
prodClient, _ := errortracker.Create(prodConfig, "production")
stagingClient, _ := errortracker.Create(stagingConfig, "staging")

// Use specific instance
prodClient, _ := errortracker.Get("production")
prodClient.Error(err, types.LevelError, nil)

// Check if instance exists
if errortracker.Has("production") {
    // ...
}
```

### HTTP Middleware

```go
import (
    "net/http"
    errortracker "github.com/royaltics/tracker-go"
    "github.com/royaltics/tracker-go/types"
)

func ErrorTrackerMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        defer func() {
            if err := recover(); err != nil {
                errortracker.Error(
                    fmt.Errorf("panic: %v", err),
                    types.LevelFatal,
                    map[string]string{
                        "path":   r.URL.Path,
                        "method": r.Method,
                    },
                )
                http.Error(w, "Internal Server Error", http.StatusInternalServerError)
            }
        }()
        
        next.ServeHTTP(w, r)
    })
}

func main() {
    errortracker.Create(config)
    defer errortracker.Shutdown()
    
    mux := http.NewServeMux()
    mux.HandleFunc("/", handler)
    
    http.ListenAndServe(":8080", ErrorTrackerMiddleware(mux))
}
```

### Gin Framework Integration

```go
import (
    "github.com/gin-gonic/gin"
    errortracker "github.com/royaltics/tracker-go"
    "github.com/royaltics/tracker-go/types"
)

func ErrorTrackerMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        defer func() {
            if err := recover(); err != nil {
                errortracker.Error(
                    fmt.Errorf("panic: %v", err),
                    types.LevelFatal,
                    map[string]string{
                        "path":   c.Request.URL.Path,
                        "method": c.Request.Method,
                        "ip":     c.ClientIP(),
                    },
                )
                c.AbortWithStatus(http.StatusInternalServerError)
            }
        }()
        
        c.Next()
        
        if len(c.Errors) > 0 {
            for _, err := range c.Errors {
                errortracker.Error(
                    err.Err,
                    types.LevelError,
                    map[string]string{
                        "path":   c.Request.URL.Path,
                        "method": c.Request.Method,
                    },
                )
            }
        }
    }
}

func main() {
    errortracker.Create(config)
    defer errortracker.Shutdown()
    
    r := gin.Default()
    r.Use(ErrorTrackerMiddleware())
    
    r.GET("/", handler)
    r.Run(":8080")
}
```

### Echo Framework Integration

```go
import (
    "github.com/labstack/echo/v4"
    errortracker "github.com/royaltics/tracker-go"
    "github.com/royaltics/tracker-go/types"
)

func ErrorTrackerMiddleware() echo.MiddlewareFunc {
    return func(next echo.HandlerFunc) echo.HandlerFunc {
        return func(c echo.Context) error {
            err := next(c)
            
            if err != nil {
                errortracker.Error(err, types.LevelError, map[string]string{
                    "path":   c.Request().URL.Path,
                    "method": c.Request().Method,
                })
            }
            
            return err
        }
    }
}

func main() {
    errortracker.Create(config)
    defer errortracker.Shutdown()
    
    e := echo.New()
    e.Use(ErrorTrackerMiddleware())
    
    e.GET("/", handler)
    e.Start(":8080")
}
```

### Graceful Shutdown

```go
import (
    "context"
    "os"
    "os/signal"
    "syscall"
    errortracker "github.com/royaltics/tracker-go"
)

func main() {
    errortracker.Create(config)
    
    // Setup signal handling
    sigChan := make(chan os.Signal, 1)
    signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
    
    // Start your application
    go func() {
        // Your app logic
    }()
    
    // Wait for signal
    <-sigChan
    
    // Graceful shutdown
    log.Println("Shutting down...")
    if err := errortracker.Flush(); err != nil {
        log.Printf("Flush error: %v", err)
    }
    errortracker.Shutdown()
}
```

## API Reference

### Package Functions

```go
// Create a new tracker instance
func Create(config *types.ClientConfig, name ...string) (*ErrorTrackerClient, error)

// Get an existing tracker instance
func Get(name ...string) (*ErrorTrackerClient, error)

// Track an error
func Error(err error, level types.EventLevel, metadata map[string]string) error

// Track an event
func Event(title string, level types.EventLevel, metadata map[string]string) error

// Flush pending events
func Flush() error

// Pause tracking
func Pause() error

// Resume tracking
func Resume() error

// Shutdown all instances
func Shutdown() error

// Check if instance exists
func Has(name ...string) bool
```

### ErrorTrackerClient

```go
type ErrorTrackerClient struct {
    // ...
}

func NewClient(config *types.ClientConfig) (*ErrorTrackerClient, error)
func (c *ErrorTrackerClient) Start() *ErrorTrackerClient
func (c *ErrorTrackerClient) Error(err error, level types.EventLevel, metadata map[string]string) *ErrorTrackerClient
func (c *ErrorTrackerClient) Event(title string, level types.EventLevel, metadata map[string]string) *ErrorTrackerClient
func (c *ErrorTrackerClient) ForceFlush() error
func (c *ErrorTrackerClient) Pause() *ErrorTrackerClient
func (c *ErrorTrackerClient) Resume() *ErrorTrackerClient
func (c *ErrorTrackerClient) Shutdown() error
```

## Testing

```go
import (
    "testing"
    errortracker "github.com/royaltics/tracker-go"
    "github.com/royaltics/tracker-go/types"
)

func TestErrorTracking(t *testing.T) {
    config := &types.ClientConfig{
        WebhookURL:    "https://test.example.com/webhook",
        LicenseID:     "test-license",
        LicenseDevice: "test-device",
    }
    
    client, err := errortracker.Create(config)
    if err != nil {
        t.Fatal(err)
    }
    defer errortracker.Shutdown()
    
    testErr := errors.New("test error")
    client.Error(testErr, types.LevelError, nil)
    
    if err := client.ForceFlush(); err != nil {
        t.Errorf("Flush failed: %v", err)
    }
}
```

## License

MIT
