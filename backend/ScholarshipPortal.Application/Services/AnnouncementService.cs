using ScholarshipPortal.Application.DTOs;
using ScholarshipPortal.Domain.Repositories;

namespace ScholarshipPortal.Application.Services;

public sealed class AnnouncementService(IAnnouncementRepository repository) : IAnnouncementService
{
    public async Task<IReadOnlyList<AnnouncementDto>> GetAllAsync(CancellationToken ct = default)
    {
        var announcements = await repository.GetAllAsync(ct);

        return announcements
            .Select(a => new AnnouncementDto(
                a.Id,
                a.Title,
                a.Category,
                a.PublishDate.ToString("yyyy-MM-dd"),
                a.Message))
            .ToList()
            .AsReadOnly();
    }
}
