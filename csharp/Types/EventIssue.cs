using System.Text.Json.Serialization;

namespace Royaltics.ErrorTracker.Types;

public sealed record EventContext
{
    [JsonPropertyName("culprit")]
    public required string Culprit { get; init; }
    
    [JsonPropertyName("extra")]
    public Dictionary<string, string>? Extra { get; init; }
    
    [JsonPropertyName("platform")]
    public string? Platform { get; init; }
    
    [JsonPropertyName("app")]
    public string? App { get; init; }
    
    [JsonPropertyName("version")]
    public string? Version { get; init; }
    
    [JsonPropertyName("device")]
    public string? Device { get; init; }
    
    [JsonPropertyName("tags")]
    public List<string>? Tags { get; init; }
}

public sealed record SerializedError
{
    [JsonPropertyName("name")]
    public required string Name { get; init; }
    
    [JsonPropertyName("message")]
    public required string Message { get; init; }
    
    [JsonPropertyName("stack")]
    public string? Stack { get; init; }
    
    [JsonPropertyName("extra")]
    public Dictionary<string, string>? Extra { get; init; }
}

public sealed record EventIssue
{
    [JsonPropertyName("event_id")]
    public required string EventId { get; init; }
    
    [JsonPropertyName("title")]
    public required string Title { get; init; }
    
    [JsonPropertyName("level")]
    public required string Level { get; init; }
    
    [JsonPropertyName("event")]
    public required SerializedError Event { get; init; }
    
    [JsonPropertyName("context")]
    public required EventContext Context { get; init; }
    
    [JsonPropertyName("timestamp")]
    public required string Timestamp { get; init; }
}

public sealed record TransportPayload
{
    [JsonPropertyName("event")]
    public required string Event { get; init; }
    
    [JsonPropertyName("license_id")]
    public required string LicenseId { get; init; }
    
    [JsonPropertyName("license_name")]
    public string? LicenseName { get; init; }
    
    [JsonPropertyName("license_device")]
    public required string LicenseDevice { get; init; }
}
