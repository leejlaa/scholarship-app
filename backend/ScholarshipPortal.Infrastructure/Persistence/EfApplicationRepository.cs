using Microsoft.EntityFrameworkCore;
using ScholarshipPortal.Domain.Repositories;
using ScholarshipPortal.Infrastructure.Persistence;
using DomainApp = ScholarshipPortal.Domain.Entities.Application;

namespace ScholarshipPortal.Infrastructure.Persistence;

internal sealed class EfApplicationRepository(AppDbContext db) : IApplicationRepository
{
    public async Task<IReadOnlyList<DomainApp>> GetAllAsync(CancellationToken ct = default)
        => await db.Applications
            .Include(a => a.Documents)
            .AsNoTracking()
            .ToListAsync(ct);

    public async Task<IReadOnlyList<DomainApp>> GetByUserIdAsync(string userId, CancellationToken ct = default)
        => await db.Applications
            .Where(a => a.UserId == userId)
            .Include(a => a.Documents)
            .AsNoTracking()
            .ToListAsync(ct);

    public async Task<IReadOnlyList<DomainApp>> GetByScholarshipIdAsync(int scholarshipId, CancellationToken ct = default)
        => await db.Applications
            .Where(a => a.ScholarshipId == scholarshipId)
            .Include(a => a.Documents)
            .ToListAsync(ct);

    public async Task<DomainApp?> GetByIdAsync(int id, CancellationToken ct = default)
        => await db.Applications
            .Include(a => a.Documents)
            .FirstOrDefaultAsync(a => a.Id == id, ct);

    public async Task AddAsync(DomainApp application, CancellationToken ct = default)
        => await db.Applications.AddAsync(application, ct);

    public Task DeleteAsync(DomainApp application, CancellationToken ct = default)
    {
        db.Applications.Remove(application);
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync(CancellationToken ct = default)
        => db.SaveChangesAsync(ct);
}
