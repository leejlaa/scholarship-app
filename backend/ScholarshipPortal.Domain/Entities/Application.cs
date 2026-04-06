using ScholarshipPortal.Domain.Enums;

namespace ScholarshipPortal.Domain.Entities;

public sealed class Application
{
    private readonly List<ApplicationDocument> _documents = [];

    public int Id { get; private set; }
    public int ScholarshipId { get; private set; }
    public string StudentName { get; private set; } = string.Empty;
    public ApplicationStatus Status { get; private set; }
    public IReadOnlyList<ApplicationDocument> Documents => _documents.AsReadOnly();

    private Application() { }

    public static Application Create(int scholarshipId, string studentName)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(studentName);

        return new Application
        {
            ScholarshipId = scholarshipId,
            StudentName = studentName,
            Status = ApplicationStatus.Draft
        };
    }

    public void Submit()
    {
        if (Status != ApplicationStatus.Draft)
            throw new InvalidOperationException("Only draft applications can be submitted.");

        Status = ApplicationStatus.Submitted;
    }

    public void UpdateStudentName(string studentName)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(studentName);
        StudentName = studentName;
    }

    public void UpdateStatus(ApplicationStatus status) => Status = status;

    public void MarkUnderReview() => Status = ApplicationStatus.UnderReview;
    public void Shortlist()      => Status = ApplicationStatus.Shortlisted;
    public void Approve()        => Status = ApplicationStatus.Approved;
    public void Reject()         => Status = ApplicationStatus.Rejected;

    public void AddDocument(string fileName, string storagePath, string documentType)
    {
        _documents.Add(ApplicationDocument.Create(Id, fileName, storagePath, documentType));
    }

    public bool HasAllRequiredDocuments(IEnumerable<string> requiredTypes) =>
        requiredTypes.All(required =>
            _documents.Any(doc => doc.DocumentType.Equals(required, StringComparison.OrdinalIgnoreCase)));
}
