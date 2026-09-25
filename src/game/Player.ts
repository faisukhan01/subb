import * as THREE from "three";
import {
  GRAVITY,
  JETPACK_HEIGHT,
  JETPACK_RISE,
  LANE_SWITCH_SMOOTH,
  LANE_X,
  PLAYER_HALF_DEPTH,
  PLAYER_HALF_WIDTH,
  PLAYER_HEIGHT,
  REX_JUMP_BONUS,
  ROLL_DURATION,
  ROLL_HEIGHT,
  type CharacterPalette,
} from "./Config";
import { CharacterAnimator, buildCharacter, type RigMode } from "./CharacterRig";
import { clamp, damp } from "./utils";

/**
 * Player controller: lane switching with lean, jump/roll physics, train-roof
 * landing support, hoverboard & jetpack attachments. Feet-based position —
 * `pos.y` is the ground contact height (0 = track, 3.33 = train roof).
 */

export type PlayerAction = "left" | "right" | "jump" | "roll";

export class Player {
  readonly root = new THREE.Group();
  pos = new THREE.Vector3(0, 0, 0);
  vy = 0;
  lane = 1;
  grounded = true;
  rolling = 0;
  flying = false;
  queuedRoll = false;
  coyote = 0;

  private rig = buildCharacter(this.palette);
  private animator = new CharacterAnimator(this.rig);
  private menuFacing = false;
  private board: THREE.Group | null = null;
  private jetpack: THREE.Group | null = null;
  private flame: THREE.Mesh | null = null;
  private lean = 0;
  private lastLandVy = 0;

  constructor(private palette: CharacterPalette) {
    this.rig.root.rotation.y = Math.PI; // rig is authored facing +z; runner faces −z
    this.root.add(this.rig.root);
  }

  get x(): number {
    return this.pos.x;
  }

  get y(): number {
    return this.pos.y;
  }

  get z(): number {
    return this.pos.z;
  }

  /** Current collision height of the player capsule. */
  get height(): number {
    return this.rolling > 0 ? ROLL_HEIGHT : PLAYER_HEIGHT;
  }

  /** Face the menu camera (+z) in menus; face forward (−z) while running. */
  setMenuFacing(v: boolean): void {
    this.menuFacing = v;
    this.root.rotation.y = v ? Math.PI : 0;
  }

  reset(palette?: CharacterPalette): void {
    if (palette && palette.id !== this.palette.id) {
      this.palette = palette;
      this.root.remove(this.rig.root);
      this.rig = buildCharacter(palette);
      this.rig.root.rotation.y = Math.PI;
      this.root.add(this.rig.root);
      this.animator = new CharacterAnimator(this.rig);
    }
    this.pos.set(0, 0, 0);
    this.vy = 0;
    this.lane = 1;
    this.grounded = true;
    this.rolling = 0;
    this.flying = false;
    this.queuedRoll = false;
    this.lean = 0;
    this.root.rotation.y = this.menuFacing ? Math.PI : 0;
    this.root.position.copy(this.pos);
    this.detachBoard();
    this.detachJetpack();
    this.animator.setMode("idle");
  }

  // ------------------------------------------------------------- actions

  switchLane(dir: -1 | 1): void {
    const next = clamp(this.lane + dir, 0, 2);
    if (next !== this.lane) this.lane = next;
  }

  jumpVelMult(): number {
    return this.palette.id === "rex" ? REX_JUMP_BONUS : 1;
  }

  jump(jumpVelocity: number): boolean {
    if (this.flying) return false;
    if (!this.grounded && this.coyote <= 0) return false;
    this.vy = jumpVelocity * this.jumpVelMult();
    this.grounded = false;
    this.coyote = 0;
    this.rolling = 0;
    this.animator.setMode("jump");
    return true;
  }

  roll(): void {
    if (this.flying) return;
    if (!this.grounded) {
      // Air-slam: cancel upward motion and queue a roll on landing.
      this.vy = Math.min(this.vy, -24);
      this.queuedRoll = true;
      return;
    }
    this.rolling = ROLL_DURATION;
    this.animator.setMode("roll");
  }

  // ---------------------------------------------------------- attachments

