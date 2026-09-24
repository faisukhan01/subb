import * as THREE from "three";
import {
  CAMERA_LOOK,
  CAMERA_OFFSET,
  CHARACTERS,
  FOV_BASE,
  FOV_SPEED_BOOST,
  JUMP_VELOCITY,
  MAX_COIN_BONUS,
  MISSIONS_PER_SET,
  MULTIPLIER_MAX,
  PLAYER_HALF_DEPTH,
  PLAYER_HALF_WIDTH,
  POWERUP_DURATIONS,
  SNEAKER_JUMP_MULT,
  SPEED_MAX,
  SPEED_RAMP,
  SPEED_START,
  TRAIN_HEIGHT,
  TRAIN_WIDTH,
  ZOE_MAGNET_BONUS,
  type CharacterPalette,
} from "./Config";
import { clamp, damp } from "./utils";
import { Player, type PlayerAction } from "./Player";
import { InputManager } from "./InputManager";
import { AudioManager } from "./AudioManager";
import { World } from "./world/World";
import { GuardManager } from "./entities/Guard";
import type {
  CharacterId,
  GameCallbacks,
  MissionState,
  PowerUpType,
  RunStats,
} from "./types";

type EnginePhase = "menu" | "running" | "paused" | "dying" | "over";

const POWERUP_ORDER: PowerUpType[] = ["magnet", "jetpack", "multiplier", "sneakers", "hoverboard"];

const MISSION_TEMPLATES: Array<{ kind: MissionState["kind"]; base: number; step: number; label: (n: number) => string }> = [
  { kind: "coins", base: 30, step: 12, label: (n) => `Collect ${n} coins` },
  { kind: "jumps", base: 12, step: 5, label: (n) => `Jump ${n} times` },
  { kind: "rolls", base: 8, step: 3, label: (n) => `Roll ${n} times` },
  { kind: "powerups", base: 2, step: 1, label: (n) => `Grab ${n} power-ups` },
];

/**
 * Top-level engine: render loop, simulation, collisions, powerups, missions,
 * camera, audio and the engine<->React callback boundary.
 */
export class Game {
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private lastFrameTime = 0;
  private world: World;
  private player: Player;
  private guard = new GuardManager();
  readonly audio = new AudioManager();
  private input: InputManager;
  private resizeObserver: ResizeObserver;
  private visibilityHandler = () => {
    if (document.hidden && this.phase === "running") this.callbacks.onPauseRequest();
  };

  private phase: EnginePhase = "menu";
  private palette: CharacterPalette = CHARACTERS[0];

  // Run state
  private speed = SPEED_START;
  private distance = 0;
  private score = 0;
  private coinCount = 0;
  private coinStreak = 0;
  private missionsCompleted = 0;
  private missions: MissionState[] = [];
  private powerTimers = new Map<PowerUpType, number>();
  private powerTotals = new Map<PowerUpType, number>();
  private invuln = 0;
  private skyCoinTimer = 0;
  private dieTimer = 0;
  private shake = 0;
  private hudTimer = 0;
  private menuTime = 0;
  private camX = 0;
  private camY = CAMERA_OFFSET.y;

  constructor(
    container: HTMLElement,
    private callbacks: GameCallbacks,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.display = "block";
    this.renderer.domElement.style.touchAction = "none";

    this.camera = new THREE.PerspectiveCamera(
      FOV_BASE,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      400,
    );

    this.world = new World({ onHorn: () => this.audio.jump() });
    this.world.scene.add(this.guard.group);
    this.player = new Player(this.palette);
    this.player.setMenuFacing(true);
    this.world.scene.add(this.player.root);

    // Pre-generate menu backdrop scenery
    this.world.reseed(0);
    this.world.update(0.016, 0, 0, 0, false);
    this.placeMenuCamera(0);

    this.input = new InputManager(
      container,
      (a) => this.handleAction(a),
      () => this.callbacks.onPauseRequest(),
    );

    this.resizeObserver = new ResizeObserver(() => this.resize(container));
    this.resizeObserver.observe(container);
    document.addEventListener("visibilitychange", this.visibilityHandler);

    this.renderer.setAnimationLoop(() => this.tick());
  }

