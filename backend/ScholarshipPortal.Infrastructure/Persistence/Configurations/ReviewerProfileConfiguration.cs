using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ScholarshipPortal.Domain.Entities;
using ScholarshipPortal.Infrastructure.Identity;

namespace ScholarshipPortal.Infrastructure.Persistence.Configurations;

internal sealed class ReviewerProfileConfiguration : IEntityTypeConfiguration<ReviewerProfile>
{
    public void Configure(EntityTypeBuilder<ReviewerProfile> builder)
    {
        builder.HasKey(p => p.UserId);

        builder.Property(p => p.UserId)
            .HasMaxLength(450);

        builder.Property(p => p.StaffNumber)
            .HasMaxLength(50);

        builder.Property(p => p.Department)
            .HasMaxLength(150);

        builder.Property(p => p.Title)
            .HasMaxLength(100);

        builder.Property(p => p.ExpertiseAreas)
            .HasMaxLength(500);

        builder.Property(p => p.OfficeLocation)
            .HasMaxLength(150);

        builder.Property(p => p.PhoneNumber)
            .HasMaxLength(50);

        builder.Property(p => p.Bio)
            .HasMaxLength(2000);

        builder.HasOne<AppUser>()
            .WithOne(u => u.ReviewerProfile)
            .HasForeignKey<ReviewerProfile>(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
