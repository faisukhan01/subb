import * as THREE from "three";
import type { CharacterPalette } from "./Config";

/**
 * Stylized character rigs — "SUBB SURFERS" signature cast.
 *
 * Built entirely from primitives with a proper joint hierarchy (elbows,
 * knees, neck) so the animator can drive a fluid run cycle, tuck jumps,
 * spin rolls, jetpack flight and a caught pose without skeletal data.
 * Shading is smooth (MeshStandardMaterial) with tuned roughness per
 * material family — fabric, skin, metal, rubber — for a soft Pixar-ish
 * look under the ACES tonemapper.
 *
 * Joint map (all pivots at joint origin, meshes offset downward):
 *   root (feet) → spin (y≈0.55, roll flips this) → hips → torso → neck → head
 *                                            └→ armL/armR (→ elbowL/R)
 *                              hips → legL/legR (→ kneeL/R)
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
  elbowL: THREE.Group;
  elbowR: THREE.Group;
  kneeL: THREE.Group;
  kneeR: THREE.Group;
  palette: CharacterPalette;
}

// ---------------------------------------------------------------- materials

interface MatOpts {
  rough?: number;
  metal?: number;
  emissive?: number;
  emissiveIntensity?: number;
}

const mat = (color: number, opts: MatOpts = {}): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({
    color,
    roughness: opts.rough ?? 0.78,
    metalness: opts.metal ?? 0,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
  });

const SKIN = { rough: 0.52 };
const HAIR = { rough: 0.42 };
const FABRIC = { rough: 0.88 };
const RUBBER = { rough: 0.35 };
const METAL = { rough: 0.32, metal: 0.75 };

function limbGroup(parent: THREE.Object3D, x: number, y: number, z = 0): THREE.Group {
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

// ------------------------------------------------------------------- pieces

/** Face: sclera + pupils + highlight, brows, nose, smiling mouth, ears. */
function buildFace(head: THREE.Group, skin: number, palette: CharacterPalette): void {
  const skinMat = mat(skin, SKIN);
  const darkMat = mat(0x241d1a, { rough: 0.3 });
  const whiteMat = mat(0xffffff, { rough: 0.25 });

  // Ears
  for (const sx of [-1, 1]) {
    const ear = addMesh(head, new THREE.SphereGeometry(0.05, 10, 8), skinMat, sx * 0.225, 0.02, 0.01);
    ear.scale.set(0.55, 1, 0.85);
  }

  if (palette.sunglasses) {
    // Inspector shades — one dark visor band with a glint
    const band = addMesh(head, new THREE.BoxGeometry(0.34, 0.085, 0.1), mat(0x101114, { rough: 0.18, metal: 0.4 }), 0, 0.035, 0.185);
    band.rotation.x = 0.08;
    addMesh(head, new THREE.BoxGeometry(0.05, 0.02, 0.02), mat(0x868e96, METAL), -0.13, 0.03, 0.2);
    addMesh(head, new THREE.BoxGeometry(0.05, 0.02, 0.02), mat(0x868e96, METAL), 0.13, 0.03, 0.2);
    return;
  }

  // Eyes (whites + iris + catchlight) — big cartoon eyes read at game distance
  for (const sx of [-1, 1]) {
    const white = addMesh(head, new THREE.SphereGeometry(0.064, 14, 12), whiteMat, sx * 0.088, 0.05, 0.172);
    white.scale.set(0.88, 1.15, 0.62);
    const iris = addMesh(head, new THREE.SphereGeometry(0.032, 10, 8), darkMat, sx * 0.088, 0.047, 0.216);
    iris.scale.set(0.85, 1, 0.5);
    const glint = addMesh(head, new THREE.SphereGeometry(0.009, 6, 6), whiteMat, sx * 0.096, 0.062, 0.227);
    glint.castShadow = false;
  }

  // Brows
  const browMat = mat(palette.hair, HAIR);
  for (const sx of [-1, 1]) {
    const brow = addMesh(head, new THREE.BoxGeometry(0.082, 0.024, 0.028), browMat, sx * 0.093, 0.128, 0.188);
    brow.rotation.z = sx * 0.14;
  }

  // Nose
  const nose = addMesh(head, new THREE.SphereGeometry(0.028, 10, 8), mat(skin, { rough: 0.48 }), 0, -0.005, 0.215);
  nose.scale.set(0.9, 0.8, 0.9);

  // Smile (open arc)
  const mouth = new THREE.Mesh(
    new THREE.TorusGeometry(0.045, 0.014, 8, 14, Math.PI * 0.85),
    mat(0x8c4a3c, { rough: 0.5 }),
  );
  mouth.position.set(0, -0.075, 0.2);
  mouth.rotation.z = Math.PI + (Math.PI * 0.85 - Math.PI) * 0.5;
  mouth.rotation.x = -0.15;
  mouth.castShadow = false;
  head.add(mouth);
}

