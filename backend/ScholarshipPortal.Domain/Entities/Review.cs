using ScholarshipPortal.Domain.Enums;

namespace ScholarshipPortal.Domain.Entities;

public sealed class Review
{
    public int Id { get; private set; }
    public int ApplicationId { get; private set; }
    public string ReviewerName { get; private set; } = string.Empty;
    public int Score { get; private set; }
    public string Comment { get; private set; } = string.Empty;
    public ReviewStage Stage { get; private set; }
    public DateTime CreatedAt { get; private set; }

    private Review() { }

    public static Review Create(
        int applicationId,
        string reviewerName,
        int score,
        string comment,
        ReviewStage stage = ReviewStage.Initial)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(reviewerName);
        ArgumentException.ThrowIfNullOrWhiteSpace(comment);
        ArgumentOutOfRangeException.ThrowIfNegative(score);
        if (score > 100) throw new ArgumentOutOfRangeException(nameof(score), "Score must be between 0 and 100.");

        return new Review
        {
            ApplicationId = applicationId,
            ReviewerName = reviewerName,
            Score = score,
            Comment = comment,
            Stage = stage,
            CreatedAt = DateTime.UtcNow
        };
    }

    public void UpdateEvaluation(string reviewerName, int score, string comment, ReviewStage stage)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(reviewerName);
        ArgumentException.ThrowIfNullOrWhiteSpace(comment);
        ArgumentOutOfRangeException.ThrowIfNegative(score);
        if (score > 100) throw new ArgumentOutOfRangeException(nameof(score), "Score must be between 0 and 100.");

        ReviewerName = reviewerName;
        Score = score;
        Comment = comment;
        Stage = stage;
    }
}
