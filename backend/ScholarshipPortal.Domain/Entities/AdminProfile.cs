namespace ScholarshipPortal.Domain.Entities;

public sealed class AdminProfile
{
    public string UserId { get; private set; } = string.Empty;
    public string? Department { get; private set; }
    public string? Title { get; private set; }
    public string? OfficeLocation { get; private set; }
    public string? PhoneNumber { get; private set; }

    private AdminProfile() { }

    public static AdminProfile Create(
        string userId,
        string? department = null,
        string? title = null,
        string? officeLocation = null,
        string? phoneNumber = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(userId);

        return new AdminProfile
        {
            UserId = userId,
            Department = department,
            Title = title,
            OfficeLocation = officeLocation,
            PhoneNumber = phoneNumber
        };
    }

    public void UpdateDetails(
        string? department,
        string? title,
        string? officeLocation,
        string? phoneNumber)
    {
        Department = department;
        Title = title;
        OfficeLocation = officeLocation;
        PhoneNumber = phoneNumber;
    }
}
