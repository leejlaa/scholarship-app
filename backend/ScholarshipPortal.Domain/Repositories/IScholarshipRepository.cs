using ScholarshipPortal.Domain.Entities;

namespace ScholarshipPortal.Domain.Repositories;

public interface IScholarshipRepository
{
    Task<IReadOnlyList<Scholarship>> GetAllAsync(CancellationToken ct = default);
    Task<Scholarship?> GetByIdAsync(int id, CancellationToken ct = default);
    Task AddAsync(Scholarship scholarship, CancellationToken ct = default);
    Task DeleteAsync(Scholarship scholarship, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
