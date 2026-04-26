using ScholarshipPortal.Application.Common;
using ScholarshipPortal.Application.DTOs;
using ScholarshipPortal.Domain.Repositories;

namespace ScholarshipPortal.Application.Services;

public sealed class DocumentService(
    IApplicationRepository applicationRepository,
    IApplicationDocumentRepository documentRepository,
    IDocumentStorageService storage) : IDocumentService
{
    public async Task<UploadDocumentResultDto> UploadAsync(int applicationId, UploadDocumentDto dto, ActorContext actor, CancellationToken ct = default)
    {
        EnsureRole(actor, "Student", "Admin");

        const long maxBytes = 100 * 1024 * 1024;
        if (dto.SizeBytes <= 0) throw new ArgumentException("No file received.");
        if (dto.SizeBytes > maxBytes) throw new ArgumentException("File exceeds 100 MB limit.");

        var application = await applicationRepository.GetByIdAsync(applicationId, ct)
            ?? throw new KeyNotFoundException("Application not found.");

        if (actor.Role.Equals("Student", StringComparison.OrdinalIgnoreCase) && application.UserId != actor.UserId)
            throw new UnauthorizedAccessException("Students can only upload to their own application.");

        var storagePath = await storage.UploadAsync(dto.FileStream, dto.FileName, dto.ContentType, ct);

        var resolvedType = !string.IsNullOrWhiteSpace(dto.DocumentType)
            ? dto.DocumentType.Trim()
            : dto.ContentType.Contains("pdf", StringComparison.OrdinalIgnoreCase) ? "PDF"
            : dto.ContentType.Contains("image", StringComparison.OrdinalIgnoreCase) ? "Image"
            : Path.GetExtension(dto.FileName).TrimStart('.').ToUpperInvariant();

        application.AddDocument(dto.FileName, storagePath, resolvedType);
        await applicationRepository.SaveChangesAsync(ct);

        return new UploadDocumentResultDto(dto.FileName, storagePath, resolvedType, dto.SizeBytes);
    }

    public async Task<IReadOnlyList<ApplicationDocumentFileDto>> ListAsync(int applicationId, ActorContext actor, CancellationToken ct = default)
    {
        EnsureRole(actor, "Student", "Reviewer", "Admin");

        var application = await applicationRepository.GetByIdAsync(applicationId, ct)
            ?? throw new KeyNotFoundException("Application not found.");

        if (actor.Role.Equals("Student", StringComparison.OrdinalIgnoreCase) && application.UserId != actor.UserId)
            throw new UnauthorizedAccessException("Students can only list documents on their own application.");

        var docs = await documentRepository.GetByApplicationIdAsync(applicationId, ct);
        return docs.Select(d => new ApplicationDocumentFileDto(d.Id, d.FileName, d.StoragePath, d.DocumentType))
            .ToList()
            .AsReadOnly();
    }

    public async Task<DownloadDocumentResultDto> DownloadAsync(string storagePath, ActorContext actor, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(actor.Role))
            throw new UnauthorizedAccessException("Authentication is required.");

        var stream = await storage.DownloadAsync(storagePath, ct);
        var contentType = storagePath.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase)
            ? "application/pdf"
            : "application/octet-stream";

        return new DownloadDocumentResultDto(stream, contentType, Path.GetFileName(storagePath));
    }

    private static void EnsureRole(ActorContext actor, params string[] roles)
    {
        if (!roles.Any(role => actor.Role.Equals(role, StringComparison.OrdinalIgnoreCase)))
            throw new UnauthorizedAccessException("You are not allowed to perform this action.");
    }
}
