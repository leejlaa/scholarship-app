namespace ScholarshipPortal.Application.DTOs;

public sealed record ReviewDto(
    int Id,
    int ApplicationId,
    string ScholarshipTitle,
    string ApplicantName,
    int RecommendedScore,
    string ReviewerName,
    bool IsMine,
    string Comment,
    string Stage);
