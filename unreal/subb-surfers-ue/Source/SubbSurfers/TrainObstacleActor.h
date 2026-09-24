// Copyright SUBB SURFERS. All rights reserved.

#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "TrainObstacleActor.generated.h"

class UBoxComponent;
class UStaticMeshComponent;

DECLARE_DYNAMIC_MULTICAST_DELEGATE(FTrainPlayerHitSignature);

/**
 * Train obstacle: static mesh root + trigger box. Optionally moves along the
 * -X axis (opposite to the player). Roof landings are tallied through
 * OnPlayerLandOnRoof; side overlaps through OnPlayerHit.
 */
UCLASS()
class SUBBSURFERS_API ATrainObstacleActor : public AActor
{
    GENERATED_BODY()

public:
    ATrainObstacleActor();

    virtual void Tick(float DeltaSeconds) override;

    /** Roof surface height above the actor pivot (uu). */
    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="SubbSurfers|Train")
    float RoofHeight = 300.f;

    /** Whether the train drives itself along -X. */
    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="SubbSurfers|Train")
    bool bMoving = false;

    /** Speed along -X in uu/s while bMoving is true. */
    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="SubbSurfers|Train", meta=(EditCondition="bMoving"))
    float MoveSpeed = 600.f;

    UPROPERTY(BlueprintAssignable, Category="SubbSurfers|Events")
    FTrainPlayerHitSignature OnPlayerHit;

    UPROPERTY(BlueprintAssignable, Category="SubbSurfers|Events")
    FTrainPlayerHitSignature OnPlayerLandOnRoof;

protected:
    virtual void BeginPlay() override;

    UFUNCTION()
    void HandleBeginOverlap(UPrimitiveComponent* OverlappedComponent,
                            AActor* OtherActor,
                            UPrimitiveComponent* OtherComp,
                            int32 OtherBodyIndex,
                            bool bFromSweep,
                            const FHitResult& SweepResult);

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="SubbSurfers|Components")
    TObjectPtr<UStaticMeshComponent> TrainMesh;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="SubbSurfers|Components")
    TObjectPtr<UBoxComponent> HitBox;
};
