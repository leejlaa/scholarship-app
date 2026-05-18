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

public class ReviewServiceTests
{
    private readonly Mock<IReviewRepository>      _reviewRepo      = new();
    private readonly Mock<IApplicationRepository> _applicationRepo = new();
    private readonly Mock<IScholarshipRepository> _scholarshipRepo = new();
    private readonly ReviewService _service;

    private static readonly ActorContext Admin    = new("Admin",    "admin-1", "Admin",   "admin@test.com");
    private static readonly ActorContext Student  = new("Student",  "stu-1",   "Alice",   "alice@test.com");
    private static readonly ActorContext Reviewer = new("Reviewer", "rev-1",   "Dr. Lee", "lee@test.com");

    public ReviewServiceTests()
    {
        _service = new ReviewService(_reviewRepo.Object, _applicationRepo.Object, _scholarshipRepo.Object);
    }

    // ── GetQueueAsync ─────────────────────────────────────────────────────────

    [Fact]
    public async Task GetQueueAsync_AsAdmin_ReturnsAllReviews()
    {
        var app        = MakeApp(1, 10, "stu-1");
        var scholarship = MakeScholarship(10, "CS Award", "rev-1");
        var review     = DomainReview.Create(1, "Dr. Lee", 80, "Good.", ReviewStage.Initial, "rev-1");

        _reviewRepo.Setup(r => r.GetAllAsync(default)).ReturnsAsync([review]);
        _applicationRepo.Setup(r => r.GetAllAsync(default)).ReturnsAsync([app]);
        _scholarshipRepo.Setup(r => r.GetAllAsync(default)).ReturnsAsync([scholarship]);

        var result = await _service.GetQueueAsync(Admin);

        Assert.Single(result);
    }

    [Fact]
    public async Task GetQueueAsync_AsReviewer_ReturnsOnlyOwnScholarshipsReviews()
    {
        var app1 = MakeApp(1, 10, "stu-1");
        var app2 = MakeApp(2, 20, "stu-2");
        var scholarshipAssigned   = MakeScholarship(10, "CS Award",   "rev-1");
        var scholarshipUnassigned = MakeScholarship(20, "Arts Award", "rev-other");

        var reviewMine  = DomainReview.Create(1, "Dr. Lee",   80, "Good.", ReviewStage.Initial, "rev-1");
        var reviewOther = DomainReview.Create(2, "Dr. Other", 70, "Ok.",   ReviewStage.Initial, "rev-other");

        _reviewRepo.Setup(r => r.GetAllAsync(default)).ReturnsAsync([reviewMine, reviewOther]);
        _applicationRepo.Setup(r => r.GetAllAsync(default)).ReturnsAsync([app1, app2]);
        _scholarshipRepo.Setup(r => r.GetAllAsync(default))
            .ReturnsAsync([scholarshipAssigned, scholarshipUnassigned]);

        var result = await _service.GetQueueAsync(Reviewer);

        Assert.Single(result);
        Assert.Equal(80, result[0].RecommendedScore);
    }

    // ── GetByIdAsync ──────────────────────────────────────────────────────────

    [Fact]
    public async Task GetByIdAsync_WhenFound_ReturnsMappedDto()
    {
        var review      = DomainReview.Create(1, "Dr. Lee", 75, "Solid.", ReviewStage.Secondary, "rev-1");
        var app         = MakeApp(1, 10, "stu-1");
        var scholarship = MakeScholarship(10, "CS Award", "rev-1");

        _reviewRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(review);
        _applicationRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(app);
        _scholarshipRepo.Setup(r => r.GetByIdAsync(10, default)).ReturnsAsync(scholarship);

        var result = await _service.GetByIdAsync(1);

        Assert.NotNull(result);
        Assert.Equal(75, result.RecommendedScore);
        Assert.Equal("CS Award", result.ScholarshipTitle);
    }

    [Fact]
    public async Task GetByIdAsync_WhenNotFound_ReturnsNull()
    {
        _reviewRepo.Setup(r => r.GetByIdAsync(99, default)).ReturnsAsync((DomainReview?)null);

        var result = await _service.GetByIdAsync(99);

        Assert.Null(result);
    }

    // ── CreateAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateAsync_AsAssignedReviewer_CreatesReview()
    {
        var app         = MakeApp(1, 10, "stu-1");
        var scholarship = MakeScholarship(10, "CS Award", "rev-1");

        _applicationRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(app);
        _scholarshipRepo.Setup(r => r.GetByIdAsync(10, default)).ReturnsAsync(scholarship);
        _reviewRepo.Setup(r => r.GetByApplicationIdAsync(1, default)).ReturnsAsync([]);
        _reviewRepo.Setup(r => r.AddAsync(It.IsAny<DomainReview>(), default)).Returns(Task.CompletedTask);
        _reviewRepo.Setup(r => r.SaveChangesAsync(default)).Returns(Task.CompletedTask);

        var dto = new CreateReviewDto(1, null, 85, "Great candidate.", "Initial");
        var result = await _service.CreateAsync(dto, Reviewer);

        Assert.Equal(85, result.RecommendedScore);
        Assert.Equal("Dr. Lee", result.ReviewerName);
        Assert.True(result.IsMine);
    }

