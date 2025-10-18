package types

import (
	"errors"
	"net/url"
	"time"
)

type EventLevel string

const (
	LevelDebug   EventLevel = "DEBUG"
	LevelInfo    EventLevel = "INFO"
	LevelWarning EventLevel = "WARNING"
	LevelError   EventLevel = "ERROR"
	LevelFatal   EventLevel = "FATAL"
)

type ClientConfig struct {
	WebhookURL    string
	LicenseID     string
	LicenseName   string
	LicenseDevice string
	App           string
	Version       string
	Platform      string
	Enabled       bool
	MaxRetries    int
	Timeout       time.Duration
	FlushInterval time.Duration
	MaxQueueSize  int
	Headers       map[string]string
}

func (c *ClientConfig) Validate() error {
	if c.WebhookURL == "" {
		return errors.New("webhookURL is required")
	}

	if _, err := url.Parse(c.WebhookURL); err != nil {
		return errors.New("webhookURL must be a valid URL")
	}

	if c.LicenseID == "" {
		return errors.New("licenseID is required")
	}

	if c.LicenseDevice == "" {
		return errors.New("licenseDevice is required")
	}

	if c.MaxRetries < 0 || c.MaxRetries > 10 {
		return errors.New("maxRetries must be between 0 and 10")
	}

	if c.Timeout < time.Second || c.Timeout > time.Minute {
		return errors.New("timeout must be between 1s and 60s")
	}

	if c.FlushInterval < 100*time.Millisecond {
		return errors.New("flushInterval must be at least 100ms")
	}

	if c.MaxQueueSize < 1 {
		return errors.New("maxQueueSize must be at least 1")
	}

	return nil
}

type EventContext struct {
	Culprit  string            `json:"culprit"`
	Extra    map[string]string `json:"extra,omitempty"`
	Platform string            `json:"platform,omitempty"`
	App      string            `json:"app,omitempty"`
	Version  string            `json:"version,omitempty"`
	Device   string            `json:"device,omitempty"`
	Tags     []string          `json:"tags,omitempty"`
}

type SerializedError struct {
	Name    string            `json:"name"`
	Message string            `json:"message"`
	Stack   string            `json:"stack,omitempty"`
	Extra   map[string]string `json:"extra,omitempty"`
}

type EventIssue struct {
	EventID   string          `json:"event_id"`
	Title     string          `json:"title"`
	Level     string          `json:"level"`
	Event     SerializedError `json:"event"`
	Context   EventContext    `json:"context"`
	Timestamp string          `json:"timestamp"`
}

type TransportPayload struct {
	Event         string `json:"event"`
	LicenseID     string `json:"license_id"`
	LicenseName   string `json:"license_name,omitempty"`
	LicenseDevice string `json:"license_device"`
}
