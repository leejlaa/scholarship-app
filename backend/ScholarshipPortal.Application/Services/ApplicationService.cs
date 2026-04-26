using ScholarshipPortal.Application.Common;
using ScholarshipPortal.Application.DTOs;
using ScholarshipPortal.Domain.Enums;
using ScholarshipPortal.Domain.Repositories;
using DomainApp = ScholarshipPortal.Domain.Entities.Application;

namespace ScholarshipPortal.Application.Services;

public sealed class ApplicationService(
    IApplicationRepository applicationRepository,
    IScholarshipRepository scholarshipRepository) : IApplicationService
{
    public async Task<IReadOnlyList<ApplicationDto>> GetAllForActorAsync(ActorContext actor, CancellationToken ct = default)
    {
        IReadOnlyList<DomainApp> applications;
        if (IsStudent(actor))
        {
            if (string.IsNullOrWhiteSpace(actor.UserId))
                throw new UnauthorizedAccessException("Student user identifier is missing.");
            applications = await applicationRepository.GetByUserIdAsync(actor.UserId, ct);
        }
        else
        {
            applications = await applicationRepository.GetAllAsync(ct);
        }

        var scholarships = await scholarshipRepository.GetAllAsync(ct);
        var titleById = scholarships.ToDictionary(s => s.Id, s => s.Title);

        return applications
            .Select(a => Map(a, titleById.GetValueOrDefault(a.ScholarshipId, "Unknown")))
            .ToList()
            .AsReadOnly();
    }

    public async Task<ApplicationDto?> GetByIdAsync(int id, ActorContext actor, CancellationToken ct = default)
    {
        var application = await applicationRepository.GetByIdAsync(id, ct);
        if (application is null) return null;

        if (IsStudent(actor) && application.UserId != actor.UserId)
            throw new UnauthorizedAccessException("Students can only access their own applications.");

        var scholarship = await scholarshipRepository.GetByIdAsync(application.ScholarshipId, ct);
        return Map(application, scholarship?.Title ?? "Unknown");
    }

    public async Task<ApplicationDto> CreateAsync(CreateApplicationDto dto, ActorContext actor, CancellationToken ct = default)
    {
        EnsureRole(actor, "Student", "Admin");

        var scholarship = await scholarshipRepository.GetByIdAsync(dto.ScholarshipId, ct)
            ?? throw new KeyNotFoundException($"Scholarship {dto.ScholarshipId} was not found.");

        var resolvedStudentName = string.IsNullOrWhiteSpace(dto.StudentName)
            ? actor.FullName ?? actor.Email ?? "Student"
            : dto.StudentName;

        var application = DomainApp.Create(dto.ScholarshipId, resolvedStudentName, actor.UserId);
        await applicationRepository.AddAsync(application, ct);
        await applicationRepository.SaveChangesAsync(ct);

        foreach (var document in dto.Documents ?? [])
        {
            if (string.IsNullOrWhiteSpace(document.FileName) || string.IsNullOrWhiteSpace(document.DocumentType))
                continue;
            application.AddDocument(document.FileName, Path.Combine("uploads", document.FileName), document.DocumentType);
        }

        if (dto.Submit) application.Submit();

        await applicationRepository.SaveChangesAsync(ct);
        return Map(application, scholarship.Title);
    }

    public async Task<ApplicationDto?> UpdateAsync(int id, UpdateApplicationDto dto, ActorContext actor, CancellationToken ct = default)
    {
        EnsureRole(actor, "Student", "Reviewer", "Admin");

        var application = await applicationRepository.GetByIdAsync(id, ct);
        if (application is null) return null;

        if (IsStudent(actor) && application.UserId != actor.UserId)
            throw new UnauthorizedAccessException("Students can only update their own applications.");

        if (!string.IsNullOrWhiteSpace(dto.StudentName))
        {
            if (IsReviewer(actor))
                throw new UnauthorizedAccessException("Reviewers can only update application status.");

            application.UpdateStudentName(dto.StudentName);
        }

        if (!string.IsNullOrWhiteSpace(dto.Status))
        {
            if (!Enum.TryParse<ApplicationStatus>(dto.Status, ignoreCase: true, out var parsedStatus))
                throw new ArgumentException($"Invalid application status '{dto.Status}'.");

            // Students may only self-submit their own draft application.
            if (IsStudent(actor))
            {
                if (application.UserId != actor.UserId)
                    throw new UnauthorizedAccessException("Students can only update their own applications.");

                if (parsedStatus != ApplicationStatus.Submitted)
                    throw new UnauthorizedAccessException("Students can only submit their applications.");

                if (application.Status != ApplicationStatus.Draft)
                    throw new InvalidOperationException("Only draft applications can be submitted.");
            }

            application.UpdateStatus(parsedStatus);
        }

        foreach (var document in dto.Documents ?? [])
        {
            if (IsReviewer(actor))
                throw new UnauthorizedAccessException("Reviewers can only update application status.");

            if (string.IsNullOrWhiteSpace(document.FileName) || string.IsNullOrWhiteSpace(document.DocumentType))
                continue;
            application.AddDocument(document.FileName, Path.Combine("uploads", document.FileName), document.DocumentType);
        }

        await applicationRepository.SaveChangesAsync(ct);
        var scholarship = await scholarshipRepository.GetByIdAsync(application.ScholarshipId, ct);
        return Map(application, scholarship?.Title ?? "Unknown");
    }

    public async Task<bool> DeleteAsync(int id, ActorContext actor, CancellationToken ct = default)
    {
        EnsureRole(actor, "Student", "Admin");

        var application = await applicationRepository.GetByIdAsync(id, ct);
        if (application is null) return false;

        if (IsStudent(actor) && application.UserId != actor.UserId)
            throw new UnauthorizedAccessException("Students can only withdraw their own applications.");

        await applicationRepository.DeleteAsync(application, ct);
        await applicationRepository.SaveChangesAsync(ct);
        return true;
    }

    private static bool IsStudent(ActorContext actor) =>
        actor.Role.Equals("Student", StringComparison.OrdinalIgnoreCase);

    private static bool IsReviewer(ActorContext actor) =>
        actor.Role.Equals("Reviewer", StringComparison.OrdinalIgnoreCase);

    private static void EnsureRole(ActorContext actor, params string[] roles)
    {
        if (!roles.Any(r => actor.Role.Equals(r, StringComparison.OrdinalIgnoreCase)))
            throw new UnauthorizedAccessException("You are not allowed to perform this action.");
    }

    private static ApplicationDto Map(DomainApp application, string scholarshipTitle) =>
        new(
            application.Id,
            scholarshipTitle,
            application.StudentName,
            application.Status.ToString(),
            Score: 0,
            DocumentsComplete: application.Documents.Count > 0,
            SubmittedDocuments: string.Join(", ", application.Documents.Select(d => d.DocumentType)),
            NextStep: ResolveNextStep(application.Status));

    private static string ResolveNextStep(ApplicationStatus status) => status switch
    {
        ApplicationStatus.Draft       => "Student must submit the application.",
        ApplicationStatus.Submitted   => "Awaiting eligibility screening.",
        ApplicationStatus.UnderReview => "Awaiting final reviewer comments.",
        ApplicationStatus.Shortlisted => "Committee decision pending.",
        ApplicationStatus.Approved    => "Award confirmed. Notification sent.",
        ApplicationStatus.Rejected    => "Application closed.",
        _                             => "Contact the scholarship office."
    };
}