/** Head + hair/cap per palette. Returns the head joint (pivot at neck). */
function buildHead(parent: THREE.Object3D, p: CharacterPalette): THREE.Group {
  const head = limbGroup(parent, 0, 0.62, 0); // neck pivot
  const skinMat = mat(p.skin, SKIN);

  // Neck
  addMesh(head, new THREE.CylinderGeometry(0.075, 0.09, 0.1, 10), skinMat, 0, -0.03, 0);

  // Skull — slightly egg-shaped
  const skull = addMesh(head, new THREE.SphereGeometry(0.225, 24, 18), skinMat, 0, 0.13, 0);
  skull.scale.set(1, 1.1, 0.98);

  const hairMat = mat(p.hair, HAIR);

  // Base hair: cap the skull back/sides so hairline reads under any headwear
  const underHair = new THREE.Mesh(new THREE.SphereGeometry(0.235, 20, 14, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.36), hairMat);
  underHair.position.set(0, 0.135, -0.012);
  underHair.castShadow = true;
  head.add(underHair);

  switch (p.id) {
    case "max": {
      // Spiky fringe poking out under the backwards cap
      for (let i = 0; i < 5; i++) {
        const spike = addMesh(head, new THREE.ConeGeometry(0.038, 0.13, 6), hairMat, -0.12 + i * 0.06, 0.235, 0.13 - Math.abs(i - 2) * 0.028);
        spike.rotation.x = -0.9 - Math.random() * 0.25;
        spike.rotation.z = (i - 2) * 0.09;
      }
      // Back tuft
      const tuft = addMesh(head, new THREE.ConeGeometry(0.05, 0.16, 7), hairMat, 0, 0.16, -0.2);
      tuft.rotation.x = 1.25;
      break;
    }
    case "zoe": {
      // Glossy bob: side curtains + straight bangs
      for (const sx of [-1, 1]) {
        const curtain = addMesh(head, new THREE.CapsuleGeometry(0.065, 0.16, 6, 10), hairMat, sx * 0.185, 0.09, -0.02);
        curtain.scale.set(0.7, 1, 1);
      }
      const back = addMesh(head, new THREE.SphereGeometry(0.21, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat, 0, 0.1, -0.05);
      back.scale.set(1.02, 1.15, 0.95);
      for (let i = 0; i < 4; i++) {
        const bang = addMesh(head, new THREE.BoxGeometry(0.085, 0.14, 0.05), hairMat, -0.135 + i * 0.09, 0.225, 0.115);
        bang.rotation.x = 0.32;
        bang.rotation.z = (i - 1.5) * 0.05;
      }
      // Purple accent streak
      const streak = addMesh(head, new THREE.BoxGeometry(0.05, 0.2, 0.045), mat(p.accent ?? 0xffd43b, { rough: 0.4 }), 0.155, 0.16, 0.06);
      streak.rotation.z = -0.35;
      break;
    }
    case "rex": {
      // Buzz cut handled by underHair; add beard + heavy jaw shade
      if (p.beard !== false) {
        const beard = new THREE.Mesh(new THREE.SphereGeometry(0.19, 16, 12, Math.PI * 0.15, Math.PI * 1.7, Math.PI * 0.62, Math.PI * 0.38), hairMat);
        beard.position.set(0, 0.055, 0.02);
        beard.castShadow = true;
        head.add(beard);
      }
      break;
    }
  }

  // Cap — sits proud of the skull so it reads as headwear
  if (p.cap) {
    const capMat = mat(p.cap, FABRIC);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.252, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.52), capMat);
    crown.position.set(0, 0.215, 0);
    crown.scale.set(1.06, 0.95, 1.06);
    crown.castShadow = true;
    head.add(crown);
    const button = addMesh(head, new THREE.SphereGeometry(0.032, 8, 8), capMat, 0, 0.45, 0);
    button.castShadow = false;
    // Brim — a squashed cylinder disc, front or back
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.195, 0.195, 0.04, 14, 1, false, 0, Math.PI), capMat);
    brim.position.set(0, 0.27, p.capBrimBack ? -0.17 : 0.17);
    brim.scale.set(1, 1, 1.2);
    if (p.capBrimBack) brim.rotation.y = Math.PI;
    brim.rotation.x = p.capBrimBack ? 0.16 : -0.12;
    brim.castShadow = true;
    head.add(brim);
  }

  buildFace(head, p.skin, p);

  // Perks: headphones for Zoe, chain for Rex
  if (p.accent && p.id === "zoe") {
    const bandMat = mat(p.accent, { rough: 0.35, metal: 0.3 });
    // Band hugs the hair just above the ears; cups sit ON the ears
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.026, 8, 20, Math.PI), bandMat);
    band.position.set(0, 0.15, 0);
    band.rotation.z = -0.06;
    head.add(band);
    for (const sx of [-0.2, 0.2]) {
      const cup = addMesh(head, new THREE.CylinderGeometry(0.08, 0.08, 0.06, 12), bandMat, sx, 0.06, 0.01);
      cup.rotation.z = Math.PI / 2;
      const pad = addMesh(head, new THREE.CylinderGeometry(0.065, 0.065, 0.022, 12), mat(0x1c1917, { rough: 0.9 }), sx * 1.05, 0.06, 0.01);
      pad.rotation.z = Math.PI / 2;
    }
  }
  if (p.accent && p.id === "rex") {
    const chain = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.024, 8, 20), mat(0xffd43b, METAL));
    chain.rotation.x = Math.PI / 2.15;
    chain.position.set(0, 0.32, 0.06);
    chain.castShadow = true;
    parent.add(chain); // hangs from neck (torso space)
  }

  return head;
}

