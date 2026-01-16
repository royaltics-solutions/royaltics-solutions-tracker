# Royaltics Error Tracker (Flutter)

I have successfully ported the **Royaltics Error Tracker** from Kotlin to Flutter as a reusable package.

## Features Implemented

*   **Full Compatibility**: Matches the Kotlin implementation's data contract (`EventIssue`, `ClientConfig`).
*   **Compression**: Implements GZIP compression + Base64 encoding for payloads.
*   **Resilient Transport**: Retries with exponential backoff for network requests.
*   **Batching**: Queues events and flushes them in batches or periodically.
*   **Automatic Context**: Captures App Version, OS, and Device Model automatically using `device_info_plus` and `package_info_plus`.
*   **Easy API**: Singleton access via `Tracker.init` and `Tracker.error`.

## Usage Example

```dart
import 'package:royaltics_error_tracker/royaltics_error_tracker.dart';

void main() async {
  // 1. Initialize
  await Tracker.create(
    ClientConfig(
      webhookUrl: 'https://your-webhook.com',
      licenseId: 'YOUR_LICENSE_ID',
      licenseDevice: 'device-123',
    ),
  );

  // 2. Track an error
  try {
    throw Exception("Something went wrong");
  } catch (e, stack) {
    Tracker.error(e, stackTrace: stack);
  }

  // 3. Track an event
  Tracker.event("UserLoggedIn", level: EventLevel.INFO);
}
```

## Directory Structure

`flutter/`

*   `lib/royaltics_error_tracker.dart`: Main export.
*   `lib/src/`:
    *   `tracker.dart`: Facade.
    *   `client.dart`: Core logic.
    *   `core/transport.dart`: Network layer.
    *   `core/event_builder.dart`: Context builder.
    *   `types/`: Data classes.
    *   `utils/compression.dart`: Gzip logic.

## Verification

*   Unit tests pass for `Compression` and `ClientConfig`.
*   `flutter analyze` passes.

## Installation

### Option 1: Git Dependency (Recommended for private use)

You can use the package directly from Git without publishing it to pub.dev.

Add this to your `pubspec.yaml`:

```yaml
dependencies:
  royaltics_error_tracker:
    git:
      url: git@github.com:royaltics/royaltics_error_tracker.git # Replace with your actual repo URL
      path: flutter             # Important: points to the package subdirectory
      ref: main                 # Optional: tag or branch
```

### Option 2: Local Path (For development)

If you are working on a monorepo or testing locally:

```yaml
dependencies:
  royaltics_error_tracker:
    path: ../royaltics_error_tracker/flutter
```

### Option 3: Publish to Pub.dev

If you want to publish this package to the public registry:

1.  Verify the package metadata in `pubspec.yaml`.
2.  Run dry-run to check for warnings:
    ```bash
    flutter pub publish --dry-run
    ```
3.  Publish:
    ```bash
    flutter pub publish
    ```
