import * as THREE from "three";
import { POWERUP_COLLECT_RADIUS } from "../Config";
import { weightedIndex } from "../utils";
import type { PowerUpType } from "../types";

/**
 * Floating power-up orbs — no crates, no cubes. Each pickup is a glowing
 * energy core inside a glass shell with a spinning metal ring, colour-coded
 * to the same palette the HUD chips use, so a player always knows what they
 * are grabbing at full sprint.
 */

interface PowerUp {
  holder: THREE.Group;
  core: THREE.Mesh;
  ring: THREE.Group;
  type: PowerUpType;
  x: number;
  y: number;
  z: number;
  spin: number;
  active: boolean;
}

const TYPE_WEIGHTS: Array<[PowerUpType, number]> = [
  ["magnet", 28],
  ["multiplier", 28],
  ["sneakers", 18],
  ["jetpack", 15],
  ["hoverboard", 11],
];

export function rollPowerUpType(): PowerUpType {
  return TYPE_WEIGHTS[weightedIndex(TYPE_WEIGHTS.map(([, w]) => w))][0];
}

/** Same hues as the HUD power-up chips — instant read. */
const TYPE_COLOR: Record<PowerUpType, number> = {
  magnet: 0xf4645c,
  jetpack: 0xff922b,
  multiplier: 0xffd43b,
  sneakers: 0x51cf66,
  hoverboard: 0x66d9e8,
};

export class PowerUpManager {
  readonly group = new THREE.Group();
  readonly active: PowerUp[] = [];

  private pool: PowerUp[] = [];
  private coreGeo = new THREE.SphereGeometry(0.21, 20, 16);
  private shellGeo = new THREE.SphereGeometry(0.3, 20, 16);
  private ringGeo = new THREE.TorusGeometry(0.42, 0.03, 10, 28);
  private ringGeo2 = new THREE.TorusGeometry(0.52, 0.018, 8, 28);
  private materials = new Map<PowerUpType, { core: THREE.MeshStandardMaterial; ring: THREE.MeshStandardMaterial }>();

  constructor(count = 6) {
    for (let i = 0; i < count; i++) {
      const holder = new THREE.Group();
      const core = new THREE.Mesh(this.coreGeo, new THREE.MeshStandardMaterial());
      core.castShadow = true;
      holder.add(core);
      const shell = new THREE.Mesh(
        this.shellGeo,
        new THREE.MeshPhysicalMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.16,
          roughness: 0.08,
          metalness: 0.1,
        }),
      );
      holder.add(shell);

      const ring = new THREE.Group();
      const r1 = new THREE.Mesh(this.ringGeo, new THREE.MeshStandardMaterial());
      r1.castShadow = false;
      ring.add(r1);
      const r2 = new THREE.Mesh(this.ringGeo2, new THREE.MeshStandardMaterial());
      r2.rotation.x = Math.PI / 2.4;
      r2.castShadow = false;
      ring.add(r2);
      ring.rotation.x = 0.5;
      holder.add(ring);

      holder.visible = false;
      this.group.add(holder);
      this.pool.push({ holder, core, ring, type: "magnet", x: 0, y: 0, z: 0, spin: 0, active: false });
    }
  }

  /** Core + ring materials per power-up type (cached). */
  private matsFor(type: PowerUpType): { core: THREE.MeshStandardMaterial; ring: THREE.MeshStandardMaterial } {
    let m = this.materials.get(type);
    if (!m) {
      const color = TYPE_COLOR[type];
      m = {
        core: new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.75,
          roughness: 0.3,
        }),
        ring: new THREE.MeshStandardMaterial({
          color: 0xe9ecef,
          roughness: 0.25,
          metalness: 0.85,
          emissive: color,
          emissiveIntensity: 0.22,
        }),
      };
      this.materials.set(type, m);
    }
    return m;
  }

  spawn(type: PowerUpType, x: number, y: number, z: number): void {
    const p = this.pool.pop();
    if (!p) return;
    p.type = type;
    p.active = true;
    p.x = x;
    p.y = y;
    p.z = z;
    p.spin = Math.random() * Math.PI * 2;

    const mats = this.matsFor(type);
    p.core.material = mats.core;
    for (const r of p.ring.children as THREE.Mesh[]) r.material = mats.ring;

    p.holder.visible = true;
    p.holder.position.set(x, y, z);
    this.active.push(p);
  }

  update(dt: number, player: { x: number; y: number; z: number }, onCollect: (t: PowerUpType) => void): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.spin += dt * 2.1;
      p.holder.position.y = p.y + Math.sin(p.spin * 1.5) * 0.13;
      p.ring.rotation.y = p.spin;
      p.ring.rotation.z = Math.sin(p.spin * 0.7) * 0.35;
      const pulse = 1 + Math.sin(p.spin * 2.3) * 0.06;
      p.core.scale.setScalar(pulse);

      const dist = Math.hypot(player.x - p.x, player.y + 0.9 - p.holder.position.y, player.z - p.z);
      if (dist < POWERUP_COLLECT_RADIUS + 0.35) {
        onCollect(p.type);
        p.active = false;
        p.holder.visible = false;
        this.active.splice(i, 1);
        this.pool.push(p);
      }
    }
  }

  cull(playerZ: number, behind: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      if (p.z > playerZ + behind) {
        p.active = false;
        p.holder.visible = false;
        this.active.splice(i, 1);
        this.pool.push(p);
      }
    }
  }

  reset(): void {
    while (this.active.length) {
      const p = this.active.pop() as PowerUp;
      p.active = false;
      p.holder.visible = false;
      this.pool.push(p);
    }
  }
}
