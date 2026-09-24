// Copyright SUBB SURFERS. All rights reserved.

#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "InputActionValue.h"
#include "SurferCharacter.generated.h"

class UBoxComponent;
class UInputAction;
class UInputMappingContext;
class UCharacterMovementComponent;
struct FInputActionValue;
struct FTimerHandle;

/** Multicast delegates used across the runner. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE(FSurferDeathSignature);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FSurferHoverboardBreakSignature, int32, RemainingCharges);

/**
 * ACharacter-based 3-lane endless runner:
 *  - Enhanced Input actions (lane move axis, jump, roll),
 *  - SmoothDamp-style lane interpolation in Tick,
 *  - custom gravity via GravityScale,
 *  - roll shrinks the capsule half-height on a timer,
 *  - runs along +X at the speed dictated by AEndlessGameMode.
 */
UCLASS()
class SUBBSURFERS_API ASurferCharacter : public ACharacter
{
    GENERATED_BODY()

public:
    ASurferCharacter();

    virtual void Tick(float DeltaSeconds) override;
    virtual void BeginPlay() override;
    virtual void SetupPlayerInputComponent(class UInputComponent* PlayerInputComponent) override;

    // ------------------------------------------------------------------
    // Public API
    // ------------------------------------------------------------------

    UFUNCTION(BlueprintCallable, Category="SubbSurfers|Run")
    void StartRun();

    UFUNCTION(BlueprintCallable, Category="SubbSurfers|Run")
    void EndRun();

    /** Called by obstacle actors on overlap — hoverboard absorbs one hit. */
    UFUNCTION(BlueprintCallable, Category="SubbSurfers|Run")
    void HandleObstacleOverlap();

    UFUNCTION(BlueprintCallable, Category="SubbSurfers|PowerUps")
    void GrantHoverboard();

    UFUNCTION(BlueprintPure, Category="SubbSurfers|Run")
    bool IsAlive() const { return bAlive; }

    UPROPERTY(BlueprintAssignable, Category="SubbSurfers|Events")
    FSurferDeathSignature OnDeath;

    UPROPERTY(BlueprintAssignable, Category="SubbSurfers|Events")
    FSurferHoverboardBreakSignature OnHoverboardBreak;

protected:
    // ------------------------------------------------------------------
    // Enhanced Input
    // ------------------------------------------------------------------

    /** Mapping context applied on BeginPlay. */
    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category="SubbSurfers|Input")
    TObjectPtr<UInputMappingContext> DefaultMappingContext;

    /** Axis action for lane switching: negative = left, positive = right. */
    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category="SubbSurfers|Input")
    TObjectPtr<UInputAction> IA_MoveLane;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category="SubbSurfers|Input")
    TObjectPtr<UInputAction> IA_Jump;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category="SubbSurfers|Input")
    TObjectPtr<UInputAction> IA_Roll;

    void OnMoveLane(const FInputActionValue& Value);
    void OnJump(const FInputActionValue& Value);
    void OnRoll(const FInputActionValue& Value);

    // ------------------------------------------------------------------
    // Tuning
    // ------------------------------------------------------------------

    /** Lane spacing in uu (3 lanes => -220 / 0 / +220). */
    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="SubbSurfers|Movement")
    float LaneWidth = 220.f;

    /** SmoothDamp-style lane lerp speed (higher = snappier). */
    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="SubbSurfers|Movement")
    float LaneInterpSpeed = 12.f;

    /** Custom gravity magnitude applied via GravityScale (uu/s^2 / 980). */
    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="SubbSurfers|Movement")
    float CustomGravity = 3800.f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="SubbSurfers|Movement")
    float JumpVelocity = 1350.f;

    /** Roll duration in seconds. */
    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="SubbSurfers|Roll")
    float RollDuration = 0.55f;

    /** Standing capsule half-height. */
    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="SubbSurfers|Roll")
    float StandingHalfHeight = 88.f;

    /** Rolling capsule half-height. */
    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="SubbSurfers|Roll")
    float RollingHalfHeight = 30.f;

private:
    void ApplyCapsuleHeight(float NewHalfHeight);
    void EndRoll();
    void Die();

    /** Current lane index: 0 = left, 1 = center, 2 = right. */
    UPROPERTY(VisibleAnywhere, Category="SubbSurfers|Movement")
    int32 LaneIndex = 1;

    /** Smoothed X position of the lane switch. */
    float CurrentLaneX = 0.f;

    /** Lane switch requested but not finished yet (queue direction). */
    int32 PendingLaneShift = 0;

    UPROPERTY(VisibleAnywhere, Category="SubbSurfers|Run")
    bool bAlive = true;

    UPROPERTY(VisibleAnywhere, Category="SubbSurfers|Run")
    int32 HoverboardCharges = 0;

    bool bRolling = false;

    FTimerHandle RollTimerHandle;

    /** Cached movement component for custom gravity. */
    UPROPERTY()
    TObjectPtr<UCharacterMovementComponent> MovementComp;
};
