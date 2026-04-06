namespace ScholarshipPortal.Application.DTOs;

public sealed record ApplicationDto(
    int Id,
    string ScholarshipTitle,
    string StudentName,
    string Status,
    int Score,
    bool DocumentsComplete,
    string SubmittedDocuments,
    string NextStep);
