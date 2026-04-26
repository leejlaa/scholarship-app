using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ScholarshipPortal.Application.Services;

namespace ScholarshipPortal.Api.Controllers;

/// <summary>
/// Authenticated – any logged-in user can view portal stats.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class OverviewController(IOverviewService service) : ControllerBase
{
    // GET /api/overview
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct) =>
    Ok(await service.GetAsync(ct));
}
