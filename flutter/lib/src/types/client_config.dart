class ClientConfig {
  final String webhookUrl;
  final String licenseId;
  final String? licenseName;
  final String licenseDevice;
  final String? app;
  final String? version;
  final String? platform;
  final bool enabled;
  final int maxRetries;
  final int timeout;
  final int flushInterval;
  final int maxQueueSize;
  final Map<String, String> headers;

  ClientConfig({
    required this.webhookUrl,
    required this.licenseId,
    required this.licenseDevice,
    this.licenseName,
    this.app,
    this.version,
    this.platform,
    this.enabled = true,
    this.maxRetries = 3,
    this.timeout = 10000,
    this.flushInterval = 5000,
    this.maxQueueSize = 50,
    this.headers = const {},
  }) {
    if (webhookUrl.trim().isEmpty) {
      throw ArgumentError('webhookUrl cannot be blank');
    }
    if (!webhookUrl.startsWith('http://') && !webhookUrl.startsWith('https://')) {
      throw ArgumentError('webhookUrl must be a valid HTTP/HTTPS URL');
    }
    if (licenseId.trim().isEmpty) {
      throw ArgumentError('licenseId cannot be blank');
    }
    if (licenseDevice.trim().isEmpty) {
      throw ArgumentError('licenseDevice cannot be blank');
    }
    if (maxRetries < 0 || maxRetries > 10) {
      throw ArgumentError('maxRetries must be between 0 and 10');
    }
    if (timeout < 1000 || timeout > 60000) {
      throw ArgumentError('timeout must be between 1000 and 60000ms');
    }
    if (flushInterval < 100) {
      throw ArgumentError('flushInterval must be at least 100ms');
    }
    if (maxQueueSize < 1) {
      throw ArgumentError('maxQueueSize must be at least 1');
    }
  }
}
