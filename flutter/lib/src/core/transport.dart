import 'dart:async';
import 'dart:convert';
import 'dart:math';
import 'package:http/http.dart' as http;
import '../types/client_config.dart';
import '../types/event_issue.dart';

class Transport {
  final ClientConfig config;
  final http.Client _client = http.Client();

  Transport(this.config);

  Future<void> send(String compressedEvent) async {
    final payload = TransportPayload(
      event: compressedEvent,
      licenseId: config.licenseId,
      licenseName: config.licenseName,
      licenseDevice: config.licenseDevice,
    );

    Exception? lastError;

    for (int attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        await _makeRequest(payload);
        return;
      } catch (e) {
        lastError = Exception(e.toString());
        if (attempt < config.maxRetries) {
          await Future.delayed(_calculateBackoff(attempt));
        }
      }
    }

    throw lastError ?? Exception("Transport failed with unknown error");
  }

  Future<void> _makeRequest(TransportPayload payload) async {
    final jsonPayload = jsonEncode(payload.toJson());
    
    // We cannot set strict timeouts on per-request basis with http.Client easily without wrapping 
    // but we can assume the server handles it or we use .timeout()
    // However, clean http usage:
    
    final uri = Uri.parse(config.webhookUrl);
    final response = await _client.post(
      uri,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Royaltics-ErrorTracker-Flutter/1.0',
        ...config.headers,
      },
      body: jsonPayload,
    ).timeout(Duration(milliseconds: config.timeout));

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception("HTTP ${response.statusCode}: ${response.body}");
    }
  }

  Duration _calculateBackoff(int attempt) {
    const baseDelay = 1000;
    const maxDelay = 30000;
    final delayMs = min(baseDelay * (1 << attempt), maxDelay);
    return Duration(milliseconds: delayMs);
  }
}
