package errortracker

import (
	"fmt"
	"os"
	"sync"
	"time"

	"github.com/royaltics/tracker-go/core"
	"github.com/royaltics/tracker-go/types"
	"github.com/royaltics/tracker-go/utils"
)

type ErrorTrackerClient struct {
	config           *types.ClientConfig
	eventBuilder     *core.EventBuilder
	transport        *core.Transport
	eventQueue       []types.EventIssue
	queueMu          sync.Mutex
	isActive         bool
	isEnabled        bool
	isProcessing     bool
	stopChan         chan struct{}
	wg               sync.WaitGroup
	fingerprintCache map[string]time.Time
	cacheMu          sync.Mutex
}

func NewClient(config *types.ClientConfig) (*ErrorTrackerClient, error) {
	if err := config.Validate(); err != nil {
		return nil, fmt.Errorf("invalid config: %w", err)
	}

	if config.MaxRetries == 0 {
		config.MaxRetries = 3
	}
	if config.Timeout == 0 {
		config.Timeout = 10 * time.Second
	}
	if config.FlushInterval == 0 {
		config.FlushInterval = 5 * time.Second
	}
	if config.MaxQueueSize == 0 {
		config.MaxQueueSize = 50
	}
	if config.ThrottleInterval == 0 {
		config.ThrottleInterval = 3 * time.Second
	}
	if config.DeduplicationInterval == 0 {
		config.DeduplicationInterval = 60 * time.Second
	}

	client := &ErrorTrackerClient{
		config:           config,
		eventBuilder:     core.NewEventBuilder(config.App, config.Version, config.Platform, config.LicenseDevice),
		transport:        core.NewTransport(config),
		eventQueue:       make([]types.EventIssue, 0, config.MaxQueueSize),
		isEnabled:        config.Enabled,
		stopChan:         make(chan struct{}),
		fingerprintCache: make(map[string]time.Time),
	}

	return client, nil
}

func (c *ErrorTrackerClient) Start() *ErrorTrackerClient {
	if c.isActive {
		return c
	}

	c.isActive = true
	c.startQueueProcessor()
	return c
}

func (c *ErrorTrackerClient) Error(err error, level types.EventLevel, metadata map[string]string) *ErrorTrackerClient {
	if !c.isEnabled {
		return c
	}

	title := "Unknown error"
	if err != nil {
		title = err.Error()
	}

	event := c.eventBuilder.Build(title, err, level, metadata)
	if c.isDuplicate(event) {
		return c
	}

	c.enqueue(event)
	return c
}

func (c *ErrorTrackerClient) Event(title string, level types.EventLevel, metadata map[string]string) *ErrorTrackerClient {
	if !c.isEnabled {
		return c
	}

	err := fmt.Errorf("%s", title)
	event := c.eventBuilder.Build(title, err, level, metadata)
	if c.isDuplicate(event) {
		return c
	}

	c.enqueue(event)
	return c
}

func (c *ErrorTrackerClient) isDuplicate(event types.EventIssue) bool {
	if !c.config.Deduplicate {
		return false
	}

	fingerprint := c.generateFingerprint(event)
	now := time.Now()

	c.cacheMu.Lock()
	defer c.cacheMu.Unlock()

	if lastSeen, ok := c.fingerprintCache[fingerprint]; ok {
		if now.Sub(lastSeen) < c.config.DeduplicationInterval {
			return true
		}
	}

	c.fingerprintCache[fingerprint] = now

	// Optional: cleanup old entries
	if len(c.fingerprintCache) > 1000 {
		for k, v := range c.fingerprintCache {
			if now.Sub(v) > c.config.DeduplicationInterval {
				delete(c.fingerprintCache, k)
			}
		}
	}

	return false
}

func (c *ErrorTrackerClient) generateFingerprint(event types.EventIssue) string {
	culprit := event.Context.Culprit
	if culprit == "" {
		culprit = "unknown"
	}
	return fmt.Sprintf("%s:%s:%s", event.Title, event.Event.Message, culprit)
}

func (c *ErrorTrackerClient) ForceFlush() error {
	for {
		c.queueMu.Lock()
		queueLen := len(c.eventQueue)
		c.queueMu.Unlock()

		if queueLen == 0 {
			break
		}

		if err := c.processQueue(); err != nil {
			return err
		}
	}
	return nil
}

func (c *ErrorTrackerClient) Pause() *ErrorTrackerClient {
	c.isEnabled = false
	return c
}

func (c *ErrorTrackerClient) Resume() *ErrorTrackerClient {
	c.isEnabled = true
	return c
}

func (c *ErrorTrackerClient) Shutdown() error {
	c.isEnabled = false
	c.isActive = false

	close(c.stopChan)
	c.wg.Wait()

	return c.ForceFlush()
}

func (c *ErrorTrackerClient) startQueueProcessor() {
	c.wg.Add(1)
	go func() {
		defer c.wg.Done()
		ticker := time.NewTicker(c.config.FlushInterval)
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				c.processQueue()
			case <-c.stopChan:
				return
			}
		}
	}()
}

func (c *ErrorTrackerClient) enqueue(event types.EventIssue) {
	c.queueMu.Lock()
	c.eventQueue = append(c.eventQueue, event)
	queueLen := len(c.eventQueue)
	c.queueMu.Unlock()

	if queueLen >= c.config.MaxQueueSize {
		go c.processQueue()
	}
}

func (c *ErrorTrackerClient) processQueue() error {
	c.queueMu.Lock()
	if len(c.eventQueue) == 0 || c.isProcessing {
		c.queueMu.Unlock()
		return nil
	}
	c.isProcessing = true
	c.queueMu.Unlock()

	defer func() {
		c.queueMu.Lock()
		c.isProcessing = false
		c.queueMu.Unlock()
	}()

	for {
		c.queueMu.Lock()
		if len(c.eventQueue) == 0 {
			c.queueMu.Unlock()
			break
		}
		event := c.eventQueue[0]
		c.queueMu.Unlock()

		var lastErr error
		success := false

		// Try up to MaxRetries + 1 (initial + retries)
		for attempt := 0; attempt <= c.config.MaxRetries; attempt++ {
			if err := c.dispatchEvent(event); err != nil {
				lastErr = err
				if attempt < c.config.MaxRetries {
					time.Sleep(c.config.ThrottleInterval)
				}
			} else {
				success = true
				break
			}
		}

		if !success {
			fmt.Fprintf(os.Stderr, "[ErrorTracker] Failed to dispatch event after %d attempts. Event: \"%s\". Reason: %v. This event will be ignored to prevent queue congestion.\n", c.config.MaxRetries+1, event.Title, lastErr)
		}

		c.queueMu.Lock()
		if len(c.eventQueue) > 0 {
			c.eventQueue = c.eventQueue[1:]
		}
		remaining := len(c.eventQueue)
		c.queueMu.Unlock()

		if remaining > 0 {
			time.Sleep(c.config.ThrottleInterval)
		}
	}

	return nil
}

func (c *ErrorTrackerClient) dispatchEvent(event types.EventIssue) error {
	eventString, err := c.eventBuilder.Stringify(event)
	if err != nil {
		return fmt.Errorf("failed to stringify event: %w", err)
	}

	compressed, err := utils.CompressAndEncode(eventString)
	if err != nil {
		return fmt.Errorf("failed to compress event: %w", err)
	}

	return c.transport.Send(compressed)
}
