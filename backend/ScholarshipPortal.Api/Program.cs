using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.IdentityModel.Tokens;
using ScholarshipPortal.Application.Services;
using ScholarshipPortal.Application.DTOs;
using ScholarshipPortal.Application.DTOs.Auth;
using ScholarshipPortal.Application.UseCases.Announcements;
using ScholarshipPortal.Application.UseCases.Applications;
using ScholarshipPortal.Application.UseCases.Auth;
using ScholarshipPortal.Application.UseCases.Overview;
using ScholarshipPortal.Application.UseCases.Reviews;
using ScholarshipPortal.Application.UseCases.Scholarships;
using ScholarshipPortal.Domain.Entities;
using ScholarshipPortal.Domain.Enums;
using ScholarshipPortal.Domain.Repositories;
using ScholarshipPortal.Infrastructure;
using ScholarshipPortal.Infrastructure.Persistence;
using DomainApp = ScholarshipPortal.Domain.Entities.Application;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();

// Allow large file uploads (max 100 MB)
builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 100 * 1024 * 1024; // 100 MB
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("frontend", policy =>
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

// ── JWT Authentication ────────────────────────────────────────────────────
var jwtSection = builder.Configuration.GetSection("Jwt");
var keyBytes   = Encoding.UTF8.GetBytes(jwtSection["Key"]!);

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = jwtSection["Issuer"],
            ValidAudience            = jwtSection["Audience"],
            IssuerSigningKey         = new SymmetricSecurityKey(keyBytes)
        };
    });

builder.Services.AddAuthorization();

var uploadRoot = builder.Configuration["Storage:UploadRoot"] is { Length: > 0 } root
    ? root
    : Path.Combine(builder.Environment.ContentRootPath, "uploads");

builder.Services.AddInfrastructure(builder.Configuration, uploadRoot);

var app = builder.Build();

// ── Apply migrations + seed demo data on startup ──────────────────────────
await AppDbInitializer.SeedAsync(app.Services);

if (app.Environment.IsDevelopment())
    app.MapOpenApi();

app.UseCors("frontend");
app.UseAuthentication();
app.UseAuthorization();

// ── Composition root: API is a thin delivery layer only ───────────────────
var api = app.MapGroup("/api");

// ── Public endpoints ──────────────────────────────────────────────────────
api.MapGet("/health", () => Results.Ok(new
{
    status    = "ok",
    service   = "ScholarshipPortal.Api",
    timestamp = DateTimeOffset.UtcNow
}));

api.MapGet("/workflow", () => Results.Ok(new[]
{
    new { Order = 1, Title = "Post scholarship",      Detail = "Admin creates the opportunity, eligibility rules, deadlines, and required documents." },
    new { Order = 2, Title = "Student application",   Detail = "Student completes the form, uploads documents, and submits the application." },
    new { Order = 3, Title = "Eligibility screening", Detail = "System checks completeness, deadlines, and basic academic requirements." },
    new { Order = 4, Title = "Reviewer scoring",      Detail = "Reviewers evaluate submissions, assign scores, and leave comments." },
    new { Order = 5, Title = "Final decision",        Detail = "Admin confirms award decisions, publishes results, and tracks status updates." }
}));

api.MapGet("/announcements", async (GetAnnouncementsQuery query, CancellationToken ct) =>
    Results.Ok(await query.ExecuteAsync(ct)));

// ── Auth endpoints (anonymous) ─────────────────────────────────────────────
var auth = api.MapGroup("/auth");

auth.MapPost("/register", async (RegisterRequest request, RegisterCommand cmd, CancellationToken ct) =>
{
    try   { return Results.Ok(await cmd.ExecuteAsync(request, ct)); }
    catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
});

auth.MapPost("/login", async (LoginRequest request, LoginCommand cmd, CancellationToken ct) =>
{
    try   { return Results.Ok(await cmd.ExecuteAsync(request, ct)); }
    catch (UnauthorizedAccessException) { return Results.Unauthorized(); }
});

// ── Protected read endpoints ───────────────────────────────────────────────
api.MapGet("/overview", async (GetPortalOverviewQuery query, CancellationToken ct) =>
    Results.Ok(await query.ExecuteAsync(ct)))
    .RequireAuthorization();

