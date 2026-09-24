import * as THREE from "three";
import type { CharacterPalette } from "./Config";

/**
 * Procedural low-poly character rigs.
 *
 * Characters are built entirely from primitives (capsules/spheres/boxes) with
 * a clean joint hierarchy so the animator can do a full run cycle, tuck
 * jumps, spin rolls, jetpack flight and a ragdoll-ish "caught" pose without
 * any skeletal animation data — no external assets, instant load.
 *
 * Joint map (all pivots at joint origin, meshes offset downward):
 *   root (feet) → spin (y≈0.55, roll flips this) → hips → torso → head
 *                                            └→ armL/armR
 *                              hips → legL/legR
 */

export interface CharacterRig {
  root: THREE.Group;
  spin: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  palette: CharacterPalette;
}

const mat = (color: number, opts: { flat?: boolean; emissive?: number } = {}): THREE.MeshLambertMaterial =>
  new THREE.MeshLambertMaterial({
    color,
    flatShading: opts.flat ?? true,
    emissive: opts.emissive ?? 0x000000,
  });

function limbGroup(parent: THREE.Group, x: number, y: number, z = 0): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

function addMesh(
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  material: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
): THREE.Mesh {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}

export function buildCharacter(p: CharacterPalette): CharacterRig {
  const skinMat = mat(p.skin);
  const torsoMat = mat(p.torso);
  const sleeveMat = mat(p.sleeves ?? p.torso);
  const pantsMat = mat(p.pants);
  const shoeMat = mat(p.shoes);

  const root = new THREE.Group();
  const spin = limbGroup(root, 0, 0.55, 0); // pivot for roll flips
  const hips = limbGroup(spin, 0, 0.37, 0); // world y ≈ 0.92

  // Torso + head
  const torso = limbGroup(hips, 0, 0, 0);
  addMesh(torso, new THREE.BoxGeometry(0.52, 0.58, 0.3), torsoMat, 0, 0.29, 0);
  if (p.sleeves) {
    addMesh(torso, new THREE.BoxGeometry(0.54, 0.2, 0.32), sleeveMat, 0, 0.52, 0);
  }

  const head = limbGroup(torso, 0, 0.78, 0);
  addMesh(head, new THREE.SphereGeometry(0.21, 14, 12), skinMat, 0, 0.12, 0);

  const hairMat = mat(p.hair);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.215, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
  hair.position.set(0, 0.14, -0.015);
  hair.castShadow = true;
  head.add(hair);

  if (p.cap) {
    const capMat = mat(p.cap);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.225, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), capMat);
    cap.position.set(0, 0.16, 0);
    cap.castShadow = true;
    head.add(cap);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.045, 0.22), capMat);
    brim.position.set(0, 0.17, p.capBrimBack ? -0.24 : 0.24);
    brim.rotation.x = p.capBrimBack ? 0.12 : -0.12;
    head.add(brim);
  }
  if (p.accent && p.id === "zoe") {
    // Headphones
    const bandMat = mat(p.accent);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.035, 8, 16, Math.PI), bandMat);
    band.rotation.y = Math.PI / 2;
    band.position.set(0, 0.14, 0);
    head.add(band);
    for (const sx of [-0.19, 0.19]) {
      addMesh(head, new THREE.CylinderGeometry(0.07, 0.07, 0.05, 10), bandMat, sx, 0.1, 0);
    }
  }
  if (p.accent && p.id === "rex") {
    // Gold chain
    const chain = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.03, 8, 18), mat(0xffd43b));
    chain.rotation.x = Math.PI / 2.4;
    chain.position.set(0, 0.5, 0.1);
    torso.add(chain);
  }

  // Arms
  const armGeo = new THREE.CapsuleGeometry(0.085, 0.34, 4, 8);
  const makeArm = (side: -1 | 1): THREE.Group => {
    const g = limbGroup(torso, side * 0.35, 0.5, 0);
    addMesh(g, armGeo, sleeveMat, 0, -0.22, 0);
    addMesh(g, new THREE.SphereGeometry(0.085, 8, 8), skinMat, 0, -0.46, 0);
    return g;
  };
  const armL = makeArm(-1);
  const armR = makeArm(1);

  // Legs
  const legGeo = new THREE.CapsuleGeometry(0.105, 0.42, 4, 8);
  const makeLeg = (side: -1 | 1): THREE.Group => {
    const g = limbGroup(hips, side * 0.16, 0, 0);
    addMesh(g, legGeo, pantsMat, 0, -0.3, 0);
    addMesh(g, new THREE.BoxGeometry(0.16, 0.1, 0.32), shoeMat, 0, -0.62, 0.06);
    return g;
  };
  const legL = makeLeg(-1);
  const legR = makeLeg(1);

  // Backpack
  if (p.backpack) {
    const bp = addMesh(torso, new THREE.BoxGeometry(0.38, 0.42, 0.18), mat(p.backpack), 0, 0.26, -0.26);
    bp.name = "backpack";
  }

  return { root, spin, torso, head, armL, armR, legL, legR, palette: p };
}

