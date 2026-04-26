namespace ScholarshipPortal.Application.DTOs;

public sealed record ScholarshipWriteDto(
    string Title,
    string Audience,
    DateOnly Deadline,
    string Eligibility,
    decimal Amount);

public sealed record AssignScholarshipReviewerDto(
    string? ReviewerId,
    string? ReviewerName,
    string? ReviewerEmail);

public sealed record ApplicationDocumentInputDto(
    string FileName,
    string DocumentType);

public sealed record CreateApplicationDto(
    int ScholarshipId,
    string? StudentName,
    bool Submit,
    IReadOnlyList<ApplicationDocumentInputDto>? Documents);

public sealed record UpdateApplicationDto(
    string? StudentName,
    string? Status,
    IReadOnlyList<ApplicationDocumentInputDto>? Documents);

public sealed record CreateReviewDto(
    int ApplicationId,
    string? ReviewerName,
    int Score,
    string Comment,
    string Stage);

public sealed record UpdateReviewDto(
    string? ReviewerName,
    int Score,
    string Comment,
    string Stage);

public sealed record UploadDocumentDto(
    Stream FileStream,
    string FileName,
    string ContentType,
    long SizeBytes,
    string? DocumentType);

public sealed record ApplicationDocumentFileDto(
    int Id,
    string FileName,
    string StoragePath,
    string DocumentType);

public sealed record UploadDocumentResultDto(
    string FileName,
    string StoragePath,
    string DocumentType,
    long SizeBytes);

public sealed record DownloadDocumentResultDto(
    Stream Content,
    string ContentType,
    string FileName);
