using ScholarshipPortal.Domain.Entities;
using ScholarshipPortal.Domain.Enums;

namespace ScholarshipPortal.Tests.Domain;

public class ScholarshipEntityTests
{
    [Fact]
    public void Create_WithFutureDeadline_StatusIsOpen()
    {
        var future = DateOnly.FromDateTime(DateTime.Today.AddDays(30));

        var scholarship = Scholarship.Create("Merit Award", "Undergrad", future, "GPA >= 3.5", 5000m);

        Assert.Equal("Merit Award", scholarship.Title);
        Assert.Equal(ScholarshipStatus.Open, scholarship.Status);
    }

    [Fact]
    public void Create_WithPastDeadline_StatusIsClosed()
    {
        var past = DateOnly.FromDateTime(DateTime.Today.AddDays(-1));

        var scholarship = Scholarship.Create("Old Award", "Grad", past, "Any", 1000m);

        Assert.Equal(ScholarshipStatus.Closed, scholarship.Status);
    }

    [Fact]
    public void Create_WithTodayDeadline_StatusIsOpen()
    {
        var today = DateOnly.FromDateTime(DateTime.Today);

        var scholarship = Scholarship.Create("Today Award", "All", today, "Any", 500m);

        Assert.Equal(ScholarshipStatus.Open, scholarship.Status);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_WithBlankTitle_ThrowsArgumentException(string title)
    {
        var deadline = DateOnly.FromDateTime(DateTime.Today.AddDays(10));

        Assert.Throws<ArgumentException>(() =>
            Scholarship.Create(title, "Undergrad", deadline, "Any", 1000m));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_WithBlankAudience_ThrowsArgumentException(string audience)
    {
        var deadline = DateOnly.FromDateTime(DateTime.Today.AddDays(10));

        Assert.Throws<ArgumentException>(() =>
            Scholarship.Create("Title", audience, deadline, "Any", 1000m));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-100)]
    public void Create_WithNonPositiveAmount_ThrowsArgumentOutOfRangeException(decimal amount)
    {
        var deadline = DateOnly.FromDateTime(DateTime.Today.AddDays(10));

        Assert.Throws<ArgumentOutOfRangeException>(() =>
            Scholarship.Create("Title", "Undergrad", deadline, "Any", amount));
    }

    [Fact]
    public void AssignReviewer_WithValidArgs_SetsReviewerFields()
    {
        var scholarship = MakeOpen();

        scholarship.AssignReviewer("rev-1", "Dr. Smith", "smith@uni.edu");

        Assert.Equal("rev-1", scholarship.AssignedReviewerId);
        Assert.Equal("Dr. Smith", scholarship.AssignedReviewerName);
        Assert.Equal("smith@uni.edu", scholarship.AssignedReviewerEmail);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void AssignReviewer_WithBlankReviewerId_ThrowsArgumentException(string reviewerId)
    {
        var scholarship = MakeOpen();

        Assert.Throws<ArgumentException>(() =>
            scholarship.AssignReviewer(reviewerId, "Name", null));
    }

    [Fact]
    public void UnassignReviewer_ClearsReviewerFields()
    {
        var scholarship = MakeOpen();
        scholarship.AssignReviewer("rev-1", "Dr. Smith", "smith@uni.edu");

        scholarship.UnassignReviewer();

        Assert.Null(scholarship.AssignedReviewerId);
        Assert.Null(scholarship.AssignedReviewerName);
        Assert.Null(scholarship.AssignedReviewerEmail);
    }

    [Fact]
    public void IsOpen_WhenStatusIsOpen_ReturnsTrue()
    {
        var scholarship = MakeOpen();

        Assert.True(scholarship.IsOpen());
    }

    [Fact]
    public void UpdateDetails_ChangesAllFields()
    {
        var scholarship = MakeOpen();
        var newDeadline = DateOnly.FromDateTime(DateTime.Today.AddDays(60));

        scholarship.UpdateDetails("New Title", "Graduate", newDeadline, "GPA >= 3.0", 2000m);

        Assert.Equal("New Title", scholarship.Title);
        Assert.Equal("Graduate", scholarship.Audience);
        Assert.Equal(2000m, scholarship.Amount);
        Assert.Equal(ScholarshipStatus.Open, scholarship.Status);
    }

    [Fact]
    public void UpdateDetails_WithPastDeadline_ClosesScholarship()
    {
        var scholarship = MakeOpen();
        var pastDeadline = DateOnly.FromDateTime(DateTime.Today.AddDays(-5));

        scholarship.UpdateDetails("Title", "All", pastDeadline, "Any", 1000m);

        Assert.Equal(ScholarshipStatus.Closed, scholarship.Status);
    }

    private static Scholarship MakeOpen() =>
        Scholarship.Create("Test Scholarship", "All Students",
            DateOnly.FromDateTime(DateTime.Today.AddDays(30)), "None", 1000m);
}