export type RigMode = "idle" | "run" | "jump" | "roll" | "fly" | "board" | "caught";

/**
 * Drives joint rotations for every pose. One animator per rig instance;
 * `update` is called once per frame with the normalized run speed.
 */
export class CharacterAnimator {
  private runPhase = 0;
  private animTime = 0;
  private mode: RigMode = "idle";

  constructor(private rig: CharacterRig) {}

  setMode(mode: RigMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.animTime = 0;
  }

  get current(): RigMode {
    return this.mode;
  }

  update(dt: number, speedNorm: number): void {
    this.animTime += dt;
    const r = this.rig;
    const t = this.animTime;
    // Reset baseline every frame, then apply mode offsets.
    r.spin.rotation.x = 0;
    r.spin.position.y = 0.55;
    r.torso.rotation.set(0, 0, 0);
    r.torso.position.set(0, 0, 0);
    r.head.rotation.set(0, 0, 0);

    switch (this.mode) {
      case "idle": {
        const breathe = Math.sin(t * 2.2) * 0.5 + 0.5;
        r.torso.scale.setScalar(1 + breathe * 0.015);
        r.armL.rotation.x = 0.08 + breathe * 0.05;
        r.armR.rotation.x = 0.08 + breathe * 0.05;
        r.armL.rotation.z = -0.09;
        r.armR.rotation.z = 0.09;
        r.legL.rotation.x = 0;
        r.legR.rotation.x = 0;
        r.head.rotation.y = Math.sin(t * 0.6) * 0.28;
        break;
      }
      case "run":
      case "board": {
        this.runPhase += dt * (6.5 + speedNorm * 9);
        const p2 = this.runPhase;
        const swing = this.mode === "board" ? 0.45 : 0.95;
        r.legL.rotation.x = Math.sin(p2) * swing;
        r.legR.rotation.x = -Math.sin(p2) * swing;
        r.armL.rotation.x = -Math.sin(p2) * swing * 0.8;
        r.armR.rotation.x = Math.sin(p2) * swing * 0.8;
        r.armL.rotation.z = -0.12;
        r.armR.rotation.z = 0.12;
        r.torso.rotation.x = this.mode === "board" ? 0.05 : 0.16 + speedNorm * 0.08;
        r.torso.position.y = Math.abs(Math.sin(p2)) * 0.045;
        r.torso.rotation.y = Math.sin(p2) * 0.06;
        r.head.rotation.x = -0.06;
        if (this.mode === "board") {
          r.legL.rotation.y = 0.28;
          r.legR.rotation.y = -0.28;
          r.torso.rotation.z = Math.sin(t * 3) * 0.05;
        }
        break;
      }
      case "jump": {
        const rise = clamp01(t / 0.18);
        r.legL.rotation.x = -0.9 * rise;
        r.legR.rotation.x = 0.5 * rise;
        r.armL.rotation.x = -2.4 * rise;
        r.armR.rotation.x = -2.4 * rise;
        r.armL.rotation.z = -0.25;
        r.armR.rotation.z = 0.25;
        r.torso.rotation.x = -0.08 * rise;
        r.legL.rotation.z = -0.12 * rise;
        break;
      }
      case "roll": {
        // Full forward flip handled via spin group; limbs tucked.
        r.legL.rotation.x = -1.9;
        r.legR.rotation.x = -1.7;
        r.armL.rotation.x = -1.4;
        r.armR.rotation.x = -1.4;
        r.torso.rotation.x = 0.5;
        break;
      }
      case "fly": {
        const flap = Math.sin(t * 7) * 0.2;
        r.legL.rotation.x = 0.25 + flap;
        r.legR.rotation.x = -0.15 - flap;
        r.armL.rotation.x = -0.5;
        r.armR.rotation.x = -0.5;
        r.armL.rotation.z = -0.5;
        r.armR.rotation.z = 0.5;
        r.torso.rotation.x = 0.35;
        break;
      }
      case "caught": {
        const drop = clamp01(t / 0.4);
        r.spin.rotation.x = -1.45 * drop;
        r.armL.rotation.x = -2.6 * drop;
        r.armR.rotation.x = -2.6 * drop;
        r.legL.rotation.x = 0.4 * drop;
        r.legR.rotation.x = -0.3 * drop;
        break;
      }
    }
  }
}