  // ------------------------------------------------------------ public API

  start(character: CharacterId): void {
    this.audio.unlock();
    this.palette = CHARACTERS.find((c) => c.id === character) ?? CHARACTERS[0];
    this.player.setMenuFacing(false);
    this.player.reset(this.palette);
    this.world.reseed(0);
    this.speed = SPEED_START;
    this.distance = 0;
    this.score = 0;
    this.coinCount = 0;
    this.coinStreak = 0;
    this.missionsCompleted = 0;
    this.missions = this.makeMissionSet();
    this.powerTimers.clear();
    this.powerTotals.clear();
    this.invuln = 0;
    this.shake = 0;
    this.dieTimer = 0;
    this.guard.setHidden();
    this.phase = "running";
    this.input.setEnabled(true);
    this.guard.startIntro(0, 0);
    this.pushMissions();
    this.audio.startMusic();
  }

  pause(): void {
    if (this.phase !== "running") return;
    this.phase = "paused";
    this.input.setEnabled(false);
    this.audio.stopMusic();
  }

  resume(): void {
    if (this.phase !== "paused") return;
    this.phase = "running";
    this.input.setEnabled(true);
    this.audio.unlock();
    this.audio.startMusic();
  }

  /** Game-over → menu (keeps last frame pose as backdrop). */
  toMenu(): void {
    this.phase = "menu";
    this.input.setEnabled(false);
    this.guard.setHidden();
    this.player.setMenuFacing(true);
    this.menuTime = 0;
  }

  setMuted(muted: boolean): void {
    this.audio.setMuted(muted);
  }

  /** Swap the idle menu character without starting a run. */
  previewCharacter(character: CharacterId): void {
    this.palette = CHARACTERS.find((c) => c.id === character) ?? CHARACTERS[0];
    this.player.reset(this.palette);
    this.player.setMenuFacing(true);
    this.player.pos.set(0, 0, 0);
  }

