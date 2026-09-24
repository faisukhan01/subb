# SUBB SURFERS — Unreal Engine 5.4 C++ project

The 3-lane endless runner as a UE 5.4 C++ source project. The repo ships the
`.uproject`, `Source/` and minimal `Config/` only — `Binaries/`,
`Intermediate/`, `DerivedDataCache/` etc. are gitignored and regenerated.

## Project layout

| Path | What it is |
| ---- | ---------- |
| `SubbSurfers.uproject` | Project descriptor (Engine 5.4, `SubbSurfers` runtime module) |
| `Source/SubbSurfers/SurferCharacter.*` | `ACharacter` runner: Enhanced Input (lane axis / jump / roll), lane lerp in Tick, roll capsule shrink on a timer, hoverboard absorbs one hit |
| `Source/SubbSurfers/TrainObstacleActor.*` | Moving train obstacle (mesh root + trigger box, `-X` movement, roof-landing vs side-hit events) |
| `Source/SubbSurfers/PickupCoin.*` | Spinning coin with overlap pickup + pooling-friendly `ActivateCoin()` |
| `Source/SubbSurfers/WorldChunkSpawner.*` | Weighted chunk streaming with actor pooling, spawn/despawn by player distance |
| `Source/SubbSurfers/EndlessGameMode.*` | `AGameModeBase` with the 1200→3000 uu/s speed ramp, distance-based score in Tick, `RestartGame()` |
| `Config/DefaultEngine.ini` | Default game mode + mobile/scalable targeting |
| `Config/DefaultInput.ini` | Enhanced Input default classes |

## Opening & building

1. Install **Unreal Engine 5.4** (Epic Games Launcher or a source build).
2. Right-click `SubbSurfers.uproject` → **Generate Visual Studio project files**
   (Windows) or run the editor once — it regenerates and asks to build.
3. Open the `.uproject` (editor builds the module on launch), or build from an IDE:
   * **Rider / Visual Studio**: open the generated `.sln`, pick the
     `SubbSurfersEditor` (Development Editor, Win64) configuration, build, then F5.
   * **CLI**:
     ```sh
     # Windows
     "C:\Program Files\Epic Games\UE_5.4\Engine\Build\BatchFiles\Build.bat" ^
       SubbSurfersEditor Win64 Development -project="…\unreal\subb-surfers-ue\SubbSurfers.uproject" -WaitMutex
     ```
4. On first launch the editor creates content folders; assign the gameplay map
   in `Project Settings → Maps & Modes` (DefaultEngine.ini already points the
   default GameMode at `AEndlessGameMode`).

## Input mapping (Enhanced Input)

Create the assets in `Content/Input/` and assign them to
`ASurferCharacter::DefaultMappingContext` in the character Blueprint:

| Action | Input Mapping Context entry | Behaviour |
| ------ | --------------------------- | --------- |
| `IA_MoveLane` | Axis: **A / Left Arrow** → −1, **D / Right Arrow** → +1 | `OnMoveLane` clamps `LaneIndex` to 0–2; Tick lerps Y position |
| `IA_Jump` | Pressed: **Space / W / Up Arrow** | `LaunchCharacter` with `JumpVelocity` (custom gravity via `GravityScale`) |
| `IA_Roll` | Pressed: **S / Down Arrow / Left Ctrl** | Shrinks the capsule half-height for `RollDuration`, slams down if airborne |

Touch swipes can be added later as additional mappings in the same context.

## Gameplay wiring checklist

1. **GameMode** — `EndlessGameMode` is the default GameMode; its Tick ramps
   speed and accumulates score, and `OnScoreChanged` / `OnRunEnded` drive UMG.
2. **Character** — place a `SurferCharacter` Blueprint, tag it `Player`.
3. **World** — add `WorldChunkSpawner` to the map, fill `ChunkClasses`
   (class + weight + length). Chunks are pooled automatically.
4. **Obstacles / coins** — Blueprint `TrainObstacleActor` (assign a mesh) and
   `PickupCoin` (assign a mesh); bind `OnPlayerHit` →
   `SurferCharacter.HandleObstacleOverlap`, `OnCollected` →
   `EndlessGameMode.AddScore`.
5. **Death** — `SurferCharacter.OnDeath` already notifies the GameMode, which
   broadcasts `OnRunEnded`; hook your game-over widget and `RestartGame()`.
