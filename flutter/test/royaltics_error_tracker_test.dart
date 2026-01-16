import 'package:flutter_test/flutter_test.dart';
import 'package:royaltics_error_tracker/royaltics_error_tracker.dart';
import 'package:royaltics_error_tracker/src/utils/compression.dart';

void main() {
  group('Compression', () {
    test('compressAndEncode returns valid base64 string', () {
      final input = '{"test": "data"}';
      final result = Compression.compressAndEncode(input);
      expect(result, isNotEmpty);
      // We can't easily verify the exact string as gzip header has timestamps/OS info unless we fix it
      // but we can check it's base64
      expect(result, matches(RegExp(r'^[a-zA-Z0-9+/]+={0,2}$')));
    });
  });

  group('ClientConfig', () {
    test('validates webhookUrl', () {
      expect(
        () => ClientConfig(
          webhookUrl: '',
          licenseId: '123',
          licenseDevice: 'dev',
        ),
        throwsArgumentError,
      );
      expect(
        () => ClientConfig(
          webhookUrl: 'ftp://example.com',
          licenseId: '123',
          licenseDevice: 'dev',
        ),
        throwsArgumentError,
      );
    });

    test('validates numeric ranges', () {
      expect(
        () => ClientConfig(
          webhookUrl: 'https://example.com',
          licenseId: '123',
          licenseDevice: 'dev',
          maxRetries: -1,
        ),
        throwsArgumentError,
      );
      expect(
        () => ClientConfig(
          webhookUrl: 'https://example.com',
          licenseId: '123',
          licenseDevice: 'dev',
          flushInterval: 50,
        ),
        throwsArgumentError,
      );
    });
    
    test('creates valid config', () {
      final config = ClientConfig(
        webhookUrl: 'https://example.com',
        licenseId: '123',
        licenseDevice: 'dev',
      );
      expect(config.enabled, isTrue);
    });
  });
}
