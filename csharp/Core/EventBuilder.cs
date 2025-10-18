using System.Diagnostics;
using System.Text.Json;
using Royaltics.ErrorTracker.Types;

namespace Royaltics.ErrorTracker.Core;

public sealed class EventBuilder
{
    private readonly string? _app;
    private readonly string? _version;
    private readonly string? _platform;
    private readonly string? _device;

    public EventBuilder(string? app, string? version, string? platform, string? device)
    {
        _app = app;
        _version = version;
        _platform = platform;
        _device = device;
    }

    public EventIssue Build(
        string title,
        Exception error,
        EventLevel level = EventLevel.ERROR,
        Dictionary<string, string>? extra = null)
    {
        var culprit = ExtractCulprit(error);
        var serializedError = SerializeError(error);
        var tags = ExtractTags(error);

        return new EventIssue
        {
            EventId = Guid.NewGuid().ToString(),
            Title = title,
            Level = level.ToString(),
            Event = serializedError,
            Timestamp = DateTime.UtcNow.ToString("O"),
            Context = new EventContext
            {
                Culprit = culprit,
                Extra = extra,
                Platform = _platform ?? Environment.OSVersion.Platform.ToString(),
                App = _app,
                Version = _version,
                Device = _device ?? Environment.MachineName,
                Tags = tags
            }
        };
    }

    public string Stringify(EventIssue eventIssue)
    {
        return JsonSerializer.Serialize(eventIssue, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
        });
    }

    private static string ExtractCulprit(Exception error)
    {
        var stackTrace = new StackTrace(error, true);
        var frame = stackTrace.GetFrame(0);

        if (frame != null)
        {
            var method = frame.GetMethod();
            if (method != null)
            {
                return $"{method.DeclaringType?.FullName}.{method.Name}";
            }
        }

        return error.GetType().Name;
    }

    private static SerializedError SerializeError(Exception error)
    {
        return new SerializedError
        {
            Name = error.GetType().Name,
            Message = error.Message,
            Stack = error.StackTrace,
            Extra = null
        };
    }

    private static List<string> ExtractTags(Exception error)
    {
        var tags = new List<string>
        {
            $"error:{error.GetType().Name}"
        };

        if (error.HResult != 0)
        {
            tags.Add($"hresult:{error.HResult}");
        }

        return tags;
    }
}
