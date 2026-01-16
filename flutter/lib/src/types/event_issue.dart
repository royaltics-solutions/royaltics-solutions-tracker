class EventContext {
  final String culprit;
  final Map<String, String>? extra;
  final String? platform;
  final String? app;
  final String? version;
  final String? device;
  final List<String>? tags;

  EventContext({
    required this.culprit,
    this.extra,
    this.platform,
    this.app,
    this.version,
    this.device,
    this.tags,
  });

  Map<String, dynamic> toJson() {
    return {
      'culprit': culprit,
      if (extra != null) 'extra': extra,
      if (platform != null) 'platform': platform,
      if (app != null) 'app': app,
      if (version != null) 'version': version,
      if (device != null) 'device': device,
      if (tags != null) 'tags': tags,
    };
  }
}

class SerializedError {
  final String name;
  final String message;
  final String? stack;
  final Map<String, String>? additionalData;

  SerializedError({
    required this.name,
    required this.message,
    this.stack,
    this.additionalData,
  });

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'message': message,
      if (stack != null) 'stack': stack,
      if (additionalData != null) 'additionalData': additionalData,
    };
  }
}

class EventIssue {
  final String eventId;
  final String title;
  final String level;
  final SerializedError event;
  final EventContext context;
  final String timestamp;

  EventIssue({
    required this.eventId,
    required this.title,
    required this.level,
    required this.event,
    required this.context,
    required this.timestamp,
  });

  Map<String, dynamic> toJson() {
    return {
      'eventId': eventId,
      'title': title,
      'level': level,
      'event': event.toJson(),
      'context': context.toJson(),
      'timestamp': timestamp,
    };
  }
}

class TransportPayload {
  final String event;
  final String licenseId;
  final String? licenseName;
  final String licenseDevice;

  TransportPayload({
    required this.event,
    required this.licenseId,
    required this.licenseDevice,
    this.licenseName,
  });

  Map<String, dynamic> toJson() {
    return {
      'event': event,
      'licenseId': licenseId,
      if (licenseName != null) 'licenseName': licenseName,
      'licenseDevice': licenseDevice,
    };
  }
}
