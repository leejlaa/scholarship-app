using ScholarshipPortal.Domain.Enums;

namespace ScholarshipPortal.Domain.Entities;

public sealed class Scholarship
{
    public int Id { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public string Audience { get; private set; } = string.Empty;
    public DateOnly Deadline { get; private set; }
    public string Eligibility { get; private set; } = string.Empty;
    public decimal Amount { get; private set; }
    public ScholarshipStatus Status { get; private set; }

    private Scholarship() { }

    public static Scholarship Create(
        string title,
        string audience,
        DateOnly deadline,
        string eligibility,
        decimal amount)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(title);
        ArgumentException.ThrowIfNullOrWhiteSpace(audience);
        ArgumentException.ThrowIfNullOrWhiteSpace(eligibility);
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(amount);

        return new Scholarship
        {
            Title = title,
            Audience = audience,
            Deadline = deadline,
            Eligibility = eligibility,
            Amount = amount,
            Status = deadline >= DateOnly.FromDateTime(DateTime.Today)
                ? ScholarshipStatus.Open
                : ScholarshipStatus.Closed
        };
    }

    public void UpdateDetails(
        string title,
        string audience,
        DateOnly deadline,
        string eligibility,
        decimal amount)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(title);
        ArgumentException.ThrowIfNullOrWhiteSpace(audience);
        ArgumentException.ThrowIfNullOrWhiteSpace(eligibility);
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(amount);

        Title = title;
        Audience = audience;
        Deadline = deadline;
        Eligibility = eligibility;
        Amount = amount;
        Status = deadline >= DateOnly.FromDateTime(DateTime.Today)
            ? ScholarshipStatus.Open
            : ScholarshipStatus.Closed;
    }

    public bool IsOpen() => Status == ScholarshipStatus.Open;
}
