package com.royaltics.errortracker.utils

import java.io.ByteArrayOutputStream
import java.util.Base64
import java.util.zip.GZIPOutputStream

object Compression {
    fun compressAndEncode(data: String): String {
        val byteArrayOutputStream = ByteArrayOutputStream()
        
        GZIPOutputStream(byteArrayOutputStream).use { gzipStream ->
            gzipStream.write(data.toByteArray(Charsets.UTF_8))
        }
        
        val compressed = byteArrayOutputStream.toByteArray()
        return Base64.getEncoder().encodeToString(compressed)
    }
}
