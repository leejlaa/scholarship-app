using ScholarshipPortal.Application.DTOs.Auth;
using ScholarshipPortal.Application.Services;

namespace ScholarshipPortal.Application.UseCases.Auth;

public sealed class LoginCommand(IAuthService authService)
{
    public Task<AuthResponse> ExecuteAsync(LoginRequest request, CancellationToken ct = default)
        => authService.LoginAsync(request, ct);
}
