using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ScholarshipPortal.Api.Requests;
using ScholarshipPortal.Application.Common;
using ScholarshipPortal.Application.DTOs;
using ScholarshipPortal.Application.Services;

namespace ScholarshipPortal.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Student,Reviewer,Admin")]
public sealed class ApplicationsController(
    IApplicationService applicationService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        try
        {
            var actor = BuildActorContext();
            return Ok(await applicationService.GetAllForActorAsync(actor, ct));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id, CancellationToken ct)
    {
        try
        {
            var actor = BuildActorContext();
            var result = await applicationService.GetByIdAsync(id, actor, ct);
            return result is null ? NotFound() : Ok(result);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpPost]
    [Authorize(Roles = "Student,Admin")]
    public async Task<IActionResult> Create(ApplicationCreateRequest request, CancellationToken ct)
    {
        try
        {
            var actor = BuildActorContext();
            var dto = new CreateApplicationDto(
                request.ScholarshipId,
                request.StudentName,
                request.Submit,
                request.Documents?.Select(d => new ApplicationDocumentInputDto(d.FileName, d.DocumentType)).ToList());

            var created = await applicationService.CreateAsync(
                dto,
                actor,
                ct);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (KeyNotFoundException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (Exception ex) when (ex is ArgumentException or ArgumentOutOfRangeException or InvalidOperationException)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Student,Reviewer,Admin")]
    public async Task<IActionResult> Update(int id, ApplicationUpdateRequest request, CancellationToken ct)
    {
        try
        {
            var actor = BuildActorContext();
            var dto = new UpdateApplicationDto(
                request.StudentName,
                request.Status,
                request.Documents?.Select(d => new ApplicationDocumentInputDto(d.FileName, d.DocumentType)).ToList());

            var updated = await applicationService.UpdateAsync(
                id,
                dto,
                actor,
                ct);
            return updated is null ? NotFound() : Ok(updated);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Student,Admin")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        try
        {
            var actor = BuildActorContext();
            var deleted = await applicationService.DeleteAsync(id, actor, ct);
            return deleted ? NoContent() : NotFound();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    private ActorContext BuildActorContext()
    {
        var role = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var fullName = User.FindFirstValue("fullName");
        var email = User.FindFirstValue(ClaimTypes.Email);

        return new ActorContext(role, userId, fullName, email);
    }
}

