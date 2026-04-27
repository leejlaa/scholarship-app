using Microsoft.AspNetCore.Identity;
using ScholarshipPortal.Domain.Entities;

namespace ScholarshipPortal.Infrastructure.Identity;

/// <summary>Extends IdentityUser with domain-specific fields.</summary>
public sealed class AppUser : IdentityUser
{
    public string FullName { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public StudentProfile? StudentProfile { get; set; }
    public ReviewerProfile? ReviewerProfile { get; set; }
    public AdminProfile? AdminProfile { get; set; }
}
