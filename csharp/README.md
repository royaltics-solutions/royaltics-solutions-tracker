# Royaltics Error Tracker - C#

> C# client for Royaltics Error Tracker

## Features

- ✅ **.NET 8.0**: Modern C# with latest features
- ✅ **Async/Await**: Full async support
- ✅ **Record Types**: Immutable data structures
- ✅ **Nullable Reference Types**: Enhanced null safety
- ✅ **HttpClient**: Built-in HTTP client
- ✅ **Production Ready**: Comprehensive error handling

## Requirements

- .NET 8.0 or higher

## Installation

### NuGet Package Manager

```bash
Install-Package Royaltics.ErrorTracker
```

### .NET CLI

```bash
dotnet add package Royaltics.ErrorTracker
```

### Package Reference

```xml
<PackageReference Include="Royaltics.ErrorTracker" Version="1.0.0" />
```

## Quick Start

```csharp
using Royaltics.ErrorTracker;
using Royaltics.ErrorTracker.Types;

// Initialize tracker
var config = new ClientConfig
{
    WebhookUrl = "https://api.example.com/webhook",
    LicenseId = "your-license-id",
    LicenseDevice = "server-01",
    App = "my-csharp-app",
    Version = "1.0.0"
};

Tracker.Create(config);

// Track errors
try
{
    // Your code
    throw new Exception("Something went wrong");
}
catch (Exception ex)
{
    Tracker.Error(ex, EventLevel.ERROR, new Dictionary<string, string>
    {
        ["userId"] = "123",
        ["action"] = "processPayment"
    });
}

// Track events
Tracker.Event("User logged in", EventLevel.INFO, new Dictionary<string, string>
{
    ["userId"] = "123"
});

// Flush before shutdown
await Tracker.FlushAsync();
Tracker.Shutdown();
```

## Configuration

```csharp
using Royaltics.ErrorTracker.Types;

var config = new ClientConfig
{
    // Required
    WebhookUrl = "https://api.example.com/webhook",
    LicenseId = "your-license-id",
    LicenseDevice = "server-01",
    
    // Optional
    LicenseName = "My Company",
    App = "my-app",
    Version = "1.0.0",
    Platform = "windows",
    Enabled = true,
    MaxRetries = 3,
    Timeout = 10000,
    FlushInterval = 5000,
    MaxQueueSize = 50,
    Headers = new Dictionary<string, string>
    {
        ["X-Custom-Header"] = "value"
    }
};
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `WebhookUrl` | `string` | **required** | HTTP/HTTPS webhook URL |
| `LicenseId` | `string` | **required** | Your license ID |
| `LicenseDevice` | `string` | **required** | Device identifier |
| `LicenseName` | `string?` | `null` | License name |
| `App` | `string?` | `null` | Application name |
| `Version` | `string?` | `null` | Application version |
| `Platform` | `string?` | `null` | Platform identifier |
| `Enabled` | `bool` | `true` | Enable/disable tracking |
| `MaxRetries` | `int` | `3` | Max retry attempts (0-10) |
| `Timeout` | `int` | `10000` | Request timeout in ms |
| `FlushInterval` | `int` | `5000` | Batch flush interval in ms |
| `MaxQueueSize` | `int` | `50` | Max events before auto-flush |
| `Headers` | `Dictionary<string, string>` | `new()` | Custom HTTP headers |

## Usage

### Basic Error Tracking

```csharp
using Royaltics.ErrorTracker;
using Royaltics.ErrorTracker.Types;

void ProcessOrder(string orderId)
{
    try
    {
        // Your code
        throw new InvalidOperationException("Order not found");
    }
    catch (Exception ex)
    {
        Tracker.Error(ex, EventLevel.ERROR, new Dictionary<string, string>
        {
            ["orderId"] = orderId,
            ["action"] = "processOrder"
        });
        throw;
    }
}
```

### Event Levels

```csharp
using Royaltics.ErrorTracker.Types;

Tracker.Event("Debug message", EventLevel.DEBUG);
Tracker.Event("Info message", EventLevel.INFO);
Tracker.Event("Warning message", EventLevel.WARNING);
Tracker.Error(new Exception("Error"), EventLevel.ERROR);
Tracker.Error(new Exception("Fatal"), EventLevel.FATAL);
```

### Using ErrorTrackerClient Directly

```csharp
using Royaltics.ErrorTracker;
using Royaltics.ErrorTracker.Types;

var client = new ErrorTrackerClient(config);
client.Start();

client.Error(
    new Exception("Test error"),
    EventLevel.ERROR,
    new Dictionary<string, string> { ["context"] = "test" }
);

client.Event("Test event", EventLevel.INFO);

// Force flush
await client.ForceFlushAsync();

