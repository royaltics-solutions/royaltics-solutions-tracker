using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Royaltics.ErrorTracker.Types;

namespace Royaltics.ErrorTracker.Core;

public sealed class Transport : IDisposable
{
    private readonly ClientConfig _config;
    private readonly HttpClient _httpClient;

    public Transport(ClientConfig config)
    {
        _config = config;
        _httpClient = new HttpClient
        {
            Timeout = TimeSpan.FromMilliseconds(config.Timeout)
        };
    }

    public async Task SendAsync(string compressedEvent, CancellationToken cancellationToken = default)
    {
        var payload = new TransportPayload
        {
            Event = compressedEvent,
            LicenseId = _config.LicenseId,
            LicenseName = _config.LicenseName,
            LicenseDevice = _config.LicenseDevice
        };

        Exception? lastError = null;

        for (var attempt = 0; attempt <= _config.MaxRetries; attempt++)
        {
            try
            {
                await MakeRequestAsync(payload, cancellationToken);
                return;
            }
            catch (Exception ex)
            {
                lastError = ex;

                if (attempt < _config.MaxRetries)
                {
                    var backoff = CalculateBackoff(attempt);
                    await Task.Delay(backoff, cancellationToken);
                }
            }
        }

        throw lastError ?? new InvalidOperationException("Transport failed with unknown error");
    }

    private async Task MakeRequestAsync(TransportPayload payload, CancellationToken cancellationToken)
    {
        var jsonPayload = JsonSerializer.Serialize(payload);
        var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

        using var request = new HttpRequestMessage(HttpMethod.Post, _config.WebhookUrl)
        {
            Content = content
        };

        request.Headers.Add("User-Agent", "Royaltics-ErrorTracker-CSharp/1.0");

        foreach (var header in _config.Headers)
        {
            request.Headers.TryAddWithoutValidation(header.Key, header.Value);
        }

        var response = await _httpClient.SendAsync(request, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new HttpRequestException(
                $"HTTP {(int)response.StatusCode}: {response.ReasonPhrase}");
        }
    }

    private static TimeSpan CalculateBackoff(int attempt)
    {
        const int baseDelay = 1000;
        const int maxDelay = 30000;
        
        var delay = Math.Min(baseDelay * (1 << attempt), maxDelay);
        return TimeSpan.FromMilliseconds(delay);
    }

    public void Dispose()
    {
        _httpClient?.Dispose();
    }
}
