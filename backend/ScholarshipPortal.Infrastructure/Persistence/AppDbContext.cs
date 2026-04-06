using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using ScholarshipPortal.Domain.Entities;
using ScholarshipPortal.Infrastructure.Identity;
using ScholarshipPortal.Infrastructure.Persistence.Configurations;
using DomainApp = ScholarshipPortal.Domain.Entities.Application;

namespace ScholarshipPortal.Infrastructure.Persistence;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options)
    : IdentityDbContext<AppUser>(options)
{
    public DbSet<Scholarship>        Scholarships        => Set<Scholarship>();
    public DbSet<DomainApp>          Applications        => Set<DomainApp>();
    public DbSet<ApplicationDocument> ApplicationDocuments => Set<ApplicationDocument>();
    public DbSet<Review>             Reviews             => Set<Review>();
    public DbSet<Announcement>       Announcements       => Set<Announcement>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder); // required for Identity tables

        modelBuilder.ApplyConfiguration(new ScholarshipConfiguration());
        modelBuilder.ApplyConfiguration(new ApplicationConfiguration());
        modelBuilder.ApplyConfiguration(new ApplicationDocumentConfiguration());
        modelBuilder.ApplyConfiguration(new ReviewConfiguration());
        modelBuilder.ApplyConfiguration(new AnnouncementConfiguration());
    }
}