// Shutdown
client.Shutdown();
client.Dispose();
```

### Multiple Instances

```csharp
// Create named instances
Tracker.Create(prodConfig, "production");
Tracker.Create(stagingConfig, "staging");

// Use specific instance
Tracker.Get("production").Error(ex);
Tracker.Get("staging").Event("Test event");

// Check if instance exists
if (Tracker.Has("production"))
{
    // ...
}
```

### ASP.NET Core Integration

#### Program.cs

```csharp
using Royaltics.ErrorTracker;
using Royaltics.ErrorTracker.Types;

var builder = WebApplication.CreateBuilder(args);

// Register Error Tracker
builder.Services.AddSingleton(sp =>
{
    var config = new ClientConfig
    {
        WebhookUrl = builder.Configuration["ErrorTracker:WebhookUrl"]!,
        LicenseId = builder.Configuration["ErrorTracker:LicenseId"]!,
        LicenseDevice = builder.Configuration["ErrorTracker:Device"]!,
        App = "my-aspnet-app",
        Version = "1.0.0"
    };
    
    return Tracker.Create(config);
});

var app = builder.Build();

// Ensure shutdown on application stop
app.Lifetime.ApplicationStopping.Register(() =>
{
    Tracker.FlushAsync().Wait();
    Tracker.Shutdown();
});

app.Run();
```

#### appsettings.json

```json
{
  "ErrorTracker": {
    "WebhookUrl": "https://api.example.com/webhook",
    "LicenseId": "your-license-id",
    "Device": "production-server-01"
  }
}
```

#### Exception Middleware

```csharp
using Royaltics.ErrorTracker;
using Royaltics.ErrorTracker.Types;

public class ErrorTrackerMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ErrorTrackerClient _tracker;

    public ErrorTrackerMiddleware(RequestDelegate next, ErrorTrackerClient tracker)
    {
        _next = next;
        _tracker = tracker;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _tracker.Error(ex, EventLevel.ERROR, new Dictionary<string, string>
            {
                ["path"] = context.Request.Path,
                ["method"] = context.Request.Method,
                ["ip"] = context.Connection.RemoteIpAddress?.ToString() ?? "unknown"
            });
            
            throw;
        }
    }
}

// Register middleware
app.UseMiddleware<ErrorTrackerMiddleware>();
```

#### Controller Usage

```csharp
using Microsoft.AspNetCore.Mvc;
using Royaltics.ErrorTracker;
using Royaltics.ErrorTracker.Types;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly ErrorTrackerClient _tracker;

    public UsersController(ErrorTrackerClient tracker)
    {
        _tracker = tracker;
    }

    [HttpPost]
    public async Task<IActionResult> CreateUser(CreateUserDto dto)
    {
        try
        {
            // Your code
            _tracker.Event("User created", EventLevel.INFO, new Dictionary<string, string>
            {
                ["userId"] = dto.Email
            });
            
            return Ok();
        }
        catch (Exception ex)
        {
            _tracker.Error(ex, EventLevel.ERROR, new Dictionary<string, string>
            {
                ["action"] = "createUser",
                ["email"] = dto.Email
            });
            
            return StatusCode(500);
        }
    }
}
```

### Minimal API

```csharp
using Royaltics.ErrorTracker;
using Royaltics.ErrorTracker.Types;

var builder = WebApplication.CreateBuilder(args);

var tracker = Tracker.Create(new ClientConfig
{
    WebhookUrl = builder.Configuration["ErrorTracker:WebhookUrl"]!,
    LicenseId = builder.Configuration["ErrorTracker:LicenseId"]!,
    LicenseDevice = "minimal-api-server"
});

var app = builder.Build();

app.MapGet("/", () => "Hello World!");

app.MapPost("/users", (CreateUserDto dto) =>
{
    try
    {
        // Your code
        tracker.Event("User created", EventLevel.INFO);
        return Results.Ok();
    }
    catch (Exception ex)
    {
        tracker.Error(ex, EventLevel.ERROR);
        return Results.Problem();
    }
});

app.Lifetime.ApplicationStopping.Register(() =>
{
    Tracker.FlushAsync().Wait();
    Tracker.Shutdown();
});

app.Run();
```

### Background Service

```csharp
using Royaltics.ErrorTracker;
using Royaltics.ErrorTracker.Types;

public class MyBackgroundService : BackgroundService
{
    private readonly ErrorTrackerClient _tracker;

    public MyBackgroundService(ErrorTrackerClient tracker)
    {
        _tracker = tracker;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                // Your background work
                await Task.Delay(1000, stoppingToken);
            }
            catch (Exception ex)
            {
                _tracker.Error(ex, EventLevel.ERROR, new Dictionary<string, string>
                {
                    ["service"] = nameof(MyBackgroundService)
                });
            }
        }
    }
}
```

### Console Application

```csharp
using Royaltics.ErrorTracker;
using Royaltics.ErrorTracker.Types;