/** Chunky sneaker: upper, toe cap, midsole, lace band. */
function buildShoe(parent: THREE.Object3D, upper: number, sole: number): void {
  const upperMat = mat(upper, FABRIC);
  const soleMat = mat(sole, RUBBER);
  const shoe = new THREE.Group();
  shoe.position.set(0, -0.6, 0.03);
  parent.add(shoe);

  const u = addMesh(shoe, new THREE.BoxGeometry(0.155, 0.11, 0.28), upperMat, 0, 0.045, -0.01);
  u.rotation.x = 0.05;
  addMesh(shoe, new THREE.BoxGeometry(0.16, 0.055, 0.2), upperMat, 0, 0.1, -0.06); // ankle collar
  const soleM = addMesh(shoe, new THREE.BoxGeometry(0.17, 0.06, 0.33), soleMat, 0, -0.02, 0.015);
  soleM.rotation.x = 0.03;
  const toe = addMesh(shoe, new THREE.SphereGeometry(0.078, 10, 8), soleMat, 0, 0.005, 0.13);
  toe.scale.set(1.05, 0.62, 0.9);
  const lace = addMesh(shoe, new THREE.BoxGeometry(0.1, 0.03, 0.12), mat(0xf1f3f5, { rough: 0.6 }), 0, 0.11, 0.02);
  lace.rotation.x = 0.2;
}

// -------------------------------------------------------------- body build

