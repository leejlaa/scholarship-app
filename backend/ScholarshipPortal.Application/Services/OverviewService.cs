using ScholarshipPortal.Application.DTOs;
using ScholarshipPortal.Domain.Enums;
using ScholarshipPortal.Domain.Repositories;

namespace ScholarshipPortal.Application.Services;

public sealed class OverviewService(
    IScholarshipRepository scholarshipRepository,
    IApplicationRepository applicationRepository,
    IReviewRepository reviewRepository) : IOverviewService
{
    public async Task<PortalOverviewDto> GetAsync(CancellationToken ct = default)
    {
        var scholarships = await scholarshipRepository.GetAllAsync(ct);
        var applications = await applicationRepository.GetAllAsync(ct);
        var reviews = await reviewRepository.GetAllAsync(ct);

        var openCount = scholarships.Count(s => s.Status is ScholarshipStatus.Open or ScholarshipStatus.ClosesSoon);
        var pendingReviews = reviews.Count(r => r.Stage != ReviewStage.Complete);
        var published = applications.Count(a => a.Status is ApplicationStatus.Approved or ApplicationStatus.Rejected);
        var uniqueStudents = applications.Select(a => a.StudentName).Distinct().Count();

        return new PortalOverviewDto(
            TotalStudents: uniqueStudents,
            TotalOpenScholarships: openCount,
            PendingReviews: pendingReviews,
            PublishedResults: published);
    }
}
