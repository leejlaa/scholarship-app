using Moq;
using ScholarshipPortal.Application.Common;
using ScholarshipPortal.Application.DTOs;
using ScholarshipPortal.Application.Services;
using ScholarshipPortal.Domain.Enums;
using ScholarshipPortal.Domain.Repositories;
using App        = ScholarshipPortal.Domain.Entities.Application;
using Scholarship = ScholarshipPortal.Domain.Entities.Scholarship;

namespace ScholarshipPortal.Tests.Services;

public class ApplicationServiceTests
{
    private readonly Mock<IApplicationRepository> _appRepo        = new();
    private readonly Mock<IScholarshipRepository> _scholarshipRepo = new();
    private readonly ApplicationService _service;

    private static readonly ActorContext Admin    = new("Admin",    "admin-1", "Admin",   "admin@test.com");
    private static readonly ActorContext Student  = new("Student",  "stu-1",   "Alice",   "alice@test.com");
    private static readonly ActorContext Reviewer = new("Reviewer", "rev-1",   "Dr. Lee", "lee@test.com");

    public ApplicationServiceTests()
    {
        _service = new ApplicationService(_appRepo.Object, _scholarshipRepo.Object);
    }

    // ── GetAllForActorAsync ───────────────────────────────────────────────────

    [Fact]
    public async Task GetAllForActorAsync_AsAdmin_ReturnsAllApplications()
    {
        var scholarship = MakeScholarship(1, "CS Award");
        var apps = new List<App>
        {
            App.Create(1, "Alice", "stu-1"),
            App.Create(1, "Bob",   "stu-2"),
        };
        _appRepo.Setup(r => r.GetAllAsync(default)).ReturnsAsync(apps);
        _scholarshipRepo.Setup(r => r.GetAllAsync(default)).ReturnsAsync([scholarship]);

        var result = await _service.GetAllForActorAsync(Admin);

        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async Task GetAllForActorAsync_AsStudent_ReturnsOnlyOwnApplications()
    {
        var scholarship = MakeScholarship(1, "CS Award");
        var ownApp = App.Create(1, "Alice", "stu-1");
        _appRepo.Setup(r => r.GetByUserIdAsync("stu-1", default)).ReturnsAsync([ownApp]);
        _scholarshipRepo.Setup(r => r.GetAllAsync(default)).ReturnsAsync([scholarship]);

        var result = await _service.GetAllForActorAsync(Student);

        Assert.Single(result);
        Assert.Equal("Alice", result[0].StudentName);
    }

    [Fact]
    public async Task GetAllForActorAsync_AsStudentWithNullUserId_ThrowsUnauthorizedAccessException()
    {
        var actor = new ActorContext("Student", null, "Ghost", null);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.GetAllForActorAsync(actor));
    }

    // ── GetByIdAsync ──────────────────────────────────────────────────────────

    [Fact]
    public async Task GetByIdAsync_AsStudent_OwnApplication_ReturnsDto()
    {
        var app = App.Create(1, "Alice", "stu-1");
        var scholarship = MakeScholarship(1, "CS Award");
        _appRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(app);
        _scholarshipRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(scholarship);

        var result = await _service.GetByIdAsync(1, Student);

        Assert.NotNull(result);
        Assert.Equal("Alice", result.StudentName);
    }

