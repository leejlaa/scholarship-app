using ScholarshipPortal.Application.DTOs.Auth;
using ScholarshipPortal.Application.Services;

namespace ScholarshipPortal.Application.UseCases.Auth;

public sealed class RegisterCommand(IAuthService authService)
{
    public Task<AuthResponse> ExecuteAsync(RegisterRequest request, CancellationToken ct = default)
        => authService.RegisterAsync(request, ct);
}
