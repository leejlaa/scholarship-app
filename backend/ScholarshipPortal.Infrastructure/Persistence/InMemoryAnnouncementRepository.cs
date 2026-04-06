using ScholarshipPortal.Domain.Entities;
using ScholarshipPortal.Domain.Repositories;

namespace ScholarshipPortal.Infrastructure.Persistence;

public sealed class InMemoryAnnouncementRepository : IAnnouncementRepository
{
    private readonly List<Announcement> _store;
    private int _nextId = 4;

    public InMemoryAnnouncementRepository()
    {
        _store =
        [
            SeedAnnouncement(1, "Spring applications are open",    "General",  DateTime.Today.AddDays(-7), "Students can now apply for all spring scholarship opportunities through the portal."),
            SeedAnnouncement(2, "Reviewer deadline reminder",       "Reviewer", DateTime.Today.AddDays(-2), "Please submit scores and comments for shortlisted applications before Friday 5 PM."),
            SeedAnnouncement(3, "Results publishing checklist",     "Admin",    DateTime.Today,             "Verify final approval, publish results, and notify successful candidates by email."),
        ];
    }

    public Task<IReadOnlyList<Announcement>> GetAllAsync(CancellationToken ct = default)
        => Task.FromResult<IReadOnlyList<Announcement>>(_store.AsReadOnly());

    public Task AddAsync(Announcement announcement, CancellationToken ct = default)
    {
        SetId(announcement, _nextId++);
        _store.Add(announcement);
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync(CancellationToken ct = default) => Task.CompletedTask;

    private static Announcement SeedAnnouncement(int id, string title, string category, DateTime date, string message)
    {
        var a = Announcement.Create(title, category, message, DateOnly.FromDateTime(date));
        SetId(a, id);
        return a;
    }

    private static void SetId(Announcement ann, int id)
    {
        var prop = typeof(Announcement).GetProperty(nameof(Announcement.Id))!;
        prop.SetValue(ann, id);
    }
}
