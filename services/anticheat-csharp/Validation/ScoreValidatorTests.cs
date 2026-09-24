using Subb.Anticheat.Models;
using Subb.Anticheat.Validation;
using Xunit;

namespace Subb.Anticheat.Validation.Tests;

public class ScoreValidatorTests
{
    [Fact]
    public void NormalRunPassesWithComfortableConfidence()
    {
        // maxScore = 1000*12 + 400*20 + 500 = 20500; maxCoins = 6020.
        var result = ScoreValidator.Validate(new ScoreSubmission("DashKing", 5000, 1000, 400));

        Assert.True(result.Valid);
        Assert.Null(result.Reason);
        Assert.InRange(result.Confidence, 0.5, 1.0);
    }

    [Fact]
    public void ImpossibleScoreIsRejected()
    {
        var result = ScoreValidator.Validate(new ScoreSubmission("Cheater", 30000, 1000, 400));

        Assert.False(result.Valid);
        Assert.Equal("score_too_high", result.Reason);
        Assert.Equal(1.0, result.Confidence);
    }

    [Fact]
    public void ImpossibleCoinCountIsRejected()
    {
        var result = ScoreValidator.Validate(new ScoreSubmission("CoinBot", 100, 100, 5000));

        Assert.False(result.Valid);
        Assert.Equal("coins_too_high", result.Reason);
    }

    [Fact]
    public void HighScoreWithoutDistanceIsRejected()
    {
        var result = ScoreValidator.Validate(new ScoreSubmission("Porter", 150, 5, 0));

        Assert.False(result.Valid);
        Assert.Equal("distance_too_low", result.Reason);
    }

    [Fact]
    public void BoundaryValuesExactlyAtLimitsPass()
    {
        // score == distance*12 + coins*20 + 500
        var atScoreLimit = ScoreValidator.Validate(new ScoreSubmission("Edge", 1700, 100, 0));
        Assert.True(atScoreLimit.Valid);
        Assert.Null(atScoreLimit.Reason);

        // coins == distance*6 + 20
        var atCoinLimit = ScoreValidator.Validate(new ScoreSubmission("Edge", 0, 100, 620));
        Assert.True(atCoinLimit.Valid);
        Assert.Null(atCoinLimit.Reason);

        // distance == MIN_DISTANCE with score >= 100 (rule is strictly "< 10")
        var atDistanceLimit = ScoreValidator.Validate(new ScoreSubmission("Edge", 100, 10, 0));
        Assert.True(atDistanceLimit.Valid);
        Assert.Null(atDistanceLimit.Reason);

        // Everything at its exact limit simultaneously.
        // maxCoins = 620; maxScore = 100*12 + 620*20 + 500 = 14100.
        var allAtOnce = ScoreValidator.Validate(new ScoreSubmission("Edge", 14100, 100, 620));
        Assert.True(allAtOnce.Valid);
        Assert.Null(allAtOnce.Reason);
    }

    [Fact]
    public void OneOverAnyLimitFails()
    {
        var overScore = ScoreValidator.Validate(new ScoreSubmission("Edge", 1701, 100, 0));
        Assert.False(overScore.Valid);
        Assert.Equal("score_too_high", overScore.Reason);

        var overCoins = ScoreValidator.Validate(new ScoreSubmission("Edge", 0, 100, 621));
        Assert.False(overCoins.Valid);
        Assert.Equal("coins_too_high", overCoins.Reason);

        var underDistance = ScoreValidator.Validate(new ScoreSubmission("Edge", 100, 9, 0));
        Assert.False(underDistance.Valid);
        Assert.Equal("distance_too_low", underDistance.Reason);
    }

    [Fact]
    public void ConfidenceAtExactBoundaryIsZero()
    {
        var result = ScoreValidator.Validate(new ScoreSubmission("Edge", 1700, 100, 0));

        Assert.True(result.Valid);
        Assert.Equal(0.0, result.Confidence);
    }

    [Fact]
    public void NegativeInputsAreClampedNotTrusted()
    {
        // A hand-crafted payload with negative values must not validate as a
        // perfect run: clamping to zero keeps it a zero run (still "valid",
        // but with full-headroom semantics, never a confidence of 1 for score).
        var result = ScoreValidator.Validate(new ScoreSubmission("Glitch", -500, 1000, 100));

        Assert.True(result.Valid);
        Assert.Null(result.Reason);
        Assert.True(result.Confidence < 1.0);
    }
}
