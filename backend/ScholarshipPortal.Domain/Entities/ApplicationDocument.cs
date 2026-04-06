namespace ScholarshipPortal.Domain.Entities;

public sealed class ApplicationDocument
{
    public int Id { get; private set; }
    public int ApplicationId { get; private set; }
    public string FileName { get; private set; } = string.Empty;
    public string StoragePath { get; private set; } = string.Empty;
    public string DocumentType { get; private set; } = string.Empty;
    public DateTime UploadedAt { get; private set; }

    private ApplicationDocument() { }

    internal static ApplicationDocument Create(
        int applicationId,
        string fileName,
        string storagePath,
        string documentType)
    {
        return new ApplicationDocument
        {
            ApplicationId = applicationId,
            FileName = fileName,
            StoragePath = storagePath,
            DocumentType = documentType,
            UploadedAt = DateTime.UtcNow
        };
    }
}
