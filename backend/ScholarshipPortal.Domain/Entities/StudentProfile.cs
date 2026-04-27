namespace ScholarshipPortal.Domain.Entities;

public sealed class StudentProfile
{
    public string UserId { get; private set; } = string.Empty;
    public string? StudentNumber { get; private set; }
    public string? Faculty { get; private set; }
    public string? Department { get; private set; }
    public string? Program { get; private set; }
    public int? CurrentYear { get; private set; }
    public decimal? Gpa { get; private set; }
    public DateOnly? DateOfBirth { get; private set; }
    public string? PhoneNumber { get; private set; }
    public string? Address { get; private set; }
    public string? Nationality { get; private set; }
    public string? PersonalStatement { get; private set; }
    public string? CvFilePath { get; private set; }

    private StudentProfile() { }

    public static StudentProfile Create(
        string userId,
        string? studentNumber = null,
        string? faculty = null,
        string? department = null,
        string? program = null,
        int? currentYear = null,
        decimal? gpa = null,
        DateOnly? dateOfBirth = null,
        string? phoneNumber = null,
        string? address = null,
        string? nationality = null,
        string? personalStatement = null,
        string? cvFilePath = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(userId);

        return new StudentProfile
        {
            UserId = userId,
            StudentNumber = studentNumber,
            Faculty = faculty,
            Department = department,
            Program = program,
            CurrentYear = currentYear,
            Gpa = gpa,
            DateOfBirth = dateOfBirth,
            PhoneNumber = phoneNumber,
            Address = address,
            Nationality = nationality,
            PersonalStatement = personalStatement,
            CvFilePath = cvFilePath
        };
    }

    public void UpdateDetails(
        string? studentNumber,
        string? faculty,
        string? department,
        string? program,
        int? currentYear,
        decimal? gpa,
        DateOnly? dateOfBirth,
        string? phoneNumber,
        string? address,
        string? nationality,
        string? personalStatement,
        string? cvFilePath)
    {
        StudentNumber = studentNumber;
        Faculty = faculty;
        Department = department;
        Program = program;
        CurrentYear = currentYear;
        Gpa = gpa;
        DateOfBirth = dateOfBirth;
        PhoneNumber = phoneNumber;
        Address = address;
        Nationality = nationality;
        PersonalStatement = personalStatement;
        CvFilePath = cvFilePath;
    }
}
