namespace Subb.Anticheat.Models;

/// <summary>
/// A run as reported by the game client. JSON uses snake_case
/// (<c>player_name</c>, <c>score</c>, <c>distance</c>, <c>coins</c>) to match
/// the Go leaderboard service contract exactly.
/// </summary>
public record ScoreSubmission(string PlayerName, int Score, int Distance, int Coins);

/// <summary>
/// Outcome of an anti-cheat validation. <see cref="Reason"/> is one of
/// <c>score_too_high</c> | <c>coins_too_high</c> | <c>distance_too_low</c> when
/// <see cref="Valid"/> is false, otherwise null.
/// <see cref="Confidence"/> is a 0..1 measure: how comfortably the run passes
/// (headroom left) when valid, or how far beyond the limit it went when invalid.
/// </summary>
public record ValidationResult(bool Valid, string? Reason, double Confidence);
