using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using ScholarshipPortal.Api.Requests;
using ScholarshipPortal.Application.Common;
using ScholarshipPortal.Application.DTOs;
using ScholarshipPortal.Application.Services;
using ScholarshipPortal.Infrastructure.Identity;

namespace ScholarshipPortal.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class ScholarshipsController(
    IScholarshipService scholarshipService,
    UserManager<AppUser> userManager) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct) =>
        Ok(await scholarshipService.GetAllAsync(ct));

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id, CancellationToken ct) =>
        (await scholarshipService.GetByIdAsync(id, ct)) is { } dto ? Ok(dto) : NotFound();

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create(ScholarshipWriteRequest request, CancellationToken ct)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.ReviewerId))
                return BadRequest(new { error = "Reviewer selection is required when creating a scholarship." });

            var reviewer = await userManager.FindByIdAsync(request.ReviewerId);
            if (reviewer is null)
                return BadRequest(new { error = "Reviewer account was not found." });

            var isReviewer = await userManager.IsInRoleAsync(reviewer, "Reviewer");
            if (!isReviewer)
                return BadRequest(new { error = "Selected user is not in the Reviewer role." });

            var dto = new ScholarshipWriteDto(
                request.Title,
                request.Audience,
                request.Deadline,
                request.Eligibility,
                request.Amount);

            var created = await scholarshipService.CreateAsync(
                dto,
                BuildActorContext(),
                ct);

            var assigned = await scholarshipService.AssignReviewerAsync(
                created.Id,
                new AssignScholarshipReviewerDto(reviewer.Id, reviewer.FullName, reviewer.Email),
                BuildActorContext(),
                ct);

            if (assigned is null)
                return BadRequest(new { error = "Scholarship was created but reviewer assignment failed." });

            return CreatedAtAction(nameof(GetById), new { id = assigned.Id }, assigned);
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (Exception ex) when (ex is ArgumentException or ArgumentOutOfRangeException)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, ScholarshipWriteRequest request, CancellationToken ct)
    {
        try
        {
            var dto = new ScholarshipWriteDto(
                request.Title,
                request.Audience,
                request.Deadline,
                request.Eligibility,
                request.Amount);

            var updated = await scholarshipService.UpdateAsync(
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
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        try
        {
            var deleted = await scholarshipService.DeleteAsync(id, BuildActorContext(), ct);
            return deleted ? NoContent() : NotFound();
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    [HttpPut("{id:int}/reviewer")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AssignReviewer(int id, ScholarshipAssignReviewerRequest request, CancellationToken ct)
    {
        try
        {
            AssignScholarshipReviewerDto dto;

            if (string.IsNullOrWhiteSpace(request.ReviewerId))
            {
                dto = new AssignScholarshipReviewerDto(null, null, null);
            }
            else
            {
                var reviewer = await userManager.FindByIdAsync(request.ReviewerId);
                if (reviewer is null)
                    return BadRequest(new { error = "Reviewer account was not found." });

                var isReviewer = await userManager.IsInRoleAsync(reviewer, "Reviewer");
                if (!isReviewer)
                    return BadRequest(new { error = "Selected user is not in the Reviewer role." });

                dto = new AssignScholarshipReviewerDto(
                    reviewer.Id,
                    reviewer.FullName,
                    reviewer.Email);
            }

            var updated = await scholarshipService.AssignReviewerAsync(id, dto, BuildActorContext(), ct);
            return updated is null ? NotFound() : Ok(updated);
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
