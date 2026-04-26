using ScholarshipPortal.Application.Common;
using ScholarshipPortal.Application.DTOs;
using ScholarshipPortal.Domain.Entities;
using ScholarshipPortal.Domain.Repositories;

namespace ScholarshipPortal.Application.Services;

public sealed class ScholarshipService(
    IScholarshipRepository repo,
    IApplicationRepository applicationRepository,
    IReviewRepository reviewRepository) : IScholarshipService
{
    public async Task<IReadOnlyList<ScholarshipDto>> GetAllAsync(CancellationToken ct = default)
    {
        var scholarships = await repo.GetAllAsync(ct);
        return scholarships.Select(Map).ToList().AsReadOnly();
    }

    public async Task<ScholarshipDto?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        var scholarship = await repo.GetByIdAsync(id, ct);
        return scholarship is null ? null : Map(scholarship);
    }

    public async Task<ScholarshipDto> CreateAsync(ScholarshipWriteDto dto, ActorContext actor, CancellationToken ct = default)
    {
        EnsureAdmin(actor);
        var scholarship = Scholarship.Create(dto.Title, dto.Audience, dto.Deadline, dto.Eligibility, dto.Amount);
        await repo.AddAsync(scholarship, ct);
        await repo.SaveChangesAsync(ct);
        return Map(scholarship);
    }

    public async Task<ScholarshipDto?> UpdateAsync(int id, ScholarshipWriteDto dto, ActorContext actor, CancellationToken ct = default)
    {
        EnsureAdmin(actor);
        var scholarship = await repo.GetByIdAsync(id, ct);
        if (scholarship is null) return null;

        scholarship.UpdateDetails(dto.Title, dto.Audience, dto.Deadline, dto.Eligibility, dto.Amount);
        await repo.SaveChangesAsync(ct);
        return Map(scholarship);
    }

    public async Task<ScholarshipDto?> AssignReviewerAsync(int id, AssignScholarshipReviewerDto dto, ActorContext actor, CancellationToken ct = default)
    {
        EnsureAdmin(actor);
        var scholarship = await repo.GetByIdAsync(id, ct);
        if (scholarship is null) return null;

        if (string.IsNullOrWhiteSpace(dto.ReviewerId))
        {
            scholarship.UnassignReviewer();
        }
        else
        {
            scholarship.AssignReviewer(
                dto.ReviewerId,
                dto.ReviewerName ?? "Reviewer",
                dto.ReviewerEmail);
        }

        await repo.SaveChangesAsync(ct);
        return Map(scholarship);
    }

    public async Task<bool> DeleteAsync(int id, ActorContext actor, CancellationToken ct = default)
    {
        EnsureAdmin(actor);
        var scholarship = await repo.GetByIdAsync(id, ct);
        if (scholarship is null) return false;

        var dependentApplications = (await applicationRepository.GetByScholarshipIdAsync(id, ct)).ToList();

        foreach (var application in dependentApplications)
        {
            var reviews = await reviewRepository.GetByApplicationIdAsync(application.Id, ct);
            foreach (var review in reviews)
            {
                await reviewRepository.DeleteAsync(review, ct);
            }
        }

        if (dependentApplications.Count > 0)
        {
            await reviewRepository.SaveChangesAsync(ct);
        }

        foreach (var application in dependentApplications)
        {
            await applicationRepository.DeleteAsync(application, ct);
        }

        if (dependentApplications.Count > 0)
        {
            await applicationRepository.SaveChangesAsync(ct);
        }

        await repo.DeleteAsync(scholarship, ct);
        await repo.SaveChangesAsync(ct);
        return true;
    }

    private static ScholarshipDto Map(Scholarship s) =>
        new(
            s.Id,
            s.Title,
            s.Audience,
            s.Deadline.ToString("yyyy-MM-dd"),
            s.Eligibility,
            s.Amount,
            s.Status.ToString(),
            s.AssignedReviewerId,
            s.AssignedReviewerName,
            s.AssignedReviewerEmail);

    private static void EnsureAdmin(ActorContext actor)
    {
        if (!actor.Role.Equals("Admin", StringComparison.OrdinalIgnoreCase))
            throw new UnauthorizedAccessException("Only admins can perform this action.");
    }
}
