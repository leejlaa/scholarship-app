using ScholarshipPortal.Application.DTOs;
using ScholarshipPortal.Domain.Repositories;

namespace ScholarshipPortal.Application.UseCases.Reviews;

public sealed class GetReviewQueueQuery(
    IReviewRepository reviewRepository,
    IApplicationRepository applicationRepository,
    IScholarshipRepository scholarshipRepository)
{
    public async Task<IReadOnlyList<ReviewDto>> ExecuteAsync(CancellationToken ct = default)
    {
        var reviews      = await reviewRepository.GetAllAsync(ct);
        var applications = await applicationRepository.GetAllAsync(ct);
        var scholarships = await scholarshipRepository.GetAllAsync(ct);

        var titleById  = scholarships.ToDictionary(s => s.Id, s => s.Title);
        var appById    = applications.ToDictionary(a => a.Id, a => a);

        return reviews
            .Select(r =>
            {
                appById.TryGetValue(r.ApplicationId, out var app);
                var scholarshipTitle = app is not null
                    ? titleById.GetValueOrDefault(app.ScholarshipId, "Unknown")
                    : "Unknown";

                return new ReviewDto(
                    r.Id,
                    r.ApplicationId,
                    scholarshipTitle,
                    app?.StudentName ?? "Unknown",
                    r.Score,
                    r.Comment,
                    r.Stage.ToString());
            })
            .ToList()
            .AsReadOnly();
    }
}
