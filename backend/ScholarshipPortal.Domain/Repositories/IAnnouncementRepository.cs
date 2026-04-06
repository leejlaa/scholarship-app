using ScholarshipPortal.Domain.Entities;

namespace ScholarshipPortal.Domain.Repositories;

public interface IAnnouncementRepository
{
    Task<IReadOnlyList<Announcement>> GetAllAsync(CancellationToken ct = default);
    Task AddAsync(Announcement announcement, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
