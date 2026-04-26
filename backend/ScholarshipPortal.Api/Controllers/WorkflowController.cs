using Microsoft.AspNetCore.Mvc;

namespace ScholarshipPortal.Api.Controllers;

/// <summary>
/// Public – describes the scholarship workflow steps.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public sealed class WorkflowController : ControllerBase
{
    // GET /api/workflow
    [HttpGet]
    public IActionResult Get() =>
        Ok(new[]
        {
            new { Order = 1, Title = "Post scholarship",      Detail = "Admin creates the opportunity, eligibility rules, deadlines, and required documents." },
            new { Order = 2, Title = "Student application",   Detail = "Student completes the form, uploads documents, and submits the application." },
            new { Order = 3, Title = "Eligibility screening", Detail = "System checks completeness, deadlines, and basic academic requirements." },
            new { Order = 4, Title = "Reviewer scoring",      Detail = "Reviewers evaluate submissions, assign scores, and leave comments." },
            new { Order = 5, Title = "Final decision",        Detail = "Admin confirms award decisions, publishes results, and tracks status updates." }
        });
}
