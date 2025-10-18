package errortracker

import (
	"errors"
	"testing"
	"time"

	"github.com/royaltics/tracker-go/types"
)

func TestCreate(t *testing.T) {
	t.Run("should create default instance", func(t *testing.T) {
		Shutdown()
		
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

		client, err := Create(config)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}

		if client == nil {
			t.Fatal("expected client to be created")
		}

		if !Has() {
			t.Error("expected default instance to exist")
		}
	})

	t.Run("should create named instance", func(t *testing.T) {
		Shutdown()
		
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

		client, err := Create(config, "custom")
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}

		if client == nil {
			t.Fatal("expected client to be created")
		}

		if !Has("custom") {
			t.Error("expected named instance to exist")
		}
	})

	t.Run("should return error for invalid config", func(t *testing.T) {
		Shutdown()
		
		config := &types.ClientConfig{
			WebhookURL: "",
		}

		_, err := Create(config)
		if err == nil {
			t.Error("expected error for invalid config")
		}
	})

	t.Run("should set default values", func(t *testing.T) {
		Shutdown()
		
		config := &types.ClientConfig{
			WebhookURL:    "https://api.example.com/webhook",
			LicenseID:     "test-license",
			LicenseDevice: "test-device",
			Enabled:       true,
		}

		client, err := Create(config)
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
}

func TestGet(t *testing.T) {
	t.Run("should get default instance", func(t *testing.T) {
		Shutdown()
		
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

		Create(config)

		client, err := Get()
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}

		if client == nil {
			t.Fatal("expected client to be returned")
		}
	})

	t.Run("should get named instance", func(t *testing.T) {
		Shutdown()
		
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

		Create(config, "custom")

		client, err := Get("custom")
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}

		if client == nil {
			t.Fatal("expected client to be returned")
		}
	})

	t.Run("should return error if no default instance", func(t *testing.T) {
		Shutdown()

		_, err := Get()
		if err == nil {
			t.Error("expected error when no default instance")
		}
	})

	t.Run("should return error if named instance not found", func(t *testing.T) {
		Shutdown()

		_, err := Get("nonexistent")
		if err == nil {
			t.Error("expected error for nonexistent instance")
		}
	})
}

func TestHas(t *testing.T) {
	t.Run("should return true if default instance exists", func(t *testing.T) {
		Shutdown()
		
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

		Create(config)

		if !Has() {
			t.Error("expected Has() to return true")
		}
	})

	t.Run("should return true if named instance exists", func(t *testing.T) {
		Shutdown()
		
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

		Create(config, "custom")

		if !Has("custom") {
			t.Error("expected Has('custom') to return true")
		}
	})

	t.Run("should return false if instance does not exist", func(t *testing.T) {
		Shutdown()

		if Has() {
			t.Error("expected Has() to return false")
		}

		if Has("nonexistent") {
			t.Error("expected Has('nonexistent') to return false")
		}
	})
}

func TestError(t *testing.T) {
	t.Run("should track error", func(t *testing.T) {
		Shutdown()
		
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

		Create(config)

		err := Error(errors.New("test error"), types.LevelError, map[string]string{
			"userId": "123",
		})

		if err != nil {
			t.Errorf("expected no error, got %v", err)
		}
	})

	t.Run("should return error if no instance", func(t *testing.T) {
		Shutdown()

		err := Error(errors.New("test error"), types.LevelError, nil)
		if err == nil {
			t.Error("expected error when no instance")
		}
	})
}

func TestEvent(t *testing.T) {
	t.Run("should track event", func(t *testing.T) {
		Shutdown()
		
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

		Create(config)

		err := Event("User logged in", types.LevelInfo, map[string]string{
			"userId": "123",
		})

		if err != nil {
			t.Errorf("expected no error, got %v", err)
		}
	})

	t.Run("should return error if no instance", func(t *testing.T) {
		Shutdown()

		err := Event("test event", types.LevelInfo, nil)
		if err == nil {
			t.Error("expected error when no instance")
		}
	})
}

func TestShutdown(t *testing.T) {
	t.Run("should shutdown all instances", func(t *testing.T) {
		Shutdown()
		
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

		Create(config)
		Create(config, "custom1")
		Create(config, "custom2")

		if !Has() {
			t.Error("expected default instance to exist")
		}
		if !Has("custom1") {
			t.Error("expected custom1 instance to exist")
		}
		if !Has("custom2") {
			t.Error("expected custom2 instance to exist")
		}

		err := Shutdown()
		if err != nil {
			t.Errorf("expected no error, got %v", err)
		}

		if Has() {
			t.Error("expected default instance to be removed")
		}
		if Has("custom1") {
			t.Error("expected custom1 instance to be removed")
		}
		if Has("custom2") {
			t.Error("expected custom2 instance to be removed")
		}
	})

	t.Run("should handle shutdown with no instances", func(t *testing.T) {
		Shutdown()

		err := Shutdown()
		if err != nil {
			t.Errorf("expected no error, got %v", err)
		}
	})
}

func TestPauseResume(t *testing.T) {
	t.Run("should pause and resume", func(t *testing.T) {
		Shutdown()
		
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

		client, _ := Create(config)

		if !client.isEnabled {
			t.Error("expected client to be enabled")
		}

		err := Pause()
		if err != nil {
			t.Errorf("expected no error, got %v", err)
		}

		if client.isEnabled {
			t.Error("expected client to be disabled")
		}

		err = Resume()
		if err != nil {
			t.Errorf("expected no error, got %v", err)
		}

		if !client.isEnabled {
			t.Error("expected client to be enabled")
		}
	})
}
