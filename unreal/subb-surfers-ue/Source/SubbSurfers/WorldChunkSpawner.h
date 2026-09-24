// Copyright SUBB SURFERS. All rights reserved.

#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Containers/Map.h"
#include "Templates/Pair.h"
#include "UObject/WeakObjectPtr.h"
#include "WorldChunkSpawner.generated.h"

/**
 * Streams an endless corridor of chunk actors along +X in front of the player:
 *  - keeps chunks spawned up to SpawnAheadDistance ahead of the player,
 *  - returns chunks further than DespawnBehindDistance behind to the pool,
 *  - each chunk class is spawned according to its weight.
 *
 * Chunks only need to expose their length via the ChunkLengthClass default or
 * a root scale; the spawner spaces them with the class' configured spacing.
 */
UCLASS()
class SUBBSURFERS_API AWorldChunkSpawner : public AActor
{
    GENERATED_BODY()

public:
    AWorldChunkSpawner();

    virtual void Tick(float DeltaSeconds) override;

    /** Clears active chunks and restarts streaming from the origin. */
    UFUNCTION(BlueprintCallable, Category="SubbSurfers|World")
    void ResetSpawner();

protected:
    virtual void BeginPlay() override;

    /** One entry in the weighted chunk table. */
    USTRUCT(BlueprintType)
    struct FWeightedChunk
    {
        GENERATED_BODY()

        /** Chunk actor class to spawn. */
        UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="SubbSurfers|Chunk")
        TSubclassOf<AActor> ChunkClass;

        /** Relative spawn probability. */
        UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="SubbSurfers|Chunk", meta=(ClampMin="0.0"))
        float Weight = 1.f;

        /** Approximate chunk length in uu along X (used to space spawns). */
        UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="SubbSurfers|Chunk", meta=(ClampMin="100.0"))
        float Length = 3000.f;
    };

    /** Weighted chunk classes to stream. */
    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="SubbSurfers|World")
    TArray<FWeightedChunk> ChunkClasses;

    /** Distance ahead of the player at which new chunks spawn (uu). */
    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="SubbSurfers|World", meta=(ClampMin="1000.0"))
    float SpawnAheadDistance = 12000.f;

    /** Distance behind the player at which chunks are recycled (uu). */
    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="SubbSurfers|World", meta=(ClampMin="500.0"))
    float DespawnBehindDistance = 3000.f;

    /** X where the first chunk spawns (relative to the spawner origin). */
    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="SubbSurfers|World")
    float StartSpawnX = 0.f;

    /** Tag identifying the player pawn (found via actor iteration). */
    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="SubbSurfers|World")
    FName PlayerTag = "Player";

private:
    struct FChunkPoolEntry
    {
        TSubclassOf<AActor> Class;
        float Length = 0.f;
    };

    AActor* AcquireChunk(int32 ClassIndex);
    void ReturnChunk(AActor* Chunk);
    int32 PickClassIndex() const;
    AActor* FindPlayer() const;

    /** Pooled, currently inactive chunks keyed by class index. */
    TMap<int32, TArray<TObjectPtr<AActor>>> Pools;

    /** Active chunks with the class index they belong to. */
    TArray<TPair<TObjectPtr<AActor>, int32>> ActiveChunks;

    /** X position where the next chunk will be placed. */
    float NextSpawnX = 0.f;

    /** Sum of all configured weights. */
    float TotalWeight = 0.f;

    /** Weak reference to the player pawn so we do not search every frame. */
    TWeakObjectPtr<AActor> CachedPlayer;
};
