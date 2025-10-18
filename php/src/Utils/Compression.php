<?php

declare(strict_types=1);

namespace Royaltics\ErrorTracker\Utils;

final class Compression
{
    public static function compressAndEncode(string $data): string
    {
        $compressed = gzencode($data, 9);
        
        if ($compressed === false) {
            throw new \RuntimeException('Failed to compress data');
        }
        
        return base64_encode($compressed);
    }
}
