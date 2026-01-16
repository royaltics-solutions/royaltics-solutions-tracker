import 'dart:io';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:stack_trace/stack_trace.dart';
import 'package:uuid/uuid.dart';

import '../types/event_issue.dart';
import '../types/event_level.dart';

class EventBuilder {
  String? _app;
  String? _version;
  String? _platform;
  String? _device;
  final Uuid _uuid = const Uuid();

  EventBuilder({
    String? app,
    String? version,
    String? platform,
    String? device,
  }) {
    _app = app;
    _version = version;
    _platform = platform;
    _device = device;
  }

  Future<void> initialize() async {
    try {
      if (_app == null || _version == null) {
        final packageInfo = await PackageInfo.fromPlatform();
        _app ??= packageInfo.appName;
        _version ??= packageInfo.version;
      }

      if (_platform == null || _device == null) {
        final deviceInfo = DeviceInfoPlugin();
        if (kIsWeb) {
             final webBrowserInfo = await deviceInfo.webBrowserInfo;
             _platform ??= 'Web';
             _device ??= webBrowserInfo.userAgent;
        } else {
            if (Platform.isAndroid) {
              final androidInfo = await deviceInfo.androidInfo;
              _platform ??= 'Android';
              _device ??= '${androidInfo.manufacturer} ${androidInfo.model}';
            } else if (Platform.isIOS) {
              final iosInfo = await deviceInfo.iosInfo;
              _platform ??= 'iOS';
              _device ??= '${iosInfo.name} ${iosInfo.systemName}';
            } else if (Platform.isWindows) {
              final windowsInfo = await deviceInfo.windowsInfo;
              _platform ??= 'Windows';
              _device ??= windowsInfo.computerName;
            } else if (Platform.isLinux) {
                final linuxInfo = await deviceInfo.linuxInfo;
                _platform ??= 'Linux';
                _device ??= linuxInfo.name;
            } else if (Platform.isMacOS) {
                final macInfo = await deviceInfo.macOsInfo;
                _platform ??= 'macOS';
                _device ??= macInfo.computerName;
            }
        }
      }
    } catch (e) {
      debugPrint('Error initializing EventBuilder: $e');
    }
    
    // Fallbacks
    _platform ??= 'Unknown';
    _device ??= 'Unknown';
    _app ??= 'Unknown';
    _version ??= 'Unknown';
  }

  EventIssue build(
    String title,
    Object error, {
    EventLevel level = EventLevel.ERROR,
    Map<String, String>? extra,
    StackTrace? stackTrace,
  }) {
    final chain = stackTrace != null ? Chain.forTrace(stackTrace) : Chain.current();
    final culprit = _extractCulprit(chain);
    final serializedError = _serializeError(error, chain);
    final tags = _extractTags(error);

    return EventIssue(
      eventId: _uuid.v4(),
      title: title,
      level: level.name,
      event: serializedError,
      timestamp: DateTime.now().toIso8601String(),
      context: EventContext(
        culprit: culprit,
        extra: extra,
        platform: _platform,
        app: _app,
        version: _version,
        device: _device,
        tags: tags,
      ),
    );
  }

  String _extractCulprit(Chain chain) {
    if (chain.traces.isNotEmpty && chain.traces.first.frames.isNotEmpty) {
      final frame = chain.traces.first.frames.first;
      return '${frame.library}:${frame.line}';
    }
    return 'unknown';
  }

  SerializedError _serializeError(Object error, Chain chain) {
    return SerializedError(
      name: error.runtimeType.toString(),
      message: error.toString(),
      stack: chain.toString(),
      additionalData: null,
    );
  }

  List<String> _extractTags(Object error) {
    return [
      'error:${error.runtimeType}',
    ];
  }
}
