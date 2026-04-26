using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;
using ScholarshipPortal.Application.Common;
using ScholarshipPortal.Application.DTOs;
using ScholarshipPortal.Application.Services;

namespace ScholarshipPortal.Api.Controllers;

/// <summary>
/// Upload: Student, Admin
/// List documents for an application: Student, Reviewer, Admin
/// Download: any authenticated user
/// </summary>
[ApiController]
[Route("api")]
public sealed class DocumentsController(
    IDocumentService documentService) : ControllerBase
{
    // POST /api/applications/{id}/documents  [Student, Admin]
    [HttpPost("applications/{id:int}/documents")]
    [Authorize(Roles = "Student,Admin")]
    [DisableRequestSizeLimit]
    public async Task<IActionResult> Upload(int id, IFormFile file, [FromQuery] string? documentType, CancellationToken ct)
    {
        try
        {
            await using var stream = file.OpenReadStream();
            var dto = new UploadDocumentDto(
                stream,
                file.FileName,
                file.ContentType,
                file.Length,
                documentType);

            var result = await documentService.UploadAsync(
                id,
                dto,
                BuildActorContext(),
                ct);

            return Ok(new
            {
                fileName = result.FileName,
                storagePath = result.StoragePath,
                documentType = result.DocumentType,
                sizeBytes = result.SizeBytes
            });
        }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (ArgumentException ex) { return BadRequest(new { error = ex.Message }); }
    }

    // GET /api/applications/{id}/documents  [Student, Reviewer, Admin]
    [HttpGet("applications/{id:int}/documents")]
    [Authorize(Roles = "Student,Reviewer,Admin")]
    public async Task<IActionResult> ListDocuments(int id, CancellationToken ct)
    {
        try
        {
            var docs = await documentService.ListAsync(id, BuildActorContext(), ct);
            return Ok(docs);
        }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    // GET /api/documents/{*storagePath}  [any authenticated user]
    [HttpGet("documents/{**storagePath}")]
    [Authorize]
    public async Task<IActionResult> Download(string storagePath, CancellationToken ct)
    {
        try
        {
            var result = await documentService.DownloadAsync(storagePath, BuildActorContext(), ct);
            return File(result.Content, result.ContentType, result.FileName);
        }
        catch (FileNotFoundException) { return NotFound(new { error = "Document not found." }); }
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