  dispose(): void {
    this.renderer.setAnimationLoop(null);
    this.input.dispose();
    this.audio.dispose();
    this.resizeObserver.disconnect();
    document.removeEventListener("visibilitychange", this.visibilityHandler);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  // ------------------------------------------------------------- actions

  private handleAction(a: PlayerAction): void {
    if (this.phase !== "running") return;
    switch (a) {
      case "left":
        this.player.switchLane(-1);
        this.audio.swoosh();
        break;
      case "right":
        this.player.switchLane(1);
        this.audio.swoosh();
        break;
      case "jump":
        if (this.player.jump(this.currentJumpVelocity())) {
          this.audio.jump();
          this.addMissionProgress("jumps");
        }
        break;
      case "roll":
        this.player.roll();
        if (this.player.rolling > 0) {
          this.audio.roll();
          this.addMissionProgress("rolls");
        }
        break;
    }
  }

  private currentJumpVelocity(): number {
    const sneakers = (this.powerTimers.get("sneakers") ?? 0) > 0;
    return JUMP_VELOCITY * (sneakers ? SNEAKER_JUMP_MULT : 1);
  }

  // --------------------------------------------------------------- loop

  private tick(): void {
    const now = performance.now();
    const dt = this.lastFrameTime > 0 ? Math.min((now - this.lastFrameTime) / 1000, 0.05) : 0.016;
    this.lastFrameTime = now;

    if (this.phase === "running") this.simulate(dt);
    else if (this.phase === "dying") this.simulateDying(dt);
    else this.simulateIdle(dt);

    this.world.sparkles.update(dt);
    this.renderer.render(this.world.scene, this.camera);
  }

  private simulateIdle(dt: number): void {
    if (this.phase === "paused") return; // frozen frame
    this.menuTime += dt;
    const p = this.player;
    p.update(dt, 0, 0, () => undefined, () => undefined);
    this.world.update(dt * 0.2, 0, 0, 0, false);
    this.orbitMenuCamera();
  }

  private simulate(dt: number): void {
    // Difficulty & speed ramp
    this.speed = Math.min(SPEED_MAX, this.speed + SPEED_RAMP * dt);
    const speedNorm = clamp((this.speed - SPEED_START) / (SPEED_MAX - SPEED_START), 0, 1);
    const difficulty = speedNorm;

    // Forward motion
    this.player.pos.z -= this.speed * dt;
    this.distance += this.speed * dt;

    // Powerup timers
    this.tickPowerups(dt);

    // Vertical/lane simulation with train-roof support
    const support = this.world.supportHeightAt(this.player.x, this.player.z, this.player.pos.y);
    this.player.update(
      dt,
      speedNorm,
      support,
      (impact) => this.audio.land(),
      () => this.audio.roll(),
    );

    // World streaming + events
    this.world.update(dt, this.player.z, this.player.x, difficulty, true);

    // Sky coin trails while flying
    if (this.player.flying) {
      this.skyCoinTimer -= dt;
      if (this.skyCoinTimer <= 0) {
        this.skyCoinTimer = 1.1;
        this.world.spawnSkyCoins(this.player.z);
      }
    }

    // Score
    const mult = this.effectiveMultiplier();
    this.score += this.speed * dt * mult;

    // Collections & collisions
    this.collectPickups(dt);
    this.checkCollisions();
    if (this.invuln > 0) this.invuln -= dt;

    // Guard chase
    this.guard.update(dt, this.player.z, this.player.x, speedNorm, true);

    // Camera & light tracking
    this.followCamera(dt, speedNorm);
    this.world.trackLight(this.player.x, this.player.z);

    // HUD sync (throttled)
    this.hudTimer += dt;
    if (this.hudTimer > 0.08) {
      this.hudTimer = 0;
      this.callbacks.onStats({
        score: Math.floor(this.score),
        coins: Math.floor(this.coinCount),
        distance: Math.floor(this.distance),
        multiplier: mult,
      });
      this.callbacks.onPowerups(
        POWERUP_ORDER.filter((t) => (this.powerTimers.get(t) ?? 0) > 0).map((t) => ({
          type: t,
          remaining: this.powerTimers.get(t) as number,
          total: this.powerTotals.get(t) as number,
        })),
      );
    }
  }

  private simulateDying(dt: number): void {
    this.dieTimer += dt;
    this.player.update(dt, 0, this.player.pos.y, () => undefined, () => undefined);
    this.guard.update(dt, this.player.z, this.player.x, 0, false);
    this.followCamera(dt, 0);
    this.shake = Math.max(0, this.shake - dt * 1.4);
    if (this.dieTimer > 1.25 && this.phase === "dying") {
      this.phase = "over";
      this.input.setEnabled(false);
      this.callbacks.onGameOver({
        score: Math.floor(this.score),
        coins: Math.floor(this.coinCount),
        distance: Math.floor(this.distance),
        missionsCompleted: this.missionsCompleted,
        character: this.palette.id,
      });
    }
  }

  // ---------------------------------------------------------- pickups

  private collectPickups(dt: number): void {
    const p = this.player;
    const magnetOn = (this.powerTimers.get("magnet") ?? 0) > 0;

    this.world.coins.update(dt, p, magnetOn, () => {
      const maxBonus = this.palette.id === "max" ? MAX_COIN_BONUS : 1;
      this.coinCount += maxBonus;
      this.coinStreak = (this.coinStreak + 1) % 5;
      this.audio.coin(this.coinStreak);
      this.world.sparkles.burst(p.x, p.pos.y + 1, p.z, 3, 0xffd43b);
      this.callbacks.onCoinPop();
      this.addMissionProgress("coins");
    });

    this.world.powerUps.update(dt, p, (type) => this.activatePowerUp(type));
  }

  private activatePowerUp(type: PowerUpType): void {
    let duration = POWERUP_DURATIONS[type];
    if (type === "magnet" && this.palette.id === "zoe") duration *= ZOE_MAGNET_BONUS;
    this.powerTimers.set(type, duration);
    this.powerTotals.set(type, duration);
    this.audio.powerupJingle(type);
    this.world.sparkles.burst(this.player.x, this.player.pos.y + 1.1, this.player.z, 8, 0xffe066);
    this.addMissionProgress("powerups");

    if (type === "jetpack") {
      this.player.startJetpack();
      this.skyCoinTimer = 0;
    }
    if (type === "hoverboard") {
      this.player.attachBoard();
    }
  }

  private tickPowerups(dt: number): void {
    for (const [type, remaining] of this.powerTimers) {
      if (remaining <= 0) continue;
      const next = remaining - dt;
      if (next <= 0) {
        this.powerTimers.set(type, 0);
        if (type === "jetpack") {
          this.player.endJetpack();
          this.invuln = Math.max(this.invuln, 0.8); // landing grace
        }
        if (type === "hoverboard") this.player.detachBoard();
      } else {
        this.powerTimers.set(type, next);
      }
    }
  }

  // -------------------------------------------------------- collisions

  private checkCollisions(): void {
    const p = this.player;
    if (this.invuln > 0 || p.flying) return;
    const hb = p.hitbox();

    for (const o of this.world.obstacles.active) {
      if (Math.abs(o.z - p.z) > o.halfLen + PLAYER_HALF_DEPTH) continue;
      if (hb.yMax <= o.yMin + 0.02 || hb.yMin >= o.yMax - 0.02) continue;
      if (Math.abs(p.x - o.obj.position.x) > o.halfWidth + PLAYER_HALF_WIDTH) continue;
      this.crash();
      return;
    }

    for (const t of this.world.trains.active) {
      if (Math.abs(t.z - p.z) > t.halfLen + PLAYER_HALF_DEPTH) continue;
      if (Math.abs(p.x - t.obj.position.x) > TRAIN_WIDTH / 2 + PLAYER_HALF_WIDTH) continue;
      const roofY = TRAIN_HEIGHT + 0.28;
      if (p.pos.y >= roofY - 0.4) continue; // safely on/above the roof
      this.crash();
      return;
    }
  }

  private crash(): void {
    // Hoverboard absorbs one wipeout
    if ((this.powerTimers.get("hoverboard") ?? 0) > 0) {
      this.powerTimers.set("hoverboard", 0);
      this.player.detachBoard();
      this.invuln = 1.25;
      this.audio.boardBreak();
      this.world.sparkles.burst(this.player.x, 0.5, this.player.z, 10, 0x7048e8);
      this.shake = 0.35;
      return;
    }
    if (this.invuln > 0) return;

    this.phase = "dying";
    this.dieTimer = 0;
    this.shake = 0.7;
    this.input.setEnabled(false);
    this.audio.crash();
    this.audio.gameOver();
    this.audio.stopMusic();
    this.world.sparkles.burst(this.player.x, 0.9, this.player.z, 12, 0xff6b6b);
    this.guard.startCatch();
  }

  // ---------------------------------------------------------- missions

  private makeMissionSet(): MissionState[] {
    // Three DISTINCT kinds per set — no duplicate objectives.
    const shuffled = [...MISSION_TEMPLATES].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, MISSIONS_PER_SET).map((tpl, i) => {
      const target = tpl.base + tpl.step * i;
      return { kind: tpl.kind, target, progress: 0, done: false, label: tpl.label(target) };
    });
  }

