using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ScholarshipPortal.Application.Services;
using ScholarshipPortal.Application.UseCases.Announcements;
using ScholarshipPortal.Application.UseCases.Applications;
using ScholarshipPortal.Application.UseCases.Auth;
using ScholarshipPortal.Application.UseCases.Overview;
using ScholarshipPortal.Application.UseCases.Reviews;
using ScholarshipPortal.Application.UseCases.Scholarships;
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
            .AddEntityFrameworkStores<AppDbContext>()
            .AddDefaultTokenProviders();

        // ── Repositories (Scoped — one per HTTP request) ──────────────────
        services.AddScoped<IScholarshipRepository,  EfScholarshipRepository>();
        services.AddScoped<IApplicationRepository,  EfApplicationRepository>();
        services.AddScoped<IReviewRepository,       EfReviewRepository>();
        services.AddScoped<IAnnouncementRepository, EfAnnouncementRepository>();

        // ── Auth service ─────────────────────────────────────────────────
        services.AddScoped<IAuthService, JwtTokenService>();

        // ── Storage ───────────────────────────────────────────────────────
        services.AddSingleton<IDocumentStorageService>(_ => new LocalDocumentStorageService(uploadRoot));

        // ── Use cases ─────────────────────────────────────────────────────
        services.AddScoped<GetScholarshipsQuery>();
        services.AddScoped<GetApplicationsQuery>();
        services.AddScoped<GetReviewQueueQuery>();
        services.AddScoped<GetAnnouncementsQuery>();
        services.AddScoped<GetPortalOverviewQuery>();
        services.AddScoped<RegisterCommand>();
        services.AddScoped<LoginCommand>();

        return services;
    }
}
