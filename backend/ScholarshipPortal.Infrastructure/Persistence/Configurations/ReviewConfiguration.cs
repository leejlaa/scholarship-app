using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ScholarshipPortal.Domain.Entities;

namespace ScholarshipPortal.Infrastructure.Persistence.Configurations;

internal sealed class ReviewConfiguration : IEntityTypeConfiguration<Review>
{
    public void Configure(EntityTypeBuilder<Review> builder)
    {
        builder.HasKey(r => r.Id);

        builder.Property(r => r.ReviewerName)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(r => r.Comment)
            .IsRequired()
            .HasMaxLength(2000);

        builder.Property(r => r.Stage)
            .HasConversion<string>()
            .HasMaxLength(30);

        builder.HasOne<ScholarshipPortal.Domain.Entities.Application>()
            .WithMany()
            .HasForeignKey(r => r.ApplicationId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
