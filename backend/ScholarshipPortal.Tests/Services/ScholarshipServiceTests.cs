using Moq;
using ScholarshipPortal.Application.Common;
using ScholarshipPortal.Application.DTOs;
using ScholarshipPortal.Application.Services;
using ScholarshipPortal.Domain.Enums;
using ScholarshipPortal.Domain.Repositories;
using App        = ScholarshipPortal.Domain.Entities.Application;
using DomainReview    = ScholarshipPortal.Domain.Entities.Review;
using Scholarship = ScholarshipPortal.Domain.Entities.Scholarship;

namespace ScholarshipPortal.Tests.Services;

public class ScholarshipServiceTests
{
    private readonly Mock<IScholarshipRepository> _scholarshipRepo  = new();
    private readonly Mock<IApplicationRepository> _applicationRepo  = new();
    private readonly Mock<IReviewRepository>      _reviewRepo       = new();
    private readonly ScholarshipService _service;

    private static readonly ActorContext Admin   = new("Admin",   "admin-1", "Admin", "admin@test.com");
    private static readonly ActorContext Student = new("Student", "stu-1",   "Alice", "alice@test.com");

    public ScholarshipServiceTests()
    {
        _service = new ScholarshipService(_scholarshipRepo.Object, _applicationRepo.Object, _reviewRepo.Object);
    }

    [Fact]
    public async Task GetAllAsync_ReturnsMappedDtos()
    {
        var scholarship = MakeScholarship("CS Award");
        _scholarshipRepo.Setup(r => r.GetAllAsync(default)).ReturnsAsync([scholarship]);

        var result = await _service.GetAllAsync();

        Assert.Single(result);
        Assert.Equal("CS Award", result[0].Title);
    }

    [Fact]
    public async Task GetByIdAsync_WhenFound_ReturnsMappedDto()
    {
        var scholarship = MakeScholarship("CS Award");
        _scholarshipRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(scholarship);

        var result = await _service.GetByIdAsync(1);

        Assert.NotNull(result);
        Assert.Equal("CS Award", result.Title);
    }

    [Fact]
    public async Task GetByIdAsync_WhenNotFound_ReturnsNull()
    {
        _scholarshipRepo.Setup(r => r.GetByIdAsync(99, default)).ReturnsAsync((Scholarship?)null);

        var result = await _service.GetByIdAsync(99);

        Assert.Null(result);
    }

    [Fact]
    public async Task CreateAsync_AsAdmin_CreatesAndReturnsDto()
    {
        var dto = new ScholarshipWriteDto("CS Award", "Undergrad",
            DateOnly.FromDateTime(DateTime.Today.AddDays(30)), "GPA >= 3.0", 5000m);
        _scholarshipRepo.Setup(r => r.AddAsync(It.IsAny<Scholarship>(), default)).Returns(Task.CompletedTask);
        _scholarshipRepo.Setup(r => r.SaveChangesAsync(default)).Returns(Task.CompletedTask);

        var result = await _service.CreateAsync(dto, Admin);

        Assert.Equal("CS Award", result.Title);
        Assert.Equal(5000m, result.Amount);
        _scholarshipRepo.Verify(r => r.AddAsync(It.IsAny<Scholarship>(), default), Times.Once);
    }

