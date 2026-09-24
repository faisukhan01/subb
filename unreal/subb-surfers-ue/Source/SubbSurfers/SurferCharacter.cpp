// Copyright SUBB SURFERS. All rights reserved.

#include "SurferCharacter.h"

#include "EndlessGameMode.h"
#include "Components/CapsuleComponent.h"
#include "Components/CharacterMovementComponent.h"
#include "EnhancedInputComponent.h"
#include "EnhancedInputSubsystems.h"
#include "GameFramework/PlayerController.h"
#include "InputMappingContext.h"
#include "TimerManager.h"

ASurferCharacter::ASurferCharacter()
{
    PrimaryActorTick.bCanEverTick = true;

    // A fairly slim capsule fits the corridor between lanes.
    GetCapsuleComponent()->InitCapsuleSize(42.f, StandingHalfHeight);

    MovementComp = GetCharacterMovement();
    if (MovementComp)
    {
        MovementComp->bOrientRotationToMovement = false;
        MovementComp->RotationRate = FRotator(0.f, 720.f, 0.f);
    }

    bUseControllerRotationYaw = false;
}

void ASurferCharacter::BeginPlay()
{
    Super::BeginPlay();

    CurrentLaneX = GetActorLocation().Y;

    if (const APlayerController* PC = Cast<APlayerController>(Controller))
    {
        if (UEnhancedInputLocalPlayerSubsystem* Subsystem =
            ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(PC->GetLocalPlayer()))
        {
            Subsystem->AddMappingContext(DefaultMappingContext, 0);
        }
    }
}

void ASurferCharacter::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);

    if (!bAlive)
    {
        return;
    }

    // ---- Forward movement along +X at the game-mode speed. ----
    float RunSpeed = 1200.f;
    if (const AEndlessGameMode* GM = Cast<AEndlessGameMode>(GetWorld()->GetAuthGameMode()))
    {
        RunSpeed = GM->GetCurrentSpeed();
    }

    FVector Location = GetActorLocation();
    Location.X += RunSpeed * DeltaSeconds;

    // ---- SmoothDamp-style lane interpolation along Y. ----
    const float TargetLaneX = (LaneIndex - 1) * LaneWidth;
    CurrentLaneX = FMath::FInterpTo(CurrentLaneX, TargetLaneX, DeltaSeconds, LaneInterpSpeed);
    Location.Y = CurrentLaneX;

    SetActorLocation(Location, true);
}

void ASurferCharacter::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
    Super::SetupPlayerInputComponent(PlayerInputComponent);

    UEnhancedInputComponent* EIC = Cast<UEnhancedInputComponent>(PlayerInputComponent);
    if (!EIC)
    {
        UE_LOG(LogSubbSurfers, Error, TEXT("SurferCharacter requires EnhancedInputComponent."));
        return;
    }

    if (IA_MoveLane)
    {
        EIC->BindAction(IA_MoveLane, ETriggerEvent::Triggered, this, &ASurferCharacter::OnMoveLane);
    }

    if (IA_Jump)
    {
        EIC->BindAction(IA_Jump, ETriggerEvent::Started, this, &ASurferCharacter::OnJump);
    }

    if (IA_Roll)
    {
        EIC->BindAction(IA_Roll, ETriggerEvent::Started, this, &ASurferCharacter::OnRoll);
    }
}

// ----------------------------------------------------------------------
// Input handlers
// ----------------------------------------------------------------------

void ASurferCharacter::OnMoveLane(const FInputActionValue& Value)
{
    if (!bAlive)
    {
        return;
    }

    const float Axis = Value.Get<float>();
    if (Axis < -0.5f)
    {
        LaneIndex = FMath::Clamp(LaneIndex - 1, 0, 2);
    }
    else if (Axis > 0.5f)
    {
        LaneIndex = FMath::Clamp(LaneIndex + 1, 0, 2);
    }
}

void ASurferCharacter::OnJump(const FInputActionValue& Value)
{
    if (!bAlive)
    {
        return;
    }

    // Custom gravity: launch with a fixed impulse instead of the default jump.
    LaunchCharacter(FVector(0.f, 0.f, JumpVelocity), false, true);
}

void ASurferCharacter::OnRoll(const FInputActionValue& Value)
{
    if (!bAlive || bRolling)
    {
        return;
    }

    bRolling = true;
    ApplyCapsuleHeight(RollingHalfHeight);

    // Slam down if airborne, then restore the capsule after the roll window.
    if (GetCharacterMovement() && GetCharacterMovement()->IsFalling())
    {
        LaunchCharacter(FVector(0.f, 0.f, -800.f), false, true);
    }

    GetWorldTimerManager().SetTimer(RollTimerHandle, this, &ASurferCharacter::EndRoll, RollDuration, false);
}

void ASurferCharacter::EndRoll()
{
    bRolling = false;
    ApplyCapsuleHeight(StandingHalfHeight);
}

void ASurferCharacter::ApplyCapsuleHeight(float NewHalfHeight)
{
    UCapsuleComponent* Capsule = GetCapsuleComponent();
    if (!Capsule)
    {
        return;
    }

    const float Radius = Capsule->GetUnscaledCapsuleRadius();
    Capsule->SetCapsuleSize(Radius, NewHalfHeight, true);
}

// ----------------------------------------------------------------------
// Run lifecycle
// ----------------------------------------------------------------------

void ASurferCharacter::StartRun()
{
    bAlive = true;
    LaneIndex = 1;
    HoverboardCharges = 0;
    bRolling = false;

    if (MovementComp)
    {
        // Convert custom gravity (uu/s^2) into the engine's GravityScale.
        MovementComp->GravityScale = CustomGravity / 980.f;
    }

    UE_LOG(LogSubbSurfers, Log, TEXT("Run started."));
}

void ASurferCharacter::EndRun()
{
    if (GetWorldTimerManager().IsTimerActive(RollTimerHandle))
    {
        GetWorldTimerManager().ClearTimer(RollTimerHandle);
    }

    UE_LOG(LogSubbSurfers, Log, TEXT("Run ended."));
}

void ASurferCharacter::GrantHoverboard()
{
    HoverboardCharges = 1;
}

void ASurferCharacter::HandleObstacleOverlap()
{
    if (!bAlive)
    {
        return;
    }

    if (HoverboardCharges > 0)
    {
        HoverboardCharges--;
        OnHoverboardBreak.Broadcast(HoverboardCharges);
        return;
    }

    Die();
}

void ASurferCharacter::Die()
{
    if (!bAlive)
    {
        return;
    }

    bAlive = false;

    if (AEndlessGameMode* GM = Cast<AEndlessGameMode>(GetWorld()->GetAuthGameMode()))
    {
        GM->NotifyPlayerDeath();
    }

    OnDeath.Broadcast();
}
