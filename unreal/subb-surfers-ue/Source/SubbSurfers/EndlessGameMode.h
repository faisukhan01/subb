// Copyright SUBB SURFERS. All rights reserved.

#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "EndlessGameMode.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FScoreChangedSignature, int32, NewScore, float, Distance);

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FRunEndedSignature, int32, FinalScore, float, FinalDistance);

/**
 * Default game mode: owns the run speed ramp (1200 uu/s start), accumulates
 * score in Tick from distance travelled + coin pickups, and handles death /
 * restart flow.
 */
UCLASS()
class SUBBSURFERS_API AEndlessGameMode : public AGameModeBase
{
    GENERATED_BODY()

public:
    AEndlessGameMode();

    virtual void Tick(float DeltaSeconds) override;

    // ------------------------------------------------------------------
    // Run tuning
    // ------------------------------------------------------------------

    /** World speed at the start of a run (uu/s). */
    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="SubbSurfers|Run")
    float StartSpeed = 1200.f;

    /** Speed after SpeedRampSeconds of running (uu/s). */
    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="SubbSurfers|Run")
    float MaxSpeed = 3000.f;

    /** Seconds from run start until MaxSpeed is reached. */
    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="SubbSurfers|Run", meta=(ClampMin="1.0"))
    float SpeedRampSeconds = 90.f;

    /** Points awarded per metre (100 uu) travelled. */
    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="SubbSurfers|Score")
    float PointsPerMetre = 1.f;

    // ------------------------------------------------------------------
    // Public API
    // ------------------------------------------------------------------

    /** Current ramped world speed (uu/s) — the character reads this in Tick. */
    UFUNCTION(BlueprintPure, Category="SubbSurfers|Run")
    float GetCurrentSpeed() const { return CurrentSpeed; }

    UFUNCTION(BlueprintPure, Category="SubbSurfers|Score")
    int32 GetScore() const { return Score; }

    UFUNCTION(BlueprintPure, Category="SubbSurfers|Score")
    float GetDistance() const { return Distance; }

    /** Called by coins to add score. */
    UFUNCTION(BlueprintCallable, Category="SubbSurfers|Score")
    void AddScore(int32 Points);

    /** Called by ASurferCharacter when the run ends in a crash. */
    UFUNCTION(BlueprintCallable, Category="SubbSurfers|Run")
    void NotifyPlayerDeath();

    /** Reloads the current level for a fresh run. */
    UFUNCTION(BlueprintCallable, Category="SubbSurfers|Run")
    void RestartGame();

    UPROPERTY(BlueprintAssignable, Category="SubbSurfers|Events")
    FScoreChangedSignature OnScoreChanged;

    UPROPERTY(BlueprintAssignable, Category="SubbSurfers|Events")
    FRunEndedSignature OnRunEnded;

private:
    /** True from run start until death. */
    bool bRunActive = false;

    /** Ramped world speed (uu/s). */
    float CurrentSpeed = 0.f;

    /** Seconds since the run started (drives the speed ramp). */
    float ElapsedRunTime = 0.f;

    /** Distance travelled this run, in metres (100 uu = 1 m). */
    float Distance = 0.f;

    /** Points accumulated this run. */
    int32 Score = 0;
};
