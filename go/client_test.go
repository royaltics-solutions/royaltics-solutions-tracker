package errortracker

import (
	"errors"
	"testing"
	"time"

	"github.com/royaltics/tracker-go/types"
)

func TestNewClient(t *testing.T) {
	t.Run("should create client with valid config", func(t *testing.T) {
		config := &types.ClientConfig{
			WebhookURL:    "https://api.example.com/webhook",
			LicenseID:     "test-license",
			LicenseDevice: "test-device",
			Enabled:       true,
			MaxRetries:    3,
			Timeout:       10 * time.Second,
			FlushInterval: 5 * time.Second,
			MaxQueueSize:  50,
		}

		client, err := NewClient(config)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}

		if client == nil {
			t.Fatal("expected client to be created")
		}

		if client.config != config {
			t.Error("expected config to be set")
		}

		if client.eventBuilder == nil {
			t.Error("expected eventBuilder to be initialized")
		}

		if client.transport == nil {
			t.Error("expected transport to be initialized")
		}

		if client.eventQueue == nil {
			t.Error("expected eventQueue to be initialized")
		}

		if !client.isEnabled {
			t.Error("expected client to be enabled")
		}
	})

	t.Run("should return error for invalid config", func(t *testing.T) {
		config := &types.ClientConfig{
			WebhookURL: "",
		}

		_, err := NewClient(config)
		if err == nil {
			t.Error("expected error for invalid config")
		}
	})

	t.Run("should set default values", func(t *testing.T) {
		config := &types.ClientConfig{
			WebhookURL:    "https://api.example.com/webhook",
			LicenseID:     "test-license",
			LicenseDevice: "test-device",
			Enabled:       true,
		}

		client, err := NewClient(config)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}

		if client.config.MaxRetries != 3 {
			t.Errorf("expected MaxRetries to be 3, got %d", client.config.MaxRetries)
		}

		if client.config.Timeout != 10*time.Second {
			t.Errorf("expected Timeout to be 10s, got %v", client.config.Timeout)
		}

		if client.config.FlushInterval != 5*time.Second {
			t.Errorf("expected FlushInterval to be 5s, got %v", client.config.FlushInterval)
		}

		if client.config.MaxQueueSize != 50 {
			t.Errorf("expected MaxQueueSize to be 50, got %d", client.config.MaxQueueSize)
		}
	})

	t.Run("should respect custom values", func(t *testing.T) {
		config := &types.ClientConfig{
			WebhookURL:    "https://api.example.com/webhook",
			LicenseID:     "test-license",
			LicenseDevice: "test-device",
			Enabled:       true,
			MaxRetries:    5,
			Timeout:       20 * time.Second,
			FlushInterval: 10 * time.Second,
			MaxQueueSize:  100,
		}

		client, err := NewClient(config)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}

		if client.config.MaxRetries != 5 {
			t.Errorf("expected MaxRetries to be 5, got %d", client.config.MaxRetries)
		}

		if client.config.Timeout != 20*time.Second {
			t.Errorf("expected Timeout to be 20s, got %v", client.config.Timeout)
		}

		if client.config.FlushInterval != 10*time.Second {
			t.Errorf("expected FlushInterval to be 10s, got %v", client.config.FlushInterval)
		}

		if client.config.MaxQueueSize != 100 {
			t.Errorf("expected MaxQueueSize to be 100, got %d", client.config.MaxQueueSize)
		}
	})
}

func TestClientStart(t *testing.T) {
	t.Run("should start client", func(t *testing.T) {
		config := &types.ClientConfig{
			WebhookURL:    "https://api.example.com/webhook",
			LicenseID:     "test-license",
			LicenseDevice: "test-device",
			Enabled:       true,
			MaxRetries:    3,
			Timeout:       10 * time.Second,
			FlushInterval: 5 * time.Second,
			MaxQueueSize:  50,
		}

		client, _ := NewClient(config)

		if client.isActive {
			t.Error("expected client to not be active initially")
		}

		client.Start()

		if !client.isActive {
			t.Error("expected client to be active after start")
		}
	})

	t.Run("should not start twice", func(t *testing.T) {
		config := &types.ClientConfig{
			WebhookURL:    "https://api.example.com/webhook",
			LicenseID:     "test-license",
			LicenseDevice: "test-device",
			Enabled:       true,
			MaxRetries:    3,
			Timeout:       10 * time.Second,
			FlushInterval: 5 * time.Second,
			MaxQueueSize:  50,
		}

		client, _ := NewClient(config)
		client.Start()
		client.Start()

		if !client.isActive {
			t.Error("expected client to remain active")
		}
	})
}

