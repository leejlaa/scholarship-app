namespace ScholarshipPortal.Application.DTOs;

public sealed record ScholarshipDto(
    int Id,
    string Title,
    string Audience,
    string Deadline,
    string Eligibility,
    decimal Amount,
    string Status);
