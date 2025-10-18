<?php

declare(strict_types=1);

namespace Royaltics\ErrorTracker\Types;

enum EventLevel: string
{
    case DEBUG = 'DEBUG';
    case INFO = 'INFO';
    case WARNING = 'WARNING';
    case ERROR = 'ERROR';
    case FATAL = 'FATAL';
}
