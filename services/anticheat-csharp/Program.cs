using System.Text.Json;
using System.Text.Json.Serialization;
using Subb.Anticheat.Models;
using Subb.Anticheat.Validation;

var builder = WebApplication.CreateBuilder(args);

// snake_case JSON so the wire contract matches the Go leaderboard service
// ({"player_name", "score", "distance", "coins"} -> {"valid","reason","confidence"}).
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower;
    options.SerializerOptions.PropertyNameCaseInsensitive = true;
    options.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
});

builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
    policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));

// Listen on :4004 (PORT env override) — Azure/Heroku-style platforms set PORT.
var port = Environment.GetEnvironmentVariable("PORT") ?? "4004";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

var app = builder.Build();
app.UseCors();

app.MapGet("/healthz", () => Results.Ok(new
{
    status = "ok",
    service = "anticheat-csharp",
    version = "1.0.0",
}));

// Transparency endpoint: publishes the anti-cheat thresholds shared with the
// Go leaderboard service and the web client.
app.MapGet("/api/v1/constants", () => Results.Ok(new
{
    max_score_per_meter = ScoreValidator.MaxScorePerMeter,
    max_coins_per_meter = ScoreValidator.MaxCoinsPerMeter,
    coin_score_weight = ScoreValidator.CoinScoreWeight,
    score_buffer = ScoreValidator.ScoreBuffer,
    coin_grace = ScoreValidator.CoinGrace,
    min_distance = ScoreValidator.MinDistance,
}));

app.MapPost("/api/v1/validate", (ScoreSubmission submission) =>
{
    ValidationResult result = ScoreValidator.Validate(submission);
    return result.Valid ? Results.Ok(result) : Results.UnprocessableEntity(result);
});

app.Run();

// Expose the implicit Program class to the test assembly.
public partial class Program { }
