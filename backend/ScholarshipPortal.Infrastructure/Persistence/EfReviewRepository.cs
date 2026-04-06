using Microsoft.EntityFrameworkCore;
using ScholarshipPortal.Domain.Entities;
using ScholarshipPortal.Domain.Repositories;
using ScholarshipPortal.Infrastructure.Persistence;

namespace ScholarshipPortal.Infrastructure.Persistence;

internal sealed class EfReviewRepository(AppDbContext db) : IReviewRepository
{
    public async Task<IReadOnlyList<Review>> GetAllAsync(CancellationToken ct = default)
        => await db.Reviews.AsNoTracking().ToListAsync(ct);

    public async Task<Review?> GetByIdAsync(int id, CancellationToken ct = default)
        => await db.Reviews.FindAsync([id], ct);

    public async Task<IReadOnlyList<Review>> GetByApplicationIdAsync(int applicationId, CancellationToken ct = default)
        => await db.Reviews
            .Where(r => r.ApplicationId == applicationId)
            .AsNoTracking()
            .ToListAsync(ct);

    public async Task AddAsync(Review review, CancellationToken ct = default)
        => await db.Reviews.AddAsync(review, ct);

    public Task DeleteAsync(Review review, CancellationToken ct = default)
    {
        db.Reviews.Remove(review);
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync(CancellationToken ct = default)
        => db.SaveChangesAsync(ct);
}
