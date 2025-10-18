package types

import (
	"testing"
	"time"
)

func TestClientConfigValidate(t *testing.T) {
	t.Run("should validate valid config", func(t *testing.T) {
		config := &ClientConfig{
			WebhookURL:    "https://api.example.com/webhook",
			LicenseID:     "test-license",
			LicenseDevice: "test-device",
			MaxRetries:    3,
			Timeout:       10 * time.Second,
			FlushInterval: 5 * time.Second,
			MaxQueueSize:  50,
		}

		err := config.Validate()
		if err != nil {
			t.Errorf("expected no error, got %v", err)
		}
	})

	t.Run("should return error for empty webhookURL", func(t *testing.T) {
		config := &ClientConfig{
			WebhookURL:    "",
			LicenseID:     "test-license",
			LicenseDevice: "test-device",
			MaxRetries:    3,
			Timeout:       10 * time.Second,
			FlushInterval: 5 * time.Second,
			MaxQueueSize:  50,
		}

		err := config.Validate()
		if err == nil {
			t.Error("expected error for empty webhookURL")
		}
	})

	t.Run("should return error for invalid webhookURL", func(t *testing.T) {
		config := &ClientConfig{
			WebhookURL:    "not-a-valid-url",
			LicenseID:     "test-license",
			LicenseDevice: "test-device",
			MaxRetries:    3,
			Timeout:       10 * time.Second,
			FlushInterval: 5 * time.Second,
			MaxQueueSize:  50,
		}

		err := config.Validate()
		if err == nil {
			t.Error("expected error for invalid webhookURL")
		}
	})

	t.Run("should return error for empty licenseID", func(t *testing.T) {
		config := &ClientConfig{
			WebhookURL:    "https://api.example.com/webhook",
			LicenseID:     "",
			LicenseDevice: "test-device",
			MaxRetries:    3,
			Timeout:       10 * time.Second,
			FlushInterval: 5 * time.Second,
			MaxQueueSize:  50,
		}

		err := config.Validate()
		if err == nil {
			t.Error("expected error for empty licenseID")
		}
	})

	t.Run("should return error for empty licenseDevice", func(t *testing.T) {
		config := &ClientConfig{
			WebhookURL:    "https://api.example.com/webhook",
			LicenseID:     "test-license",
			LicenseDevice: "",
			MaxRetries:    3,
			Timeout:       10 * time.Second,
			FlushInterval: 5 * time.Second,
			MaxQueueSize:  50,
		}

		err := config.Validate()
		if err == nil {
			t.Error("expected error for empty licenseDevice")
		}
	})

	t.Run("should return error for negative maxRetries", func(t *testing.T) {
		config := &ClientConfig{
			WebhookURL:    "https://api.example.com/webhook",
			LicenseID:     "test-license",
			LicenseDevice: "test-device",
			MaxRetries:    -1,
			Timeout:       10 * time.Second,
			FlushInterval: 5 * time.Second,
			MaxQueueSize:  50,
		}

		err := config.Validate()
		if err == nil {
			t.Error("expected error for negative maxRetries")
		}
	})

	t.Run("should return error for maxRetries > 10", func(t *testing.T) {
		config := &ClientConfig{
			WebhookURL:    "https://api.example.com/webhook",
			LicenseID:     "test-license",
			LicenseDevice: "test-device",
			MaxRetries:    11,
			Timeout:       10 * time.Second,
			FlushInterval: 5 * time.Second,
			MaxQueueSize:  50,
		}

		err := config.Validate()
		if err == nil {
			t.Error("expected error for maxRetries > 10")
		}
	})

	t.Run("should return error for timeout < 1s", func(t *testing.T) {
		config := &ClientConfig{
			WebhookURL:    "https://api.example.com/webhook",
			LicenseID:     "test-license",
			LicenseDevice: "test-device",
			MaxRetries:    3,
			Timeout:       500 * time.Millisecond,
			FlushInterval: 5 * time.Second,
			MaxQueueSize:  50,
		}

		err := config.Validate()
		if err == nil {
			t.Error("expected error for timeout < 1s")
		}
	})

	t.Run("should return error for timeout > 60s", func(t *testing.T) {
		config := &ClientConfig{
			WebhookURL:    "https://api.example.com/webhook",
			LicenseID:     "test-license",
			LicenseDevice: "test-device",
			MaxRetries:    3,
			Timeout:       61 * time.Second,
			FlushInterval: 5 * time.Second,
			MaxQueueSize:  50,
		}

		err := config.Validate()
		if err == nil {
			t.Error("expected error for timeout > 60s")
		}
	})

	t.Run("should return error for flushInterval < 100ms", func(t *testing.T) {
		config := &ClientConfig{
			WebhookURL:    "https://api.example.com/webhook",
			LicenseID:     "test-license",
			LicenseDevice: "test-device",
			MaxRetries:    3,
			Timeout:       10 * time.Second,
			FlushInterval: 50 * time.Millisecond,
			MaxQueueSize:  50,
		}

		err := config.Validate()
		if err == nil {
			t.Error("expected error for flushInterval < 100ms")
		}
	})

	t.Run("should return error for maxQueueSize < 1", func(t *testing.T) {
		config := &ClientConfig{
			WebhookURL:    "https://api.example.com/webhook",
			LicenseID:     "test-license",
			LicenseDevice: "test-device",
			MaxRetries:    3,
			Timeout:       10 * time.Second,
			FlushInterval: 5 * time.Second,
			MaxQueueSize:  0,
		}

		err := config.Validate()
		if err == nil {
			t.Error("expected error for maxQueueSize < 1")
		}
	})

	t.Run("should validate with optional fields", func(t *testing.T) {
		config := &ClientConfig{
			WebhookURL:    "https://api.example.com/webhook",
			LicenseID:     "test-license",
			LicenseName:   "Test License",
			LicenseDevice: "test-device",
			App:           "test-app",
			Version:       "1.0.0",
			Platform:      "linux",
			Enabled:       true,
			MaxRetries:    3,
			Timeout:       10 * time.Second,
			FlushInterval: 5 * time.Second,
			MaxQueueSize:  50,
			Headers: map[string]string{
				"X-Custom-Header": "value",
			},
		}

		err := config.Validate()
		if err != nil {
			t.Errorf("expected no error, got %v", err)
		}
	})
}

