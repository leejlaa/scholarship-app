using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ScholarshipPortal.Infrastructure.Identity;
using ScholarshipPortal.Infrastructure.Persistence;

namespace ScholarshipPortal.Api.Controllers;

// ── Request / Response DTOs (scoped to this controller) ──────────────────

public sealed record StudentProfileResponse(
    string  UserId,
    string  FullName,
    string  Email,
    string? StudentNumber,
    string? Faculty,
    string? Department,
    string? Program,
    int?    CurrentYear,
    decimal? Gpa,
    string? PhoneNumber,
    string? Address,
    string? Nationality,
    string? PersonalStatement);

public sealed record ReviewerProfileResponse(
    string  UserId,
    string  FullName,
    string  Email,
    string? StaffNumber,
    string? Department,
    string? Title,
    string? ExpertiseAreas,
    string? OfficeLocation,
    string? PhoneNumber,
    string? Bio,
    int?    MaxActiveReviews,
    bool    IsAvailable);

public sealed record AdminProfileResponse(
    string  UserId,
    string  FullName,
    string  Email,
    string? Department,
    string? Title,
    string? OfficeLocation,
    string? PhoneNumber);

public sealed record UpdateStudentProfileRequest(
    string? StudentNumber,
    string? Faculty,
    string? Department,
    string? Program,
    int?    CurrentYear,
    decimal? Gpa,
    string? PhoneNumber,
    string? Address,
    string? Nationality,
    string? PersonalStatement);

public sealed record UpdateReviewerProfileRequest(
    string? StaffNumber,
    string? Department,
    string? Title,
    string? ExpertiseAreas,
    string? OfficeLocation,
    string? PhoneNumber,
    string? Bio,
    int?    MaxActiveReviews,
    bool    IsAvailable);

public sealed record UpdateAdminProfileRequest(
    string? Department,
    string? Title,
    string? OfficeLocation,
    string? PhoneNumber);

// ── Controller ────────────────────────────────────────────────────────────

[ApiController]
[Route("api/profile")]
[Authorize]
public sealed class ProfileController(
    AppDbContext db,
    UserManager<AppUser> userManager) : ControllerBase
{
    // GET /api/profile
    [HttpGet]
    public async Task<IActionResult> GetProfile(CancellationToken ct)
    {
        var user = await userManager.GetUserAsync(User);
        if (user is null) return Unauthorized();

        var roles = await userManager.GetRolesAsync(user);
        var role  = roles.FirstOrDefault() ?? "Student";

        return role switch
        {
            "Student" => await GetStudentProfile(user, ct),
            "Reviewer" => await GetReviewerProfile(user, ct),
            "Admin" => await GetAdminProfile(user, ct),
            _ => NotFound()
        };
    }

    // PUT /api/profile/student
    [HttpPut("student")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> UpdateStudentProfile(
        UpdateStudentProfileRequest req,
        CancellationToken ct)
    {
        var user = await userManager.GetUserAsync(User);
        if (user is null) return Unauthorized();

        var profile = await db.StudentProfiles.FindAsync([user.Id], ct);
        if (profile is null) return NotFound("Profile not found.");

        profile.UpdateDetails(
            req.StudentNumber, req.Faculty, req.Department,
            req.Program, req.CurrentYear, req.Gpa,
            null, req.PhoneNumber, req.Address,
            req.Nationality, req.PersonalStatement, null);

        await db.SaveChangesAsync(ct);

        return Ok(ToStudentResponse(user, profile));
    }

    // PUT /api/profile/reviewer
    [HttpPut("reviewer")]
    [Authorize(Roles = "Reviewer")]
    public async Task<IActionResult> UpdateReviewerProfile(
        UpdateReviewerProfileRequest req,
        CancellationToken ct)
    {
        var user = await userManager.GetUserAsync(User);
        if (user is null) return Unauthorized();

        var profile = await db.ReviewerProfiles.FindAsync([user.Id], ct);
        if (profile is null) return NotFound("Profile not found.");

        profile.UpdateDetails(
            req.StaffNumber, req.Department, req.Title,
            req.ExpertiseAreas, req.OfficeLocation,
            req.PhoneNumber, req.Bio,
            req.MaxActiveReviews, req.IsAvailable);

        await db.SaveChangesAsync(ct);

        return Ok(ToReviewerResponse(user, profile));
    }

    // PUT /api/profile/admin
    [HttpPut("admin")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateAdminProfile(
        UpdateAdminProfileRequest req,
        CancellationToken ct)
    {
        var user = await userManager.GetUserAsync(User);
        if (user is null) return Unauthorized();

        var profile = await db.AdminProfiles.FindAsync([user.Id], ct);
        if (profile is null) return NotFound("Profile not found.");

        profile.UpdateDetails(req.Department, req.Title, req.OfficeLocation, req.PhoneNumber);

        await db.SaveChangesAsync(ct);

        return Ok(ToAdminResponse(user, profile));
    }

    // ── helpers ───────────────────────────────────────────────────────────

    private async Task<IActionResult> GetStudentProfile(AppUser user, CancellationToken ct)
    {
        var profile = await db.StudentProfiles.FirstOrDefaultAsync(p => p.UserId == user.Id, ct);
        if (profile is null) return NotFound("Profile not found.");
        return Ok(ToStudentResponse(user, profile));
    }

    private async Task<IActionResult> GetReviewerProfile(AppUser user, CancellationToken ct)
    {
        var profile = await db.ReviewerProfiles.FirstOrDefaultAsync(p => p.UserId == user.Id, ct);
        if (profile is null) return NotFound("Profile not found.");
        return Ok(ToReviewerResponse(user, profile));
    }

    private async Task<IActionResult> GetAdminProfile(AppUser user, CancellationToken ct)
    {
        var profile = await db.AdminProfiles.FirstOrDefaultAsync(p => p.UserId == user.Id, ct);
        if (profile is null) return NotFound("Profile not found.");
        return Ok(ToAdminResponse(user, profile));
    }

    private static StudentProfileResponse ToStudentResponse(
        AppUser user, ScholarshipPortal.Domain.Entities.StudentProfile p) =>
        new(user.Id, user.FullName, user.Email ?? string.Empty,
            p.StudentNumber, p.Faculty, p.Department, p.Program,
            p.CurrentYear, p.Gpa, p.PhoneNumber, p.Address,
            p.Nationality, p.PersonalStatement);

    private static ReviewerProfileResponse ToReviewerResponse(
        AppUser user, ScholarshipPortal.Domain.Entities.ReviewerProfile p) =>
        new(user.Id, user.FullName, user.Email ?? string.Empty,
            p.StaffNumber, p.Department, p.Title, p.ExpertiseAreas,
            p.OfficeLocation, p.PhoneNumber, p.Bio,
            p.MaxActiveReviews, p.IsAvailable);

    private static AdminProfileResponse ToAdminResponse(
        AppUser user, ScholarshipPortal.Domain.Entities.AdminProfile p) =>
        new(user.Id, user.FullName, user.Email ?? string.Empty,
            p.Department, p.Title, p.OfficeLocation, p.PhoneNumber);
}
