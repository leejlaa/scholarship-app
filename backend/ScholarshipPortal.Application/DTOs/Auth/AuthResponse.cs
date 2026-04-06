namespace ScholarshipPortal.Application.DTOs.Auth;

public sealed record AuthResponse(
    string Token,
    string Email,
    string FullName,
    string Role,
    DateTime ExpiresAt
);
