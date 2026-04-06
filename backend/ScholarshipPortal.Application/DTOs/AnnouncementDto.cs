namespace ScholarshipPortal.Application.DTOs;

public sealed record AnnouncementDto(
    int Id,
    string Title,
    string Category,
    string PublishDate,
    string Message);
