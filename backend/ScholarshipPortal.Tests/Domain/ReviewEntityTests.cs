using ScholarshipPortal.Domain.Entities;
using ScholarshipPortal.Domain.Enums;

namespace ScholarshipPortal.Tests.Domain;

public class ReviewEntityTests
{
    [Fact]
    public void Create_WithValidArgs_CreatesReview()
    {
        var review = Review.Create(1, "Dr. Smith", 85, "Excellent candidate.", ReviewStage.Initial, "rev-1");

        Assert.Equal(1, review.ApplicationId);
        Assert.Equal("Dr. Smith", review.ReviewerName);
        Assert.Equal(85, review.Score);
        Assert.Equal("Excellent candidate.", review.Comment);
        Assert.Equal(ReviewStage.Initial, review.Stage);
        Assert.Equal("rev-1", review.ReviewerId);
        Assert.True(review.CreatedAt <= DateTime.UtcNow);
    }

    [Fact]
    public void Create_WithNullReviewerId_CreatesReview()
    {
        var review = Review.Create(1, "Dr. Smith", 50, "Average.", ReviewStage.Initial, null);

        Assert.Null(review.ReviewerId);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_WithBlankReviewerName_ThrowsArgumentException(string name)
    {
        Assert.Throws<ArgumentException>(() =>
            Review.Create(1, name, 80, "Comment", ReviewStage.Initial));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_WithBlankComment_ThrowsArgumentException(string comment)
    {
        Assert.Throws<ArgumentException>(() =>
            Review.Create(1, "Dr. Smith", 80, comment, ReviewStage.Initial));
    }

    [Fact]
    public void Create_WithNegativeScore_ThrowsArgumentOutOfRangeException()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() =>
            Review.Create(1, "Dr. Smith", -1, "Comment", ReviewStage.Initial));
    }

    [Fact]
    public void Create_WithScoreOver100_ThrowsArgumentOutOfRangeException()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() =>
            Review.Create(1, "Dr. Smith", 101, "Comment", ReviewStage.Initial));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(50)]
    [InlineData(100)]
    public void Create_WithBoundaryScores_Succeeds(int score)
    {
        var review = Review.Create(1, "Dr. Smith", score, "Comment", ReviewStage.Initial);

        Assert.Equal(score, review.Score);
    }

    [Fact]
    public void UpdateEvaluation_ChangesAllFields()
    {
        var review = Review.Create(1, "Dr. Smith", 70, "Initial comment.", ReviewStage.Initial, "rev-1");

        review.UpdateEvaluation("Dr. Jones", 90, "Updated comment.", ReviewStage.Complete);

        Assert.Equal("Dr. Jones", review.ReviewerName);
        Assert.Equal(90, review.Score);
        Assert.Equal("Updated comment.", review.Comment);
        Assert.Equal(ReviewStage.Complete, review.Stage);
    }

    [Fact]
    public void UpdateEvaluation_WithInvalidScore_Throws()
    {
        var review = Review.Create(1, "Dr. Smith", 70, "Comment.", ReviewStage.Initial);

        Assert.Throws<ArgumentOutOfRangeException>(() =>
            review.UpdateEvaluation("Dr. Smith", 150, "Comment.", ReviewStage.Complete));
    }

    [Theory]
    [InlineData(ReviewStage.Initial)]
    [InlineData(ReviewStage.Secondary)]
    [InlineData(ReviewStage.PanelDiscussion)]
    [InlineData(ReviewStage.Complete)]
    public void Create_WithAllStages_Succeeds(ReviewStage stage)
    {
        var review = Review.Create(1, "Dr. Smith", 80, "Comment.", stage);

        Assert.Equal(stage, review.Stage);
    }
}
