import 'client.dart';
import 'types/client_config.dart';
import 'types/event_level.dart';

class Tracker {
  static final Map<String, ErrorTrackerClient> _instances = {};
  static ErrorTrackerClient? _defaultInstance;

  static Future<ErrorTrackerClient> create(ClientConfig config, {String? name}) async {
    final client = ErrorTrackerClient(config);

    if (name != null) {
      _instances[name] = client;
    } else if (_defaultInstance == null) {
      _defaultInstance = client;
    }

    return await client.start();
  }

  static ErrorTrackerClient get({String? name}) {
    if (name != null) {
      final instance = _instances[name];
      if (instance == null) {
        throw StateError('Tracker instance "$name" not found');
      }
      return instance;
    } else {
      final instance = _defaultInstance;
      if (instance == null) {
        throw StateError('No default tracker initialized. Call Tracker.create() first.');
      }
      return instance;
    }
  }

  static bool has({String? name}) {
    if (name != null) {
      return _instances.containsKey(name);
    } else {
      return _defaultInstance != null;
    }
  }

  // Convenience methods forwarding to default instance

  static ErrorTrackerClient error(
    Object error, {
    StackTrace? stackTrace,
    EventLevel level = EventLevel.ERROR,
    Map<String, String>? metadata,
  }) {
    return get().error(
      error,
      stackTrace: stackTrace,
      level: level,
      extra: metadata,
    );
  }

  static ErrorTrackerClient event(
    String title, {
    EventLevel level = EventLevel.INFO,
    Map<String, String>? metadata,
  }) {
    return get().event(
      title,
      level: level,
      extra: metadata,
    );
  }

  static Future<void> flush() async {
    await get().forceFlush();
  }

  static void pause() {
    get().pause();
  }

  static void resume() {
    get().resume();
  }

  static Future<void> shutdown() async {
    if (_defaultInstance != null) {
      await _defaultInstance!.shutdown();
      _defaultInstance = null;
    }
    
    for (final instance in _instances.values) {
      await instance.shutdown();
    }
    _instances.clear();
  }
}
