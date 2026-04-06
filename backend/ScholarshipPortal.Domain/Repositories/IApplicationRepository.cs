using ScholarshipPortal.Domain.Entities;

namespace ScholarshipPortal.Domain.Repositories;

public interface IApplicationRepository
{
    Task<IReadOnlyList<Application>> GetAllAsync(CancellationToken ct = default);
    Task<Application?> GetByIdAsync(int id, CancellationToken ct = default);
    Task AddAsync(Application application, CancellationToken ct = default);
    Task DeleteAsync(Application application, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
