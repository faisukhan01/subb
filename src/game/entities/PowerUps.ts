import * as THREE from "three";
import { POWERUP_COLLECT_RADIUS } from "../Config";
import { weightedIndex } from "../utils";
import { powerUpIconTexture } from "../textures";
import type { PowerUpType } from "../types";

/**
 * Floating power-up crates: bobbing, spinning, icon-textured boxes in a pool.
 */

interface PowerUp {
  mesh: THREE.Mesh;
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

export class PowerUpManager {
  readonly group = new THREE.Group();
  readonly active: PowerUp[] = [];

  private pool: PowerUp[] = [];
  private geo = new THREE.BoxGeometry(0.62, 0.62, 0.62);
  private materials = new Map<PowerUpType, THREE.MeshLambertMaterial>();
  private frameGeo = new THREE.BoxGeometry(0.72, 0.72, 0.72);

  constructor(count = 6) {
    const frameMat = new THREE.MeshLambertMaterial({ color: 0x495057, flatShading: true });
    for (let i = 0; i < count; i++) {
      const holder = new THREE.Group();
      const mesh = new THREE.Mesh(this.geo, new THREE.MeshLambertMaterial());
      mesh.castShadow = true;
      holder.add(mesh);
      const frame = new THREE.Mesh(this.frameGeo, frameMat);
      frame.scale.setScalar(1.04);
      holder.add(frame);
      holder.visible = false;
      this.group.add(holder);
      this.pool.push({ mesh, type: "magnet", x: 0, y: 0, z: 0, spin: 0, active: false });
      // Keep a reference from wrapper to holder via mesh.parent
      mesh.userData.holder = holder;
    }
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

    let mat = this.materials.get(type);
    if (!mat) {
      mat = new THREE.MeshLambertMaterial({ map: powerUpIconTexture(type) });
      this.materials.set(type, mat);
    }
    p.mesh.material = mat;

    const holder = p.mesh.userData.holder as THREE.Group;
    holder.visible = true;
    holder.position.set(x, y, z);
    this.active.push(p);
  }

  update(dt: number, player: { x: number; y: number; z: number }, onCollect: (t: PowerUpType) => void): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.spin += dt * 1.8;
      const holder = p.mesh.userData.holder as THREE.Group;
      holder.position.y = p.y + Math.sin(p.spin * 1.6) * 0.14;
      holder.rotation.y = p.spin;

      const dist = Math.hypot(player.x - p.x, player.y + 0.9 - holder.position.y, player.z - p.z);
      if (dist < POWERUP_COLLECT_RADIUS + 0.35) {
        onCollect(p.type);
        p.active = false;
        holder.visible = false;
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
        (p.mesh.userData.holder as THREE.Group).visible = false;
        this.active.splice(i, 1);
        this.pool.push(p);
      }
    }
  }

  reset(): void {
    while (this.active.length) {
      const p = this.active.pop() as PowerUp;
      p.active = false;
      (p.mesh.userData.holder as THREE.Group).visible = false;
      this.pool.push(p);
    }
  }
}
