using ScholarshipPortal.Application.Common;
using ScholarshipPortal.Application.DTOs;
using ScholarshipPortal.Domain.Entities;
using ScholarshipPortal.Domain.Enums;
using ScholarshipPortal.Domain.Repositories;

namespace ScholarshipPortal.Application.Services;

public sealed class ReviewService(
    IReviewRepository reviewRepository,
    IApplicationRepository applicationRepository,
    IScholarshipRepository scholarshipRepository) : IReviewService
{
    public async Task<IReadOnlyList<ReviewDto>> GetQueueAsync(ActorContext actor, CancellationToken ct = default)
    {
        var reviews = await reviewRepository.GetAllAsync(ct);
        var applications = await applicationRepository.GetAllAsync(ct);
        var scholarships = await scholarshipRepository.GetAllAsync(ct);

        var appById = applications.ToDictionary(a => a.Id, a => a);
        var scholarshipById = scholarships.ToDictionary(s => s.Id, s => s);
        var titleById = scholarships.ToDictionary(s => s.Id, s => s.Title);

        var filteredReviews = reviews;
        if (IsReviewer(actor))
        {
            filteredReviews = reviews
                .Where(r => appById.TryGetValue(r.ApplicationId, out var app)
                    && scholarshipById.TryGetValue(app.ScholarshipId, out var scholarship)
                    && scholarship.AssignedReviewerId == actor.UserId)
                .ToList();
        }

        return filteredReviews.Select(r =>
        {
            appById.TryGetValue(r.ApplicationId, out var app);
            var scholarshipTitle = app is null ? "Unknown" : titleById.GetValueOrDefault(app.ScholarshipId, "Unknown");
            return Map(r, scholarshipTitle, app?.StudentName ?? "Unknown", IsReviewMine(actor, r));
        }).ToList().AsReadOnly();
    }

    public async Task<ReviewDto?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        var review = await reviewRepository.GetByIdAsync(id, ct);
        if (review is null) return null;

        var app = await applicationRepository.GetByIdAsync(review.ApplicationId, ct);
        var scholarship = app is null ? null : await scholarshipRepository.GetByIdAsync(app.ScholarshipId, ct);
        return Map(review, scholarship?.Title ?? "Unknown", app?.StudentName ?? "Unknown", false);
    }

    public async Task<IReadOnlyList<ReviewDto>> GetByApplicationAsync(int applicationId, CancellationToken ct = default)
    {
        var reviews = await reviewRepository.GetByApplicationIdAsync(applicationId, ct);
        var app = await applicationRepository.GetByIdAsync(applicationId, ct);
        var scholarship = app is null ? null : await scholarshipRepository.GetByIdAsync(app.ScholarshipId, ct);

        return reviews.Select(r => Map(r, scholarship?.Title ?? "Unknown", app?.StudentName ?? "Unknown", false))
            .ToList()
            .AsReadOnly();
    }

    public async Task<ReviewDto> CreateAsync(CreateReviewDto dto, ActorContext actor, CancellationToken ct = default)
    {
        EnsureReviewerOrAdmin(actor);

        var app = await applicationRepository.GetByIdAsync(dto.ApplicationId, ct)
            ?? throw new KeyNotFoundException($"Application {dto.ApplicationId} was not found.");

        var scholarship = await scholarshipRepository.GetByIdAsync(app.ScholarshipId, ct)
            ?? throw new KeyNotFoundException($"Scholarship {app.ScholarshipId} was not found.");

        EnsureReviewerAssignedOrAdmin(actor, scholarship.AssignedReviewerId);

        if (IsReviewer(actor))
        {
            var existing = await reviewRepository.GetByApplicationIdAsync(dto.ApplicationId, ct);
            if (existing.Any(r => IsReviewMine(actor, r)))
                throw new InvalidOperationException("You can only submit one review per application.");
        }

        if (!Enum.TryParse<ReviewStage>(dto.Stage, ignoreCase: true, out var parsedStage))
            throw new ArgumentException($"Invalid review stage '{dto.Stage}'.");

        var resolvedReviewerName = string.IsNullOrWhiteSpace(dto.ReviewerName)
            ? actor.FullName ?? actor.Email ?? "Reviewer"
            : dto.ReviewerName;

        var review = Review.Create(dto.ApplicationId, resolvedReviewerName, dto.Score, dto.Comment, parsedStage, reviewerId: actor.UserId);
        await reviewRepository.AddAsync(review, ct);
        await reviewRepository.SaveChangesAsync(ct);

        return Map(review, scholarship?.Title ?? "Unknown", app.StudentName, IsReviewMine(actor, review));
    }

    public async Task<ReviewDto?> UpdateAsync(int id, UpdateReviewDto dto, ActorContext actor, CancellationToken ct = default)
    {
        EnsureReviewerOrAdmin(actor);

        var review = await reviewRepository.GetByIdAsync(id, ct);
        if (review is null) return null;

        var app = await applicationRepository.GetByIdAsync(review.ApplicationId, ct)
            ?? throw new KeyNotFoundException($"Application {review.ApplicationId} was not found.");
        var scholarship = await scholarshipRepository.GetByIdAsync(app.ScholarshipId, ct)
            ?? throw new KeyNotFoundException($"Scholarship {app.ScholarshipId} was not found.");

        EnsureReviewerAssignedOrAdmin(actor, scholarship.AssignedReviewerId);
        EnsureReviewOwnerOrAdmin(actor, review);

        if (!Enum.TryParse<ReviewStage>(dto.Stage, ignoreCase: true, out var parsedStage))
            throw new ArgumentException($"Invalid review stage '{dto.Stage}'.");

        var resolvedReviewerName = string.IsNullOrWhiteSpace(dto.ReviewerName) ? review.ReviewerName : dto.ReviewerName;
        review.UpdateEvaluation(resolvedReviewerName, dto.Score, dto.Comment, parsedStage);
        await reviewRepository.SaveChangesAsync(ct);

        return Map(review, scholarship?.Title ?? "Unknown", app?.StudentName ?? "Unknown", IsReviewMine(actor, review));
    }

    public async Task<bool> DeleteAsync(int id, ActorContext actor, CancellationToken ct = default)
    {
        EnsureReviewerOrAdmin(actor);

        var review = await reviewRepository.GetByIdAsync(id, ct);
        if (review is null) return false;

        var app = await applicationRepository.GetByIdAsync(review.ApplicationId, ct)
            ?? throw new KeyNotFoundException($"Application {review.ApplicationId} was not found.");
        var scholarship = await scholarshipRepository.GetByIdAsync(app.ScholarshipId, ct)
            ?? throw new KeyNotFoundException($"Scholarship {app.ScholarshipId} was not found.");

        EnsureReviewerAssignedOrAdmin(actor, scholarship.AssignedReviewerId);
        EnsureReviewOwnerOrAdmin(actor, review);

        await reviewRepository.DeleteAsync(review, ct);
        await reviewRepository.SaveChangesAsync(ct);
        return true;
    }

    private static ReviewDto Map(Review review, string scholarshipTitle, string applicantName, bool isMine) =>
        new(
            review.Id,
            review.ApplicationId,
            scholarshipTitle,
            applicantName,
            review.Score,
            review.ReviewerName,
            isMine,
            review.Comment,
            review.Stage.ToString());

    private static void EnsureReviewerOrAdmin(ActorContext actor)
    {
        var ok = actor.Role.Equals("Reviewer", StringComparison.OrdinalIgnoreCase)
                 || actor.Role.Equals("Admin", StringComparison.OrdinalIgnoreCase);
        if (!ok) throw new UnauthorizedAccessException("Only reviewers and admins can perform this action.");
    }

    private static void EnsureReviewerAssignedOrAdmin(ActorContext actor, string? assignedReviewerId)
    {
        if (actor.Role.Equals("Admin", StringComparison.OrdinalIgnoreCase))
            return;

        if (!actor.Role.Equals("Reviewer", StringComparison.OrdinalIgnoreCase))
            throw new UnauthorizedAccessException("Only reviewers and admins can perform this action.");

        if (string.IsNullOrWhiteSpace(actor.UserId) || string.IsNullOrWhiteSpace(assignedReviewerId) || actor.UserId != assignedReviewerId)
            throw new UnauthorizedAccessException("Only the assigned reviewer can review this scholarship.");
    }

    private static bool IsReviewer(ActorContext actor) =>
        actor.Role.Equals("Reviewer", StringComparison.OrdinalIgnoreCase);

    private static bool IsReviewMine(ActorContext actor, Review review)
    {
        if (!string.IsNullOrWhiteSpace(actor.UserId) && !string.IsNullOrWhiteSpace(review.ReviewerId))
            return actor.UserId == review.ReviewerId;

        return review.ReviewerName.Equals(actor.FullName ?? actor.Email ?? string.Empty, StringComparison.OrdinalIgnoreCase);
    }

    private static void EnsureReviewOwnerOrAdmin(ActorContext actor, Review review)
    {
        if (actor.Role.Equals("Admin", StringComparison.OrdinalIgnoreCase))
            return;

        if (!IsReviewMine(actor, review))
            throw new UnauthorizedAccessException("You can only edit or delete your own review.");
    }
}
