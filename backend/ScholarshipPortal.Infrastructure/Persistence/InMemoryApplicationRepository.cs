using DomainApp = ScholarshipPortal.Domain.Entities.Application;
using ScholarshipPortal.Domain.Enums;
using ScholarshipPortal.Domain.Repositories;

namespace ScholarshipPortal.Infrastructure.Persistence;

public sealed class InMemoryApplicationRepository : IApplicationRepository
{
    private readonly List<DomainApp> _store;
    private int _nextId = 1004;

    public InMemoryApplicationRepository()
    {
        var a1 = DomainApp.Create(1, "Amina Yusuf");
        SetId(a1, 1001); a1.Submit(); a1.MarkUnderReview();

        var a2 = DomainApp.Create(2, "David Chen");
        SetId(a2, 1002); a2.Submit(); a2.MarkUnderReview(); a2.Shortlist();

        var a3 = DomainApp.Create(3, "Sara Ibrahim");
        SetId(a3, 1003);
        // Stays in Draft — documents incomplete

        _store = [a1, a2, a3];
    }

    public Task<IReadOnlyList<DomainApp>> GetAllAsync(CancellationToken ct = default)
        => Task.FromResult<IReadOnlyList<DomainApp>>(_store.AsReadOnly());

    public Task<DomainApp?> GetByIdAsync(int id, CancellationToken ct = default)
        => Task.FromResult(_store.FirstOrDefault(a => a.Id == id));

    public Task AddAsync(DomainApp application, CancellationToken ct = default)
    {
        SetId(application, _nextId++);
        _store.Add(application);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(DomainApp application, CancellationToken ct = default)
    {
        _store.Remove(application);
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync(CancellationToken ct = default) => Task.CompletedTask;

    private static void SetId(DomainApp application, int id)
    {
        var prop = typeof(DomainApp).GetProperty(nameof(DomainApp.Id))!;
        prop.SetValue(application, id);
    }
}
