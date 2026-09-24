# SUBB SURFERS — Unity client (2022.3 LTS)

The Unity port of the 3-lane endless runner. The repository ships **source
only** (`Assets/Scripts/`, `Packages/manifest.json`, `ProjectSettings/ProjectVersion.txt`)
— Unity-generated `Library/`, `Temp/` etc. are gitignored.

## Opening the project

1. Install **Unity 2022.3.52f1** through Unity Hub (the exact version is pinned
   in `ProjectSettings/ProjectVersion.txt`).
2. Unity Hub → `Open → Add project from disk` → select this folder
   (`unity/subb-surfers-unity`).
3. Let Unity import/compile — the Input System package (1.7.0) and
   TextMeshPro (3.0.9) resolve from `Packages/manifest.json`.
   When asked, allow Unity to enable the **new Input System backend**
   (a restart of the editor is required).

## Scene setup

1. **Bootstrap scene** (`Assets/Scenes/MainMenu.unity`, add to Build Profiles):
   * Empty GameObject `GameBootstrap` → add `GameBootstrap` (Core).
   * Canvas with `MainMenuController` (UI) + buttons:
     `playButton`, `pauseButton`, `resumeButton`, `characterSelectButton`
     (+ `TMP_Text characterLabel`).
2. **Gameplay scene** (`Assets/Scenes/Gameplay.unity`):
   * `Player` GameObject: `CharacterController` + `PlayerController`
     + `CharacterAnimator` (+ `Animator` with parameters
     `Speed` (float), `Grounded` (bool), `Dead` (bool), `Jump`/`Roll` triggers).
     Tag the object `Player`.
   * Empty `World` GameObject → add `EndlessWorldSpawner`; assign chunk prefabs
     with weights.
   * Camera → add `CameraFollow`, assign the player as target.
   * HUD canvas → `HudController`: score/coins/multiplier `TMP_Text` labels,
     per-power-up bars (`root` GameObject + `Image` fill), game-over panel +
     summary label.
   * Systems GameObject → `ScoreSystem`, `PowerUpSystem`, `MissionSystem`.

## Making prefabs from the scripts

* **Chunk prefab** — empty root with `Chunk` (World), `localZLength` matching
  the visual slice (e.g. 30), child `BoxCollider`s/`StaticMesh`s for track
  decor, empty `Transform` children assigned into `laneSpawnAnchors`.
  Optionally assign `coinPrefab` / `powerUpPrefab` so anchors auto-populate.
* **Train prefab** — mesh + `TrainObstacle` (World) with a `BoxCollider`
  (isTrigger **off**, so roof landings produce collision contacts);
  optional `Light` child assigned to `headlight`.
* **Low barrier / Blockade prefabs** — mesh + `LowBarrier` / `Blockade`
  (World) with the trigger `BoxCollider` (created/configured on `Reset()`).
* **Coin prefab** — mesh + `Coin` (Pickups) with a trigger sphere collider.
* **PowerUp prefab** — mesh + `PowerUp` (Pickups) with a trigger collider and
  the `type` set (Magnet / Jetpack / Multiplier / Sneakers / Hoverboard).

Drag each configured object into `Assets/Prefabs/`, then reference the prefabs
from `EndlessWorldSpawner.chunkPrefabs` and `Chunk.coinPrefab/powerUpPrefab`.

## Gameplay scripts map

| Script | Responsibility |
| ------ | -------------- |
| `Core/GameBootstrap` | Singleton state machine (Menu/Running/Paused/GameOver), speed ramp, lazy scene loader |
| `Player/PlayerController` | 3-lane movement, jump/roll, hoverboard = one free crash |
| `Player/CharacterAnimator` | Events → Animator parameters |
| `World/EndlessWorldSpawner` | Weighted pooled chunk streaming (120 m ahead / 30 m behind) |
| `World/Chunk` | Slice definition, lane anchors, `OnSpawn(difficulty)` |
| `World/TrainObstacle` | Roof height 3, moving trains, roof-landing event |
| `World/LowBarrier` / `Blockade` | Roll-under / jump-over obstacles |
| `Pickups/Coin` | Spinning, magnet homing, static pool, `CoinCollected(int)` |
| `Pickups/PowerUp` | 5 power-up types, `PowerUpCollected(PowerUpType)` |
| `Systems/ScoreSystem` | distance × multiplier (mission-grown, cap 5) + x2 powerup |
| `Systems/PowerUpSystem` | Per-type coroutine timers, effect application |
| `Systems/MissionSystem` | Runtime-generated missions per run |
| `Input/InputService` | Input System bindings + swipe detection |
| `Cameras/CameraFollow` | SmoothDamp chase cam, speed-based FOV |
| `UI/HudController` / `MainMenuController` | TMP HUD & menu wiring |

## GameCI notes

`.github/workflows/ci.yml` builds the project with
[game-ci/unity-builder@v4](https://game.ci/docs/github/unity-builder) on every
push. That job needs activation secrets set once in the repo
(`Settings → Secrets and variables → Actions`):

| Secret | Meaning |
| ------ | ------- |
| `UNITY_LICENSE` | Contents of a Personal `.ulf` licence file |
| `UNITY_EMAIL` / `UNITY_PASSWORD` | Unity account used for manual activation |
| `UNITY_TARGET_PLATFORM` | Build target, e.g. `WebGL`, `Android`, `StandaloneWindows64` |

To create the licence file locally:
`docker run -it --rm -v "$(pwd):/root" unityci/editor:ubuntu-2022.3.52f1-linux-il2cpp -createManualActivationFile`,
then activate at license.unity3d.com and convert with `-manualLicenseFile`.
The CI job is `continue-on-error: true` until those secrets exist.
