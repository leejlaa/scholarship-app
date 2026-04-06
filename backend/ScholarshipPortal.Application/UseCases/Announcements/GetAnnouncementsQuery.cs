using ScholarshipPortal.Application.DTOs;
using ScholarshipPortal.Domain.Repositories;

namespace ScholarshipPortal.Application.UseCases.Announcements;

public sealed class GetAnnouncementsQuery(IAnnouncementRepository repository)
{
    public async Task<IReadOnlyList<AnnouncementDto>> ExecuteAsync(CancellationToken ct = default)
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
