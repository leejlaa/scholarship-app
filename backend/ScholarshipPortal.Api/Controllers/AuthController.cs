using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using ScholarshipPortal.Application.DTOs.Auth;
using ScholarshipPortal.Application.Services;
using ScholarshipPortal.Infrastructure.Identity;

namespace ScholarshipPortal.Api.Controllers;

/// <summary>
/// /register  — public, role is forced to "Student" (anyone can sign up as a student)
/// /login     — public
/// /users     — Admin only: create Reviewer or Admin accounts
/// </summary>
[ApiController]
[Route("api/auth")]
public sealed class AuthController(
    IAuthService authService,
    UserManager<AppUser> userManager) : ControllerBase
{
    private static readonly HashSet<string> AllowedRoles =
        new(StringComparer.OrdinalIgnoreCase) { "Student", "Reviewer", "Admin" };

    // POST /api/auth/register  — creates an account with the requested role
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request, CancellationToken ct)
    {
        if (!AllowedRoles.Contains(request.Role))
            return BadRequest(new { error = $"Role must be one of: {string.Join(", ", AllowedRoles)}." });

        try
        {
            var result = await authService.RegisterAsync(request, ct);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    // GET /api/auth/me — Azure AD bearer; returns portal role for the signed-in user
    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        // Azure AD NameIdentifier is the OID, not the portal user ID — match by email instead.
        var email = User.FindFirstValue("preferred_username")
                 ?? User.FindFirstValue(ClaimTypes.Email)
                 ?? User.FindFirstValue("email")
                 ?? User.FindFirstValue(ClaimTypes.Upn);

        if (string.IsNullOrEmpty(email))
            return Unauthorized(new { error = "No email claim found in token. Register first or contact an administrator." });

        var user = await userManager.FindByEmailAsync(email);
        if (user is null)
            return Unauthorized(new { error = "No portal account is linked to this Microsoft sign-in. Register first or contact an administrator." });

        var roles = await userManager.GetRolesAsync(user);
        var role = roles.FirstOrDefault() ?? "Student";

        return Ok(new AuthResponse(
            Token: string.Empty,
            Email: user.Email!,
            FullName: user.FullName,
            Role: role,
            ExpiresAt: DateTime.UtcNow.AddHours(1)));
    }

    // POST /api/auth/login  — public
    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request, CancellationToken ct)
    {
        try
        {
            var result = await authService.LoginAsync(request, ct);
            return Ok(result);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized();
        }
    }

    // POST /api/auth/users  — Admin only: create accounts with any role
    [HttpPost("users")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateUser(RegisterRequest request, CancellationToken ct)
    {
        if (!AllowedRoles.Contains(request.Role))
            return BadRequest(new { error = $"Role must be one of: {string.Join(", ", AllowedRoles)}." });

        try
        {
            var result = await authService.RegisterAsync(request, ct);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    // GET /api/auth/reviewers — Admin only: list assignable reviewers
    [HttpGet("reviewers")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetReviewers()
    {
        var users = await userManager.GetUsersInRoleAsync("Reviewer");
        var result = users
            .OrderBy(u => u.FullName)
            .Select(u => new
            {
                id = u.Id,
                fullName = u.FullName,
                email = u.Email
            });

        return Ok(result);
    }
}
