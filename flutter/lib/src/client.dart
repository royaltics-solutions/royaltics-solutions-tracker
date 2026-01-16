import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';

import 'core/event_builder.dart';
import 'core/transport.dart';
import 'types/client_config.dart';
import 'types/event_issue.dart';
import 'types/event_level.dart';
import 'utils/compression.dart';

class ErrorTrackerClient {
  final ClientConfig config;
  late final EventBuilder _eventBuilder;
  late final Transport _transport;

  final List<EventIssue> _queue = [];
  bool _isActive = false;
  bool _isEnabled;
  bool _isProcessing = false;
  Timer? _flushTimer;

  ErrorTrackerClient(this.config) : _isEnabled = config.enabled {
    _eventBuilder = EventBuilder(
      app: config.app,
      version: config.version,
      platform: config.platform, // Can be null, EventBuilder infers
      device: config.licenseDevice,
    );
    _transport = Transport(config);
  }

  Future<ErrorTrackerClient> start() async {
    if (!_isActive) {
      _isActive = true;
      await _eventBuilder.initialize();
      _startBatchProcessor();
      _attachErrorHandlers();
    }
    return this;
  }

  void _attachErrorHandlers() {
    FlutterError.onError = (FlutterErrorDetails details) {
      error(
        details.exception,
        stackTrace: details.stack,
        level: EventLevel.FATAL,
        extra: {'context': 'FlutterError.onError'},
      );
    };

    PlatformDispatcher.instance.onError = (error, stack) {
      this.error(
        error,
        stackTrace: stack,
        level: EventLevel.FATAL,
        extra: {'context': 'PlatformDispatcher.onError'},
      );
      return true; // We handled it
    };
  }

  ErrorTrackerClient error(
    Object error, {
    StackTrace? stackTrace,
    EventLevel level = EventLevel.ERROR,
    Map<String, String>? extra,
  }) {
    if (!_isEnabled) return this;

    try {
      final title = error.toString();
      final event = _eventBuilder.build(
        title,
        error,
        level: level,
        extra: extra,
        stackTrace: stackTrace,
      );
      _enqueue(event);
    } catch (e, s) {
      _handleInternalError("Failed to track error", e, s);
    }

    return this;
  }

  ErrorTrackerClient event(
    String title, {
    EventLevel level = EventLevel.INFO,
    Map<String, String>? extra,
  }) {
    if (!_isEnabled) return this;

    try {
      final event = _eventBuilder.build(
        title,
        Exception(title), // Treat as exception for compatibility
        level: level,
        extra: extra,
      );
      _enqueue(event);
    } catch (e, s) {
      _handleInternalError("Failed to track event", e, s);
    }

    return this;
  }

  Future<void> forceFlush() async {
    while (_queue.isNotEmpty) {
      await _processBatch();
    }
  }

  ErrorTrackerClient pause() {
    _isEnabled = false;
    return this;
  }

  ErrorTrackerClient resume() {
    _isEnabled = true;
    return this;
  }

  Future<void> shutdown() async {
    _isEnabled = false;
    _isActive = false;
    _flushTimer?.cancel();
    await forceFlush();
  }

  void _startBatchProcessor() {
    _flushTimer?.cancel();
    _flushTimer = Timer.periodic(Duration(milliseconds: config.flushInterval), (_) {
      if (_isActive) {
        _processBatch();
      }
    });
  }

  void _enqueue(EventIssue event) {
    _queue.add(event);
    if (_queue.length >= config.maxQueueSize) {
      _processBatch();
    }
  }

  Future<void> _processBatch() async {
    if (_queue.isEmpty || _isProcessing) {
      return;
    }

    _isProcessing = true;

    try {
      final batchCount = _queue.length < config.maxQueueSize ? _queue.length : config.maxQueueSize;
      final batch = <EventIssue>[];
      
      for(var i = 0; i < batchCount; i++) {
        if (_queue.isNotEmpty) {
           batch.add(_queue.removeAt(0));
        }
      }

      // Send concurrently
      final futures = batch.map((event) => _dispatchEvent(event));
      await Future.wait(futures);

    } catch (e, s) {
      _handleInternalError("Batch processing failed", e, s);
    } finally {
      _isProcessing = false;
    }
  }

  Future<void> _dispatchEvent(EventIssue event) async {
    try {
      final jsonString = jsonEncode(event.toJson());
      final compressed = Compression.compressAndEncode(jsonString);
      await _transport.send(compressed);
    } catch (e, s) {
      _handleInternalError("Failed to dispatch event", e, s);
    }
  }

  void _handleInternalError(String context, Object error, StackTrace stack) {
    debugPrint("[ErrorTracker] $context: $error");
    // debugPrint(stack.toString());
  }
}
