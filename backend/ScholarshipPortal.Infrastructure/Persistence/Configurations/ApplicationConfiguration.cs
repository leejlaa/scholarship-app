using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using DomainApp = ScholarshipPortal.Domain.Entities.Application;

namespace ScholarshipPortal.Infrastructure.Persistence.Configurations;

internal sealed class ApplicationConfiguration : IEntityTypeConfiguration<DomainApp>
{
    public void Configure(EntityTypeBuilder<DomainApp> builder)
    {
        builder.HasKey(a => a.Id);

        builder.Property(a => a.StudentName)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(a => a.UserId)
            .HasMaxLength(450); // matches ASP.NET Identity user-id length

        builder.Property(a => a.Status)
            .HasConversion<string>()
            .HasMaxLength(20);

        // Map the private backing field _documents so EF Core can populate it
        builder.HasMany(a => a.Documents)
            .WithOne()
            .HasForeignKey(d => d.ApplicationId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Navigation(a => a.Documents)
            .HasField("_documents")
            .UsePropertyAccessMode(PropertyAccessMode.Field);

        builder.HasOne<ScholarshipPortal.Domain.Entities.Scholarship>()
            .WithMany()
            .HasForeignKey(a => a.ScholarshipId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
