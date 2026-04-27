using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using ScholarshipPortal.Domain.Entities;
using ScholarshipPortal.Domain.Enums;
using ScholarshipPortal.Infrastructure.Identity;
using DomainApp = ScholarshipPortal.Domain.Entities.Application;

namespace ScholarshipPortal.Infrastructure.Persistence;

public static class AppDbInitializer
{
    private static readonly string[] Roles = ["Student", "Reviewer", "Admin"];

    public static async Task SeedAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db          = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<AppRole>>();

        await db.Database.MigrateAsync();

        await SeedRolesAsync(roleManager);
        await SeedUsersAsync(userManager);
        await SeedProfilesAsync(db, userManager);
        await SeedScholarshipsAsync(db);
        await SeedApplicationsAsync(db);
        await SeedReviewsAsync(db);
        await SeedAnnouncementsAsync(db);
    }

    // ── Ensure Student / Reviewer / Admin rows exist in AspNetRoles ───────
    private static async Task SeedRolesAsync(RoleManager<AppRole> roleManager)
    {
        foreach (var role in Roles)
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new AppRole(role));
        }
    }

    private static async Task SeedUsersAsync(UserManager<AppUser> userManager)
    {
        var seeds = new[]
        {
            (Email: "student@scholarship.local",  FullName: "Amina Yusuf",     Role: "Student"),
            (Email: "reviewer@scholarship.local", FullName: "Dr. Elena Kovač", Role: "Reviewer"),
            (Email: "admin@scholarship.local",    FullName: "Portal Admin",    Role: "Admin")
        };

        foreach (var (email, fullName, role) in seeds)
        {
            var user = await userManager.FindByEmailAsync(email);

            if (user is null)
            {
                user = new AppUser
                {
                    UserName = email,
                    Email = email,
                    FullName = fullName,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };

                var result = await userManager.CreateAsync(user, "Password123");
                if (!result.Succeeded)
                {
                    var errors = string.Join("; ", result.Errors.Select(e => e.Description));
                    throw new InvalidOperationException($"Failed to seed user {email}: {errors}");
                }
            }
            else
            {
                var needsUpdate = false;

                if (!string.Equals(user.FullName, fullName, StringComparison.Ordinal))
                {
                    user.FullName = fullName;
                    needsUpdate = true;
                }

                if (!user.IsActive)
                {
                    user.IsActive = true;
                    needsUpdate = true;
                }

                if (user.CreatedAt == default)
                {
                    user.CreatedAt = DateTime.UtcNow;
                    needsUpdate = true;
                }

                if (needsUpdate)
                {
                    var updateResult = await userManager.UpdateAsync(user);
                    if (!updateResult.Succeeded)
                    {
                        var errors = string.Join("; ", updateResult.Errors.Select(e => e.Description));
                        throw new InvalidOperationException($"Failed to update seeded user {email}: {errors}");
                    }
                }
            }

            var currentRoles = await userManager.GetRolesAsync(user);
            var rolesToRemove = currentRoles.Where(r => !r.Equals(role, StringComparison.OrdinalIgnoreCase)).ToArray();
            if (rolesToRemove.Length > 0)
            {
                var removeResult = await userManager.RemoveFromRolesAsync(user, rolesToRemove);
                if (!removeResult.Succeeded)
                {
                    var errors = string.Join("; ", removeResult.Errors.Select(e => e.Description));
                    throw new InvalidOperationException($"Failed to normalize roles for {email}: {errors}");
                }
            }

            if (!currentRoles.Any(r => r.Equals(role, StringComparison.OrdinalIgnoreCase)))
            {
                var addRoleResult = await userManager.AddToRoleAsync(user, role);
                if (!addRoleResult.Succeeded)
                {
                    var errors = string.Join("; ", addRoleResult.Errors.Select(e => e.Description));
                    throw new InvalidOperationException($"Failed to assign role '{role}' to {email}: {errors}");
                }
            }
        }
    }

    private static async Task SeedProfilesAsync(AppDbContext db, UserManager<AppUser> userManager)
    {
        var users = await userManager.Users.ToListAsync();
        foreach (var user in users)
        {
            var roles = await userManager.GetRolesAsync(user);

            if (roles.Any(r => r.Equals("Student", StringComparison.OrdinalIgnoreCase))
                && !await db.StudentProfiles.AnyAsync(p => p.UserId == user.Id))
            {
                db.StudentProfiles.Add(StudentProfile.Create(user.Id));
            }

            if (roles.Any(r => r.Equals("Reviewer", StringComparison.OrdinalIgnoreCase))
                && !await db.ReviewerProfiles.AnyAsync(p => p.UserId == user.Id))
            {
                db.ReviewerProfiles.Add(ReviewerProfile.Create(user.Id));
            }

            if (roles.Any(r => r.Equals("Admin", StringComparison.OrdinalIgnoreCase))
                && !await db.AdminProfiles.AnyAsync(p => p.UserId == user.Id))
            {
                db.AdminProfiles.Add(AdminProfile.Create(user.Id));
            }
        }

        await db.SaveChangesAsync();
    }

    private static async Task SeedScholarshipsAsync(AppDbContext db)
    {
        if (await db.Scholarships.AnyAsync()) return;

        db.Scholarships.AddRange(
            Scholarship.Create("STEM Excellence Award", "Undergraduate students", DateOnly.FromDateTime(DateTime.Today.AddDays(24)), "GPA 3.5+, engineering or computer science major, statement of purpose", 5000m),
            Scholarship.Create("Community Leadership Grant", "Any enrolled student", DateOnly.FromDateTime(DateTime.Today.AddDays(14)), "Volunteer history, recommendation letter, leadership essay", 2500m),
            Scholarship.Create("Research Innovation Fellowship", "Final-year and postgraduate students", DateOnly.FromDateTime(DateTime.Today.AddDays(31)), "Research proposal, supervisor endorsement, CV", 8000m)
        );

        await db.SaveChangesAsync();
    }

    private static async Task SeedApplicationsAsync(AppDbContext db)
    {
        if (await db.Applications.AnyAsync()) return;

        var scholarships = await db.Scholarships.OrderBy(s => s.Id).ToListAsync();
        if (scholarships.Count < 3) return;

        // Resolve the Identity user IDs so applications are linked to real accounts
        var studentUser   = await db.Users.FirstOrDefaultAsync(u => u.Email == "student@scholarship.local");
        var studentUserId = studentUser?.Id;

        var a1 = DomainApp.Create(scholarships[0].Id, "Amina Yusuf", studentUserId);
        a1.Submit();
        a1.MarkUnderReview();

        var a2 = DomainApp.Create(scholarships[1].Id, "David Chen");
        a2.Submit();
        a2.MarkUnderReview();
        a2.Shortlist();

        var a3 = DomainApp.Create(scholarships[2].Id, "Sara Ibrahim");

        db.Applications.AddRange(a1, a2, a3);
        await db.SaveChangesAsync();

        a1.AddDocument("transcript.pdf", "uploads/transcript.pdf", "Transcript");
        a1.AddDocument("essay.pdf", "uploads/essay.pdf", "Essay");
        a2.AddDocument("recommendation.pdf", "uploads/recommendation.pdf", "Recommendation Letter");

        await db.SaveChangesAsync();
    }

    private static async Task SeedReviewsAsync(AppDbContext db)
    {
        if (await db.Reviews.AnyAsync()) return;

        var applications = await db.Applications.OrderBy(a => a.Id).ToListAsync();
        if (applications.Count < 2) return;

        db.Reviews.AddRange(
            Review.Create(applications[0].Id, "Dr. Elena Kovač", 82, "Strong academic performance and clear career goals.", ReviewStage.Initial),
            Review.Create(applications[1].Id, "Prof. James Obi", 88, "Excellent leadership record with measurable impact.", ReviewStage.PanelDiscussion)
        );

        await db.SaveChangesAsync();
    }

    private static async Task SeedAnnouncementsAsync(AppDbContext db)
    {
        if (await db.Announcements.AnyAsync()) return;

        db.Announcements.AddRange(
            Announcement.Create("Spring applications are open", "General", "Students can now apply for all spring scholarship opportunities through the portal.", DateOnly.FromDateTime(DateTime.Today.AddDays(-7))),
            Announcement.Create("Reviewer deadline reminder", "Reviewer", "Please submit scores and comments for shortlisted applications before Friday 5 PM.", DateOnly.FromDateTime(DateTime.Today.AddDays(-2))),
            Announcement.Create("Results publishing checklist", "Admin", "Verify final approval, publish results, and notify successful candidates by email.", DateOnly.FromDateTime(DateTime.Today))
        );

        await db.SaveChangesAsync();
    }
}
