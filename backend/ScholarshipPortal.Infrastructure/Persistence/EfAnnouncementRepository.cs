using Microsoft.EntityFrameworkCore;
using ScholarshipPortal.Domain.Entities;
using ScholarshipPortal.Domain.Repositories;
using ScholarshipPortal.Infrastructure.Persistence;

namespace ScholarshipPortal.Infrastructure.Persistence;

internal sealed class EfAnnouncementRepository(AppDbContext db) : IAnnouncementRepository
{
    public async Task<IReadOnlyList<Announcement>> GetAllAsync(CancellationToken ct = default)
        => await db.Announcements.AsNoTracking().ToListAsync(ct);

    public async Task AddAsync(Announcement announcement, CancellationToken ct = default)
        => await db.Announcements.AddAsync(announcement, ct);

    public Task SaveChangesAsync(CancellationToken ct = default)
        => db.SaveChangesAsync(ct);
}
