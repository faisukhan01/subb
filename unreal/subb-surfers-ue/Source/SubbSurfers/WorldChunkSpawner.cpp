// Copyright SUBB SURFERS. All rights reserved.

#include "WorldChunkSpawner.h"

#include "GameFramework/Actor.h"
#include "UObject/ActorIterator.h"

AWorldChunkSpawner::AWorldChunkSpawner()
{
    PrimaryActorTick.bCanEverTick = true;
}

void AWorldChunkSpawner::BeginPlay()
{
    Super::BeginPlay();

    TotalWeight = 0.f;
    for (const FWeightedChunk& Entry : ChunkClasses)
    {
        if (Entry.ChunkClass)
        {
            TotalWeight += FMath::Max(0.f, Entry.Weight);
        }
    }

    NextSpawnX = StartSpawnX;
}

void AWorldChunkSpawner::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);

    const AActor* Player = FindPlayer();
    if (!Player || ChunkClasses.Num() == 0 || TotalWeight <= 0.f)
    {
        return;
    }

    const float PlayerX = Player->GetActorLocation().X;

    // --- Spawn ahead. ---
    while (NextSpawnX < PlayerX + SpawnAheadDistance)
    {
        const int32 Index = PickClassIndex();
        if (Index == INDEX_NONE)
        {
            break;
        }

        AActor* Chunk = AcquireChunk(Index);
        if (!Chunk)
        {
            break;
        }

        Chunk->SetActorLocation(FVector(NextSpawnX, GetActorLocation().Y, GetActorLocation().Z));
        Chunk->SetActorHiddenInGame(false);
        Chunk->SetActorTickEnabled(true);
        NextSpawnX += FMath::Max(500.f, ChunkClasses[Index].Length);
    }

    // --- Recycle behind. ---
    for (int32 i = ActiveChunks.Num() - 1; i >= 0; --i)
    {
        const AActor* Chunk = ActiveChunks[i].Key.Get();
        if (Chunk && Chunk->GetActorLocation().X < PlayerX - DespawnBehindDistance)
        {
            ReturnChunk(ActiveChunks[i].Key.Get());
            ActiveChunks.RemoveAt(i);
        }
    }
}

void AWorldChunkSpawner::ResetSpawner()
{
    for (const TPair<TObjectPtr<AActor>, int32>& Entry : ActiveChunks)
    {
        ReturnChunk(Entry.Key.Get());
    }

    ActiveChunks.Reset();
    NextSpawnX = StartSpawnX;
    CachedPlayer = nullptr;
}

AActor* AWorldChunkSpawner::AcquireChunk(int32 ClassIndex)
{
    if (!ChunkClasses.IsValidIndex(ClassIndex) || !ChunkClasses[ClassIndex].ChunkClass)
    {
        return nullptr;
    }

    // --- Pull from the pool first. ---
    if (TArray<TObjectPtr<AActor>>* Pool = Pools.Find(ClassIndex))
    {
        while (Pool->Num() > 0)
        {
            TObjectPtr<AActor> Pooled = Pool->Pop();
            if (IsValid(Pooled))
            {
                ActiveChunks.Emplace(Pooled, ClassIndex);
                return Pooled.Get();
            }
        }
    }

    // --- Pool empty: instantiate a fresh chunk. ---
    FActorSpawnParameters Params;
    Params.Owner = this;
    Params.SpawnCollisionHandlingOverride =
        ESpawnActorCollisionHandlingMethod::AlwaysSpawn;

    AActor* Chunk = GetWorld()->SpawnActor<AActor>(
        ChunkClasses[ClassIndex].ChunkClass,
        FVector(NextSpawnX, GetActorLocation().Y, GetActorLocation().Z),
        FRotator::ZeroRotator,
        Params);

    if (Chunk)
    {
        ActiveChunks.Emplace(Chunk, ClassIndex);
    }

    return Chunk;
}

void AWorldChunkSpawner::ReturnChunk(AActor* Chunk)
{
    if (!Chunk)
    {
        return;
    }

    Chunk->SetActorHiddenInGame(true);
    Chunk->SetActorTickEnabled(false);

    for (int32 i = 0; i < ChunkClasses.Num(); ++i)
    {
        if (Chunk->IsA(ChunkClasses[i].ChunkClass))
        {
            Pools.FindOrAdd(i).Add(Chunk);
            return;
        }
    }

    Chunk->Destroy();
}

int32 AWorldChunkSpawner::PickClassIndex() const
{
    if (ChunkClasses.Num() == 0 || TotalWeight <= 0.f)
    {
        return INDEX_NONE;
    }

    float Roll = FMath::FRand() * TotalWeight;
    for (int32 i = 0; i < ChunkClasses.Num(); ++i)
    {
        if (!ChunkClasses[i].ChunkClass)
        {
            continue;
        }

        Roll -= FMath::Max(0.f, ChunkClasses[i].Weight);
        if (Roll <= 0.f)
        {
            return i;
        }
    }

    // Floating point safety net: last valid entry.
    for (int32 i = ChunkClasses.Num() - 1; i >= 0; --i)
    {
        if (ChunkClasses[i].ChunkClass)
        {
            return i;
        }
    }

    return INDEX_NONE;
}

AActor* AWorldChunkSpawner::FindPlayer() const
{
    if (CachedPlayer.IsValid())
    {
        return CachedPlayer.Get();
    }

    for (TActorIterator<AActor> It(GetWorld()); It; ++It)
    {
        if (It->ActorHasTag(PlayerTag))
        {
            CachedPlayer = *It;
            return CachedPlayer.Get();
        }
    }

    return nullptr;
}
