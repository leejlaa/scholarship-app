namespace ScholarshipPortal.Application.DTOs;

public sealed record PortalOverviewDto(
    int TotalStudents,
    int TotalOpenScholarships,
    int PendingReviews,
    int PublishedResults);
