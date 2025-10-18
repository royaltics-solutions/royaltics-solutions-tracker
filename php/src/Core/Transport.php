<?php

declare(strict_types=1);

namespace Royaltics\ErrorTracker\Core;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use Royaltics\ErrorTracker\Types\ClientConfig;
use Royaltics\ErrorTracker\Types\TransportPayload;

final class Transport
{
    private readonly Client $client;

    public function __construct(private readonly ClientConfig $config)
    {
        $this->client = new Client([
            'timeout' => $this->config->timeout / 1000,
            'connect_timeout' => $this->config->timeout / 1000,
        ]);
    }

    public function send(string $compressedEvent): void
    {
        $payload = new TransportPayload(
            event: $compressedEvent,
            licenseId: $this->config->licenseId,
            licenseDevice: $this->config->licenseDevice,
            licenseName: $this->config->licenseName
        );

        $lastError = null;

        for ($attempt = 0; $attempt <= $this->config->maxRetries; $attempt++) {
            try {
                $this->makeRequest($payload);
                return;
            } catch (\Exception $e) {
                $lastError = $e;

                if ($attempt < $this->config->maxRetries) {
                    usleep($this->calculateBackoff($attempt) * 1000);
                }
            }
        }

        throw $lastError ?? new \RuntimeException('Transport failed with unknown error');
    }

    private function makeRequest(TransportPayload $payload): void
    {
        $jsonPayload = json_encode([
            'event' => $payload->event,
            'license_id' => $payload->licenseId,
            'license_name' => $payload->licenseName,
            'license_device' => $payload->licenseDevice,
        ], JSON_THROW_ON_ERROR);

        $headers = array_merge(
            [
                'Content-Type' => 'application/json',
                'User-Agent' => 'Royaltics-ErrorTracker-PHP/1.0',
            ],
            $this->config->headers
        );

        try {
            $response = $this->client->post($this->config->webhookUrl, [
                'body' => $jsonPayload,
                'headers' => $headers,
            ]);

            if ($response->getStatusCode() < 200 || $response->getStatusCode() >= 300) {
                throw new \RuntimeException(
                    sprintf('HTTP %d: %s', $response->getStatusCode(), $response->getReasonPhrase())
                );
            }
        } catch (GuzzleException $e) {
            throw new \RuntimeException('Network error: ' . $e->getMessage(), 0, $e);
        }
    }

    private function calculateBackoff(int $attempt): int
    {
        $baseDelay = 1000;
        $maxDelay = 30000;
        $delay = min($baseDelay * (2 ** $attempt), $maxDelay);
        
        return $delay;
    }
}