api.MapGet("/reviewer/queue", async (GetReviewQueueQuery query, CancellationToken ct) =>
    Results.Ok(await query.ExecuteAsync(ct)))
    .RequireAuthorization(policy => policy.RequireRole("Reviewer", "Admin"));

// ── Scholarships CRUD ──────────────────────────────────────────────────────
var scholarshipsApi = api.MapGroup("/scholarships");

scholarshipsApi.MapGet("", async (GetScholarshipsQuery query, CancellationToken ct) =>
    Results.Ok(await query.ExecuteAsync(ct)));

scholarshipsApi.MapGet("/{id:int}", async (int id, IScholarshipRepository repo, CancellationToken ct) =>
{
    var scholarship = await repo.GetByIdAsync(id, ct);
    return scholarship is null ? Results.NotFound() : Results.Ok(scholarship);
});

scholarshipsApi.MapPost("", async (ScholarshipWriteRequest request, IScholarshipRepository repo, CancellationToken ct) =>
{
    try
    {
        var scholarship = Scholarship.Create(request.Title, request.Audience, request.Deadline, request.Eligibility, request.Amount);
        await repo.AddAsync(scholarship, ct);
        await repo.SaveChangesAsync(ct);
        return Results.Created($"/api/scholarships/{scholarship.Id}", scholarship);
    }
    catch (Exception ex) when (ex is ArgumentException or ArgumentOutOfRangeException)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
}).RequireAuthorization(policy => policy.RequireRole("Admin"));

scholarshipsApi.MapPut("/{id:int}", async (int id, ScholarshipWriteRequest request, IScholarshipRepository repo, CancellationToken ct) =>
{
    try
    {
        var scholarship = await repo.GetByIdAsync(id, ct);
        if (scholarship is null) return Results.NotFound();

        scholarship.UpdateDetails(request.Title, request.Audience, request.Deadline, request.Eligibility, request.Amount);
        await repo.SaveChangesAsync(ct);
        return Results.Ok(scholarship);
    }
    catch (Exception ex) when (ex is ArgumentException or ArgumentOutOfRangeException)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
}).RequireAuthorization(policy => policy.RequireRole("Admin"));

scholarshipsApi.MapDelete("/{id:int}", async (int id, IScholarshipRepository repo, CancellationToken ct) =>
{
    var scholarship = await repo.GetByIdAsync(id, ct);
    if (scholarship is null) return Results.NotFound();

    await repo.DeleteAsync(scholarship, ct);
    await repo.SaveChangesAsync(ct);
    return Results.NoContent();
}).RequireAuthorization(policy => policy.RequireRole("Admin"));

// ── Applications CRUD ──────────────────────────────────────────────────────
var applicationsApi = api.MapGroup("/applications");

applicationsApi.MapGet("", async (GetApplicationsQuery query, CancellationToken ct) =>
    Results.Ok(await query.ExecuteAsync(ct)))
    .RequireAuthorization(policy => policy.RequireRole("Student", "Reviewer", "Admin"));

applicationsApi.MapGet("/{id:int}", async (
    int id,
    IApplicationRepository applicationRepository,
    IScholarshipRepository scholarshipRepository,
    CancellationToken ct) =>
{
    var application = await applicationRepository.GetByIdAsync(id, ct);
    if (application is null) return Results.NotFound();

    var scholarship = await scholarshipRepository.GetByIdAsync(application.ScholarshipId, ct);
    return Results.Ok(ToApplicationDto(application, scholarship?.Title ?? "Unknown"));
}).RequireAuthorization(policy => policy.RequireRole("Student", "Reviewer", "Admin"));

