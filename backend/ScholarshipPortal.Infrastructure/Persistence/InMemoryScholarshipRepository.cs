using ScholarshipPortal.Domain.Entities;
using ScholarshipPortal.Domain.Enums;
using ScholarshipPortal.Domain.Repositories;

namespace ScholarshipPortal.Infrastructure.Persistence;

/// <summary>
/// In-memory repository — replace with an EF Core implementation backed by SQL Server in production.
/// </summary>
public sealed class InMemoryScholarshipRepository : IScholarshipRepository
{
    private readonly List<Scholarship> _store;
    private int _nextId = 4;

    public InMemoryScholarshipRepository()
    {
        _store =
        [
            CreateSeeded(1, "STEM Excellence Award",          "Undergraduate students",              DateTime.Today.AddDays(24), "GPA 3.5+, engineering or computer science major, statement of purpose",   5000m),
            CreateSeeded(2, "Community Leadership Grant",     "Any enrolled student",                DateTime.Today.AddDays(14), "Volunteer history, recommendation letter, leadership essay",              2500m),
            CreateSeeded(3, "Research Innovation Fellowship", "Final-year and postgraduate students", DateTime.Today.AddDays(31), "Research proposal, supervisor endorsement, CV",                           8000m),
        ];
    }

    public Task<IReadOnlyList<Scholarship>> GetAllAsync(CancellationToken ct = default)
        => Task.FromResult<IReadOnlyList<Scholarship>>(_store.AsReadOnly());

    public Task<Scholarship?> GetByIdAsync(int id, CancellationToken ct = default)
        => Task.FromResult(_store.FirstOrDefault(s => s.Id == id));

    public Task AddAsync(Scholarship scholarship, CancellationToken ct = default)
    {
        SetId(scholarship, _nextId++);
        _store.Add(scholarship);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(Scholarship scholarship, CancellationToken ct = default)
    {
        _store.Remove(scholarship);
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync(CancellationToken ct = default) => Task.CompletedTask;

    // ── helpers ─────────────────────────────────────────────────────────────

    private static Scholarship CreateSeeded(
        int id, string title, string audience, DateTime deadline,
        string eligibility, decimal amount)
    {
        var s = Scholarship.Create(title, audience, DateOnly.FromDateTime(deadline), eligibility, amount);
        SetId(s, id);
        return s;
    }

    private static void SetId(Scholarship scholarship, int id)
    {
        // Use reflection to set the private Id on a domain entity without
        // exposing a public setter; replace with EF Core's shadow property in production.
        var prop = typeof(Scholarship).GetProperty(nameof(Scholarship.Id))!;
        prop.SetValue(scholarship, id);
    }
}
