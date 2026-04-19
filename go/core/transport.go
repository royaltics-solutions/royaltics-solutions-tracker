package core

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/royaltics/tracker-go/types"
)

type Transport struct {
	config *types.ClientConfig
	client *http.Client
}

func NewTransport(config *types.ClientConfig) *Transport {
	return &Transport{
		config: config,
		client: &http.Client{
			Timeout: config.Timeout,
		},
	}
}

func (t *Transport) Send(compressedEvent string) error {
	payload := types.TransportPayload{
		Event:         compressedEvent,
		LicenseID:     t.config.LicenseID,
		LicenseName:   t.config.LicenseName,
		LicenseDevice: t.config.LicenseDevice,
	}

	return t.makeRequest(payload)
}

func (t *Transport) makeRequest(payload types.TransportPayload) error {
	jsonData, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	req, err := http.NewRequest("POST", t.config.WebhookURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "Royaltics-ErrorTracker-Go/1.0")

	for key, value := range t.config.Headers {
		req.Header.Set(key, value)
	}

	resp, err := t.client.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	io.Copy(io.Discard, resp.Body)

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("HTTP %d: %s", resp.StatusCode, resp.Status)
	}

	return nil
}