  attachBoard(): void {
    if (this.board) return;
    const g = new THREE.Group();
    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(0.52, 0.09, 1.15),
      new THREE.MeshLambertMaterial({ color: 0xff922b, flatShading: true }),
    );
    deck.castShadow = true;
    g.add(deck);
    const glow = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.05, 0.9),
      new THREE.MeshLambertMaterial({ color: 0xffe066, emissive: 0xcf8a00 }),
    );
    glow.position.y = -0.07;
    g.add(glow);
    g.position.y = 0.1;
    this.board = g;
    this.root.add(g);
  }

  detachBoard(): void {
    if (!this.board) return;
    this.root.remove(this.board);
    this.board.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    });
    this.board = null;
  }

  get hasBoard(): boolean {
    return this.board !== null;
  }

  attachJetpack(): void {
    if (this.jetpack) return;
    const g = new THREE.Group();
    const metal = new THREE.MeshLambertMaterial({ color: 0x8d99ae, flatShading: true });
    for (const sx of [-0.13, 0.13]) {
      const tank = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.3, 4, 8), metal);
      tank.position.set(sx, 0.32, -0.24);
      g.add(tank);
      const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.1, 8), metal);
      nozzle.rotation.x = Math.PI;
      nozzle.position.set(sx, 0.1, -0.24);
      g.add(nozzle);
    }
    this.flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.11, 0.55, 8),
      new THREE.MeshLambertMaterial({
        color: 0xffa94d,
        emissive: 0xff7b00,
        transparent: true,
        opacity: 0.9,
      }),
    );
    this.flame.rotation.x = Math.PI;
    this.flame.position.set(0, -0.2, -0.24);
    g.add(this.flame);
    this.jetpack = g;
    this.rig.torso.add(g);
  }

  detachJetpack(): void {
    if (!this.jetpack) return;
    this.rig.torso.remove(this.jetpack);
    this.jetpack.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    });
    this.jetpack = null;
    this.flame = null;
  }

  startJetpack(): void {
    this.flying = true;
    this.rolling = 0;
    this.attachJetpack();
  }

  endJetpack(): void {
    this.flying = false;
    this.detachJetpack();
  }

  // -------------------------------------------------------------- update

  /**
   * @param supportHeight ground/train-roof height under the player
   * @param speedNorm normalized run speed 0..1 (drives animation tempo)
   */
  update(
    dt: number,
    speedNorm: number,
    supportHeight: number,
    onLand: (impact: number) => void,
    onRollStart: () => void,
  ): void {
    // Lane smoothing + body lean
    const targetX = LANE_X[this.lane];
    this.pos.x = damp(this.pos.x, targetX, LANE_SWITCH_SMOOTH, dt);
    const leanTarget = clamp((this.pos.x - targetX) * 0.55, -0.42, 0.42);
    this.lean = damp(this.lean, leanTarget, 10, dt);
    this.rig.root.rotation.z = -this.lean;

    if (this.rolling > 0) {
      this.rolling = Math.max(0, this.rolling - dt);
      // Forward flip progress over the roll duration (animator owns the spin)
      this.animator.setRollProgress(1 - this.rolling / ROLL_DURATION);
      if (this.rolling === 0) this.animator.setRollProgress(0);
    }

    if (this.flying) {
      // Rise to cruise altitude, hover there
      const targetY = JETPACK_HEIGHT;
      this.pos.y = damp(this.pos.y, targetY, 3.2, dt);
      this.vy = 0;
      this.grounded = false;
      if (this.flame) {
        const s = 0.8 + Math.sin(performance.now() * 0.045) * 0.25;
        this.flame.scale.set(1, s, 1);
      }
    } else {
      // Gravity + vertical integration with train-roof support.
      // The support surface only "catches" the player when they come from
      // above it — running into a train flank leaves you falling (and the
      // collision solver turns that into a wipeout).
      const prevY = this.pos.y;
      this.vy -= GRAVITY * dt;
      this.pos.y += this.vy * dt;
      const wasGrounded = this.grounded;
      this.grounded = false;

      if (this.pos.y <= supportHeight && this.vy <= 0 && prevY >= supportHeight - 0.06) {
        const impact = -this.vy;
        this.pos.y = supportHeight;
        this.vy = 0;
        this.grounded = true;
        this.coyote = 0.09;
        if (!wasGrounded && impact > 3) onLand(impact);
        if (this.queuedRoll) {
          this.queuedRoll = false;
          this.rolling = ROLL_DURATION;
          this.animator.setMode("roll");
          onRollStart();
        }
      } else if (this.pos.y > supportHeight) {
        this.coyote = Math.max(0, this.coyote - dt);
      }
    }

    // Fell off a train roof into the pit? Ground is always at 0 below, so
    // supportHeight handles the drop naturally.

    // Animation state resolution
    if (!this.flying) {
      let mode: RigMode;
      if (this.rolling > 0) mode = "roll";
      else if (this.grounded) mode = speedNorm > 0.02 ? "run" : "idle";
      else mode = this.vy > 1.5 ? "jump" : "jump"; // fall reuses tuck pose
      if (this.hasBoard && this.grounded && this.rolling <= 0) mode = "board";
      this.animator.setMode(mode);
    } else {
      this.animator.setMode("fly");
    }

    this.animator.update(dt, speedNorm);
    this.root.position.copy(this.pos);
    if (this.board) this.board.visible = this.grounded && this.rolling <= 0;
  }

  /** AABB extents for the collision solver (world space). */
  hitbox(): { xMin: number; xMax: number; yMin: number; yMax: number; zMin: number; zMax: number } {
    return {
      xMin: this.pos.x - PLAYER_HALF_WIDTH,
      xMax: this.pos.x + PLAYER_HALF_WIDTH,
      yMin: this.pos.y,
      yMax: this.pos.y + this.height,
      zMin: this.pos.z - PLAYER_HALF_DEPTH,
      zMax: this.pos.z + PLAYER_HALF_DEPTH,
    };
  }

  get paletteId(): string {
    return this.palette.id;
  }
}
