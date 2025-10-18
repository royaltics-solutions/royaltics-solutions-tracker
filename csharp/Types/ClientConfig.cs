namespace Royaltics.ErrorTracker.Types;

public sealed record ClientConfig
{
    public required string WebhookUrl { get; init; }
    public required string LicenseId { get; init; }
    public required string LicenseDevice { get; init; }
    public string? LicenseName { get; init; }
    public string? App { get; init; }
    public string? Version { get; init; }
    public string? Platform { get; init; }
    public bool Enabled { get; init; } = true;
    public int MaxRetries { get; init; } = 3;
    public int Timeout { get; init; } = 10000;
    public int FlushInterval { get; init; } = 5000;
    public int MaxQueueSize { get; init; } = 50;
    public Dictionary<string, string> Headers { get; init; } = new();

    public void Validate()
    {
        if (string.IsNullOrWhiteSpace(WebhookUrl))
            throw new ArgumentException("WebhookUrl is required", nameof(WebhookUrl));

        if (!Uri.TryCreate(WebhookUrl, UriKind.Absolute, out var uri) || 
            (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
            throw new ArgumentException("WebhookUrl must be a valid HTTP/HTTPS URL", nameof(WebhookUrl));

        if (string.IsNullOrWhiteSpace(LicenseId))
            throw new ArgumentException("LicenseId is required", nameof(LicenseId));

        if (string.IsNullOrWhiteSpace(LicenseDevice))
            throw new ArgumentException("LicenseDevice is required", nameof(LicenseDevice));

        if (MaxRetries < 0 || MaxRetries > 10)
            throw new ArgumentException("MaxRetries must be between 0 and 10", nameof(MaxRetries));

        if (Timeout < 1000 || Timeout > 60000)
            throw new ArgumentException("Timeout must be between 1000 and 60000ms", nameof(Timeout));

        if (FlushInterval < 100)
            throw new ArgumentException("FlushInterval must be at least 100ms", nameof(FlushInterval));

        if (MaxQueueSize < 1)
            throw new ArgumentException("MaxQueueSize must be at least 1", nameof(MaxQueueSize));
    }
}
