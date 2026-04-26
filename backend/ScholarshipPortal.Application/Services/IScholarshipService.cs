using ScholarshipPortal.Application.Common;
using ScholarshipPortal.Application.DTOs;

namespace ScholarshipPortal.Application.Services;

public interface IScholarshipService
{
    Task<IReadOnlyList<ScholarshipDto>> GetAllAsync(CancellationToken ct = default);
    Task<ScholarshipDto?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<ScholarshipDto> CreateAsync(ScholarshipWriteDto dto, ActorContext actor, CancellationToken ct = default);
    Task<ScholarshipDto?> UpdateAsync(int id, ScholarshipWriteDto dto, ActorContext actor, CancellationToken ct = default);
    Task<ScholarshipDto?> AssignReviewerAsync(int id, AssignScholarshipReviewerDto dto, ActorContext actor, CancellationToken ct = default);
    Task<bool> DeleteAsync(int id, ActorContext actor, CancellationToken ct = default);
}
