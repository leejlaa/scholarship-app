using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ScholarshipPortal.Domain.Entities;
using ScholarshipPortal.Domain.Enums;

namespace ScholarshipPortal.Infrastructure.Persistence.Configurations;

internal sealed class ScholarshipConfiguration : IEntityTypeConfiguration<Scholarship>
{
    public void Configure(EntityTypeBuilder<Scholarship> builder)
    {
        builder.HasKey(s => s.Id);

        builder.Property(s => s.Title)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(s => s.Audience)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(s => s.Eligibility)
            .IsRequired()
            .HasMaxLength(1000);

        builder.Property(s => s.Amount)
            .HasPrecision(18, 2);

        builder.Property(s => s.Status)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(s => s.AssignedReviewerId)
            .HasMaxLength(450);

        builder.Property(s => s.AssignedReviewerName)
            .HasMaxLength(200);

        builder.Property(s => s.AssignedReviewerEmail)
            .HasMaxLength(256);

        // SQLite stores DateOnly as text
        builder.Property(s => s.Deadline)
            .HasConversion(
                d => d.ToString("yyyy-MM-dd"),
                s => DateOnly.Parse(s));
    }
}
