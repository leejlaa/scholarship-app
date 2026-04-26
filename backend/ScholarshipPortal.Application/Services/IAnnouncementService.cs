using ScholarshipPortal.Application.DTOs;

namespace ScholarshipPortal.Application.Services;

public interface IAnnouncementService
{
    Task<IReadOnlyList<AnnouncementDto>> GetAllAsync(CancellationToken ct = default);
}
