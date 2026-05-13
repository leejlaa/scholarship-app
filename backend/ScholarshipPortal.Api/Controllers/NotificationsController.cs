using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ScholarshipPortal.Domain.Enums;
using ScholarshipPortal.Infrastructure.Identity;
using ScholarshipPortal.Infrastructure.Persistence;
using System.Security.Claims;

namespace ScholarshipPortal.Api.Controllers;

public sealed record NotificationDto(
    int    Id,
    string Title,
    string Message,
    string Link,
    string Type
);

[ApiController]
[Route("api/notifications")]
[Authorize]
public sealed class NotificationsController(
    UserManager<AppUser> userManager,
    AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var user   = await userManager.FindByIdAsync(userId);
        if (user is null) return Unauthorized();

        var roles = await userManager.GetRolesAsync(user);
        var role  = roles.FirstOrDefault() ?? "Student";

        var result = role switch
        {
            "Reviewer" => await ReviewerNotifications(userId, ct),
            "Admin"    => await AdminNotifications(ct),
            _          => await StudentNotifications(ct),
        };

        return Ok(result);
    }

    private async Task<List<NotificationDto>> StudentNotifications(CancellationToken ct)
    {
        var scholarships = await db.Scholarships
            .Where(s => s.Status == ScholarshipStatus.Open)
            .OrderByDescending(s => s.Id)
            .Take(15)
            .ToListAsync(ct);

        return scholarships
            .Select(s => new NotificationDto(
                s.Id,
                s.Title,
                $"Deadline {s.Deadline:MMM d, yyyy} · Award ${s.Amount:N0}",
                $"/student/apply?id={s.Id}",
                "scholarship"))
            .ToList();
    }

    private async Task<List<NotificationDto>> ReviewerNotifications(string reviewerId, CancellationToken ct)
    {
        var assignedIds = await db.Scholarships
            .Where(s => s.AssignedReviewerId == reviewerId)
            .Select(s => s.Id)
            .ToListAsync(ct);

        if (assignedIds.Count == 0) return [];

        var reviewedAppIds = await db.Reviews
            .Where(r => r.ReviewerId == reviewerId)
            .Select(r => r.ApplicationId)
            .ToListAsync(ct);

        var pending = await db.Applications
            .Where(a => assignedIds.Contains(a.ScholarshipId)
                     && (a.Status == ApplicationStatus.Submitted || a.Status == ApplicationStatus.UnderReview)
                     && !reviewedAppIds.Contains(a.Id))
            .OrderByDescending(a => a.Id)
            .Take(20)
            .ToListAsync(ct);

        if (pending.Count == 0) return [];

        var titles = await db.Scholarships
            .Where(s => assignedIds.Contains(s.Id))
            .ToDictionaryAsync(s => s.Id, s => s.Title, ct);

        return pending
            .Select(a => new NotificationDto(
                a.Id,
                $"{a.StudentName} applied",
                titles.TryGetValue(a.ScholarshipId, out var t) ? t : "Scholarship",
                "/reviewer",
                "application"))
            .ToList();
    }

    private async Task<List<NotificationDto>> AdminNotifications(CancellationToken ct)
    {
        var apps = await db.Applications
            .Where(a => a.Status == ApplicationStatus.Approved || a.Status == ApplicationStatus.Shortlisted)
            .OrderByDescending(a => a.Id)
            .Take(20)
            .ToListAsync(ct);

        if (apps.Count == 0) return [];

        var scholarshipIds = apps.Select(a => a.ScholarshipId).Distinct().ToList();
        var titles = await db.Scholarships
            .Where(s => scholarshipIds.Contains(s.Id))
            .ToDictionaryAsync(s => s.Id, s => s.Title, ct);

        return apps
            .Select(a => new NotificationDto(
                a.Id,
                $"{a.StudentName} was {(a.Status == ApplicationStatus.Approved ? "approved" : "shortlisted")}",
                titles.TryGetValue(a.ScholarshipId, out var t) ? t : "Scholarship",
                "/admin",
                a.Status == ApplicationStatus.Approved ? "approval" : "shortlist"))
            .ToList();
    }
}