    [Fact]
    public async Task GetByIdAsync_AsStudent_OtherStudentsApplication_ThrowsUnauthorizedAccessException()
    {
        var app = App.Create(1, "Bob", "stu-2");
        _appRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(app);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.GetByIdAsync(1, Student));
    }

    [Fact]
    public async Task GetByIdAsync_WhenNotFound_ReturnsNull()
    {
        _appRepo.Setup(r => r.GetByIdAsync(99, default)).ReturnsAsync((App?)null);

        var result = await _service.GetByIdAsync(99, Admin);

        Assert.Null(result);
    }

    // ── CreateAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateAsync_AsStudent_CreatesApplicationInDraftStatus()
    {
        var scholarship = MakeScholarship(1, "CS Award");
        _scholarshipRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(scholarship);
        _appRepo.Setup(r => r.AddAsync(It.IsAny<App>(), default)).Returns(Task.CompletedTask);
        _appRepo.Setup(r => r.SaveChangesAsync(default)).Returns(Task.CompletedTask);

        var dto = new CreateApplicationDto(1, null, Submit: false, Documents: null);
        var result = await _service.CreateAsync(dto, Student);

        Assert.Equal("Draft", result.Status);
        Assert.Equal("CS Award", result.ScholarshipTitle);
    }

    [Fact]
    public async Task CreateAsync_WithSubmitTrue_SubmitsApplication()
    {
        var scholarship = MakeScholarship(1, "CS Award");
        _scholarshipRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(scholarship);
        _appRepo.Setup(r => r.AddAsync(It.IsAny<App>(), default)).Returns(Task.CompletedTask);
        _appRepo.Setup(r => r.SaveChangesAsync(default)).Returns(Task.CompletedTask);

        var dto = new CreateApplicationDto(1, null, Submit: true, Documents: null);
        var result = await _service.CreateAsync(dto, Student);

        Assert.Equal("Submitted", result.Status);
    }

    [Fact]
    public async Task CreateAsync_AsReviewer_ThrowsUnauthorizedAccessException()
    {
        var dto = new CreateApplicationDto(1, null, Submit: false, Documents: null);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.CreateAsync(dto, Reviewer));
    }

    [Fact]
    public async Task CreateAsync_WithNonexistentScholarship_ThrowsKeyNotFoundException()
    {
        _scholarshipRepo.Setup(r => r.GetByIdAsync(99, default)).ReturnsAsync((Scholarship?)null);

        var dto = new CreateApplicationDto(99, null, Submit: false, Documents: null);

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => _service.CreateAsync(dto, Student));
    }

    [Fact]
    public async Task CreateAsync_UsesActorNameWhenStudentNameIsBlank()
    {
        var scholarship = MakeScholarship(1, "CS Award");
        _scholarshipRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(scholarship);
        _appRepo.Setup(r => r.AddAsync(It.IsAny<App>(), default)).Returns(Task.CompletedTask);
        _appRepo.Setup(r => r.SaveChangesAsync(default)).Returns(Task.CompletedTask);

        var dto = new CreateApplicationDto(1, StudentName: null, Submit: false, Documents: null);
        var result = await _service.CreateAsync(dto, Student);

        Assert.Equal("Alice", result.StudentName);
    }

    [Fact]
    public async Task CreateAsync_WithDocuments_AttachesDocumentsToApplication()
    {
        var scholarship = MakeScholarship(1, "CS Award");
        _scholarshipRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(scholarship);
        _appRepo.Setup(r => r.AddAsync(It.IsAny<App>(), default)).Returns(Task.CompletedTask);
        _appRepo.Setup(r => r.SaveChangesAsync(default)).Returns(Task.CompletedTask);

        var documents = new List<ApplicationDocumentInputDto>
        {
            new("resume.pdf", "Resume"),
            new("transcript.pdf", "Transcript"),
        };
        var dto = new CreateApplicationDto(1, null, Submit: false, Documents: documents);
        var result = await _service.CreateAsync(dto, Student);

        Assert.True(result.DocumentsComplete);
    }

    // ── UpdateAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateAsync_AsStudent_UpdatesOwnStudentName()
    {
        var app = App.Create(1, "Alice", "stu-1");
        var scholarship = MakeScholarship(1, "CS Award");
        _appRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(app);
        _appRepo.Setup(r => r.SaveChangesAsync(default)).Returns(Task.CompletedTask);
        _scholarshipRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(scholarship);

        var dto = new UpdateApplicationDto("Alice Updated", Status: null, Documents: null);
        var result = await _service.UpdateAsync(1, dto, Student);

        Assert.NotNull(result);
        Assert.Equal("Alice Updated", result.StudentName);
    }

    [Fact]
    public async Task UpdateAsync_AsStudent_CanSubmitOwnDraftApplication()
    {
        var app = App.Create(1, "Alice", "stu-1");
        var scholarship = MakeScholarship(1, "CS Award");
        _appRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(app);
        _appRepo.Setup(r => r.SaveChangesAsync(default)).Returns(Task.CompletedTask);
        _scholarshipRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(scholarship);

        var dto = new UpdateApplicationDto(StudentName: null, Status: "Submitted", Documents: null);
        var result = await _service.UpdateAsync(1, dto, Student);

        Assert.Equal("Submitted", result!.Status);
    }

    [Fact]
    public async Task UpdateAsync_AsStudent_CannotApproveApplication()
    {
        var app = App.Create(1, "Alice", "stu-1");
        _appRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(app);

        var dto = new UpdateApplicationDto(StudentName: null, Status: "Approved", Documents: null);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.UpdateAsync(1, dto, Student));
    }

    [Fact]
    public async Task UpdateAsync_AsStudent_CannotSubmitAlreadySubmittedApplication()
    {
        var app = App.Create(1, "Alice", "stu-1");
        app.Submit();
        _appRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(app);

        var dto = new UpdateApplicationDto(StudentName: null, Status: "Submitted", Documents: null);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _service.UpdateAsync(1, dto, Student));
    }

    [Fact]
    public async Task UpdateAsync_AsStudent_CannotUpdateOtherStudentsApplication()
    {
        var app = App.Create(1, "Bob", "stu-2");
        _appRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(app);

        var dto = new UpdateApplicationDto("Hacked Name", Status: null, Documents: null);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.UpdateAsync(1, dto, Student));
    }

    [Fact]
    public async Task UpdateAsync_AsReviewer_CanUpdateStatus()
    {
        var app = App.Create(1, "Alice", "stu-1");
        var scholarship = MakeScholarship(1, "CS Award");
        _appRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(app);
        _appRepo.Setup(r => r.SaveChangesAsync(default)).Returns(Task.CompletedTask);
        _scholarshipRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(scholarship);

        var dto = new UpdateApplicationDto(StudentName: null, Status: "UnderReview", Documents: null);
        var result = await _service.UpdateAsync(1, dto, Reviewer);

        Assert.Equal("UnderReview", result!.Status);
    }

    [Fact]
    public async Task UpdateAsync_AsReviewer_CannotUpdateStudentName()
    {
        var app = App.Create(1, "Alice", "stu-1");
        _appRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(app);

        var dto = new UpdateApplicationDto("New Name", Status: null, Documents: null);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.UpdateAsync(1, dto, Reviewer));
    }

    [Fact]
    public async Task UpdateAsync_WithInvalidStatus_ThrowsArgumentException()
    {
        var app = App.Create(1, "Alice", "stu-1");
        _appRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(app);

        var dto = new UpdateApplicationDto(StudentName: null, Status: "NotAStatus", Documents: null);

        await Assert.ThrowsAsync<ArgumentException>(
            () => _service.UpdateAsync(1, dto, Admin));
    }

    [Fact]
    public async Task UpdateAsync_WhenNotFound_ReturnsNull()
    {
        _appRepo.Setup(r => r.GetByIdAsync(99, default)).ReturnsAsync((App?)null);

        var dto = new UpdateApplicationDto(StudentName: null, Status: null, Documents: null);
        var result = await _service.UpdateAsync(99, dto, Admin);

        Assert.Null(result);
    }

    // ── DeleteAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task DeleteAsync_AsStudent_DeletesOwnApplication_ReturnsTrue()
    {
        var app = App.Create(1, "Alice", "stu-1");
        _appRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(app);
        _appRepo.Setup(r => r.DeleteAsync(app, default)).Returns(Task.CompletedTask);
        _appRepo.Setup(r => r.SaveChangesAsync(default)).Returns(Task.CompletedTask);

        var result = await _service.DeleteAsync(1, Student);

        Assert.True(result);
        _appRepo.Verify(r => r.DeleteAsync(app, default), Times.Once);
    }

    [Fact]
    public async Task DeleteAsync_AsStudent_CannotDeleteOtherStudentsApplication()
    {
        var app = App.Create(1, "Bob", "stu-2");
        _appRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(app);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.DeleteAsync(1, Student));
    }

    [Fact]
    public async Task DeleteAsync_AsReviewer_ThrowsUnauthorizedAccessException()
    {
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.DeleteAsync(1, Reviewer));
    }

    [Fact]
    public async Task DeleteAsync_WhenNotFound_ReturnsFalse()
    {
        _appRepo.Setup(r => r.GetByIdAsync(99, default)).ReturnsAsync((App?)null);

        var result = await _service.DeleteAsync(99, Admin);

        Assert.False(result);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static Scholarship MakeScholarship(int id, string title)
    {
        var s = Scholarship.Create(title, "All",
            DateOnly.FromDateTime(DateTime.Today.AddDays(30)), "None", 1000m);
        typeof(Scholarship).GetProperty("Id")!.SetValue(s, id);
        return s;
    }
}
