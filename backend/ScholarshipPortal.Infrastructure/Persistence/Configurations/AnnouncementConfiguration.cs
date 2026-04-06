using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ScholarshipPortal.Domain.Entities;

namespace ScholarshipPortal.Infrastructure.Persistence.Configurations;

internal sealed class AnnouncementConfiguration : IEntityTypeConfiguration<Announcement>
{
    public void Configure(EntityTypeBuilder<Announcement> builder)
    {
        builder.HasKey(a => a.Id);

        builder.Property(a => a.Title)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(a => a.Category)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(a => a.Message)
            .IsRequired()
            .HasMaxLength(5000);

        builder.Property(a => a.PublishDate)
            .HasConversion(
                d => d.ToString("yyyy-MM-dd"),
                s => DateOnly.Parse(s));
    }
}