export function buildCharacter(p: CharacterPalette): CharacterRig {
  const skinMat = mat(p.skin, SKIN);
  const torsoMat = mat(p.torso, FABRIC);
  const sleeveMat = p.sleeves != null ? mat(p.sleeves, FABRIC) : skinMat;
  const pantsMat = mat(p.pants, FABRIC);
  const shoeMat = mat(p.shoes, FABRIC);

  const root = new THREE.Group();
  const spin = limbGroup(root, 0, 0.55, 0); // pivot for roll flips
  const hips = limbGroup(spin, 0, 0.37, 0); // world y ≈ 0.92

  // Pelvis
  const pelvis = addMesh(hips, new THREE.BoxGeometry(0.4, 0.18, 0.28), pantsMat, 0, 0.02, 0);
  pelvis.scale.set(1, 1, 0.95);

  // Torso
  const torso = limbGroup(hips, 0, 0.06, 0);
  const stocky = p.id === "rex" ? 1.14 : 1;
  const chest = addMesh(torso, new THREE.BoxGeometry(0.46 * stocky, 0.5, 0.29), torsoMat, 0, 0.31, 0);
  chest.scale.set(1, 1, 1);

  switch (p.style ?? "hoodie") {
    case "hoodie": {
      // Chest panel (tee showing through open hoodie)
      addMesh(torso, new THREE.BoxGeometry(0.2, 0.34, 0.02), mat(0xf8f5f0, FABRIC), 0, 0.3, 0.15);
      // Hood bunched behind the neck
      const hood = addMesh(torso, new THREE.SphereGeometry(0.14, 12, 10), torsoMat, 0, 0.55, -0.14);
      hood.scale.set(1.25, 0.62, 0.8);
      // Kangaroo pocket
      addMesh(torso, new THREE.BoxGeometry(0.26, 0.12, 0.03), torsoMat, 0, 0.16, 0.15);
      // Drawstrings
      for (const sx of [-0.07, 0.07]) {
        const cord = addMesh(torso, new THREE.CylinderGeometry(0.008, 0.008, 0.09, 6), mat(0xf8f5f0, FABRIC), sx, 0.47, 0.155);
        cord.castShadow = false;
      }
      // Hem band
      addMesh(torso, new THREE.BoxGeometry(0.47 * stocky, 0.06, 0.3), mat(new THREE.Color(p.torso).multiplyScalar(0.82).getHex(), FABRIC), 0, 0.075, 0);
      break;
    }
    case "bomber": {
      // Collar
      const collar = addMesh(torso, new THREE.CylinderGeometry(0.13, 0.15, 0.07, 12), mat(p.sleeves ?? p.torso, FABRIC), 0, 0.555, 0.01);
      collar.rotation.x = 0.15;
      // Zipper + placket
      addMesh(torso, new THREE.BoxGeometry(0.03, 0.44, 0.015), mat(0xe9ecef, { rough: 0.4, metal: 0.3 }), 0, 0.3, 0.152);
      // Tee triangle
      const tee = addMesh(torso, new THREE.BoxGeometry(0.12, 0.3, 0.02), mat(0xf8f5f0, FABRIC), 0, 0.28, 0.148);
      tee.rotation.z = 0;
      // Ribbed hem
      addMesh(torso, new THREE.BoxGeometry(0.47 * stocky, 0.06, 0.3), mat(p.sleeves ?? p.torso, FABRIC), 0, 0.075, 0);
      break;
    }
    case "tank": {
      // Tank straps = skin shoulders; big chest plate + belly hem
      addMesh(torso, new THREE.BoxGeometry(0.3, 0.2, 0.3), skinMat, 0, 0.5, 0.005);
      const stripe = addMesh(torso, new THREE.BoxGeometry(0.47 * stocky, 0.1, 0.31), mat(0xf8f5f0, FABRIC), 0, 0.12, 0);
      stripe.castShadow = false;
      break;
    }
    case "uniform": {
      // Belt + buckle + chest pockets + tie
      addMesh(torso, new THREE.BoxGeometry(0.48 * stocky, 0.09, 0.3), mat(0x212529, FABRIC), 0, 0.1, 0);
      addMesh(torso, new THREE.BoxGeometry(0.08, 0.06, 0.02), mat(0xffd43b, METAL), 0, 0.1, 0.15);
      addMesh(torso, new THREE.BoxGeometry(0.02, 0.3, 0.02), mat(0x343a40, FABRIC), 0, 0.34, 0.15);
      for (const sx of [-0.14, 0.14]) {
        addMesh(torso, new THREE.BoxGeometry(0.09, 0.1, 0.02), mat(new THREE.Color(p.torso).multiplyScalar(0.85).getHex(), FABRIC), sx, 0.38, 0.148);
      }
      // Epaulettes
      for (const sx of [-0.19, 0.19]) {
        addMesh(torso, new THREE.BoxGeometry(0.1, 0.03, 0.16), mat(0x212529, FABRIC), sx, 0.555, 0);
      }
      break;
    }
  }

  // Backpack
  if (p.backpack) {
    const bpMat = mat(p.backpack, FABRIC);
    const bp = addMesh(torso, new THREE.BoxGeometry(0.36, 0.4, 0.17), bpMat, 0, 0.3, -0.24);
    bp.name = "backpack";
    const flap = addMesh(torso, new THREE.BoxGeometry(0.37, 0.13, 0.18), mat(new THREE.Color(p.backpack).multiplyScalar(0.8).getHex(), FABRIC), 0, 0.44, -0.24);
    flap.castShadow = false;
    for (const sx of [-0.12, 0.12]) {
      const strap = addMesh(torso, new THREE.BoxGeometry(0.05, 0.34, 0.03), bpMat, sx, 0.34, 0.145);
      strap.castShadow = false;
    }
  }

  // Head
  const head = buildHead(torso, p);

  // Arms — shoulder → upper arm → elbow → forearm → hand
  const limbBulk = p.id === "rex" ? 1.18 : 1; // Rex is the muscle of the crew
  const upperArmGeo = new THREE.CapsuleGeometry(0.082 * limbBulk, 0.17, 6, 12);
  const foreArmGeo = new THREE.CapsuleGeometry(0.07 * limbBulk, 0.17, 6, 12);
  const makeArm = (side: -1 | 1): { shoulder: THREE.Group; elbow: THREE.Group } => {
    const shoulder = limbGroup(torso, side * 0.29 * stocky, 0.52, 0);
    // Shoulder cap keeps the silhouette smooth when swinging
    const capMesh = addMesh(shoulder, new THREE.SphereGeometry(0.098 * limbBulk, 12, 10), sleeveMat, 0, 0.015, 0);
    capMesh.castShadow = false;
    addMesh(shoulder, upperArmGeo, sleeveMat, 0, -0.13, 0);
    const elbow = limbGroup(shoulder, 0, -0.26, 0);
    addMesh(elbow, foreArmGeo, skinMat, 0, -0.12, 0);
    const hand = addMesh(elbow, new THREE.SphereGeometry(0.068 * limbBulk, 10, 10), skinMat, 0, -0.26, 0);
    hand.scale.set(0.9, 1.05, 0.85);
    if (p.wristbands) {
      const band = addMesh(elbow, new THREE.TorusGeometry(0.062, 0.02, 8, 14), mat(p.accent ?? 0xffd43b, FABRIC), 0, -0.2, 0);
      band.rotation.x = Math.PI / 2;
      band.castShadow = false;
    }
    return { shoulder, elbow };
  };
  const armL = makeArm(-1);
  const armR = makeArm(1);

  // Legs — hip → thigh → knee → shin → sneaker
  const thighGeo = new THREE.CapsuleGeometry(0.098, 0.22, 6, 12);
  const shinGeo = new THREE.CapsuleGeometry(0.082, 0.2, 6, 12);
  const makeLeg = (side: -1 | 1): { hip: THREE.Group; knee: THREE.Group } => {
    const hip = limbGroup(hips, side * 0.15, -0.04, 0);
    addMesh(hip, thighGeo, pantsMat, 0, -0.18, 0);
    const knee = limbGroup(hip, 0, -0.36, 0);
    addMesh(knee, shinGeo, pantsMat, 0, -0.12, 0);
    buildShoe(knee, p.shoes, p.soleColor ?? 0x212529);
    return { hip, knee };
  };
  const legL = makeLeg(-1);
  const legR = makeLeg(1);

  return {
    root,
    spin,
    torso,
    head,
    armL: armL.shoulder,
    armR: armR.shoulder,
    legL: legL.hip,
    legR: legR.hip,
    elbowL: armL.elbow,
    elbowR: armR.elbow,
    kneeL: legL.knee,
    kneeR: legR.knee,
    palette: p,
  };
}

