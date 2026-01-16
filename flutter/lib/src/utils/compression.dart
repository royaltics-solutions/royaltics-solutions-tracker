import 'dart:convert';
import 'dart:io';

class Compression {
  /// Compresses the string using GZIP and then encodes it to Base64.
  static String compressAndEncode(String data) {
    List<int> stringBytes = utf8.encode(data);
    List<int> compressedBytes = gzip.encode(stringBytes);
    return base64Encode(compressedBytes);
  }
}