    [Fact]
    public async Task CreateAsync_AsStudent_ThrowsUnauthorizedAccessException()
    {
        var dto = new ScholarshipWriteDto("CS Award", "Undergrad",
            DateOnly.FromDateTime(DateTime.Today.AddDays(30)), "Any", 1000m);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => _service.CreateAsync(dto, Student));
    }

    [Fact]
    public async Task UpdateAsync_AsAdmin_WhenFound_UpdatesAndReturnsDto()
    {
        var scholarship = MakeScholarship("Old Title");
        _scholarshipRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(scholarship);
        _scholarshipRepo.Setup(r => r.SaveChangesAsync(default)).Returns(Task.CompletedTask);

        var dto = new ScholarshipWriteDto("New Title", "Graduate",
            DateOnly.FromDateTime(DateTime.Today.AddDays(60)), "GPA >= 3.5", 8000m);

        var result = await _service.UpdateAsync(1, dto, Admin);

        Assert.NotNull(result);
        Assert.Equal("New Title", result.Title);
        Assert.Equal(8000m, result.Amount);
    }

    [Fact]
    public async Task UpdateAsync_WhenNotFound_ReturnsNull()
    {
        _scholarshipRepo.Setup(r => r.GetByIdAsync(99, default)).ReturnsAsync((Scholarship?)null);
        var dto = new ScholarshipWriteDto("Title", "All",
            DateOnly.FromDateTime(DateTime.Today.AddDays(10)), "Any", 1000m);

        var result = await _service.UpdateAsync(99, dto, Admin);

        Assert.Null(result);
    }

    [Fact]
    public async Task UpdateAsync_AsStudent_ThrowsUnauthorizedAccessException()
    {
        var dto = new ScholarshipWriteDto("Title", "All",
            DateOnly.FromDateTime(DateTime.Today.AddDays(10)), "Any", 1000m);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => _service.UpdateAsync(1, dto, Student));
    }

    [Fact]
    public async Task DeleteAsync_AsAdmin_DeletesAndReturnsTrue()
    {
        var scholarship = MakeScholarship("CS Award");
        _scholarshipRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(scholarship);
        _applicationRepo.Setup(r => r.GetByScholarshipIdAsync(1, default)).ReturnsAsync([]);
        _scholarshipRepo.Setup(r => r.DeleteAsync(scholarship, default)).Returns(Task.CompletedTask);
        _scholarshipRepo.Setup(r => r.SaveChangesAsync(default)).Returns(Task.CompletedTask);

        var result = await _service.DeleteAsync(1, Admin);

        Assert.True(result);
        _scholarshipRepo.Verify(r => r.DeleteAsync(scholarship, default), Times.Once);
    }

    [Fact]
    public async Task DeleteAsync_WithDependentApplicationsAndReviews_CascadesDeletes()
    {
        var scholarship  = MakeScholarship("CS Award");
        var application  = App.Create(1, "Alice", "stu-1");
        var review       = DomainReview.Create(application.Id, "Dr. Smith", 80, "Good.", ReviewStage.Initial, "rev-1");

        _scholarshipRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(scholarship);
        _applicationRepo.Setup(r => r.GetByScholarshipIdAsync(1, default)).ReturnsAsync([application]);
        _reviewRepo.Setup(r => r.GetByApplicationIdAsync(application.Id, default)).ReturnsAsync([review]);
        _reviewRepo.Setup(r => r.DeleteAsync(review, default)).Returns(Task.CompletedTask);
        _reviewRepo.Setup(r => r.SaveChangesAsync(default)).Returns(Task.CompletedTask);
        _applicationRepo.Setup(r => r.DeleteAsync(application, default)).Returns(Task.CompletedTask);
        _applicationRepo.Setup(r => r.SaveChangesAsync(default)).Returns(Task.CompletedTask);
        _scholarshipRepo.Setup(r => r.DeleteAsync(scholarship, default)).Returns(Task.CompletedTask);
        _scholarshipRepo.Setup(r => r.SaveChangesAsync(default)).Returns(Task.CompletedTask);

        var result = await _service.DeleteAsync(1, Admin);

        Assert.True(result);
        _reviewRepo.Verify(r => r.DeleteAsync(review, default), Times.Once);
        _applicationRepo.Verify(r => r.DeleteAsync(application, default), Times.Once);
        _scholarshipRepo.Verify(r => r.DeleteAsync(scholarship, default), Times.Once);
    }

    [Fact]
    public async Task DeleteAsync_WhenNotFound_ReturnsFalse()
    {
        _scholarshipRepo.Setup(r => r.GetByIdAsync(99, default)).ReturnsAsync((Scholarship?)null);

        var result = await _service.DeleteAsync(99, Admin);

        Assert.False(result);
    }

    [Fact]
    public async Task DeleteAsync_AsStudent_ThrowsUnauthorizedAccessException()
    {
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => _service.DeleteAsync(1, Student));
    }

    [Fact]
    public async Task AssignReviewerAsync_WithReviewerId_AssignsReviewer()
    {
        var scholarship = MakeScholarship("CS Award");
        _scholarshipRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(scholarship);
        _scholarshipRepo.Setup(r => r.SaveChangesAsync(default)).Returns(Task.CompletedTask);

        var dto = new AssignScholarshipReviewerDto("rev-1", "Dr. Smith", "smith@uni.edu");
        var result = await _service.AssignReviewerAsync(1, dto, Admin);

        Assert.NotNull(result);
        Assert.Equal("rev-1", result.AssignedReviewerId);
        Assert.Equal("Dr. Smith", result.AssignedReviewerName);
    }

    [Fact]
    public async Task AssignReviewerAsync_WithNullReviewerId_UnassignsReviewer()
    {
        var scholarship = MakeScholarship("CS Award");
        scholarship.AssignReviewer("rev-old", "Old Reviewer", null);
        _scholarshipRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(scholarship);
        _scholarshipRepo.Setup(r => r.SaveChangesAsync(default)).Returns(Task.CompletedTask);

        var dto = new AssignScholarshipReviewerDto(null, null, null);
        var result = await _service.AssignReviewerAsync(1, dto, Admin);

        Assert.NotNull(result);
        Assert.Null(result.AssignedReviewerId);
        Assert.Null(result.AssignedReviewerName);
    }

    private static Scholarship MakeScholarship(string title) =>
        Scholarship.Create(title, "All Students",
            DateOnly.FromDateTime(DateTime.Today.AddDays(30)), "None", 1000m);
}