    [Fact]
    public async Task CreateAsync_AsStudent_ThrowsUnauthorizedAccessException()
    {
        var dto = new CreateReviewDto(1, null, 85, "Comment.", "Initial");

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.CreateAsync(dto, Student));
    }

    [Fact]
    public async Task CreateAsync_ReviewerNotAssignedToScholarship_ThrowsUnauthorizedAccessException()
    {
        var app         = MakeApp(1, 10, "stu-1");
        var scholarship = MakeScholarship(10, "CS Award", "rev-other");

        _applicationRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(app);
        _scholarshipRepo.Setup(r => r.GetByIdAsync(10, default)).ReturnsAsync(scholarship);

        var dto = new CreateReviewDto(1, null, 85, "Comment.", "Initial");

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.CreateAsync(dto, Reviewer));
    }

    [Fact]
    public async Task CreateAsync_ReviewerSubmitsSecondReview_ThrowsInvalidOperationException()
    {
        var app         = MakeApp(1, 10, "stu-1");
        var scholarship = MakeScholarship(10, "CS Award", "rev-1");
        var existing    = DomainReview.Create(1, "Dr. Lee", 70, "First review.", ReviewStage.Initial, "rev-1");

        _applicationRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(app);
        _scholarshipRepo.Setup(r => r.GetByIdAsync(10, default)).ReturnsAsync(scholarship);
        _reviewRepo.Setup(r => r.GetByApplicationIdAsync(1, default)).ReturnsAsync([existing]);

        var dto = new CreateReviewDto(1, null, 90, "Second attempt.", "Secondary");

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _service.CreateAsync(dto, Reviewer));
    }

    [Fact]
    public async Task CreateAsync_WithInvalidStage_ThrowsArgumentException()
    {
        var app         = MakeApp(1, 10, "stu-1");
        var scholarship = MakeScholarship(10, "CS Award", "rev-1");

        _applicationRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(app);
        _scholarshipRepo.Setup(r => r.GetByIdAsync(10, default)).ReturnsAsync(scholarship);
        _reviewRepo.Setup(r => r.GetByApplicationIdAsync(1, default)).ReturnsAsync([]);

        var dto = new CreateReviewDto(1, null, 80, "Comment.", "NotAStage");

        await Assert.ThrowsAsync<ArgumentException>(
            () => _service.CreateAsync(dto, Reviewer));
    }

    [Fact]
    public async Task CreateAsync_WithNonexistentApplication_ThrowsKeyNotFoundException()
    {
        _applicationRepo.Setup(r => r.GetByIdAsync(99, default)).ReturnsAsync((App?)null);

        var dto = new CreateReviewDto(99, null, 80, "Comment.", "Initial");

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => _service.CreateAsync(dto, Reviewer));
    }

    [Fact]
    public async Task CreateAsync_AsAdminWithNoAssignedReviewer_Succeeds()
    {
        var app         = MakeApp(1, 10, "stu-1");
        var scholarship = MakeScholarship(10, "CS Award", assignedReviewerId: null);

        _applicationRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(app);
        _scholarshipRepo.Setup(r => r.GetByIdAsync(10, default)).ReturnsAsync(scholarship);
        _reviewRepo.Setup(r => r.GetByApplicationIdAsync(1, default)).ReturnsAsync([]);
        _reviewRepo.Setup(r => r.AddAsync(It.IsAny<DomainReview>(), default)).Returns(Task.CompletedTask);
        _reviewRepo.Setup(r => r.SaveChangesAsync(default)).Returns(Task.CompletedTask);

        var dto = new CreateReviewDto(1, "Admin Reviewer", 88, "Admin review.", "Initial");
        var result = await _service.CreateAsync(dto, Admin);

        Assert.Equal(88, result.RecommendedScore);
    }

    // ── UpdateAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateAsync_AsReviewOwner_UpdatesReview()
    {
        var review      = DomainReview.Create(1, "Dr. Lee", 70, "Old comment.", ReviewStage.Initial, "rev-1");
        var app         = MakeApp(1, 10, "stu-1");
        var scholarship = MakeScholarship(10, "CS Award", "rev-1");

        _reviewRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(review);
        _applicationRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(app);
        _scholarshipRepo.Setup(r => r.GetByIdAsync(10, default)).ReturnsAsync(scholarship);
        _reviewRepo.Setup(r => r.SaveChangesAsync(default)).Returns(Task.CompletedTask);

        var dto = new UpdateReviewDto(null, 95, "Updated comment.", "Complete");
        var result = await _service.UpdateAsync(1, dto, Reviewer);

        Assert.NotNull(result);
        Assert.Equal(95, result.RecommendedScore);
        Assert.Equal("Updated comment.", result.Comment);
    }

    [Fact]
    public async Task UpdateAsync_AsNonOwnerReviewer_ThrowsUnauthorizedAccessException()
    {
        var review      = DomainReview.Create(1, "Dr. Other", 70, "Comment.", ReviewStage.Initial, "rev-other");
        var app         = MakeApp(1, 10, "stu-1");
        var scholarship = MakeScholarship(10, "CS Award", "rev-1");

        _reviewRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(review);
        _applicationRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(app);
        _scholarshipRepo.Setup(r => r.GetByIdAsync(10, default)).ReturnsAsync(scholarship);

        var dto = new UpdateReviewDto(null, 90, "Stolen update.", "Complete");

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.UpdateAsync(1, dto, Reviewer));
    }

    [Fact]
    public async Task UpdateAsync_AsAdmin_CanUpdateAnyReview()
    {
        var review      = DomainReview.Create(1, "Dr. Lee", 70, "Old.", ReviewStage.Initial, "rev-1");
        var app         = MakeApp(1, 10, "stu-1");
        var scholarship = MakeScholarship(10, "CS Award", "rev-1");

        _reviewRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(review);
        _applicationRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(app);
        _scholarshipRepo.Setup(r => r.GetByIdAsync(10, default)).ReturnsAsync(scholarship);
        _reviewRepo.Setup(r => r.SaveChangesAsync(default)).Returns(Task.CompletedTask);

        var dto = new UpdateReviewDto("Admin Override", 60, "Admin updated.", "Secondary");
        var result = await _service.UpdateAsync(1, dto, Admin);

        Assert.NotNull(result);
        Assert.Equal(60, result.RecommendedScore);
    }

    [Fact]
    public async Task UpdateAsync_WhenNotFound_ReturnsNull()
    {
        _reviewRepo.Setup(r => r.GetByIdAsync(99, default)).ReturnsAsync((DomainReview?)null);

        var dto = new UpdateReviewDto(null, 80, "Comment.", "Initial");
        var result = await _service.UpdateAsync(99, dto, Admin);

        Assert.Null(result);
    }

    // ── DeleteAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task DeleteAsync_AsReviewOwner_DeletesAndReturnsTrue()
    {
        var review      = DomainReview.Create(1, "Dr. Lee", 70, "Comment.", ReviewStage.Initial, "rev-1");
        var app         = MakeApp(1, 10, "stu-1");
        var scholarship = MakeScholarship(10, "CS Award", "rev-1");

        _reviewRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(review);
        _applicationRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(app);
        _scholarshipRepo.Setup(r => r.GetByIdAsync(10, default)).ReturnsAsync(scholarship);
        _reviewRepo.Setup(r => r.DeleteAsync(review, default)).Returns(Task.CompletedTask);
        _reviewRepo.Setup(r => r.SaveChangesAsync(default)).Returns(Task.CompletedTask);

        var result = await _service.DeleteAsync(1, Reviewer);

        Assert.True(result);
        _reviewRepo.Verify(r => r.DeleteAsync(review, default), Times.Once);
    }

    [Fact]
    public async Task DeleteAsync_AsStudent_ThrowsUnauthorizedAccessException()
    {
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.DeleteAsync(1, Student));
    }

    [Fact]
    public async Task DeleteAsync_WhenNotFound_ReturnsFalse()
    {
        _reviewRepo.Setup(r => r.GetByIdAsync(99, default)).ReturnsAsync((DomainReview?)null);

        var result = await _service.DeleteAsync(99, Admin);

        Assert.False(result);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static App MakeApp(int appId, int scholarshipId, string userId)
    {
        var app = App.Create(scholarshipId, "Test Student", userId);
        typeof(App).GetProperty("Id")!.SetValue(app, appId);
        return app;
    }

    private static Scholarship MakeScholarship(int id, string title, string? assignedReviewerId)
    {
        var s = Scholarship.Create(title, "All",
            DateOnly.FromDateTime(DateTime.Today.AddDays(30)), "None", 1000m);
        typeof(Scholarship).GetProperty("Id")!.SetValue(s, id);
        if (assignedReviewerId != null)
            s.AssignReviewer(assignedReviewerId, "Assigned Reviewer", null);
        return s;
    }
}
