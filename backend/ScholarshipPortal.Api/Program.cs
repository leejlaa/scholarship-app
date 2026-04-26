using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.IdentityModel.Tokens;
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

app.MapControllers();


app.Run();
