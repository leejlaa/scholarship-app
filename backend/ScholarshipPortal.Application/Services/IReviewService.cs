using ScholarshipPortal.Application.Common;
using ScholarshipPortal.Application.DTOs;

namespace ScholarshipPortal.Application.Services;

public interface IReviewService
{
    Task<IReadOnlyList<ReviewDto>> GetQueueAsync(ActorContext actor, CancellationToken ct = default);
    Task<ReviewDto?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<IReadOnlyList<ReviewDto>> GetByApplicationAsync(int applicationId, CancellationToken ct = default);
    Task<ReviewDto> CreateAsync(CreateReviewDto dto, ActorContext actor, CancellationToken ct = default);
    Task<ReviewDto?> UpdateAsync(int id, UpdateReviewDto dto, ActorContext actor, CancellationToken ct = default);
    Task<bool> DeleteAsync(int id, ActorContext actor, CancellationToken ct = default);
}
