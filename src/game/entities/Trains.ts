import * as THREE from "three";
import {
  COLORS,
  ONCOMING_TRAIN_SPEED,
  TRAIN_HEIGHT,
  TRAIN_WIDTH,
} from "../Config";
import { randRange } from "../utils";
import { trainFrontTexture, trainSideTexture } from "../textures";

/**
 * Subway car streaming with pooled bodies. Every car is a real vehicle:
 * rounded roof shell, window band glass, paired sliding doors, bogies with
 * visible wheels, rooftop AC units, cab face with windshield + headlights.
 * Roof of every car is walkable (support y = TRAIN_HEIGHT + 0.28); oncoming
 * "moving" trains travel toward the player with headlight glow.
 */

export interface Train {
  obj: THREE.Group;
  lane: number;
  z: number; // center
  halfLen: number;
  moving: boolean;
  speed: number; // +z world speed when moving
  active: boolean;
  parts?: CarParts;
}

const LENGTHS = [14, 18, 22] as const;

// Body shell metrics (visual): skirt bottom 0.28 → body top 2.55 → roof apex ≈ 3.28
const BODY_BOTTOM = 0.46;
const BODY_TOP = 2.74;
const ROOF_R = TRAIN_WIDTH / 2;
const ROOF_APEX = 3.28;

interface CarParts {
  body: THREE.Mesh;
  glowA: THREE.Sprite;
  glowB: THREE.Sprite;
}

export class TrainManager {
  readonly group = new THREE.Group();
  readonly active: Train[] = [];

  private pool: Train[] = [];
  private mats = new Map<string, THREE.Material[]>();
  private glowTex: THREE.SpriteMaterial;

  constructor() {
    this.glowTex = new THREE.SpriteMaterial({
      color: 0xfff3bf,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    for (let i = 0; i < 10; i++) {
      const length = LENGTHS[i % LENGTHS.length];
      const obj = new THREE.Group();
      obj.visible = false;
      const parts = this.buildCar(obj, length);
      this.group.add(obj);
      this.pool.push({
        obj, lane: 0, z: 0, halfLen: length / 2, moving: false, speed: 0, active: false,
        parts,
      });
    }
  }

  // ------------------------------------------------------------ materials

  /** Material array for a BoxGeometry body: [+x, -x, +y, -y, +z, -z]. */
  private materialsFor(colorIdx: number): THREE.Material[] {
    const key = String(colorIdx);
    const cached = this.mats.get(key);
    if (cached) return cached;

    const livery = COLORS.trains[colorIdx % COLORS.trains.length];
    const sideTex = trainSideTexture(livery.body, livery.stripe);
    const sideMat = new THREE.MeshStandardMaterial({
      map: sideTex,
      roughness: 0.42,
      metalness: 0.18,
    });
    const frontTex = trainFrontTexture(livery.body);
    const frontMat = new THREE.MeshStandardMaterial({
      map: frontTex,
      roughness: 0.42,
      metalness: 0.18,
    });
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x6b7078,
      roughness: 0.6,
      metalness: 0.35,
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x24262b,
      roughness: 0.7,
      metalness: 0.3,
    });
    // BoxGeometry material order: +x, -x, +y, -y, +z (front→player), -z
    const mats = [sideMat, sideMat, roofMat, darkMat, frontMat, sideMat];
    this.mats.set(key, mats);
    return mats;
  }

  // ----------------------------------------------------------- car build

