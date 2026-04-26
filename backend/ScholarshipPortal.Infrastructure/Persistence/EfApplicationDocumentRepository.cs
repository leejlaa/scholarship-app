using Microsoft.EntityFrameworkCore;
using ScholarshipPortal.Domain.Entities;
using ScholarshipPortal.Domain.Repositories;

namespace ScholarshipPortal.Infrastructure.Persistence;

internal sealed class EfApplicationDocumentRepository(AppDbContext db) : IApplicationDocumentRepository
{
    public async Task<IReadOnlyList<ApplicationDocument>> GetByApplicationIdAsync(int applicationId, CancellationToken ct = default)
        => await db.ApplicationDocuments
            .Where(d => d.ApplicationId == applicationId)
            .AsNoTracking()
            .ToListAsync(ct);

    public Task SaveChangesAsync(CancellationToken ct = default)
        => db.SaveChangesAsync(ct);
}
