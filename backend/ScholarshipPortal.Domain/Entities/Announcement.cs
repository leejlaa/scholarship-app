namespace ScholarshipPortal.Domain.Entities;

public sealed class Announcement
{
    public int Id { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public string Category { get; private set; } = string.Empty;
    public string Message { get; private set; } = string.Empty;
    public DateOnly PublishDate { get; private set; }

    private Announcement() { }

    public static Announcement Create(
        string title,
        string category,
        string message,
        DateOnly? publishDate = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(title);
        ArgumentException.ThrowIfNullOrWhiteSpace(category);
        ArgumentException.ThrowIfNullOrWhiteSpace(message);

        return new Announcement
        {
            Title = title,
            Category = category,
            Message = message,
            PublishDate = publishDate ?? DateOnly.FromDateTime(DateTime.Today)
        };
    }
}
