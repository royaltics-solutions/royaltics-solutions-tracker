package core

import (
	"encoding/json"
	"fmt"
	"os"
	"runtime"
	"time"

	"github.com/google/uuid"
	"github.com/royaltics/tracker-go/types"
)

type EventBuilder struct {
	app      string
	version  string
	platform string
	device   string
}

func NewEventBuilder(app, version, platform, device string) *EventBuilder {
	return &EventBuilder{
		app:      app,
		version:  version,
		platform: platform,
		device:   device,
	}
}

func (eb *EventBuilder) Build(
	title string,
	err error,
	level types.EventLevel,
	extra map[string]string,
) types.EventIssue {
	culprit := eb.extractCulprit()
	serializedError := eb.serializeError(err)
	tags := eb.extractTags(err)

	platform := eb.platform
	if platform == "" {
		platform = runtime.GOOS
	}

	device := eb.device
	if device == "" {
		device = os.Getenv("HOSTNAME")
		if device == "" {
			device = "unknown"
		}
	}

	return types.EventIssue{
		EventID:   uuid.New().String(),
		Title:     title,
		Level:     string(level),
		Event:     serializedError,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Context: types.EventContext{
			Culprit:  culprit,
			Extra:    extra,
			Platform: platform,
			App:      eb.app,
			Version:  eb.version,
			Device:   device,
			Tags:     tags,
		},
	}
}

func (eb *EventBuilder) Stringify(event types.EventIssue) (string, error) {
	data, err := json.Marshal(event)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

func (eb *EventBuilder) extractCulprit() string {
	pc := make([]uintptr, 10)
	n := runtime.Callers(4, pc)
	
	if n > 0 {
		frames := runtime.CallersFrames(pc[:n])
		frame, _ := frames.Next()
		return fmt.Sprintf("%s:%d", frame.Function, frame.Line)
	}
	
	return "Unknown"
}

func (eb *EventBuilder) serializeError(err error) types.SerializedError {
	if err == nil {
		return types.SerializedError{
			Name:    "UnknownError",
			Message: "Unknown error",
		}
	}

	stack := eb.getStackTrace()

	return types.SerializedError{
		Name:    fmt.Sprintf("%T", err),
		Message: err.Error(),
		Stack:   stack,
	}
}

func (eb *EventBuilder) getStackTrace() string {
	buf := make([]byte, 4096)
	n := runtime.Stack(buf, false)
	return string(buf[:n])
}

func (eb *EventBuilder) extractTags(err error) []string {
	tags := []string{}
	
	if err != nil {
		tags = append(tags, fmt.Sprintf("error:%T", err))
	}
	
	return tags
}
