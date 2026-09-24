// Copyright SUBB SURFERS. All rights reserved.

#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "PickupCoin.generated.h"

class USphereComponent;
class UStaticMeshComponent;

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FCoinCollectedSignature, APickupCoin*, Coin, int32, Value);

/**
 * Spinning coin pickup. Overlap with a pawn raises OnCollected (the game mode
 * listens and accumulates the score) and hides the coin until the chunk
 * spawner recycles it via ActivateCoin().
 */
UCLASS()
class SUBBSURFERS_API APickupCoin : public AActor
{
    GENERATED_BODY()

public:
    APickupCoin();

    virtual void Tick(float DeltaSeconds) override;

    /** Score awarded on pickup. */
    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="SubbSurfers|Coin")
    int32 ScoreValue = 10;

    /** Visual spin rate in degrees per second. */
    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="SubbSurfers|Coin")
    float SpinSpeed = 240.f;

    /** Raised when a pawn collects this coin. */
    UPROPERTY(BlueprintAssignable, Category="SubbSurfers|Events")
    FCoinCollectedSignature OnCollected;

    /** Re-enables the coin after pooling. */
    UFUNCTION(BlueprintCallable, Category="SubbSurfers|Coin")
    void ActivateCoin();

    /** True while the coin is waiting to be picked up. */
    UFUNCTION(BlueprintPure, Category="SubbSurfers|Coin")
    bool IsActive() const { return bActive; }

protected:
    UFUNCTION()
    void HandleBeginOverlap(UPrimitiveComponent* OverlappedComponent,
                            AActor* OtherActor,
                            UPrimitiveComponent* OtherComp,
                            int32 OtherBodyIndex,
                            bool bFromSweep,
                            const FHitResult& SweepResult);

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="SubbSurfers|Components")
    TObjectPtr<UStaticMeshComponent> CoinMesh;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="SubbSurfers|Components")
    TObjectPtr<USphereComponent> PickupSphere;

private:
    bool bActive = true;
};
