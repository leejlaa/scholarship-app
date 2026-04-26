using ScholarshipPortal.Application.Common;
using ScholarshipPortal.Application.DTOs;

namespace ScholarshipPortal.Application.Services;

public interface IDocumentService
{
    Task<UploadDocumentResultDto> UploadAsync(int applicationId, UploadDocumentDto dto, ActorContext actor, CancellationToken ct = default);
    Task<IReadOnlyList<ApplicationDocumentFileDto>> ListAsync(int applicationId, ActorContext actor, CancellationToken ct = default);
    Task<DownloadDocumentResultDto> DownloadAsync(string storagePath, ActorContext actor, CancellationToken ct = default);
}
