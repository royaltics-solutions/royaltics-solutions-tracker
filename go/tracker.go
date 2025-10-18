package errortracker

import (
	"fmt"
	"sync"

	"github.com/royaltics/tracker-go/types"
)

var (
	instances       = make(map[string]*ErrorTrackerClient)
	defaultInstance *ErrorTrackerClient
	mu              sync.RWMutex
)

func Create(config *types.ClientConfig, name ...string) (*ErrorTrackerClient, error) {
	client, err := NewClient(config)
	if err != nil {
		return nil, err
	}

	mu.Lock()
	defer mu.Unlock()

	if len(name) > 0 && name[0] != "" {
		instances[name[0]] = client
	} else if defaultInstance == nil {
		defaultInstance = client
	}

	return client.Start(), nil
}

func Get(name ...string) (*ErrorTrackerClient, error) {
	mu.RLock()
	defer mu.RUnlock()

	if len(name) > 0 && name[0] != "" {
		client, ok := instances[name[0]]
		if !ok {
			return nil, fmt.Errorf("tracker instance %q not found", name[0])
		}
		return client, nil
	}

	if defaultInstance == nil {
		return nil, fmt.Errorf("no default tracker initialized. Call Create() first")
	}

	return defaultInstance, nil
}

func Error(err error, level types.EventLevel, metadata map[string]string) error {
	client, e := Get()
	if e != nil {
		return e
	}
	client.Error(err, level, metadata)
	return nil
}

func Event(title string, level types.EventLevel, metadata map[string]string) error {
	client, err := Get()
	if err != nil {
		return err
	}
	client.Event(title, level, metadata)
	return nil
}

func Flush() error {
	client, err := Get()
	if err != nil {
		return err
	}
	return client.ForceFlush()
}

func Pause() error {
	client, err := Get()
	if err != nil {
		return err
	}
	client.Pause()
	return nil
}

func Resume() error {
	client, err := Get()
	if err != nil {
		return err
	}
	client.Resume()
	return nil
}

func Shutdown() error {
	mu.Lock()
	defer mu.Unlock()

	if defaultInstance != nil {
		if err := defaultInstance.Shutdown(); err != nil {
			return err
		}
		defaultInstance = nil
	}

	for _, client := range instances {
		if err := client.Shutdown(); err != nil {
			return err
		}
	}

	instances = make(map[string]*ErrorTrackerClient)
	return nil
}

func Has(name ...string) bool {
	mu.RLock()
	defer mu.RUnlock()

	if len(name) > 0 && name[0] != "" {
		_, ok := instances[name[0]]
		return ok
	}

	return defaultInstance != nil
}