// ------------------------------------------------------------------ Guard dog

export interface DogRig {
  root: THREE.Group;
  legs: THREE.Group[];
  tail: THREE.Group;
  head: THREE.Group;
}

export function buildDog(): DogRig {
  const furMat = mat(0x8d6748);
  const darkMat = mat(0x5c4130);
  const root = new THREE.Group();
  const spin = limbGroup(root, 0, 0.32, 0);

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.42, 4, 8), furMat);
  body.rotation.x = Math.PI / 2;
  body.castShadow = true;
  spin.add(body);

  const head = limbGroup(spin, 0, 0.18, 0.34);
  addMesh(head, new THREE.SphereGeometry(0.15, 10, 8), furMat);
  addMesh(head, new THREE.BoxGeometry(0.12, 0.1, 0.16), darkMat, 0, -0.02, 0.14);
  for (const sx of [-0.08, 0.08]) {
    const ear = addMesh(head, new THREE.ConeGeometry(0.05, 0.12, 6), darkMat, sx, 0.16, 0);
    ear.rotation.z = sx * 2.2;
  }

  const legs: THREE.Group[] = [];
  for (const [sx, sz] of [
    [-0.14, 0.2],
    [0.14, 0.2],
    [-0.14, -0.2],
    [0.14, -0.2],
  ]) {
    const leg = limbGroup(spin, sx, -0.1, sz);
    addMesh(leg, new THREE.CapsuleGeometry(0.045, 0.2, 3, 6), furMat, 0, -0.12, 0);
    legs.push(leg);
  }

  const tail = limbGroup(spin, 0, 0.14, -0.34);
  const tailMesh = addMesh(tail, new THREE.CapsuleGeometry(0.035, 0.18, 3, 6), furMat, 0, 0.1, -0.04);
  tailMesh.rotation.x = -0.7;

  return { root, legs, tail, head };
}

export class DogAnimator {
  private phase = 0;
  constructor(private dog: DogRig) {}

  update(dt: number, speedNorm: number, barking = false): void {
    this.phase += dt * (9 + speedNorm * 8);
    const p = this.phase;
    this.dog.legs.forEach((leg, i) => {
      leg.rotation.x = Math.sin(p + (i % 2) * Math.PI + (i > 1 ? 0.6 : 0)) * 0.75;
    });
    this.dog.tail.rotation.z = -0.7 + Math.sin(p * 2) * 0.25;
    this.dog.head.position.y = 0.18 + Math.abs(Math.sin(p)) * 0.03;
    this.dog.head.rotation.x = barking ? 0.25 : Math.sin(p * 0.5) * 0.06;
  }
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
