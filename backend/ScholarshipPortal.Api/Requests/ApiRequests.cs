namespace ScholarshipPortal.Api.Requests;

// ── Scholarships ──────────────────────────────────────────────────────────
public sealed record ScholarshipWriteRequest(
    string Title,
    string Audience,
    DateOnly Deadline,
    string Eligibility,
    decimal Amount,
    string? ReviewerId);

public sealed record ScholarshipAssignReviewerRequest(
    string? ReviewerId);

// ── Applications ──────────────────────────────────────────────────────────
public sealed record ApplicationDocumentRequest(string FileName, string DocumentType);

public sealed record ApplicationCreateRequest(
    int ScholarshipId,
    string? StudentName,
    bool Submit,
    List<ApplicationDocumentRequest>? Documents);

public sealed record ApplicationUpdateRequest(
    string? StudentName,
    string? Status,
    List<ApplicationDocumentRequest>? Documents);

// ── Reviews ───────────────────────────────────────────────────────────────
public sealed record ReviewCreateRequest(
    int ApplicationId,
    string? ReviewerName,
    int Score,
    string Comment,
    string Stage);

public sealed record ReviewUpdateRequest(
    string? ReviewerName,
    int Score,
    string Comment,
    string Stage);
