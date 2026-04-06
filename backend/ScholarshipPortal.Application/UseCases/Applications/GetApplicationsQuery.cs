using ScholarshipPortal.Application.DTOs;
using ScholarshipPortal.Domain.Repositories;

namespace ScholarshipPortal.Application.UseCases.Applications;

public sealed class GetApplicationsQuery(
    IApplicationRepository applicationRepository,
    IScholarshipRepository scholarshipRepository)
{
    public async Task<IReadOnlyList<ApplicationDto>> ExecuteAsync(CancellationToken ct = default)
    {
        var applications = await applicationRepository.GetAllAsync(ct);
        var scholarships = await scholarshipRepository.GetAllAsync(ct);

        var titleById = scholarships.ToDictionary(s => s.Id, s => s.Title);

        return applications
            .Select(a => new ApplicationDto(
                a.Id,
                titleById.GetValueOrDefault(a.ScholarshipId, "Unknown"),
                a.StudentName,
                a.Status.ToString(),
                Score: 0,
                DocumentsComplete: a.Documents.Count > 0,
                SubmittedDocuments: string.Join(", ", a.Documents.Select(d => d.DocumentType)),
                NextStep: ResolveNextStep(a.Status.ToString())))
            .ToList()
            .AsReadOnly();
    }

    private static string ResolveNextStep(string status) => status switch
    {
        "Draft"       => "Student must submit the application.",
        "Submitted"   => "Awaiting eligibility screening.",
        "UnderReview" => "Awaiting final reviewer comments.",
        "Shortlisted" => "Committee decision pending.",
        "Approved"    => "Award confirmed. Notification sent.",
        "Rejected"    => "Application closed.",
        _             => "Contact the scholarship office."
    };
}