  private makeMission(level: number): MissionState {
    const tpl = MISSION_TEMPLATES[Math.floor(Math.random() * MISSION_TEMPLATES.length)];
    const target = tpl.base + tpl.step * level;
    return { kind: tpl.kind, target, progress: 0, done: false, label: tpl.label(target) };
  }

  private addMissionProgress(kind: MissionState["kind"], n = 1): void {
    for (let i = 0; i < this.missions.length; i++) {
      const m = this.missions[i];
      if (m.kind !== kind || m.done) continue;
      m.progress = Math.min(m.target, m.progress + n);
      if (m.progress >= m.target) {
        m.done = true;
        this.missionsCompleted += 1;
        this.audio.mission();
        this.callbacks.onMissionComplete(m.label, this.effectiveMultiplier());
        // Chain a fresh, harder mission in its slot
        this.missions[i] = this.makeMission(this.missionsCompleted);
      }
    }
    this.pushMissions();
  }

  private pushMissions(): void {
    this.callbacks.onMissions(this.missions.map((m) => ({ ...m })));
  }

  private effectiveMultiplier(): number {
    const base = Math.min(MULTIPLIER_MAX, 1 + this.missionsCompleted);
    const x2 = (this.powerTimers.get("multiplier") ?? 0) > 0;
    return x2 ? base * 2 : base;
  }

