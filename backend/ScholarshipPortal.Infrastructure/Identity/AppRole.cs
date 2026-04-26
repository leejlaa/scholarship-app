using Microsoft.AspNetCore.Identity;

namespace ScholarshipPortal.Infrastructure.Identity;

/// <summary>
/// ASP.NET Identity role entity.
/// The three built-in roles are: Student | Reviewer | Admin
/// </summary>
public sealed class AppRole : IdentityRole
{
    // Parameterless ctor required by EF Core
    public AppRole() { }
    public AppRole(string roleName) : base(roleName) { }
}
