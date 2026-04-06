using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using ScholarshipPortal.Application.DTOs.Auth;
using ScholarshipPortal.Application.Services;
using ScholarshipPortal.Infrastructure.Identity;

namespace ScholarshipPortal.Infrastructure.Auth;

internal sealed class JwtTokenService(
    UserManager<AppUser> userManager,
    IConfiguration configuration) : IAuthService
{
    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default)
    {
        var existingUser = await userManager.FindByEmailAsync(request.Email);
        if (existingUser is not null)
            throw new InvalidOperationException($"Email '{request.Email}' is already registered.");

        var user = new AppUser
        {
            UserName = request.Email,
            Email    = request.Email,
            FullName = request.FullName,
            Role     = request.Role
        };

        var result = await userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            var errors = string.Join("; ", result.Errors.Select(e => e.Description));
            throw new InvalidOperationException($"Registration failed: {errors}");
        }

        return BuildResponse(user);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var user = await userManager.FindByEmailAsync(request.Email)
            ?? throw new UnauthorizedAccessException("Invalid email or password.");

        var passwordValid = await userManager.CheckPasswordAsync(user, request.Password);
        if (!passwordValid)
            throw new UnauthorizedAccessException("Invalid email or password.");

        return BuildResponse(user);
    }

    // ── Token generation ────────────────────────────────────────────────────
    private AuthResponse BuildResponse(AppUser user)
    {
        var jwtSection = configuration.GetSection("Jwt");
        var keyBytes   = Encoding.UTF8.GetBytes(jwtSection["Key"]!);
        var expiryHours = double.TryParse(jwtSection["ExpiryHours"], out var h) ? h : 24;

        var expiresAt = DateTime.UtcNow.AddHours(expiryHours);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub,   user.Id),
            new Claim(JwtRegisteredClaimNames.Email, user.Email!),
            new Claim(JwtRegisteredClaimNames.Jti,   Guid.NewGuid().ToString()),
            new Claim("fullName", user.FullName),
            new Claim(ClaimTypes.Role, user.Role)
        };

        var token = new JwtSecurityToken(
            issuer:   jwtSection["Issuer"],
            audience: jwtSection["Audience"],
            claims:   claims,
            expires:  expiresAt,
            signingCredentials: new SigningCredentials(
                new SymmetricSecurityKey(keyBytes),
                SecurityAlgorithms.HmacSha256));

        return new AuthResponse(
            Token:     new JwtSecurityTokenHandler().WriteToken(token),
            Email:     user.Email!,
            FullName:  user.FullName,
            Role:      user.Role,
            ExpiresAt: expiresAt);
    }
}
