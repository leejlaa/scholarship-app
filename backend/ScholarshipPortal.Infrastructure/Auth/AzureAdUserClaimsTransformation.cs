using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Identity;
using ScholarshipPortal.Infrastructure.Identity;

namespace ScholarshipPortal.Infrastructure.Auth;

/// <summary>
/// Maps an Azure AD principal to a local portal user (by email) so role-based
/// authorization and NameIdentifier match the application database.
/// </summary>
internal sealed class AzureAdUserClaimsTransformation(UserManager<AppUser> userManager) : IClaimsTransformation
{
    private const string MappedClaimType = "portal_user_mapped";

    public async Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal principal)
    {
        if (principal.Identity?.IsAuthenticated != true)
            return principal;

        if (principal.HasClaim(MappedClaimType, "true"))
            return principal;

        var email = ResolveEmail(principal);
        if (string.IsNullOrWhiteSpace(email))
            return principal;

        var user = await userManager.FindByEmailAsync(email);
        if (user is null)
            return principal;

        var roles = await userManager.GetRolesAsync(user);
        var role = roles.FirstOrDefault() ?? "Student";

        var claims = principal.Claims
            .Where(c => c.Type is not (
                ClaimTypes.NameIdentifier
                or "sub"
                or ClaimTypes.Role
                or "roles"
                or "fullName"))
            .ToList();

        claims.Add(new Claim(MappedClaimType, "true"));
        claims.Add(new Claim(ClaimTypes.NameIdentifier, user.Id));
        claims.Add(new Claim(ClaimTypes.Email, user.Email!));
        claims.Add(new Claim(ClaimTypes.Role, role));
        claims.Add(new Claim("fullName", user.FullName));

        var identity = new ClaimsIdentity(
            claims,
            principal.Identity.AuthenticationType,
            ClaimTypes.Name,
            ClaimTypes.Role);

        return new ClaimsPrincipal(identity);
    }

    private static string? ResolveEmail(ClaimsPrincipal principal) =>
        principal.FindFirstValue(ClaimTypes.Email)
        ?? principal.FindFirstValue("preferred_username")
        ?? principal.FindFirstValue(ClaimTypes.Upn)
        ?? principal.FindFirstValue("unique_name");
}
