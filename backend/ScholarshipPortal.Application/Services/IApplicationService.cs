using ScholarshipPortal.Application.Common;
using ScholarshipPortal.Application.DTOs;

namespace ScholarshipPortal.Application.Services;

public interface IApplicationService
{
    Task<IReadOnlyList<ApplicationDto>> GetAllForActorAsync(ActorContext actor, CancellationToken ct = default);
    Task<ApplicationDto?> GetByIdAsync(int id, ActorContext actor, CancellationToken ct = default);
    Task<ApplicationDto> CreateAsync(CreateApplicationDto dto, ActorContext actor, CancellationToken ct = default);
    Task<ApplicationDto?> UpdateAsync(int id, UpdateApplicationDto dto, ActorContext actor, CancellationToken ct = default);
    Task<bool> DeleteAsync(int id, ActorContext actor, CancellationToken ct = default);
}
