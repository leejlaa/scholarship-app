using Microsoft.EntityFrameworkCore;
using ScholarshipPortal.Domain.Entities;
using ScholarshipPortal.Domain.Repositories;
using ScholarshipPortal.Infrastructure.Persistence;

namespace ScholarshipPortal.Infrastructure.Persistence;

internal sealed class EfScholarshipRepository(AppDbContext db) : IScholarshipRepository
{
    public async Task<IReadOnlyList<Scholarship>> GetAllAsync(CancellationToken ct = default)
        => await db.Scholarships.AsNoTracking().ToListAsync(ct);

    public async Task<Scholarship?> GetByIdAsync(int id, CancellationToken ct = default)
        => await db.Scholarships.FindAsync([id], ct);

    public async Task AddAsync(Scholarship scholarship, CancellationToken ct = default)
        => await db.Scholarships.AddAsync(scholarship, ct);

    public Task DeleteAsync(Scholarship scholarship, CancellationToken ct = default)
    {
        db.Scholarships.Remove(scholarship);
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync(CancellationToken ct = default)
        => db.SaveChangesAsync(ct);
}
