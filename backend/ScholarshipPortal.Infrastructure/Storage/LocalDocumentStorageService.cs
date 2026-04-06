using ScholarshipPortal.Application.Services;

namespace ScholarshipPortal.Infrastructure.Storage;

/// <summary>
/// Saves files to a local uploads directory.
/// Swap this for an Azure Blob Storage or S3 implementation in production.
/// </summary>
public sealed class LocalDocumentStorageService(string uploadRoot) : IDocumentStorageService
{
    public async Task<string> UploadAsync(
        Stream content,
        string fileName,
        string contentType,
        CancellationToken ct = default)
    {
        var sanitized  = Path.GetFileName(fileName);
        var uniqueName = $"{Guid.NewGuid():N}_{sanitized}";
        var fullPath   = Path.Combine(uploadRoot, uniqueName);

        Directory.CreateDirectory(uploadRoot);

        await using var fs = File.Create(fullPath);
        await content.CopyToAsync(fs, ct);

        return uniqueName; // stored path (relative)
    }

    public Task<Stream> DownloadAsync(string storagePath, CancellationToken ct = default)
    {
        var fullPath = Path.Combine(uploadRoot, storagePath);

        if (!File.Exists(fullPath))
            throw new FileNotFoundException("Document not found.", storagePath);

        Stream stream = File.OpenRead(fullPath);
        return Task.FromResult(stream);
    }
}
