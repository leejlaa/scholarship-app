using ScholarshipPortal.Domain.Entities;

namespace ScholarshipPortal.Domain.Repositories;

public interface IApplicationDocumentRepository
{
    Task<IReadOnlyList<ApplicationDocument>> GetByApplicationIdAsync(int applicationId, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
