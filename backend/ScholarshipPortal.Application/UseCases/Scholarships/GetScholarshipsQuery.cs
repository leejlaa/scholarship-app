using ScholarshipPortal.Application.DTOs;
using ScholarshipPortal.Domain.Repositories;

namespace ScholarshipPortal.Application.UseCases.Scholarships;

public sealed class GetScholarshipsQuery(IScholarshipRepository repository)
{
    public async Task<IReadOnlyList<ScholarshipDto>> ExecuteAsync(CancellationToken ct = default)
    {
        var scholarships = await repository.GetAllAsync(ct);

        return scholarships
            .Select(s => new ScholarshipDto(
                s.Id,
                s.Title,
                s.Audience,
                s.Deadline.ToString("yyyy-MM-dd"),
                s.Eligibility,
                s.Amount,
                s.Status.ToString()))
            .ToList()
            .AsReadOnly();
    }
}
