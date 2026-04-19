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

        await MakeRequestAsync(payload, cancellationToken);
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
            var errorContent = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new HttpRequestException(
                $"HTTP {(int)response.StatusCode}: {response.ReasonPhrase}. Details: {errorContent}");
        }
    }

    public void Dispose()
    {
        _httpClient?.Dispose();
    }
}