  // ------------------------------------------------------------ camera

  private followCamera(dt: number, speedNorm: number): void {
    const p = this.player;
    const targetX = p.x * 0.52;
    const targetY = CAMERA_OFFSET.y + Math.max(0, p.pos.y - 1) * 0.35;
    this.camX = damp(this.camX, targetX, 6, dt);
    this.camY = damp(this.camY, targetY, 5, dt);

    const shakeX = this.shake > 0 ? (Math.random() - 0.5) * this.shake * 0.7 : 0;
    const shakeY = this.shake > 0 ? (Math.random() - 0.5) * this.shake * 0.5 : 0;
    if (this.shake > 0 && this.phase === "running") this.shake = Math.max(0, this.shake - dt * 1.4);

    this.camera.position.set(
      this.camX + shakeX,
      this.camY + shakeY,
      p.z + CAMERA_OFFSET.z,
    );
    this.camera.lookAt(
      p.x * 0.72,
      CAMERA_LOOK.y + Math.max(0, p.pos.y - 1) * 0.5,
      p.z + CAMERA_LOOK.z,
    );
    const targetFov = FOV_BASE + speedNorm * FOV_SPEED_BOOST;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = damp(this.camera.fov, targetFov, 3, dt);
      this.camera.updateProjectionMatrix();
    }
  }

  private orbitMenuCamera(): void {
    // Slow cinematic orbit — low hero angle, gentle float.
    // On wide screens the runner is framed fully clear of the roster cards
    // (right of center); centered on portrait.
    const a = Math.sin(this.menuTime * 0.14) * 0.55 + 0.35;
    const r = 5.1;
    const wide = this.camera.aspect > 1.05;
    const pan = wide ? -2.35 : 0;
    this.camera.position.set(
      Math.sin(a) * r,
      1.8 + Math.sin(this.menuTime * 0.4) * 0.15,
      Math.cos(a) * r,
    );
    this.camera.lookAt(pan, wide ? 1.0 : 1.15, 0);
    if (Math.abs(this.camera.fov - FOV_BASE) > 0.05) {
      this.camera.fov = damp(this.camera.fov, FOV_BASE, 4, 0.016);
      this.camera.updateProjectionMatrix();
    }
  }

  private placeMenuCamera(_t: number): void {
    const wide = this.camera.aspect > 1.05;
    this.camera.position.set(Math.sin(0.35) * 5.1, 1.8, Math.cos(0.35) * 5.1);
    this.camera.lookAt(wide ? -2.35 : 0, wide ? 1.0 : 1.15, 0);
  }

  // ------------------------------------------------------------- resize

  private resize(container: HTMLElement): void {
    const w = container.clientWidth;
    const h = Math.max(1, container.clientHeight);
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
}
