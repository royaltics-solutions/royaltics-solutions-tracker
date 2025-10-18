using System.Collections.Concurrent;
using Royaltics.ErrorTracker.Types;

namespace Royaltics.ErrorTracker;

public static class Tracker
{
    private static readonly ConcurrentDictionary<string, ErrorTrackerClient> Instances = new();
    private static ErrorTrackerClient? _defaultInstance;
    private static readonly object Lock = new();

    public static ErrorTrackerClient Create(ClientConfig config, string? name = null)
    {
        var client = new ErrorTrackerClient(config);

        if (name != null)
        {
            Instances[name] = client;
        }
        else
        {
            lock (Lock)
            {
                _defaultInstance ??= client;
            }
        }

        return client.Start();
    }

    public static ErrorTrackerClient Get(string? name = null)
    {
        if (name != null)
        {
            if (!Instances.TryGetValue(name, out var instance))
            {
                throw new InvalidOperationException($"Tracker instance \"{name}\" not found");
            }
            return instance;
        }

        if (_defaultInstance == null)
        {
            throw new InvalidOperationException("No default tracker initialized. Call Tracker.Create() first.");
        }

        return _defaultInstance;
    }

    public static ErrorTrackerClient Error(
        Exception error,
        EventLevel level = EventLevel.ERROR,
        Dictionary<string, string>? metadata = null)
    {
        return Get().Error(error, level, metadata);
    }

    public static ErrorTrackerClient Event(
        string title,
        EventLevel level = EventLevel.INFO,
        Dictionary<string, string>? metadata = null)
    {
        return Get().Event(title, level, metadata);
    }

    public static Task FlushAsync()
    {
        return Get().ForceFlushAsync();
    }

    public static ErrorTrackerClient Pause()
    {
        return Get().Pause();
    }

    public static ErrorTrackerClient Resume()
    {
        return Get().Resume();
    }

    public static void Shutdown()
    {
        lock (Lock)
        {
            _defaultInstance?.Shutdown();
            _defaultInstance = null;
        }

        foreach (var instance in Instances.Values)
        {
            instance.Shutdown();
        }

        Instances.Clear();
    }

    public static bool Has(string? name = null)
    {
        if (name != null)
        {
            return Instances.ContainsKey(name);
        }

        return _defaultInstance != null;
    }
}