applicationsApi.MapPost("", async (
    ApplicationCreateRequest request,
    ClaimsPrincipal user,
    IApplicationRepository applicationRepository,
    IScholarshipRepository scholarshipRepository,
    CancellationToken ct) =>
{
    try
    {
        var scholarship = await scholarshipRepository.GetByIdAsync(request.ScholarshipId, ct);
        if (scholarship is null)
            return Results.BadRequest(new { error = $"Scholarship {request.ScholarshipId} was not found." });

        var studentName = string.IsNullOrWhiteSpace(request.StudentName)
            ? user.FindFirstValue("fullName") ?? user.FindFirstValue(ClaimTypes.Email) ?? "Student"
            : request.StudentName;

        var application = DomainApp.Create(request.ScholarshipId, studentName);
        await applicationRepository.AddAsync(application, ct);
        await applicationRepository.SaveChangesAsync(ct);

        foreach (var document in request.Documents ?? [])
        {
            if (string.IsNullOrWhiteSpace(document.FileName) || string.IsNullOrWhiteSpace(document.DocumentType))
                continue;

            application.AddDocument(document.FileName, Path.Combine("uploads", document.FileName), document.DocumentType);
        }

        if (request.Submit)
            application.Submit();

        await applicationRepository.SaveChangesAsync(ct);
        return Results.Created($"/api/applications/{application.Id}", ToApplicationDto(application, scholarship.Title));
    }
    catch (Exception ex) when (ex is ArgumentException or ArgumentOutOfRangeException or InvalidOperationException)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
});

applicationsApi.MapPut("/{id:int}", async (
    int id,
    ApplicationUpdateRequest request,
    IApplicationRepository applicationRepository,
    IScholarshipRepository scholarshipRepository,
    CancellationToken ct) =>
{
    try
    {
        var application = await applicationRepository.GetByIdAsync(id, ct);
        if (application is null) return Results.NotFound();

        if (!string.IsNullOrWhiteSpace(request.StudentName))
            application.UpdateStudentName(request.StudentName);

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            if (!Enum.TryParse<ApplicationStatus>(request.Status, ignoreCase: true, out var status))
                return Results.BadRequest(new { error = $"Invalid application status '{request.Status}'." });

            application.UpdateStatus(status);
        }

        foreach (var document in request.Documents ?? [])
        {
            if (string.IsNullOrWhiteSpace(document.FileName) || string.IsNullOrWhiteSpace(document.DocumentType))
                continue;

            application.AddDocument(document.FileName, Path.Combine("uploads", document.FileName), document.DocumentType);
        }

        await applicationRepository.SaveChangesAsync(ct);

        var scholarship = await scholarshipRepository.GetByIdAsync(application.ScholarshipId, ct);
        return Results.Ok(ToApplicationDto(application, scholarship?.Title ?? "Unknown"));
    }
    catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
});

applicationsApi.MapDelete("/{id:int}", async (int id, IApplicationRepository applicationRepository, CancellationToken ct) =>
{
    var application = await applicationRepository.GetByIdAsync(id, ct);
    if (application is null) return Results.NotFound();

    await applicationRepository.DeleteAsync(application, ct);
    await applicationRepository.SaveChangesAsync(ct);
    return Results.NoContent();
}).RequireAuthorization(policy => policy.RequireRole("Admin"));

// ── Reviews CRUD ───────────────────────────────────────────────────────────
var reviewsApi = api.MapGroup("/reviews")
    .RequireAuthorization(policy => policy.RequireRole("Reviewer", "Admin"));

reviewsApi.MapGet("", async (GetReviewQueueQuery query, CancellationToken ct) =>
    Results.Ok(await query.ExecuteAsync(ct)));

reviewsApi.MapGet("/{id:int}", async (
    int id,
    IReviewRepository reviewRepository,
    IApplicationRepository applicationRepository,
    IScholarshipRepository scholarshipRepository,
    CancellationToken ct) =>
{
    var review = await reviewRepository.GetByIdAsync(id, ct);
    if (review is null) return Results.NotFound();

    var application = await applicationRepository.GetByIdAsync(review.ApplicationId, ct);
    var scholarship = application is null ? null : await scholarshipRepository.GetByIdAsync(application.ScholarshipId, ct);
    return Results.Ok(ToReviewDto(review, scholarship?.Title ?? "Unknown", application?.StudentName ?? "Unknown"));
});

reviewsApi.MapGet("/application/{applicationId:int}", async (
    int applicationId,
    IReviewRepository reviewRepository,
    IApplicationRepository applicationRepository,
    IScholarshipRepository scholarshipRepository,
    CancellationToken ct) =>
{
    var reviews = await reviewRepository.GetByApplicationIdAsync(applicationId, ct);
    var application = await applicationRepository.GetByIdAsync(applicationId, ct);
    var scholarship = application is null ? null : await scholarshipRepository.GetByIdAsync(application.ScholarshipId, ct);

    return Results.Ok(reviews.Select(review =>
        ToReviewDto(review, scholarship?.Title ?? "Unknown", application?.StudentName ?? "Unknown")));
});

