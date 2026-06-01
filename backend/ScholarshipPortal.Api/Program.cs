using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Identity.Web;
using ScholarshipPortal.Infrastructure;
using ScholarshipPortal.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

// ── MVC Controllers ───────────────────────────────────────────────────────
builder.Services.AddControllers();

builder.Services.AddOpenApi();

// Allow large file uploads (max 100 MB)
builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 100 * 1024 * 1024; // 100 MB
});

builder.Services.AddCors(options =>
{
    var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
        ?? ["http://localhost:5173"];
    options.AddPolicy("frontend", policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod());
});

// ── Azure AD (JWT Bearer) ─────────────────────────────────────────────────
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddMicrosoftIdentityWebApi(builder.Configuration.GetSection("AzureAd"));

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

app.MapControllers();


app.Run();
