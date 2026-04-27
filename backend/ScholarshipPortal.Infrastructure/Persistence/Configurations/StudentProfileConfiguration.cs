using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ScholarshipPortal.Domain.Entities;
using ScholarshipPortal.Infrastructure.Identity;

namespace ScholarshipPortal.Infrastructure.Persistence.Configurations;

internal sealed class StudentProfileConfiguration : IEntityTypeConfiguration<StudentProfile>
{
    public void Configure(EntityTypeBuilder<StudentProfile> builder)
    {
        builder.HasKey(p => p.UserId);

        builder.Property(p => p.UserId)
            .HasMaxLength(450);

        builder.Property(p => p.StudentNumber)
            .HasMaxLength(50);

        builder.Property(p => p.Faculty)
            .HasMaxLength(150);

        builder.Property(p => p.Department)
            .HasMaxLength(150);

        builder.Property(p => p.Program)
            .HasMaxLength(150);

        builder.Property(p => p.Gpa)
            .HasPrecision(3, 2);

        builder.Property(p => p.PhoneNumber)
            .HasMaxLength(50);

        builder.Property(p => p.Address)
            .HasMaxLength(300);

        builder.Property(p => p.Nationality)
            .HasMaxLength(100);

        builder.Property(p => p.PersonalStatement)
            .HasMaxLength(2000);

        builder.Property(p => p.CvFilePath)
            .HasMaxLength(260);

        builder.HasOne<AppUser>()
            .WithOne(u => u.StudentProfile)
            .HasForeignKey<StudentProfile>(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
