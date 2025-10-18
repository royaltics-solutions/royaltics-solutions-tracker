package errortracker

import (
	"fmt"
	"sync"
	"time"

	"github.com/royaltics/tracker-go/core"
	"github.com/royaltics/tracker-go/types"
	"github.com/royaltics/tracker-go/utils"
)

type ErrorTrackerClient struct {
	config       *types.ClientConfig
	eventBuilder *core.EventBuilder
	transport    *core.Transport
	eventQueue   []types.EventIssue
	queueMu      sync.Mutex
	isActive     bool
	isEnabled    bool
	isProcessing bool
	stopChan     chan struct{}
	wg           sync.WaitGroup
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

	client := &ErrorTrackerClient{
		config:       config,
		eventBuilder: core.NewEventBuilder(config.App, config.Version, config.Platform, config.LicenseDevice),
		transport:    core.NewTransport(config),
		eventQueue:   make([]types.EventIssue, 0, config.MaxQueueSize),
		isEnabled:    config.Enabled,
		stopChan:     make(chan struct{}),
	}

	return client, nil
}

func (c *ErrorTrackerClient) Start() *ErrorTrackerClient {
	if c.isActive {
		return c
	}

	c.isActive = true
	c.startBatchProcessor()
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
	c.enqueue(event)

	return c
}

func (c *ErrorTrackerClient) Event(title string, level types.EventLevel, metadata map[string]string) *ErrorTrackerClient {
	if !c.isEnabled {
		return c
	}

	err := fmt.Errorf("%s", title)
	event := c.eventBuilder.Build(title, err, level, metadata)
	c.enqueue(event)

	return c
}

func (c *ErrorTrackerClient) ForceFlush() error {
	for {
		c.queueMu.Lock()
		queueLen := len(c.eventQueue)
		c.queueMu.Unlock()

		if queueLen == 0 {
			break
		}

		if err := c.processBatch(); err != nil {
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

func (c *ErrorTrackerClient) startBatchProcessor() {
	c.wg.Add(1)
	go func() {
		defer c.wg.Done()
		ticker := time.NewTicker(c.config.FlushInterval)
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				c.processBatch()
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
		go c.processBatch()
	}
}

func (c *ErrorTrackerClient) processBatch() error {
	c.queueMu.Lock()
	if len(c.eventQueue) == 0 || c.isProcessing {
		c.queueMu.Unlock()
		return nil
	}
	c.isProcessing = true

	batchSize := c.config.MaxQueueSize
	if len(c.eventQueue) < batchSize {
		batchSize = len(c.eventQueue)
	}

	batch := make([]types.EventIssue, batchSize)
	copy(batch, c.eventQueue[:batchSize])
	c.eventQueue = c.eventQueue[batchSize:]
	c.queueMu.Unlock()

	var wg sync.WaitGroup
	errChan := make(chan error, len(batch))

	for _, event := range batch {
		wg.Add(1)
		go func(evt types.EventIssue) {
			defer wg.Done()
			if err := c.dispatchEvent(evt); err != nil {
				errChan <- err
			}
		}(event)
	}

	wg.Wait()
	close(errChan)

	c.queueMu.Lock()
	c.isProcessing = false
	c.queueMu.Unlock()

	for err := range errChan {
		if err != nil {
			return err
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
