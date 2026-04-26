using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ScholarshipPortal.Api.Requests;
using ScholarshipPortal.Application.Common;
using ScholarshipPortal.Application.DTOs;
using ScholarshipPortal.Application.Services;

namespace ScholarshipPortal.Api.Controllers;

/// <summary>
/// All review endpoints require Reviewer or Admin role.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Reviewer,Admin")]
public sealed class ReviewsController(
    IReviewService reviewService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetQueue(CancellationToken ct) =>
        Ok(await reviewService.GetQueueAsync(BuildActorContext(), ct));

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id, CancellationToken ct) =>
        (await reviewService.GetByIdAsync(id, ct)) is { } dto ? Ok(dto) : NotFound();

    [HttpGet("application/{applicationId:int}")]
    public async Task<IActionResult> GetByApplication(int applicationId, CancellationToken ct) =>
        Ok(await reviewService.GetByApplicationAsync(applicationId, ct));

    [HttpPost]
    public async Task<IActionResult> Create(ReviewCreateRequest request, CancellationToken ct)
    {
        try
        {
            var dto = new CreateReviewDto(
                request.ApplicationId,
                request.ReviewerName,
                request.Score,
                request.Comment,
                request.Stage);

            var created = await reviewService.CreateAsync(
                dto,
                BuildActorContext(),
                ct);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (KeyNotFoundException ex) { return BadRequest(new { error = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (Exception ex) when (ex is ArgumentException or ArgumentOutOfRangeException or InvalidOperationException)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, ReviewUpdateRequest request, CancellationToken ct)
    {
        try
        {
            var dto = new UpdateReviewDto(
                request.ReviewerName,
                request.Score,
                request.Comment,
                request.Stage);

            var updated = await reviewService.UpdateAsync(
                id,
                dto,
                BuildActorContext(),
                ct);
            return updated is null ? NotFound() : Ok(updated);
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (Exception ex) when (ex is ArgumentException or ArgumentOutOfRangeException)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        try
        {
            var deleted = await reviewService.DeleteAsync(id, BuildActorContext(), ct);
            return deleted ? NoContent() : NotFound();
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
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

/// <summary>
/// Backwards-compatible alias: GET /api/reviewer/queue → same as GET /api/reviews
/// </summary>
[ApiController]
[Route("api/reviewer")]
[Authorize(Roles = "Reviewer,Admin")]
public sealed class ReviewerQueueController(IReviewService reviewService) : ControllerBase
{
    [HttpGet("queue")]
    public async Task<IActionResult> GetQueue(CancellationToken ct) =>
    Ok(await reviewService.GetQueueAsync(BuildActorContext(), ct));

    private ActorContext BuildActorContext()
    {
        var role = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var fullName = User.FindFirstValue("fullName");
        var email = User.FindFirstValue(ClaimTypes.Email);
        return new ActorContext(role, userId, fullName, email);
    }
}