reviewsApi.MapPost("", async (
    ReviewCreateRequest request,
    ClaimsPrincipal user,
    IReviewRepository reviewRepository,
    IApplicationRepository applicationRepository,
    IScholarshipRepository scholarshipRepository,
    CancellationToken ct) =>
{
    try
    {
        var application = await applicationRepository.GetByIdAsync(request.ApplicationId, ct);
        if (application is null)
            return Results.BadRequest(new { error = $"Application {request.ApplicationId} was not found." });

        if (!Enum.TryParse<ReviewStage>(request.Stage, ignoreCase: true, out var stage))
            return Results.BadRequest(new { error = $"Invalid review stage '{request.Stage}'." });

        var reviewerName = string.IsNullOrWhiteSpace(request.ReviewerName)
            ? user.FindFirstValue("fullName") ?? user.FindFirstValue(ClaimTypes.Email) ?? "Reviewer"
            : request.ReviewerName;

        var review = Review.Create(request.ApplicationId, reviewerName, request.Score, request.Comment, stage);
        await reviewRepository.AddAsync(review, ct);
        await reviewRepository.SaveChangesAsync(ct);

        var scholarship = await scholarshipRepository.GetByIdAsync(application.ScholarshipId, ct);
        return Results.Created($"/api/reviews/{review.Id}", ToReviewDto(review, scholarship?.Title ?? "Unknown", application.StudentName));
    }
    catch (Exception ex) when (ex is ArgumentException or ArgumentOutOfRangeException)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
});

reviewsApi.MapPut("/{id:int}", async (
    int id,
    ReviewUpdateRequest request,
    ClaimsPrincipal user,
    IReviewRepository reviewRepository,
    IApplicationRepository applicationRepository,
    IScholarshipRepository scholarshipRepository,
    CancellationToken ct) =>
{
    try
    {
        var review = await reviewRepository.GetByIdAsync(id, ct);
        if (review is null) return Results.NotFound();

        if (!Enum.TryParse<ReviewStage>(request.Stage, ignoreCase: true, out var stage))
            return Results.BadRequest(new { error = $"Invalid review stage '{request.Stage}'." });

        var reviewerName = string.IsNullOrWhiteSpace(request.ReviewerName)
            ? review.ReviewerName
            : request.ReviewerName;

        review.UpdateEvaluation(reviewerName, request.Score, request.Comment, stage);
        await reviewRepository.SaveChangesAsync(ct);

        var application = await applicationRepository.GetByIdAsync(review.ApplicationId, ct);
        var scholarship = application is null ? null : await scholarshipRepository.GetByIdAsync(application.ScholarshipId, ct);
        return Results.Ok(ToReviewDto(review, scholarship?.Title ?? "Unknown", application?.StudentName ?? "Unknown"));
    }
    catch (Exception ex) when (ex is ArgumentException or ArgumentOutOfRangeException)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
});

reviewsApi.MapDelete("/{id:int}", async (int id, IReviewRepository reviewRepository, CancellationToken ct) =>
{
    var review = await reviewRepository.GetByIdAsync(id, ct);
    if (review is null) return Results.NotFound();

    await reviewRepository.DeleteAsync(review, ct);
    await reviewRepository.SaveChangesAsync(ct);
    return Results.NoContent();
});

