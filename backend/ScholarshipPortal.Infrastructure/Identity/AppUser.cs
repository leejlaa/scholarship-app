using Microsoft.AspNetCore.Identity;

namespace ScholarshipPortal.Infrastructure.Identity;

/// <summary>Extends IdentityUser with domain-specific fields.</summary>
public sealed class AppUser : IdentityUser
{
    public string FullName { get; set; } = string.Empty;

    /// <summary>Application role: "Student" | "Reviewer" | "Admin"</summary>
    public string Role { get; set; } = "Student";
}
