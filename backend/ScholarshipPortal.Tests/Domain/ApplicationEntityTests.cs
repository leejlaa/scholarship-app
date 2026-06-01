using ScholarshipPortal.Domain.Enums;
using App = ScholarshipPortal.Domain.Entities.Application;

namespace ScholarshipPortal.Tests.Domain;

public class ApplicationEntityTests
{
    [Fact]
    public void Create_WithValidArgs_CreatesWithDraftStatus()
    {
        var app = App.Create(1, "Alice Smith", "user-1");

        Assert.Equal(1, app.ScholarshipId);
        Assert.Equal("Alice Smith", app.StudentName);
        Assert.Equal("user-1", app.UserId);
        Assert.Equal(ApplicationStatus.Draft, app.Status);
        Assert.Empty(app.Documents);
    }

    [Fact]
    public void Create_WithNullUserId_CreatesSuccessfully()
    {
        var app = App.Create(1, "Alice Smith", null);

        Assert.Null(app.UserId);
        Assert.Equal(ApplicationStatus.Draft, app.Status);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_WithBlankStudentName_ThrowsArgumentException(string name)
    {
        Assert.Throws<ArgumentException>(() => App.Create(1, name));
    }

    [Fact]
    public void Submit_WhenDraft_ChangesStatusToSubmitted()
    {
        var app = App.Create(1, "Bob Jones");

        app.Submit();

        Assert.Equal(ApplicationStatus.Submitted, app.Status);
    }

    [Theory]
    [InlineData(ApplicationStatus.Submitted)]
    [InlineData(ApplicationStatus.UnderReview)]
    [InlineData(ApplicationStatus.Approved)]
    public void Submit_WhenNotDraft_ThrowsInvalidOperationException(ApplicationStatus initialStatus)
    {
        var app = App.Create(1, "Bob Jones");
        app.UpdateStatus(initialStatus);

        Assert.Throws<InvalidOperationException>(() => app.Submit());
    }

    [Fact]
    public void UpdateStudentName_WithValidName_UpdatesName()
    {
        var app = App.Create(1, "Old Name");

        app.UpdateStudentName("New Name");

        Assert.Equal("New Name", app.StudentName);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void UpdateStudentName_WithBlankName_ThrowsArgumentException(string name)
    {
        var app = App.Create(1, "Valid Name");

        Assert.Throws<ArgumentException>(() => app.UpdateStudentName(name));
    }

    [Fact]
    public void AddDocument_AppendsToDocumentsCollection()
    {
        var app = App.Create(1, "Alice");

        app.AddDocument("resume.pdf", "uploads/resume.pdf", "Resume");
        app.AddDocument("transcript.pdf", "uploads/transcript.pdf", "Transcript");

        Assert.Equal(2, app.Documents.Count);
        Assert.Equal("Resume", app.Documents[0].DocumentType);
        Assert.Equal("Transcript", app.Documents[1].DocumentType);
    }

    [Fact]
    public void HasAllRequiredDocuments_WhenAllPresent_ReturnsTrue()
    {
        var app = App.Create(1, "Alice");
        app.AddDocument("resume.pdf", "uploads/resume.pdf", "Resume");
        app.AddDocument("transcript.pdf", "uploads/transcript.pdf", "Transcript");

        var result = app.HasAllRequiredDocuments(["Resume", "Transcript"]);

        Assert.True(result);
    }

    [Fact]
    public void HasAllRequiredDocuments_WhenMissingOne_ReturnsFalse()
    {
        var app = App.Create(1, "Alice");
        app.AddDocument("resume.pdf", "uploads/resume.pdf", "Resume");

        var result = app.HasAllRequiredDocuments(["Resume", "Transcript"]);

        Assert.False(result);
    }

    [Fact]
    public void HasAllRequiredDocuments_IsCaseInsensitive()
    {
        var app = App.Create(1, "Alice");
        app.AddDocument("resume.pdf", "uploads/resume.pdf", "RESUME");

        var result = app.HasAllRequiredDocuments(["resume"]);

        Assert.True(result);
    }

    [Fact]
    public void StatusTransitions_AllWorkCorrectly()
    {
        var app = App.Create(1, "Alice");

        app.MarkUnderReview();
        Assert.Equal(ApplicationStatus.UnderReview, app.Status);

        app.Shortlist();
        Assert.Equal(ApplicationStatus.Shortlisted, app.Status);

        app.Approve();
        Assert.Equal(ApplicationStatus.Approved, app.Status);
    }

    [Fact]
    public void Reject_SetsStatusToRejected()
    {
        var app = App.Create(1, "Alice");
        app.Submit();

        app.Reject();

        Assert.Equal(ApplicationStatus.Rejected, app.Status);
    }
}