func TestEventLevel(t *testing.T) {
	t.Run("should have correct level values", func(t *testing.T) {
		if LevelDebug != "DEBUG" {
			t.Errorf("expected LevelDebug to be 'DEBUG', got %s", LevelDebug)
		}

		if LevelInfo != "INFO" {
			t.Errorf("expected LevelInfo to be 'INFO', got %s", LevelInfo)
		}

		if LevelWarning != "WARNING" {
			t.Errorf("expected LevelWarning to be 'WARNING', got %s", LevelWarning)
		}

		if LevelError != "ERROR" {
			t.Errorf("expected LevelError to be 'ERROR', got %s", LevelError)
		}

		if LevelFatal != "FATAL" {
			t.Errorf("expected LevelFatal to be 'FATAL', got %s", LevelFatal)
		}
	})
}

func TestEventContext(t *testing.T) {
	t.Run("should create event context", func(t *testing.T) {
		ctx := EventContext{
			Culprit:  "main.go:42",
			Extra:    map[string]string{"key": "value"},
			Platform: "linux",
			App:      "test-app",
			Version:  "1.0.0",
			Device:   "test-device",
			Tags:     []string{"tag1", "tag2"},
		}

		if ctx.Culprit != "main.go:42" {
			t.Errorf("expected Culprit to be 'main.go:42', got %s", ctx.Culprit)
		}

		if ctx.Platform != "linux" {
			t.Errorf("expected Platform to be 'linux', got %s", ctx.Platform)
		}

		if ctx.App != "test-app" {
			t.Errorf("expected App to be 'test-app', got %s", ctx.App)
		}

		if ctx.Version != "1.0.0" {
			t.Errorf("expected Version to be '1.0.0', got %s", ctx.Version)
		}

		if ctx.Device != "test-device" {
			t.Errorf("expected Device to be 'test-device', got %s", ctx.Device)
		}

		if len(ctx.Tags) != 2 {
			t.Errorf("expected 2 tags, got %d", len(ctx.Tags))
		}
	})
}

func TestSerializedError(t *testing.T) {
	t.Run("should create serialized error", func(t *testing.T) {
		err := SerializedError{
			Name:    "Error",
			Message: "test error",
			Stack:   "stack trace",
			Extra:   map[string]string{"key": "value"},
		}

		if err.Name != "Error" {
			t.Errorf("expected Name to be 'Error', got %s", err.Name)
		}

		if err.Message != "test error" {
			t.Errorf("expected Message to be 'test error', got %s", err.Message)
		}

		if err.Stack != "stack trace" {
			t.Errorf("expected Stack to be 'stack trace', got %s", err.Stack)
		}

		if err.Extra["key"] != "value" {
			t.Errorf("expected Extra['key'] to be 'value', got %s", err.Extra["key"])
		}
	})
}

func TestEventIssue(t *testing.T) {
	t.Run("should create event issue", func(t *testing.T) {
		event := EventIssue{
			EventID:   "test-id",
			Title:     "test title",
			Level:     string(LevelError),
			Timestamp: "2024-01-01T00:00:00Z",
			Event: SerializedError{
				Name:    "Error",
				Message: "test error",
			},
			Context: EventContext{
				Culprit: "main.go:42",
			},
		}

		if event.EventID != "test-id" {
			t.Errorf("expected EventID to be 'test-id', got %s", event.EventID)
		}

		if event.Title != "test title" {
			t.Errorf("expected Title to be 'test title', got %s", event.Title)
		}

		if event.Level != string(LevelError) {
			t.Errorf("expected Level to be 'ERROR', got %s", event.Level)
		}

		if event.Timestamp != "2024-01-01T00:00:00Z" {
			t.Errorf("expected Timestamp to be '2024-01-01T00:00:00Z', got %s", event.Timestamp)
		}
	})
}

func TestTransportPayload(t *testing.T) {
	t.Run("should create transport payload", func(t *testing.T) {
		payload := TransportPayload{
			Event:         "compressed-event-data",
			LicenseID:     "test-license",
			LicenseName:   "Test License",
			LicenseDevice: "test-device",
		}

		if payload.Event != "compressed-event-data" {
			t.Errorf("expected Event to be 'compressed-event-data', got %s", payload.Event)
		}

		if payload.LicenseID != "test-license" {
			t.Errorf("expected LicenseID to be 'test-license', got %s", payload.LicenseID)
		}

		if payload.LicenseName != "Test License" {
			t.Errorf("expected LicenseName to be 'Test License', got %s", payload.LicenseName)
		}

		if payload.LicenseDevice != "test-device" {
			t.Errorf("expected LicenseDevice to be 'test-device', got %s", payload.LicenseDevice)
		}
	})
}