func TestClientError(t *testing.T) {
	t.Run("should track error", func(t *testing.T) {
		config := &types.ClientConfig{
			WebhookURL:    "https://api.example.com/webhook",
			LicenseID:     "test-license",
			LicenseDevice: "test-device",
			Enabled:       true,
			MaxRetries:    3,
			Timeout:       10 * time.Second,
			FlushInterval: 5 * time.Second,
			MaxQueueSize:  50,
		}

		client, _ := NewClient(config)
		client.Start()

		err := errors.New("test error")
		client.Error(err, types.LevelError, map[string]string{
			"userId": "123",
		})

		client.queueMu.Lock()
		queueLen := len(client.eventQueue)
		client.queueMu.Unlock()

		if queueLen != 1 {
			t.Errorf("expected queue length to be 1, got %d", queueLen)
		}
	})

	t.Run("should not track when disabled", func(t *testing.T) {
		config := &types.ClientConfig{
			WebhookURL:    "https://api.example.com/webhook",
			LicenseID:     "test-license",
			LicenseDevice: "test-device",
			Enabled:       false,
			MaxRetries:    3,
			Timeout:       10 * time.Second,
			FlushInterval: 5 * time.Second,
			MaxQueueSize:  50,
		}

		client, _ := NewClient(config)
		client.Start()

		err := errors.New("test error")
		client.Error(err, types.LevelError, nil)

		client.queueMu.Lock()
		queueLen := len(client.eventQueue)
		client.queueMu.Unlock()

		if queueLen != 0 {
			t.Errorf("expected queue length to be 0, got %d", queueLen)
		}
	})

	t.Run("should handle nil error", func(t *testing.T) {
		config := &types.ClientConfig{
			WebhookURL:    "https://api.example.com/webhook",
			LicenseID:     "test-license",
			LicenseDevice: "test-device",
			Enabled:       true,
			MaxRetries:    3,
			Timeout:       10 * time.Second,
			FlushInterval: 5 * time.Second,
			MaxQueueSize:  50,
		}

		client, _ := NewClient(config)
		client.Start()

		client.Error(nil, types.LevelError, nil)

		client.queueMu.Lock()
		queueLen := len(client.eventQueue)
		client.queueMu.Unlock()

		if queueLen != 1 {
			t.Errorf("expected queue length to be 1, got %d", queueLen)
		}
	})

	t.Run("should track error with all levels", func(t *testing.T) {
		config := &types.ClientConfig{
			WebhookURL:    "https://api.example.com/webhook",
			LicenseID:     "test-license",
			LicenseDevice: "test-device",
			Enabled:       true,
			MaxRetries:    3,
			Timeout:       10 * time.Second,
			FlushInterval: 5 * time.Second,
			MaxQueueSize:  50,
		}

		client, _ := NewClient(config)
		client.Start()

		levels := []types.EventLevel{
			types.LevelDebug,
			types.LevelInfo,
			types.LevelWarning,
			types.LevelError,
			types.LevelFatal,
		}

		for _, level := range levels {
			client.Error(errors.New("test"), level, nil)
		}

		client.queueMu.Lock()
		queueLen := len(client.eventQueue)
		client.queueMu.Unlock()

		if queueLen != 5 {
			t.Errorf("expected queue length to be 5, got %d", queueLen)
		}
	})
}

