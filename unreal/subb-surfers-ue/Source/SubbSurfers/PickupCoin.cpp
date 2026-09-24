// Copyright SUBB SURFERS. All rights reserved.

#include "PickupCoin.h"

#include "Components/SphereComponent.h"
#include "Components/StaticMeshComponent.h"
#include "GameFramework/Character.h"

APickupCoin::APickupCoin()
{
    PrimaryActorTick.bCanEverTick = true;

    CoinMesh = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("CoinMesh"));
    RootComponent = CoinMesh;
    CoinMesh->SetCollisionEnabled(ECollisionEnabled::NoCollision);

    PickupSphere = CreateDefaultSubobject<USphereComponent>(TEXT("PickupSphere"));
    PickupSphere->SetupAttachment(RootComponent);
    PickupSphere->InitSphereRadius(60.f);
    PickupSphere->SetCollisionEnabled(ECollisionEnabled::QueryOnly);
    PickupSphere->SetCollisionResponseToAllChannels(ECR_Ignore);
    PickupSphere->SetCollisionResponseToChannel(ECC_Pawn, ECR_Overlap);

    PickupSphere->OnComponentBeginOverlap.AddDynamic(this, &APickupCoin::HandleBeginOverlap);
}

void APickupCoin::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);

    // Spin around the vertical axis for that classic coin shimmer.
    if (bActive)
    {
        AddActorLocalRotation(FRotator(0.f, SpinSpeed * DeltaSeconds, 0.f));
    }
}

void APickupCoin::HandleBeginOverlap(UPrimitiveComponent* OverlappedComponent,
                                     AActor* OtherActor,
                                     UPrimitiveComponent* OtherComp,
                                     int32 OtherBodyIndex,
                                     bool bFromSweep,
                                     const FHitResult& SweepResult)
{
    if (!bActive || !Cast<ACharacter>(OtherActor))
    {
        return;
    }

    bActive = false;

    // Hide (do not destroy — the spawner pools and re-activates us).
    SetActorHiddenInGame(true);
    SetActorTickEnabled(false);
    PickupSphere->SetCollisionEnabled(ECollisionEnabled::NoCollision);

    OnCollected.Broadcast(this, ScoreValue);
}

void APickupCoin::ActivateCoin()
{
    bActive = true;
    SetActorHiddenInGame(false);
    SetActorTickEnabled(true);
    PickupSphere->SetCollisionEnabled(ECollisionEnabled::QueryOnly);
}
