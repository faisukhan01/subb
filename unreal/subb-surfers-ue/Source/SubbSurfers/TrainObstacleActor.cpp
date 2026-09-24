// Copyright SUBB SURFERS. All rights reserved.

#include "TrainObstacleActor.h"

#include "Components/BoxComponent.h"
#include "Components/StaticMeshComponent.h"
#include "GameFramework/Character.h"

ATrainObstacleActor::ATrainObstacleActor()
{
    PrimaryActorTick.bCanEverTick = true;

    // Static mesh is the root so moving the actor moves everything with it.
    TrainMesh = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("TrainMesh"));
    RootComponent = TrainMesh;
    TrainMesh->SetCollisionEnabled(ECollisionEnabled::QueryAndPhysics);
    TrainMesh->SetCollisionResponseToAllChannels(ECR_Block);

    // Slightly oversized trigger box for forgiving side-hit / roof-landing tests.
    HitBox = CreateDefaultSubobject<UBoxComponent>(TEXT("HitBox"));
    HitBox->SetupAttachment(RootComponent);
    HitBox->InitBoxExtent(FVector(140.f, 120.f, 160.f));
    HitBox->SetRelativeLocation(FVector(0.f, 0.f, 160.f));
    HitBox->SetCollisionEnabled(ECollisionEnabled::QueryOnly);
    HitBox->SetCollisionResponseToAllChannels(ECR_Ignore);
    HitBox->SetCollisionResponseToChannel(ECC_Pawn, ECR_Overlap);

    HitBox->OnComponentBeginOverlap.AddDynamic(this, &ATrainObstacleActor::HandleBeginOverlap);
}

void ATrainObstacleActor::BeginPlay()
{
    Super::BeginPlay();
}

void ATrainObstacleActor::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);

    if (bMoving)
    {
        // Trains drive along -X, i.e. against the player's +X run direction.
        AddActorWorldOffset(FVector(-MoveSpeed * DeltaSeconds, 0.f, 0.f), true);
    }
}

void ATrainObstacleActor::HandleBeginOverlap(UPrimitiveComponent* OverlappedComponent,
                                             AActor* OtherActor,
                                             UPrimitiveComponent* OtherComp,
                                             int32 OtherBodyIndex,
                                             bool bFromSweep,
                                             const FHitResult& SweepResult)
{
    ACharacter* Character = Cast<ACharacter>(OtherActor);
    if (!Character)
    {
        return;
    }

    const FVector PlayerLocation = Character->GetActorLocation();
    const float RoofWorldZ = GetActorLocation().Z + RoofHeight;

    if (PlayerLocation.Z >= RoofWorldZ - 50.f)
    {
        // Landed on the roof — not a crash.
        OnPlayerLandOnRoof.Broadcast();
        return;
    }

    // Side hit — lethal (the character's hoverboard logic lives in ASurferCharacter).
    OnPlayerHit.Broadcast();
}
