using System.IdentityModel.Tokens.Jwt;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Identity.Web;
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
    var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
        ?? ["http://localhost:5173"];
    options.AddPolicy("frontend", policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod());
});

// ── Authentication: Azure AD + local email/password JWT ───────────────────
// A policy scheme inspects the token issuer and forwards to the right validator.
var authBuilder = builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultScheme = "SmartSelector";
        options.DefaultChallengeScheme = "SmartSelector";
    })
    .AddPolicyScheme("SmartSelector", "JWT router", options =>
    {
        options.ForwardDefaultSelector = context =>
        {
            var authHeader = context.Request.Headers.Authorization.FirstOrDefault();
            if (authHeader?.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase) == true)
            {
                var raw = authHeader["Bearer ".Length..].Trim();
                try
                {
                    var handler = new JwtSecurityTokenHandler();
                    if (handler.CanReadToken(raw) &&
                        handler.ReadJwtToken(raw).Issuer == builder.Configuration["Jwt:Issuer"])
                        return "Local";
                }
                catch { }
            }
            return JwtBearerDefaults.AuthenticationScheme;
        };
    });

// Azure AD — validates tokens issued by Microsoft
authBuilder.AddMicrosoftIdentityWebApi(builder.Configuration.GetSection("AzureAd"));

// Local — validates symmetric-key JWTs issued by JwtTokenGenerator (email/password login)
authBuilder.AddJwtBearer("Local", options =>
{
    var key = Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!);
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidateAudience = true,
        ValidAudience = builder.Configuration["Jwt:Audience"],
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero,
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
