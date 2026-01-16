enum EventLevel {
  DEBUG,
  INFO,
  WARNING,
  ERROR,
  FATAL;

  String get name => toString().split('.').last;
}
