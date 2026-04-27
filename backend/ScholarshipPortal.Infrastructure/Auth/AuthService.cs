using Microsoft.AspNetCore.Identity;
using ScholarshipPortal.Application.DTOs.Auth;
using ScholarshipPortal.Application.Services;
using ScholarshipPortal.Domain.Entities;
using ScholarshipPortal.Infrastructure.Identity;
using ScholarshipPortal.Infrastructure.Persistence;

namespace ScholarshipPortal.Infrastructure.Auth;

internal sealed class AuthService(
    UserManager<AppUser> userManager,
    IJwtTokenGenerator tokenGenerator,
    AppDbContext db) : IAuthService
{
    private static readonly string[] ValidRoles = ["Student", "Reviewer", "Admin"];

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default)
    {
        var existingUser = await userManager.FindByEmailAsync(request.Email);
        if (existingUser is not null)
            throw new InvalidOperationException($"Email '{request.Email}' is already registered.");

        var role = ValidRoles.FirstOrDefault(r =>
            r.Equals(request.Role, StringComparison.OrdinalIgnoreCase)) ?? "Student";

        var user = new AppUser
        {
            UserName = request.Email,
            Email = request.Email,
            FullName = request.FullName
        };

        var createResult = await userManager.CreateAsync(user, request.Password);
        if (!createResult.Succeeded)
        {
            var errors = string.Join("; ", createResult.Errors.Select(e => e.Description));
            throw new InvalidOperationException($"Registration failed: {errors}");
        }

        var roleResult = await userManager.AddToRoleAsync(user, role);
        if (!roleResult.Succeeded)
        {
            var errors = string.Join("; ", roleResult.Errors.Select(e => e.Description));
            throw new InvalidOperationException($"Role assignment failed: {errors}");
        }

        // Create the role-specific profile row
        switch (role)
        {
            case "Student":
                db.StudentProfiles.Add(StudentProfile.Create(
                    user.Id,
                    studentNumber:    request.StudentNumber,
                    faculty:          request.Faculty,
                    department:       request.Department,
                    program:          request.Program,
                    currentYear:      request.CurrentYear,
                    gpa:              request.Gpa,
                    dateOfBirth:      request.DateOfBirth,
                    phoneNumber:      request.PhoneNumber,
                    address:          request.Address,
                    nationality:      request.Nationality,
                    personalStatement: request.PersonalStatement));
                break;

            case "Reviewer":
                db.ReviewerProfiles.Add(ReviewerProfile.Create(
                    user.Id,
                    staffNumber:      request.StaffNumber,
                    department:       request.Department,
                    title:            request.Title,
                    expertiseAreas:   request.ExpertiseAreas,
                    officeLocation:   request.OfficeLocation,
                    phoneNumber:      request.PhoneNumber,
                    bio:              request.Bio,
                    maxActiveReviews: request.MaxActiveReviews,
                    isAvailable:      request.IsAvailable ?? true));
                break;

            case "Admin":
                db.AdminProfiles.Add(AdminProfile.Create(
                    user.Id,
                    department:       request.Department,
                    title:            request.Title,
                    officeLocation:   request.OfficeLocation,
                    phoneNumber:      request.PhoneNumber));
                break;
        }
        await db.SaveChangesAsync(ct);

        var roles = await userManager.GetRolesAsync(user);
        return tokenGenerator.Generate(user, roles.FirstOrDefault() ?? "Student");
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var user = await userManager.FindByEmailAsync(request.Email)
            ?? throw new UnauthorizedAccessException("Invalid email or password.");

        var passwordValid = await userManager.CheckPasswordAsync(user, request.Password);
        if (!passwordValid)
            throw new UnauthorizedAccessException("Invalid email or password.");

        var roles = await userManager.GetRolesAsync(user);
        return tokenGenerator.Generate(user, roles.FirstOrDefault() ?? "Student");
    }
}
