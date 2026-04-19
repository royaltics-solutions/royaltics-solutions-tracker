using System.Collections.Concurrent;
using Royaltics.ErrorTracker.Core;
using Royaltics.ErrorTracker.Types;
using Royaltics.ErrorTracker.Utils;

namespace Royaltics.ErrorTracker;

public sealed class ErrorTrackerClient : IDisposable
{
    private readonly ClientConfig _config;
    private readonly EventBuilder _eventBuilder;
    private readonly Transport _transport;
    private readonly ConcurrentQueue<EventIssue> _eventQueue;
    private readonly CancellationTokenSource _cancellationTokenSource;
    private readonly SemaphoreSlim _processingLock;
    private readonly ConcurrentDictionary<string, long> _fingerprintCache;
    
    private bool _isActive;
    private bool _isEnabled;
    private bool _isProcessing;
    private Task? _flushTask;

    public ErrorTrackerClient(ClientConfig config)
    {
        config.Validate();
        
        _config = config;
        _isEnabled = config.Enabled;
        _eventQueue = new ConcurrentQueue<EventIssue>();
        _cancellationTokenSource = new CancellationTokenSource();
        _processingLock = new SemaphoreSlim(1, 1);
        _fingerprintCache = new ConcurrentDictionary<string, long>();

        _eventBuilder = new EventBuilder(
            config.App,
            config.Version,
            config.Platform,
            config.LicenseDevice
        );

        _transport = new Transport(config);
    }

    public ErrorTrackerClient Start()
    {
        if (_isActive)
            return this;

        AttachErrorHandlers();
        StartQueueProcessor();
        _isActive = true;

        return this;
    }

    public ErrorTrackerClient Error(
        Exception error,
        EventLevel level = EventLevel.ERROR,
        Dictionary<string, string>? metadata = null)
    {
        if (!_isEnabled)
            return this;

        try
        {
            var title = error.Message ?? "Unknown error";
            var eventIssue = _eventBuilder.Build(title, error, level, metadata);
            
            if (IsDuplicate(eventIssue))
                return this;

            Enqueue(eventIssue);
        }
        catch (Exception ex)
        {
            HandleInternalError("Failed to track error", ex);
        }

        return this;
    }

    public ErrorTrackerClient Event(
        string title,
        EventLevel level = EventLevel.INFO,
        Dictionary<string, string>? metadata = null)
    {
        if (!_isEnabled)
            return this;

        try
        {
            var error = new Exception(title);
            var eventIssue = _eventBuilder.Build(title, error, level, metadata);

            if (IsDuplicate(eventIssue))
                return this;

            Enqueue(eventIssue);
        }
        catch (Exception ex)
        {
            HandleInternalError("Failed to track event", ex);
        }

        return this;
    }

    private bool IsDuplicate(EventIssue eventIssue)
    {
        if (!_config.Deduplicate) return false;

        var fingerprint = GenerateFingerprint(eventIssue);
        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

        if (_fingerprintCache.TryGetValue(fingerprint, out var lastSeen) && 
            (now - lastSeen) < _config.DeduplicationInterval)
        {
            return true;
        }

        _fingerprintCache[fingerprint] = now;

        // Optional: cleanup old entries
        if (_fingerprintCache.Count > 1000)
        {
            foreach (var key in _fingerprintCache.Keys)
            {
                if (_fingerprintCache.TryGetValue(key, out var time) && now - time > _config.DeduplicationInterval)
                {
                    _fingerprintCache.TryRemove(key, out _);
                }
            }
        }

        return false;
    }

    private string GenerateFingerprint(EventIssue eventIssue)
    {
        var culprit = eventIssue.Context.Culprit ?? "unknown";
        var message = eventIssue.Event.Message ?? "";
        return $"{eventIssue.Title}:{message}:{culprit}";
    }

    public async Task ForceFlushAsync()
    {
        while (!_eventQueue.IsEmpty)
        {
            await ProcessQueueAsync();
        }
    }