// ── Document upload / download ─────────────────────────────────────────────
// POST /api/applications/{id}/documents   — upload one file
applicationsApi.MapPost("/{id:int}/documents", async (
    int id,
    IFormFile file,
    string? documentType,
    IApplicationRepository applicationRepository,
    IDocumentStorageService storage,
    CancellationToken ct) =>
{
    if (file is null || file.Length == 0)
        return Results.BadRequest(new { error = "No file received." });

    const long maxBytes = 100 * 1024 * 1024; // 100 MB
    if (file.Length > maxBytes)
        return Results.BadRequest(new { error = "File exceeds 100 MB limit." });

    var application = await applicationRepository.GetByIdAsync(id, ct);
    if (application is null) return Results.NotFound();

    await using var stream = file.OpenReadStream();
    var storagePath = await storage.UploadAsync(stream, file.FileName, file.ContentType, ct);

    // documentType header or query param — default to the file's extension without the dot
    var resolvedDocumentType = !string.IsNullOrWhiteSpace(documentType)
        ? documentType.Trim()
        : file.ContentType.Contains("pdf", StringComparison.OrdinalIgnoreCase) ? "PDF"
        : file.ContentType.Contains("image", StringComparison.OrdinalIgnoreCase) ? "Image"
        : Path.GetExtension(file.FileName).TrimStart('.').ToUpperInvariant();

    application.AddDocument(file.FileName, storagePath, resolvedDocumentType);
    await applicationRepository.SaveChangesAsync(ct);

    return Results.Ok(new
    {
        fileName    = file.FileName,
        storagePath,
        documentType = resolvedDocumentType,
        sizeBytes   = file.Length
    });
}).DisableAntiforgery()
  .RequireAuthorization(policy => policy.RequireRole("Student", "Admin"));

// GET /api/applications/{id}/documents   — list documents attached to an application
applicationsApi.MapGet("/{id:int}/documents", async (
    int id,
    IApplicationRepository applicationRepository,
    CancellationToken ct) =>
{
    var application = await applicationRepository.GetByIdAsync(id, ct);
    if (application is null) return Results.NotFound();

    var docs = application.Documents.Select(d => new
    {
        d.Id,
        d.FileName,
        d.StoragePath,
        d.DocumentType
    });
    return Results.Ok(docs);
}).RequireAuthorization(policy => policy.RequireRole("Student", "Reviewer", "Admin"));

// GET /api/documents/{storagePath}   — download a stored file
api.MapGet("/documents/{**storagePath}", async (
    string storagePath,
    IDocumentStorageService storage,
    CancellationToken ct) =>
{
    try
    {
        var stream      = await storage.DownloadAsync(storagePath, ct);
        var contentType = storagePath.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase)
            ? "application/pdf"
            : "application/octet-stream";
        return Results.Stream(stream, contentType, Path.GetFileName(storagePath));
    }
    catch (FileNotFoundException)
    {
        return Results.NotFound(new { error = "Document not found." });
    }
}).RequireAuthorization();

app.Run();

static ApplicationDto ToApplicationDto(DomainApp application, string scholarshipTitle) =>
    new(
        application.Id,
        scholarshipTitle,
        application.StudentName,
        application.Status.ToString(),
        Score: 0,
        DocumentsComplete: application.Documents.Count > 0,
        SubmittedDocuments: string.Join(", ", application.Documents.Select(d => d.DocumentType)),
        NextStep: ResolveNextStep(application.Status));

static ReviewDto ToReviewDto(Review review, string scholarshipTitle, string applicantName) =>
    new(
        review.Id,
        review.ApplicationId,
        scholarshipTitle,
        applicantName,
        review.Score,
        review.Comment,
        review.Stage.ToString());

static string ResolveNextStep(ApplicationStatus status) => status switch
{
    ApplicationStatus.Draft       => "Student must submit the application.",
    ApplicationStatus.Submitted   => "Awaiting eligibility screening.",
    ApplicationStatus.UnderReview => "Awaiting final reviewer comments.",
    ApplicationStatus.Shortlisted => "Committee decision pending.",
    ApplicationStatus.Approved    => "Award confirmed. Notification sent.",
    ApplicationStatus.Rejected    => "Application closed.",
    _                             => "Contact the scholarship office."
};

internal sealed record ScholarshipWriteRequest(
    string Title,
    string Audience,
    DateOnly Deadline,
    string Eligibility,
    decimal Amount);

internal sealed record ApplicationDocumentRequest(string FileName, string DocumentType);

internal sealed record ApplicationCreateRequest(
    int ScholarshipId,
    string? StudentName,
    bool Submit,
    List<ApplicationDocumentRequest>? Documents);

internal sealed record ApplicationUpdateRequest(
    string? StudentName,
    string? Status,
    List<ApplicationDocumentRequest>? Documents);

internal sealed record ReviewCreateRequest(
    int ApplicationId,
    string? ReviewerName,
    int Score,
    string Comment,
    string Stage);

internal sealed record ReviewUpdateRequest(
    string? ReviewerName,
    int Score,
    string Comment,
    string Stage);

