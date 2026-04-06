using ScholarshipPortal.Domain.Entities;

namespace ScholarshipPortal.Domain.Repositories;

public interface IReviewRepository
{
    Task<IReadOnlyList<Review>> GetAllAsync(CancellationToken ct = default);
    Task<Review?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<IReadOnlyList<Review>> GetByApplicationIdAsync(int applicationId, CancellationToken ct = default);
    Task AddAsync(Review review, CancellationToken ct = default);
    Task DeleteAsync(Review review, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
