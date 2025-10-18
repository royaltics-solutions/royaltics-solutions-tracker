using System.IO.Compression;
using System.Text;

namespace Royaltics.ErrorTracker.Utils;

public static class Compression
{
    public static string CompressAndEncode(string data)
    {
        var bytes = Encoding.UTF8.GetBytes(data);
        
        using var outputStream = new MemoryStream();
        using (var gzipStream = new GZipStream(outputStream, CompressionMode.Compress))
        {
            gzipStream.Write(bytes, 0, bytes.Length);
        }
        
        var compressed = outputStream.ToArray();
        return Convert.ToBase64String(compressed);
    }
}
