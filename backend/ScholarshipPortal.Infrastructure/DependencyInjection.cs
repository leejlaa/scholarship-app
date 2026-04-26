using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ScholarshipPortal.Application.Services;
using ScholarshipPortal.Domain.Repositories;
using ScholarshipPortal.Infrastructure.Auth;
using ScholarshipPortal.Infrastructure.Identity;
using ScholarshipPortal.Infrastructure.Persistence;
using ScholarshipPortal.Infrastructure.Storage;

namespace ScholarshipPortal.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration,
        string uploadRoot)
    {
        // ── Database (SQLite via EF Core) ─────────────────────────────────
        var connectionString = configuration.GetConnectionString("Default")
            ?? "Data Source=scholarship.db";

        services.AddDbContext<AppDbContext>(opts =>
            opts.UseSqlite(connectionString));

        // ── ASP.NET Core Identity (API mode — no cookie UI) ───────────────
        services.AddIdentityCore<AppUser>(opts =>
            {
                opts.Password.RequireDigit           = true;
                opts.Password.RequireLowercase       = true;
                opts.Password.RequireUppercase       = false;
                opts.Password.RequireNonAlphanumeric = false;
                opts.Password.RequiredLength         = 8;
            })
            .AddRoles<AppRole>()
            .AddEntityFrameworkStores<AppDbContext>()
            .AddDefaultTokenProviders();

        // ── Repositories (Scoped — one per HTTP request) ──────────────────
        services.AddScoped<IScholarshipRepository,  EfScholarshipRepository>();
        services.AddScoped<IApplicationRepository,  EfApplicationRepository>();
        services.AddScoped<IApplicationDocumentRepository, EfApplicationDocumentRepository>();
        services.AddScoped<IReviewRepository,       EfReviewRepository>();
        services.AddScoped<IAnnouncementRepository, EfAnnouncementRepository>();

        // ── Services ──────────────────────────────────────────────────────
        services.AddScoped<IJwtTokenGenerator, JwtTokenGenerator>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IScholarshipService, ScholarshipService>();
        services.AddScoped<IApplicationService, ApplicationService>();
        services.AddScoped<IReviewService, ReviewService>();
        services.AddScoped<IDocumentService, DocumentService>();
        services.AddScoped<IAnnouncementService, AnnouncementService>();
        services.AddScoped<IOverviewService, OverviewService>();

        // ── Storage ───────────────────────────────────────────────────────
        services.AddSingleton<IDocumentStorageService>(_ => new LocalDocumentStorageService(uploadRoot));

        return services;
    }
}
