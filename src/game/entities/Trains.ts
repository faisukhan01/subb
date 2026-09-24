import * as THREE from "three";
import {
  COLORS,
  ONCOMING_TRAIN_SPEED,
  TRAIN_HEIGHT,
  TRAIN_WIDTH,
} from "../Config";
import { pick, randRange } from "../utils";
import { trainFrontTexture, trainSideTexture } from "../textures";

/**
 * Train streaming with pooled bodies. Roof of every train is walkable
 * (roof y = TRAIN_HEIGHT); oncoming "moving" trains travel toward the
 * player at their own speed with headlight glow.
 */

export interface Train {
  obj: THREE.Group;
  lane: number;
  z: number; // center
  halfLen: number;
  moving: boolean;
  speed: number; // +z world speed when moving
  active: boolean;
}

// Length buckets keep side-texture repeat values cacheable.
const LENGTHS = [14, 18, 22] as const;

export class TrainManager {
  readonly group = new THREE.Group();
  readonly active: Train[] = [];

  private pool: Train[] = [];
  private sideCache = new Map<string, THREE.MeshLambertMaterial[]>();

  constructor() {
    for (let i = 0; i < 10; i++) {
      const obj = new THREE.Group();
      obj.visible = false;
      this.group.add(obj);
      this.pool.push({
        obj, lane: 0, z: 0, halfLen: 0, moving: false, speed: 0, active: false,
      });
    }
  }

  /** Materials vary per (color, length) so textures repeat exactly. */
  private materialsFor(colorIdx: number, length: number): THREE.MeshLambertMaterial[] {
    const key = `${colorIdx}-${length}`;
    const cached = this.sideCache.get(key);
    if (cached) return cached;

    const color = COLORS.trains[colorIdx];
    const sideTex = trainSideTexture(color, 0xfff4e6);
    sideTex.repeat.set(length / 4.5, 1);
    const sideMat = new THREE.MeshLambertMaterial({ map: sideTex });
    const frontTex = trainFrontTexture(color);
    const frontMat = new THREE.MeshLambertMaterial({ map: frontTex });
    const topMat = new THREE.MeshLambertMaterial({ color, flatShading: true });
    const underMat = new THREE.MeshLambertMaterial({ color: 0x2b2b30 });
    // BoxGeometry material order: +x, -x, +y, -y, +z (front→player), -z
    const mats = [sideMat, sideMat, topMat, underMat, frontMat, sideMat];
    this.sideCache.set(key, mats);
    return mats;
  }

  spawn(lane: number, laneX: number, z: number, moving: boolean, colorIdx?: number): Train | null {
    const t = this.pool.pop();
    if (!t) return null;

    const length = pick(LENGTHS);
    const colorIdxFinal = colorIdx ?? Math.floor(randRange(0, COLORS.trains.length));

    // Rebuild body (cheap: one box + wheels + roof lip)
    t.obj.clear();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(TRAIN_WIDTH, TRAIN_HEIGHT, length),
      this.materialsFor(colorIdxFinal, length),
    );
    body.position.y = TRAIN_HEIGHT / 2 + 0.18;
    body.castShadow = true;
    t.obj.add(body);

    const roofLip = new THREE.Mesh(
      new THREE.BoxGeometry(TRAIN_WIDTH * 0.86, 0.12, length * 0.96),
      new THREE.MeshLambertMaterial({ color: 0x3f3f46, flatShading: true }),
    );
    roofLip.position.y = TRAIN_HEIGHT + 0.22;
    t.obj.add(roofLip);

    const underMat = new THREE.MeshLambertMaterial({ color: 0x2b2b30, flatShading: true });
    for (const dz of [-length / 2 + 1.6, length / 2 - 1.6]) {
      const bogie = new THREE.Mesh(new THREE.BoxGeometry(TRAIN_WIDTH * 0.82, 0.4, 2.2), underMat);
      bogie.position.set(0, 0.2, dz);
      t.obj.add(bogie);
    }

    if (moving) {
      // Headlight glow cones on the front face (+z = toward player)
      const glowMat = new THREE.SpriteMaterial({
        color: 0xfff3bf,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      });
      for (const sx of [-0.62, 0.62]) {
        const glow = new THREE.Sprite(glowMat);
        glow.scale.setScalar(1.7);
        glow.position.set(sx, 0.95, length / 2 + 0.35);
        t.obj.add(glow);
      }
    }

    t.active = true;
    t.lane = lane;
    t.z = z;
    t.halfLen = length / 2;
    t.moving = moving;
    t.speed = moving ? ONCOMING_TRAIN_SPEED : 0;
    t.obj.position.set(laneX, 0, z);
    t.obj.visible = true;
    this.active.push(t);
    return t;
  }

  update(dt: number): void {
    for (const t of this.active) {
      if (t.moving) {
        t.z += t.speed * dt;
        t.obj.position.z = t.z;
      }
    }
  }

  cull(playerZ: number, behind: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const t = this.active[i];
      const tail = t.z + t.halfLen; // +z end (closest to player behind)
      if (tail > playerZ + behind) {
        t.active = false;
        t.obj.visible = false;
        this.active.splice(i, 1);
        this.pool.push(t);
      }
    }
  }

  /**
   * Support height under (x, z): roof if a train covers the point and the
   * caller is close to roof level (never lets you "stand" inside a train),
   * else ground level 0.
   */
  supportHeightAt(x: number, z: number, callerY: number): number {
    const roof = TRAIN_HEIGHT + 0.28;
    for (const t of this.active) {
      if (Math.abs(z - t.z) <= t.halfLen && Math.abs(x - t.obj.position.x) <= TRAIN_WIDTH / 2 + 0.1) {
        return callerY >= roof - 0.45 ? roof : 0;
      }
    }
    return 0;
  }

  reset(): void {
    while (this.active.length) {
      const t = this.active.pop() as Train;
      t.active = false;
      t.obj.visible = false;
      this.pool.push(t);
    }
  }
}
