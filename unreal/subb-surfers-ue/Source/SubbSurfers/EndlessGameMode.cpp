// Copyright SUBB SURFERS. All rights reserved.

#include "EndlessGameMode.h"

#include "Engine/World.h"
#include "Kismet/GameplayStatics.h"

AEndlessGameMode::AEndlessGameMode()
{
    PrimaryActorTick.bCanEverTick = true;
}

void AEndlessGameMode::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);

    if (!bRunActive)
    {
        return;
    }

    ElapsedRunTime += DeltaSeconds;

    // --- Difficulty ramp: linear interpolation StartSpeed -> MaxSpeed. ---
    const float Alpha = FMath::Clamp(ElapsedRunTime / FMath::Max(1.f, SpeedRampSeconds), 0.f, 1.f);
    CurrentSpeed = FMath::Lerp(StartSpeed, MaxSpeed, Alpha);

    // --- Score from distance travelled (100 uu = 1 metre). ---
    const float MetresThisFrame = (CurrentSpeed * DeltaSeconds) / 100.f;
    Distance += MetresThisFrame;

    const int32 NextScore = Score + FMath::RoundToInt(MetresThisFrame * PointsPerMetre);
    if (NextScore != Score)
    {
        Score = NextScore;
        OnScoreChanged.Broadcast(Score, Distance);
    }
}

void AEndlessGameMode::AddScore(int32 Points)
{
    if (!bRunActive || Points == 0)
    {
        return;
    }

    Score += Points;
    OnScoreChanged.Broadcast(Score, Distance);
}

void AEndlessGameMode::NotifyPlayerDeath()
{
    if (!bRunActive)
    {
        return;
    }

    bRunActive = false;
    UE_LOG(LogSubbSurfers, Log, TEXT("Run over — score %d, distance %.0f m"), Score, Distance);
    OnRunEnded.Broadcast(Score, Distance);
}

void AEndlessGameMode::RestartGame()
{
    UWorld* World = GetWorld();
    if (!World)
    {
        return;
    }

    Score = 0;
    Distance = 0.f;
    ElapsedRunTime = 0.f;
    CurrentSpeed = StartSpeed;

    // Reopen the current level — a fresh AEndlessGameMode restarts the run.
    UE_LOG(LogSubbSurfers, Log, TEXT("Restarting level '%s'."), *World->GetName());
    UGameplayStatics::OpenLevel(this, FName(*World->GetName()), true);
}
