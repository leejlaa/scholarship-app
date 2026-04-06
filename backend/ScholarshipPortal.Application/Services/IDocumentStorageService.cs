namespace ScholarshipPortal.Application.Services;

public interface IDocumentStorageService
{
    /// <summary>
    /// Persists the uploaded file and returns a storage path/URL.
    /// </summary>
    Task<string> UploadAsync(
        Stream content,
        string fileName,
        string contentType,
        CancellationToken ct = default);

    /// <summary>
    /// Returns a readable stream for the stored document.
    /// </summary>
    Task<Stream> DownloadAsync(string storagePath, CancellationToken ct = default);
}