class Program
{
    static async Task Main(string[] args)
    {
        var config = new ClientConfig
        {
            WebhookUrl = Environment.GetEnvironmentVariable("ERROR_TRACKER_WEBHOOK_URL")!,
            LicenseId = Environment.GetEnvironmentVariable("ERROR_TRACKER_LICENSE_ID")!,
            LicenseDevice = Environment.MachineName
        };

        Tracker.Create(config);

        try
        {
            // Your application logic
            await DoWork();
        }
        catch (Exception ex)
        {
            Tracker.Error(ex, EventLevel.FATAL);
        }
        finally
        {
            await Tracker.FlushAsync();
            Tracker.Shutdown();
        }
    }

    static async Task DoWork()
    {
        // Your code
    }
}
```

### Global Exception Handler

```csharp
using Royaltics.ErrorTracker;
using Royaltics.ErrorTracker.Types;

class Program
{
    static void Main(string[] args)
    {
        Tracker.Create(config);

        AppDomain.CurrentDomain.UnhandledException += (sender, e) =>
        {
            if (e.ExceptionObject is Exception ex)
            {
                Tracker.Error(ex, EventLevel.FATAL, new Dictionary<string, string>
                {
                    ["source"] = "UnhandledException",
                    ["isTerminating"] = e.IsTerminating.ToString()
                });
                
                Tracker.FlushAsync().Wait();
            }
        };

        TaskScheduler.UnobservedTaskException += (sender, e) =>
        {
            Tracker.Error(e.Exception, EventLevel.ERROR, new Dictionary<string, string>
            {
                ["source"] = "UnobservedTaskException"
            });
            
            e.SetObserved();
        };

        // Your application
        RunApplication();

        Tracker.Shutdown();
    }
}
```

## API Reference

### Tracker Class

```csharp
public static class Tracker
{
    public static ErrorTrackerClient Create(ClientConfig config, string? name = null);
    public static ErrorTrackerClient Get(string? name = null);
    public static ErrorTrackerClient Error(Exception error, EventLevel level = EventLevel.ERROR, Dictionary<string, string>? metadata = null);
    public static ErrorTrackerClient Event(string title, EventLevel level = EventLevel.INFO, Dictionary<string, string>? metadata = null);
    public static Task FlushAsync();
    public static ErrorTrackerClient Pause();
    public static ErrorTrackerClient Resume();
    public static void Shutdown();
    public static bool Has(string? name = null);
}
```

### ErrorTrackerClient Class

```csharp
public sealed class ErrorTrackerClient : IDisposable
{
    public ErrorTrackerClient(ClientConfig config);
    public ErrorTrackerClient Start();
    public ErrorTrackerClient Error(Exception error, EventLevel level = EventLevel.ERROR, Dictionary<string, string>? metadata = null);
    public ErrorTrackerClient Event(string title, EventLevel level = EventLevel.INFO, Dictionary<string, string>? metadata = null);
    public Task ForceFlushAsync();
    public ErrorTrackerClient Pause();
    public ErrorTrackerClient Resume();
    public void Shutdown();
    public void Dispose();
}
```

### EventLevel Enum

```csharp
public enum EventLevel
{
    DEBUG,
    INFO,
    WARNING,
    ERROR,
    FATAL
}
```

## Testing

```csharp
using Xunit;
using Royaltics.ErrorTracker;
using Royaltics.ErrorTracker.Types;

public class ErrorTrackerTests
{
    [Fact]
    public async Task ShouldTrackError()
    {
        var config = new ClientConfig
        {
            WebhookUrl = "https://test.example.com/webhook",
            LicenseId = "test-license",
            LicenseDevice = "test-device"
        };

        var client = Tracker.Create(config);

        var error = new Exception("Test error");
        client.Error(error, EventLevel.ERROR);

        await client.ForceFlushAsync();
        client.Shutdown();
        client.Dispose();

        Assert.True(true);
    }
}
```

## Environment Variables

```env
ERROR_TRACKER_WEBHOOK_URL=https://api.example.com/webhook
ERROR_TRACKER_LICENSE_ID=your-license-id
ERROR_TRACKER_DEVICE=production-server-01
```

## Best Practices

1. **Use Dependency Injection**: Register as singleton in ASP.NET Core
2. **Flush Before Shutdown**: Always call `FlushAsync()` before application exit
3. **Dispose Properly**: Use `using` statements or call `Dispose()`
4. **Environment Variables**: Store sensitive config in environment variables
5. **Add Context**: Include relevant metadata with errors
6. **Async All The Way**: Use async methods throughout

## License

MIT