func TestClientEvent(t *testing.T) {
	t.Run("should track event", func(t *testing.T) {
		config := &types.ClientConfig{
			WebhookURL:    "https://api.example.com/webhook",
			LicenseID:     "test-license",
			LicenseDevice: "test-device",
			Enabled:       true,
			MaxRetries:    3,
			Timeout:       10 * time.Second,
			FlushInterval: 5 * time.Second,
			MaxQueueSize:  50,
		}

		client, _ := NewClient(config)
		client.Start()

		client.Event("User logged in", types.LevelInfo, map[string]string{
			"userId": "123",
		})

		client.queueMu.Lock()
		queueLen := len(client.eventQueue)
		client.queueMu.Unlock()

		if queueLen != 1 {
			t.Errorf("expected queue length to be 1, got %d", queueLen)
		}
	})

	t.Run("should not track when disabled", func(t *testing.T) {
		config := &types.ClientConfig{
			WebhookURL:    "https://api.example.com/webhook",
			LicenseID:     "test-license",
			LicenseDevice: "test-device",
			Enabled:       false,
			MaxRetries:    3,
			Timeout:       10 * time.Second,
			FlushInterval: 5 * time.Second,
			MaxQueueSize:  50,
		}

		client, _ := NewClient(config)
		client.Start()

		client.Event("test event", types.LevelInfo, nil)

		client.queueMu.Lock()
		queueLen := len(client.eventQueue)
		client.queueMu.Unlock()

		if queueLen != 0 {
			t.Errorf("expected queue length to be 0, got %d", queueLen)
		}
	})
}

func TestClientPauseResume(t *testing.T) {
	t.Run("should pause client", func(t *testing.T) {
		config := &types.ClientConfig{
			WebhookURL:    "https://api.example.com/webhook",
			LicenseID:     "test-license",
			LicenseDevice: "test-device",
			Enabled:       true,
			MaxRetries:    3,
			Timeout:       10 * time.Second,
			FlushInterval: 5 * time.Second,
			MaxQueueSize:  50,
		}

		client, _ := NewClient(config)
		client.Start()

		if !client.isEnabled {
			t.Error("expected client to be enabled")
		}

		client.Pause()

		if client.isEnabled {
			t.Error("expected client to be disabled")
		}
	})

	t.Run("should resume client", func(t *testing.T) {
		config := &types.ClientConfig{
			WebhookURL:    "https://api.example.com/webhook",
			LicenseID:     "test-license",
			LicenseDevice: "test-device",
			Enabled:       true,
			MaxRetries:    3,
			Timeout:       10 * time.Second,
			FlushInterval: 5 * time.Second,
			MaxQueueSize:  50,
		}

		client, _ := NewClient(config)
		client.Start()
		client.Pause()

		if client.isEnabled {
			t.Error("expected client to be disabled")
		}

		client.Resume()

		if !client.isEnabled {
			t.Error("expected client to be enabled")
		}
	})

	t.Run("should not track when paused", func(t *testing.T) {
		config := &types.ClientConfig{
			WebhookURL:    "https://api.example.com/webhook",
			LicenseID:     "test-license",
			LicenseDevice: "test-device",
			Enabled:       true,
			MaxRetries:    3,
			Timeout:       10 * time.Second,
			FlushInterval: 5 * time.Second,
			MaxQueueSize:  50,
		}

		client, _ := NewClient(config)
		client.Start()
		client.Pause()

		client.Error(errors.New("test"), types.LevelError, nil)

		client.queueMu.Lock()
		queueLen := len(client.eventQueue)
		client.queueMu.Unlock()

		if queueLen != 0 {
			t.Errorf("expected queue length to be 0, got %d", queueLen)
		}
	})
}