    public ErrorTrackerClient Pause()
    {
        _isEnabled = false;
        return this;
    }

    public ErrorTrackerClient Resume()
    {
        _isEnabled = true;
        return this;
    }

    public void Shutdown()
    {
        _isEnabled = false;
        _isActive = false;

        _cancellationTokenSource.Cancel();
        _flushTask?.Wait();

        ForceFlushAsync().Wait();
    }

    public void Dispose()
    {
        Shutdown();
        _transport?.Dispose();
        _cancellationTokenSource?.Dispose();
        _processingLock?.Dispose();
    }

    private void AttachErrorHandlers()
    {
        AppDomain.CurrentDomain.UnhandledException += (sender, args) =>
        {
            if (args.ExceptionObject is Exception ex)
            {
                Error(ex, EventLevel.FATAL, new Dictionary<string, string>
                {
                    ["source"] = "UnhandledException"
                });
                ForceFlushAsync().Wait();
            }
        };

        TaskScheduler.UnobservedTaskException += (sender, args) =>
        {
            Error(args.Exception, EventLevel.ERROR, new Dictionary<string, string>
            {
                ["source"] = "UnobservedTaskException"
            });
            args.SetObserved();
        };
    }

    private void StartQueueProcessor()
    {
        _flushTask = Task.Run(async () =>
        {
            while (!_cancellationTokenSource.Token.IsCancellationRequested)
            {
                try
                {
                    await Task.Delay(_config.FlushInterval, _cancellationTokenSource.Token);
                    await ProcessQueueAsync();
                }
                catch (OperationCanceledException)
                {
                    break;
                }
                catch (Exception ex)
                {
                    HandleInternalError("Queue processing failed", ex);
                }
            }
        }, _cancellationTokenSource.Token);
    }

    private void Enqueue(EventIssue eventIssue)
    {
        _eventQueue.Enqueue(eventIssue);

        if (_eventQueue.Count >= _config.MaxQueueSize)
        {
            _ = Task.Run(ProcessQueueAsync);
        }
    }

    private async Task ProcessQueueAsync()
    {
        if (_eventQueue.IsEmpty || _isProcessing)
            return;

        await _processingLock.WaitAsync();

        try
        {
            _isProcessing = true;

            while (_eventQueue.TryDequeue(out var eventIssue))
            {
                var success = false;
                Exception? lastError = null;

                // Try up to MaxRetries + 1 (initial + retries)
                for (var attempt = 0; attempt <= _config.MaxRetries; attempt++)
                {
                    try
                    {
                        await DispatchEventAsync(eventIssue);
                        success = true;
                        break;
                    }
                    catch (Exception ex)
                    {
                        lastError = ex;
                        if (attempt < _config.MaxRetries)
                        {
                            await Task.Delay(_config.ThrottleInterval, _cancellationTokenSource.Token);
                        }
                    }
                }

                if (!success)
                {
                    Console.Error.WriteLine($"[ErrorTracker] Failed to dispatch event after {_config.MaxRetries + 1} attempts. Event: \"{eventIssue.Title}\". Reason: {lastError?.Message}. This event will be ignored to prevent queue congestion.");
                }

                if (!_eventQueue.IsEmpty)
                {
                    await Task.Delay(_config.ThrottleInterval, _cancellationTokenSource.Token);
                }
            }
        }
        finally
        {
            _isProcessing = false;
            _processingLock.Release();
        }
    }

    private async Task DispatchEventAsync(EventIssue eventIssue)
    {
        var eventString = _eventBuilder.Stringify(eventIssue);
        var compressed = Compression.CompressAndEncode(eventString);
        await _transport.SendAsync(compressed, _cancellationTokenSource.Token);
    }

    private static void HandleInternalError(string context, Exception error)
    {
        Console.Error.WriteLine($"[ErrorTracker] {context}: {error.Message}");
    }
}
