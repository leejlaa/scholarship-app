namespace ScholarshipPortal.Application.Common;

public sealed record ActorContext(
    string Role,
    string? UserId,
    string? FullName,
    string? Email);
