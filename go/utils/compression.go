package utils

import (
	"bytes"
	"compress/gzip"
	"encoding/base64"
)

func CompressAndEncode(data string) (string, error) {
	var buf bytes.Buffer
	
	gzipWriter := gzip.NewWriter(&buf)
	if _, err := gzipWriter.Write([]byte(data)); err != nil {
		return "", err
	}
	
	if err := gzipWriter.Close(); err != nil {
		return "", err
	}
	
	compressed := buf.Bytes()
	encoded := base64.StdEncoding.EncodeToString(compressed)
	
	return encoded, nil
}
