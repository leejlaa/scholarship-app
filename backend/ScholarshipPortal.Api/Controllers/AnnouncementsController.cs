using Microsoft.AspNetCore.Mvc;
using ScholarshipPortal.Application.Services;

namespace ScholarshipPortal.Api.Controllers;

/// <summary>
/// Public – list published announcements.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public sealed class AnnouncementsController(IAnnouncementService service) : ControllerBase
{
    // GET /api/announcements
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct) =>
    Ok(await service.GetAllAsync(ct));
}