func TestClientShutdown(t *testing.T) {
	t.Run("should shutdown client", func(t *testing.T) {
		config := &types.ClientConfig{
			WebhookURL:    "https://api.example.com/webhook",
			LicenseID:     "test-license",
			LicenseDevice: "test-device",
			Enabled:       true,
			MaxRetries:    3,
			Timeout:       10 * time.Second,
			FlushInterval: 5 * time.Second,
			MaxQueueSize:  50,
		}

		client, _ := NewClient(config)
		client.Start()

		if !client.isActive {
			t.Error("expected client to be active")
		}

		if !client.isEnabled {
			t.Error("expected client to be enabled")
		}

		err := client.Shutdown()
		if err != nil {
			t.Errorf("expected no error, got %v", err)
		}

		if client.isActive {
			t.Error("expected client to be inactive")
		}

		if client.isEnabled {
			t.Error("expected client to be disabled")
		}
	})

	t.Run("should flush queue on shutdown", func(t *testing.T) {
		config := &types.ClientConfig{
			WebhookURL:    "https://api.example.com/webhook",
			LicenseID:     "test-license",
			LicenseDevice: "test-device",
			Enabled:       true,
			MaxRetries:    3,
			Timeout:       10 * time.Second,
			FlushInterval: 5 * time.Second,
			MaxQueueSize:  50,
		}

		client, _ := NewClient(config)
		client.Start()

		client.Error(errors.New("test"), types.LevelError, nil)

		client.queueMu.Lock()
		queueLen := len(client.eventQueue)
		client.queueMu.Unlock()

		if queueLen != 1 {
			t.Errorf("expected queue length to be 1, got %d", queueLen)
		}

		client.Shutdown()

		client.queueMu.Lock()
		queueLen = len(client.eventQueue)
		client.queueMu.Unlock()

		if queueLen != 0 {
			t.Errorf("expected queue to be empty after shutdown, got %d", queueLen)
		}
	})
}

func TestClientEnqueue(t *testing.T) {
	t.Run("should enqueue event", func(t *testing.T) {
		config := &types.ClientConfig{
			WebhookURL:    "https://api.example.com/webhook",
			LicenseID:     "test-license",
			LicenseDevice: "test-device",
			Enabled:       true,
			MaxRetries:    3,
			Timeout:       10 * time.Second,
			FlushInterval: 5 * time.Second,
			MaxQueueSize:  50,
		}

		client, _ := NewClient(config)
		client.Start()

		event := types.EventIssue{
			EventID:   "test-id",
			Title:     "test",
			Level:     string(types.LevelError),
			Timestamp: time.Now().Format(time.RFC3339),
		}

		client.enqueue(event)

		client.queueMu.Lock()
		queueLen := len(client.eventQueue)
		client.queueMu.Unlock()

		if queueLen != 1 {
			t.Errorf("expected queue length to be 1, got %d", queueLen)
		}
	})

	t.Run("should trigger batch when queue is full", func(t *testing.T) {
		config := &types.ClientConfig{
			WebhookURL:    "https://api.example.com/webhook",
			LicenseID:     "test-license",
			LicenseDevice: "test-device",
			Enabled:       true,
			MaxRetries:    3,
			Timeout:       10 * time.Second,
			FlushInterval: 5 * time.Second,
			MaxQueueSize:  2,
		}

		client, _ := NewClient(config)
		client.Start()

		event := types.EventIssue{
			EventID:   "test-id",
			Title:     "test",
			Level:     string(types.LevelError),
			Timestamp: time.Now().Format(time.RFC3339),
		}

		client.enqueue(event)
		client.enqueue(event)

		time.Sleep(100 * time.Millisecond)

		client.queueMu.Lock()
		queueLen := len(client.eventQueue)
		client.queueMu.Unlock()

		if queueLen >= 2 {
			t.Errorf("expected queue to be processed, got length %d", queueLen)
		}
	})
}

func TestClientForceFlush(t *testing.T) {
	t.Run("should flush empty queue", func(t *testing.T) {
		config := &types.ClientConfig{
			WebhookURL:    "https://api.example.com/webhook",
			LicenseID:     "test-license",
			LicenseDevice: "test-device",
			Enabled:       true,
			MaxRetries:    3,
			Timeout:       10 * time.Second,
			FlushInterval: 5 * time.Second,
			MaxQueueSize:  50,
		}

		client, _ := NewClient(config)
		client.Start()

		err := client.ForceFlush()
		if err != nil {
			t.Errorf("expected no error, got %v", err)
		}
	})
}