// ---------------------------------------------------------------- animation

export type RigMode = "idle" | "run" | "jump" | "roll" | "fly" | "board" | "caught";

/**
 * Drives joint rotations for every pose. One animator per rig instance;
 * `update` is called once per frame with the normalized run speed.
 *
 * Conventions (rig authored facing +z):
 *  - negative rotation.x on a hanging limb swings it forward
 *  - knees only flex positive (heel back), elbows only flex negative
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
    r.spin.rotation.set(0, 0, 0);
    r.spin.position.y = 0.55;
    r.torso.rotation.set(0, 0, 0);
    r.torso.position.set(0, 0.06, 0);
    r.head.rotation.set(0, 0, 0);
    r.elbowL.rotation.set(0, 0, 0);
    r.elbowR.rotation.set(0, 0, 0);
    r.kneeL.rotation.set(0, 0, 0);
    r.kneeR.rotation.set(0, 0, 0);

    switch (this.mode) {
      case "idle": {
        const breathe = Math.sin(t * 2.1) * 0.5 + 0.5;
        const sway = Math.sin(t * 1.4);
        r.torso.scale.set(1 + breathe * 0.014, 1 + breathe * 0.01, 1);
        r.torso.rotation.z = sway * 0.02;
        r.torso.rotation.x = 0.02;
        r.armL.rotation.x = -0.12 - breathe * 0.03;
        r.armR.rotation.x = -0.12 - breathe * 0.03;
        r.armL.rotation.z = -0.07;
        r.armR.rotation.z = 0.07;
        r.elbowL.rotation.x = -0.32 - breathe * 0.05;
        r.elbowR.rotation.x = -0.32 - breathe * 0.05;
        r.legL.rotation.x = 0;
        r.legR.rotation.x = 0;
        r.kneeL.rotation.x = 0.06;
        r.kneeR.rotation.x = 0.06;
        r.head.rotation.y = Math.sin(t * 0.55) * 0.3;
        r.head.rotation.x = -0.03 + breathe * 0.015;
        break;
      }
      case "run":
      case "board": {
        if (this.mode === "run") {
          this.runPhase += dt * (7.6 + speedNorm * 10.5);
          const ph = this.runPhase;
          const s = Math.sin(ph);
          const stride = 0.82 + speedNorm * 0.22;

          // Legs: thigh swings, knee flexes on the recovery pass
          r.legL.rotation.x = -s * stride;
          r.legR.rotation.x = s * stride;
          r.kneeL.rotation.x = 0.14 + Math.max(0, Math.cos(ph - 0.9)) * (1.05 + speedNorm * 0.35);
          r.kneeR.rotation.x = 0.14 + Math.max(0, Math.cos(ph - 0.9 + Math.PI)) * (1.05 + speedNorm * 0.35);

          // Arms opposite phase, elbows pumping
          r.armL.rotation.x = s * (0.62 + speedNorm * 0.2);
          r.armR.rotation.x = -s * (0.62 + speedNorm * 0.2);
          r.armL.rotation.z = -0.08;
          r.armR.rotation.z = 0.08;
          r.elbowL.rotation.x = -0.75 - Math.max(0, -s) * 0.5;
          r.elbowR.rotation.x = -0.75 - Math.max(0, s) * 0.5;

          // Torso counter-rotation + forward lean + bounce
          r.torso.rotation.x = 0.13 + speedNorm * 0.1;
          r.torso.rotation.y = s * 0.09;
          r.torso.position.y = 0.06 + Math.abs(Math.cos(ph)) * 0.045;
          r.head.rotation.x = -0.09 - speedNorm * 0.05;
          r.head.rotation.y = -s * 0.05;
        } else {
          // Surf stance: staggered legs, twisted torso, balance arms
          const carve = Math.sin(t * 2.6);
          r.legL.rotation.x = -0.42;
          r.legR.rotation.x = 0.3;
          r.legL.rotation.y = 0.32;
          r.legR.rotation.y = -0.38;
          r.kneeL.rotation.x = 0.4;
          r.kneeR.rotation.x = 0.45;
          r.torso.rotation.y = 0.42;
          r.torso.rotation.z = carve * 0.06;
          r.torso.rotation.x = 0.05;
          r.armL.rotation.x = -0.5;
          r.armL.rotation.z = -0.85;
          r.armR.rotation.x = 0.25;
          r.armR.rotation.z = 0.95;
          r.elbowL.rotation.x = -0.4;
          r.elbowR.rotation.x = -0.3;
          r.head.rotation.y = -0.32;
        }
        break;
      }
      case "jump": {
        const rise = clamp01(t / 0.16);
        r.legL.rotation.x = -0.95 * rise;
        r.legR.rotation.x = -0.35 * rise;
        r.kneeL.rotation.x = 1.7 * rise;
        r.kneeR.rotation.x = 0.85 * rise;
        r.armL.rotation.x = -2.35 * rise;
        r.armR.rotation.x = -2.2 * rise;
        r.armL.rotation.z = -0.3;
        r.armR.rotation.z = 0.3;
        r.elbowL.rotation.x = -0.5 * rise;
        r.elbowR.rotation.x = -0.5 * rise;
        r.torso.rotation.x = -0.1 * rise;
        r.head.rotation.x = 0.12 * rise;
        break;
      }
      case "roll": {
        // Full forward flip handled via spin group; limbs tucked tight.
        r.legL.rotation.x = -1.85;
        r.legR.rotation.x = -1.7;
        r.kneeL.rotation.x = 2.1;
        r.kneeR.rotation.x = 2.0;
        r.armL.rotation.x = -1.5;
        r.armR.rotation.x = -1.5;
        r.elbowL.rotation.x = -1.4;
        r.elbowR.rotation.x = -1.4;
        r.torso.rotation.x = 0.45;
        r.head.rotation.x = 0.45;
        break;
      }
      case "fly": {
        const flap = Math.sin(t * 7.2) * 0.14;
        r.legL.rotation.x = -0.32 + flap;
        r.legR.rotation.x = 0.14 - flap;
        r.kneeL.rotation.x = 0.55;
        r.kneeR.rotation.x = 0.4;
        r.armL.rotation.x = -1.35;
        r.armR.rotation.x = -1.35;
        r.armL.rotation.z = -0.42;
        r.armR.rotation.z = 0.42;
        r.elbowL.rotation.x = -1.15;
        r.elbowR.rotation.x = -1.15;
        r.torso.rotation.x = 0.3;
        r.head.rotation.x = -0.28;
        break;
      }
      case "caught": {
        const drop = clamp01(t / 0.4);
        const flail = Math.sin(t * 16) * (1 - drop) * 0.3;
        r.spin.rotation.x = -1.35 * drop;
        r.armL.rotation.x = -2.7 * drop + flail;
        r.armR.rotation.x = -2.5 * drop - flail;
        r.elbowL.rotation.x = -0.35;
        r.elbowR.rotation.x = -0.35;
        r.legL.rotation.x = -0.55 * drop;
        r.legR.rotation.x = 0.3 * drop;
        r.kneeL.rotation.x = 0.75 * drop;
        r.kneeR.rotation.x = 0.5 * drop;
        r.head.rotation.x = 0.25 * drop;
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
  const furMat = mat(0x9c7a54, { rough: 0.95 });
  const darkMat = mat(0x6b4f33, { rough: 0.95 });
  const root = new THREE.Group();
  const spin = limbGroup(root, 0, 0.34, 0);

  // Body: chest deeper than rear
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.175, 0.4, 8, 14), furMat);
  body.rotation.x = Math.PI / 2;
  body.position.z = -0.02;
  body.castShadow = true;
  spin.add(body);
  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.185, 12, 10), furMat);
  chest.position.set(0, 0.02, 0.2);
  chest.scale.set(1, 1.05, 0.9);
  chest.castShadow = true;
  spin.add(chest);
  // Saddle patch
  const saddle = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.45), darkMat);
  saddle.rotation.x = Math.PI / 2.3;
  saddle.position.set(0, 0.12, -0.06);
  saddle.castShadow = false;
  spin.add(saddle);

  // Head: skull + snout + jaw + floppy ears + eyes + brows + nose
  const head = limbGroup(spin, 0, 0.22, 0.33);
  addMesh(head, new THREE.SphereGeometry(0.155, 14, 12), furMat, 0, 0.03, 0.02);
  const snout = addMesh(head, new THREE.BoxGeometry(0.13, 0.095, 0.15), furMat, 0, -0.01, 0.15);
  snout.rotation.x = 0.08;
  const jaw = addMesh(head, new THREE.BoxGeometry(0.1, 0.045, 0.12), darkMat, 0, -0.065, 0.135);
  jaw.rotation.x = 0.08;
  const nose = addMesh(head, new THREE.SphereGeometry(0.032, 8, 8), mat(0x1c1917, RUBBER), 0, 0.02, 0.225);
  nose.castShadow = false;
  // Eyes + brows
  for (const sx of [-1, 1]) {
    const eye = addMesh(head, new THREE.SphereGeometry(0.026, 8, 8), mat(0x241d1a, { rough: 0.3 }), sx * 0.07, 0.06, 0.115);
    eye.scale.set(1, 1, 0.6);
    eye.castShadow = false;
    const brow = addMesh(head, new THREE.BoxGeometry(0.045, 0.014, 0.02), darkMat, sx * 0.07, 0.095, 0.115);
    brow.rotation.z = sx * -0.2;
    brow.castShadow = false;
    // Floppy ears
    const ear = addMesh(head, new THREE.BoxGeometry(0.055, 0.13, 0.09), darkMat, sx * 0.14, 0.02, -0.01);
    ear.rotation.z = sx * 0.5;
    ear.rotation.x = -0.15;
  }
  // Collar + tag
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.022, 8, 16), mat(0xc92a2a, FABRIC));
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, -0.02, 0.06);
  collar.castShadow = false;
  head.add(collar);
  const tag = addMesh(head, new THREE.SphereGeometry(0.022, 8, 8), mat(0xffd43b, METAL), 0, -0.06, 0.09);
  tag.castShadow = false;

  // Legs: upper + lower with paw
  const legs: THREE.Group[] = [];
  const lowers: THREE.Group[] = [];
  for (const [sx, sz] of [
    [-0.13, 0.19],
    [0.13, 0.19],
    [-0.13, -0.19],
    [0.13, -0.19],
  ]) {
    const leg = limbGroup(spin, sx, -0.1, sz);
    addMesh(leg, new THREE.CapsuleGeometry(0.048, 0.14, 6, 10), sz > 0 ? furMat : darkMat, 0, -0.08, 0);
    const lower = limbGroup(leg, 0, -0.17, 0);
    addMesh(lower, new THREE.CapsuleGeometry(0.04, 0.1, 6, 10), sz > 0 ? furMat : darkMat, 0, -0.06, 0);
    const paw = addMesh(lower, new THREE.SphereGeometry(0.05, 8, 8), furMat, 0, -0.13, 0.02);
    paw.scale.set(1, 0.7, 1.25);
    legs.push(leg);
    lowers.push(lower);
  }

  // Tail: two segments, held up and wagging
  const tail = limbGroup(spin, 0, 0.16, -0.32);
  const tailMesh = addMesh(tail, new THREE.CapsuleGeometry(0.038, 0.16, 6, 8), furMat, 0, 0.09, -0.03);
  tailMesh.rotation.x = -0.65;
  const tailTip = limbGroup(tail, 0, 0.17, -0.07);
  const tipMesh = addMesh(tailTip, new THREE.CapsuleGeometry(0.03, 0.1, 6, 8), darkMat, 0, 0.06, -0.05);
  tipMesh.rotation.x = -0.5;

  return { root, legs, tail, head };
}

export class DogAnimator {
  private phase = 0;
  private lowerRefs: THREE.Group[] | null = null;

  constructor(private dog: DogRig) {}

  update(dt: number, speedNorm: number, barking = false): void {
    this.phase += dt * (10 + speedNorm * 9);
    const p = this.phase;
    this.dog.legs.forEach((leg, i) => {
      leg.rotation.x = Math.sin(p + (i % 2) * Math.PI + (i > 1 ? 0.5 : 0)) * 0.7;
    });
    // Lower leg follow-through
    if (!this.lowerRefs) {
      this.lowerRefs = this.dog.legs.map((leg) => {
        const lower = leg.children.find((c) => c instanceof THREE.Group);
        return (lower as THREE.Group) ?? null;
      }).filter(Boolean) as THREE.Group[];
    }
    this.lowerRefs.forEach((lower, i) => {
      lower.rotation.x = Math.max(0, Math.sin(p + (i % 2) * Math.PI + 1.2)) * 0.55;
    });
    this.dog.tail.rotation.z = -0.25 + Math.sin(p * 1.4) * 0.35;
    this.dog.tail.rotation.x = Math.sin(p * 0.8) * 0.12;
    this.dog.head.position.y = 0.22 + Math.abs(Math.sin(p)) * 0.028;
    this.dog.head.rotation.x = barking ? 0.22 : Math.sin(p * 0.5) * 0.05;
    this.dog.head.rotation.z = barking ? Math.sin(p * 3) * 0.06 : 0;
  }
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
