namespace ScholarshipPortal.Application.DTOs.Auth;

public sealed record RegisterRequest(
    string FullName,
    string Email,
    string Password,
    string Role,        // "Student" | "Reviewer" | "Admin"

    // ── Student profile (optional, used when Role = "Student") ────────────
    string? StudentNumber    = null,
    string? Faculty          = null,
    string? Department       = null,
    string? Program          = null,
    int?    CurrentYear      = null,
    decimal? Gpa             = null,
    DateOnly? DateOfBirth    = null,
    string? Address          = null,
    string? Nationality      = null,
    string? PersonalStatement = null,

    // ── Reviewer profile (optional, used when Role = "Reviewer") ──────────
    string? StaffNumber      = null,
    string? Title            = null,
    string? ExpertiseAreas   = null,
    string? OfficeLocation   = null,
    string? PhoneNumber      = null,
    string? Bio              = null,
    int?    MaxActiveReviews = null,
    bool?   IsAvailable      = null
);
