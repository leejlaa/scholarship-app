namespace ScholarshipPortal.Domain.Entities;

public sealed class ReviewerProfile
{
    public string UserId { get; private set; } = string.Empty;
    public string? StaffNumber { get; private set; }
    public string? Department { get; private set; }
    public string? Title { get; private set; }
    public string? ExpertiseAreas { get; private set; }
    public string? OfficeLocation { get; private set; }
    public string? PhoneNumber { get; private set; }
    public string? Bio { get; private set; }
    public int? MaxActiveReviews { get; private set; }
    public bool IsAvailable { get; private set; }

    private ReviewerProfile() { }

    public static ReviewerProfile Create(
        string userId,
        string? staffNumber = null,
        string? department = null,
        string? title = null,
        string? expertiseAreas = null,
        string? officeLocation = null,
        string? phoneNumber = null,
        string? bio = null,
        int? maxActiveReviews = null,
        bool isAvailable = true)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(userId);

        return new ReviewerProfile
        {
            UserId = userId,
            StaffNumber = staffNumber,
            Department = department,
            Title = title,
            ExpertiseAreas = expertiseAreas,
            OfficeLocation = officeLocation,
            PhoneNumber = phoneNumber,
            Bio = bio,
            MaxActiveReviews = maxActiveReviews,
            IsAvailable = isAvailable
        };
    }

    public void UpdateDetails(
        string? staffNumber,
        string? department,
        string? title,
        string? expertiseAreas,
        string? officeLocation,
        string? phoneNumber,
        string? bio,
        int? maxActiveReviews,
        bool isAvailable)
    {
        StaffNumber = staffNumber;
        Department = department;
        Title = title;
        ExpertiseAreas = expertiseAreas;
        OfficeLocation = officeLocation;
        PhoneNumber = phoneNumber;
        Bio = bio;
        MaxActiveReviews = maxActiveReviews;
        IsAvailable = isAvailable;
    }
}
