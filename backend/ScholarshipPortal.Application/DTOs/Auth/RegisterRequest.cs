namespace ScholarshipPortal.Application.DTOs.Auth;

public sealed record RegisterRequest(
    string FullName,
    string Email,
    string Password,
    string Role   // "Student" | "Reviewer" | "Admin"
);