  /** Builds a full car into `obj` once; returns the parts that vary per spawn. */
  private buildCar(obj: THREE.Group, length: number): CarParts {
    const steel = new THREE.MeshStandardMaterial({ color: 0x3d4148, roughness: 0.55, metalness: 0.55 });
    const rubber = new THREE.MeshStandardMaterial({ color: 0x1c1e22, roughness: 0.85 });
    const glassDark = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.25, metalness: 0.4 });

    const halfLen = length / 2;
    const bodyH = BODY_TOP - BODY_BOTTOM;

    // ---- body shell (materials swapped per livery on spawn)
    const bodyGeo = new THREE.BoxGeometry(TRAIN_WIDTH, bodyH, length);
    const body = new THREE.Mesh(bodyGeo, this.materialsFor(0));
    body.position.y = BODY_BOTTOM + bodyH / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    obj.add(body);

    // ---- rounded roof shell (half cylinder, flattened)
    const roofGeo = new THREE.CylinderGeometry(ROOF_R, ROOF_R, length, 18, 1, false, Math.PI / 2, Math.PI);
    const roof = new THREE.Mesh(roofGeo, new THREE.MeshStandardMaterial({ color: 0x565c63, roughness: 0.5, metalness: 0.5 }));
    roof.rotation.x = Math.PI / 2;
    roof.scale.y = (ROOF_APEX - BODY_TOP) / ROOF_R; // flatten the dome
    roof.position.y = BODY_TOP;
    roof.castShadow = true;
    obj.add(roof);

    // ---- rooftop AC pods (kept off the running line in the middle)
    for (const sx of [-0.58, 0.58]) {
      for (const dz of [-halfLen * 0.28, halfLen * 0.28]) {
        const ac = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, length * 0.16, 4, 10), steel);
        ac.rotation.x = Math.PI / 2;
        ac.scale.set(1, 1, 0.55);
        ac.position.set(sx, ROOF_APEX - 0.06, dz);
        ac.castShadow = true;
        obj.add(ac);
      }
    }

    // ---- pantograph on the roof centre (rear quarter)
    const panto = new THREE.Group();
    const armMat = new THREE.MeshStandardMaterial({ color: 0x2c2f34, roughness: 0.4, metalness: 0.7 });
    const lowerArm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 1.15), armMat);
    lowerArm.position.set(0, 0.3, 0);
    lowerArm.rotation.x = 0.42;
    panto.add(lowerArm);
    const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 1.0), armMat);
    upperArm.position.set(0, 0.62, 0.28);
    upperArm.rotation.x = -0.55;
    panto.add(upperArm);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.035, 0.12), armMat);
    shoe.position.set(0, 0.86, 0.02);
    panto.add(shoe);
    panto.position.set(0, ROOF_APEX - 0.02, halfLen * 0.36);
    obj.add(panto);

    // ---- underframe + skirts
    const frame = new THREE.Mesh(new THREE.BoxGeometry(TRAIN_WIDTH * 0.86, 0.34, length * 0.94), rubber);
    frame.position.y = 0.33;
    frame.castShadow = true;
    obj.add(frame);
    for (const sx of [-1, 1]) {
      const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, length * 0.9), steel);
      skirt.position.set(sx * (TRAIN_WIDTH / 2 - 0.05), 0.4, 0);
      obj.add(skirt);
    }

    // ---- bogies with real wheels
    for (const dz of [-halfLen + 1.7, halfLen - 1.7]) {
      const bogie = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.34, 2.1), steel);
      bogie.position.set(0, 0.34, dz);
      bogie.castShadow = true;
      obj.add(bogie);
      const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.11, 18);
      for (const wx of [-0.72, 0.72]) {
        for (const wz of [-0.72, 0.72]) {
          const wheel = new THREE.Mesh(wheelGeo, rubber);
          wheel.rotation.z = Math.PI / 2;
          wheel.position.set(wx, 0.32, dz + wz);
          wheel.castShadow = true;
          obj.add(wheel);
        }
      }
    }

    // ---- cab face details (front = +z, toward the player)
    // wind deflector brow above the windshield
    const brow = new THREE.Mesh(new THREE.BoxGeometry(TRAIN_WIDTH * 0.9, 0.14, 0.3), steel);
    brow.position.set(0, BODY_TOP - 0.12, halfLen + 0.06);
    brow.rotation.x = -0.5;
    obj.add(brow);
    // bumper plow
    const plow = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.34, 0.5), rubber);
    plow.position.set(0, 0.42, halfLen + 0.12);
    plow.rotation.x = 0.35;
    plow.castShadow = true;
    obj.add(plow);
    // coupler
    const coupler = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.42), steel);
    coupler.position.set(0, 0.5, halfLen + 0.22);
    obj.add(coupler);

    // ---- headlight glow sprites (revealed when moving)
    const glowA = new THREE.Sprite(this.glowTex);
    glowA.scale.setScalar(1.9);
    glowA.position.set(-0.62, 1.0, halfLen + 0.4);
    glowA.visible = false;
    obj.add(glowA);
    const glowB = new THREE.Sprite(this.glowTex);
    glowB.scale.setScalar(1.9);
    glowB.position.set(0.62, 1.0, halfLen + 0.4);
    glowB.visible = false;
    obj.add(glowB);

    return { body, glowA, glowB };
  }

  // -------------------------------------------------------------- spawn

  spawn(lane: number, laneX: number, z: number, moving: boolean, colorIdx?: number): Train | null {
    const t = this.pool.pop();
    if (!t) return null;

    const parts = t.parts;
    if (parts) {
      const livery = colorIdx ?? Math.floor(randRange(0, COLORS.trains.length));
      parts.body.material = this.materialsFor(livery);
      parts.glowA.visible = moving;
      parts.glowB.visible = moving;
    }

    t.active = true;
    t.lane = lane;
    t.z = z;
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
        if (t.parts) {
          t.parts.glowA.visible = false;
          t.parts.glowB.visible = false;
        }
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
      if (t.parts) {
        t.parts.glowA.visible = false;
        t.parts.glowB.visible = false;
      }
      this.pool.push(t);
    }
  }
}
