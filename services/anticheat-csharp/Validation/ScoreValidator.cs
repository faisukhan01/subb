using Subb.Anticheat.Models;

namespace Subb.Anticheat.Validation;

/// <summary>
/// Anti-cheat heuristic for score submissions.
///
/// ANTI-CHEAT CONTRACT: these constants and formulas are mirrored verbatim in
/// services/leaderboard-go/internal/model/score.go (Go) and in the web client.
/// Checks run in a fixed order (score -> coins -> distance) so every service
/// reports the same single reason when multiple rules fail at once:
///
///   score <= distance*MAX_SCORE_PER_METER + coins*COIN_SCORE_WEIGHT + SCORE_BUFFER
///   coins <= distance*MAX_COINS_PER_METER + 20
///   NOT (score >= 100 AND distance &lt; MIN_DISTANCE)
/// </summary>
public static class ScoreValidator
{
    public const int MaxScorePerMeter = 12;
    public const int MaxCoinsPerMeter = 6;
    public const int CoinScoreWeight = 20;
    public const int ScoreBuffer = 500;
    public const int MinDistance = 10;

    /// <summary>Flat coin allowance (the literal "+20" in the shared spec).</summary>
    public const int CoinGrace = 20;

    /// <summary>
    /// Absurd-input guard, mirroring MaxPlausibleInput in the Go service:
    /// anything beyond this cannot come from real gameplay.
    /// </summary>
    public const long MaxPlausibleInput = 1L << 50;

    public static ValidationResult Validate(ScoreSubmission submission)
    {
        // Clamp defensive negatives to zero so the reason set stays exactly
        // { score_too_high, coins_too_high, distance_too_low }.
        long score = Math.Max((long)submission.Score, 0);
        long distance = Math.Max((long)submission.Distance, 0);
        long coins = Math.Max((long)submission.Coins, 0);

        if (score > MaxPlausibleInput || distance > MaxPlausibleInput || coins > MaxPlausibleInput)
        {
            // The score bound is the first rule that would fail; report that.
            return Fail("score_too_high", 1.0);
        }

        long maxScore = distance * MaxScorePerMeter + coins * CoinScoreWeight + ScoreBuffer;
        long maxCoins = distance * MaxCoinsPerMeter + CoinGrace;

        double scoreUsage = Usage(score, maxScore);
        double coinUsage = Usage(coins, maxCoins);

        if (score > maxScore)
        {
            return Fail("score_too_high", scoreUsage);
        }

        if (coins > maxCoins)
        {
            return Fail("coins_too_high", coinUsage);
        }

        if (score >= 100 && distance < MinDistance)
        {
            // Certain violation: a >=100-point run cannot cover less than 10 m.
            return Fail("distance_too_low", 1.0);
        }

        // Valid: confidence = share of the tightest budget still unused.
        double confidence = Math.Clamp(1.0 - Math.Max(scoreUsage, coinUsage), 0.0, 1.0);
        return new ValidationResult(true, null, Math.Round(confidence, 4));
    }

    /// <summary>Ratio of budget used, capped at 1.0 for confidence math.</summary>
    private static double Usage(long used, long allowed)
        => allowed <= 0 ? 1.0 : Math.Min(used / (double)allowed, 1.0);

    private static ValidationResult Fail(string reason, double confidence)
        => new(false, reason, Math.Round(Math.Min(confidence, 1.0), 4));
}
