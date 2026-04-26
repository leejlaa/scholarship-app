using Microsoft.AspNetCore.Mvc;

namespace ScholarshipPortal.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get() =>
        Ok(new
        {
            status    = "ok",
            service   = "ScholarshipPortal.Api",
            timestamp = DateTimeOffset.UtcNow
        });
}
