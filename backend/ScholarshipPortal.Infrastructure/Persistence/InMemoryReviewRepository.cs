using ScholarshipPortal.Domain.Entities;
using ScholarshipPortal.Domain.Enums;
using ScholarshipPortal.Domain.Repositories;

namespace ScholarshipPortal.Infrastructure.Persistence;

public sealed class InMemoryReviewRepository : IReviewRepository
{
    private readonly List<Review> _store;
    private int _nextId = 4;

    public InMemoryReviewRepository()
    {
        _store =
        [
            SeedReview(1, 1001, "Dr. Elena Kovač",   82, "Strong academic performance and clear career goals.",                          ReviewStage.Initial),
            SeedReview(2, 1002, "Prof. James Obi",   88, "Excellent leadership record with measurable impact.",                          ReviewStage.PanelDiscussion),
            SeedReview(3, 1004, "Dr. Layla Hassan",  79, "Proposal is promising but budget justification needs improvement.",            ReviewStage.Secondary),
        ];
    }

    public Task<IReadOnlyList<Review>> GetAllAsync(CancellationToken ct = default)
        => Task.FromResult<IReadOnlyList<Review>>(_store.AsReadOnly());

    public Task<Review?> GetByIdAsync(int id, CancellationToken ct = default)
        => Task.FromResult(_store.FirstOrDefault(r => r.Id == id));

    public Task<IReadOnlyList<Review>> GetByApplicationIdAsync(int applicationId, CancellationToken ct = default)
        => Task.FromResult<IReadOnlyList<Review>>(_store.Where(r => r.ApplicationId == applicationId).ToList().AsReadOnly());

    public Task AddAsync(Review review, CancellationToken ct = default)
    {
        SetId(review, _nextId++);
        _store.Add(review);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(Review review, CancellationToken ct = default)
    {
        _store.Remove(review);
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync(CancellationToken ct = default) => Task.CompletedTask;

    private static Review SeedReview(int id, int applicationId, string reviewer, int score, string comment, ReviewStage stage)
    {
        var r = Review.Create(applicationId, reviewer, score, comment, stage);
        SetId(r, id);
        return r;
    }

    private static void SetId(Review review, int id)
    {
        var prop = typeof(Review).GetProperty(nameof(Review.Id))!;
        prop.SetValue(review, id);
    }
}
