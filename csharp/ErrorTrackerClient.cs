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
        StartBatchProcessor();
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
            Enqueue(eventIssue);
        }
        catch (Exception ex)
        {
            HandleInternalError("Failed to track event", ex);
        }

        return this;
    }

    public async Task ForceFlushAsync()
    {
        while (!_eventQueue.IsEmpty)
        {
            await ProcessBatchAsync();
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

    private void StartBatchProcessor()
    {
        _flushTask = Task.Run(async () =>
        {
            while (!_cancellationTokenSource.Token.IsCancellationRequested)
            {
                try
                {
                    await Task.Delay(_config.FlushInterval, _cancellationTokenSource.Token);
                    await ProcessBatchAsync();
                }
                catch (OperationCanceledException)
                {
                    break;
                }
                catch (Exception ex)
                {
                    HandleInternalError("Batch processing failed", ex);
                }
            }
        }, _cancellationTokenSource.Token);
    }

    private void Enqueue(EventIssue eventIssue)
    {
        _eventQueue.Enqueue(eventIssue);

        if (_eventQueue.Count >= _config.MaxQueueSize)
        {
            _ = Task.Run(ProcessBatchAsync);
        }
    }

    private async Task ProcessBatchAsync()
    {
        if (_eventQueue.IsEmpty || _isProcessing)
            return;

        await _processingLock.WaitAsync();

        try
        {
            _isProcessing = true;

            var batch = new List<EventIssue>();
            var batchSize = Math.Min(_config.MaxQueueSize, _eventQueue.Count);

            for (var i = 0; i < batchSize && _eventQueue.TryDequeue(out var eventIssue); i++)
            {
                batch.Add(eventIssue);
            }

            var tasks = batch.Select(DispatchEventAsync);
            await Task.WhenAll(tasks);
        }
        finally
        {
            _isProcessing = false;
            _processingLock.Release();
        }
    }

    private async Task DispatchEventAsync(EventIssue eventIssue)
    {
        try
        {
            var eventString = _eventBuilder.Stringify(eventIssue);
            var compressed = Compression.CompressAndEncode(eventString);
            await _transport.SendAsync(compressed, _cancellationTokenSource.Token);
        }
        catch (Exception ex)
        {
            HandleInternalError("Failed to dispatch event", ex);
        }
    }

    private static void HandleInternalError(string context, Exception error)
    {
        Console.Error.WriteLine($"[ErrorTracker] {context}: {error.Message}");
    }
}
