import * as THREE from "three";
import type { CharacterPalette } from "./Config";

/**
 * SUBB SURFERS — signature cast rigs.
 *
 * Bodies are lathe-turned organic shells (no flat boxes anywhere), limbs are
 * capsule chains with real joints (shoulder→elbow, hip→knee), and clothes are
 * layered volumes (hoods, collars, cuffs, hems) that read as fabric under the
 * ACES tonemapper.
 *
 * Joint map (all pivots at joint origin, meshes offset outward):
 *   root (feet) → spin (y=0.55, roll flips this) → hips → torso → neck → head
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

const SKIN = { rough: 0.55 };
const HAIR = { rough: 0.42 };
const FABRIC = { rough: 0.9 };
const DENIM = { rough: 0.84 };
const RUBBER = { rough: 0.4 };
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

/**
 * Lathe-turned body shell from a (radius, height) profile. Elliptical depth
 * via z-scale gives a natural chest/back silhouette — the core of the
 * "not made of boxes" look.
 */
function latheBody(
  profile: Array<[number, number]>,
  material: THREE.Material,
  zSquash = 0.7,
): THREE.Mesh {
  const pts = profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.001), y));
  const geo = new THREE.LatheGeometry(pts, 22);
  const m = new THREE.Mesh(geo, material);
  m.scale.z = zSquash;
  m.castShadow = true;
  return m;
}

// ------------------------------------------------------------------- pieces

/** Face: sclera + pupils + highlight, soft brows, nose, smiling mouth, ears. */
function buildFace(head: THREE.Group, skin: number, palette: CharacterPalette): void {
  const skinMat = mat(skin, SKIN);
  const darkMat = mat(0x241d1a, { rough: 0.3 });
  const whiteMat = mat(0xffffff, { rough: 0.25 });

  // Ears
  for (const sx of [-1, 1]) {
    const ear = addMesh(head, new THREE.SphereGeometry(0.04, 10, 8), skinMat, sx * 0.163, 0.02, 0.01);
    ear.scale.set(0.55, 1, 0.85);
  }

  if (palette.sunglasses) {
    // Inspector shades — one dark visor band with a glint
    const band = addMesh(head, new THREE.CapsuleGeometry(0.038, 0.19, 4, 10), mat(0x101114, { rough: 0.18, metal: 0.4 }), 0, 0.035, 0.142);
    band.rotation.z = Math.PI / 2;
    band.scale.set(1, 1, 0.55);
    addMesh(head, new THREE.BoxGeometry(0.05, 0.02, 0.02), mat(0x868e96, METAL), -0.13, 0.03, 0.2);
    addMesh(head, new THREE.BoxGeometry(0.05, 0.02, 0.02), mat(0x868e96, METAL), 0.13, 0.03, 0.2);
    return;
  }

  // Eyes (whites + iris + catchlight) — big cartoon eyes read at game distance
  for (const sx of [-1, 1]) {
    const white = addMesh(head, new THREE.SphereGeometry(0.052, 14, 12), whiteMat, sx * 0.068, 0.05, 0.136);
    white.scale.set(0.88, 1.15, 0.62);
    const iris = addMesh(head, new THREE.SphereGeometry(0.026, 10, 8), darkMat, sx * 0.068, 0.047, 0.172);
    iris.scale.set(0.85, 1, 0.5);
    const glint = addMesh(head, new THREE.SphereGeometry(0.008, 6, 6), whiteMat, sx * 0.074, 0.062, 0.182);
    glint.castShadow = false;
  }

  // Brows — soft capsules
  const browMat = mat(palette.hair, HAIR);
  for (const sx of [-1, 1]) {
    const brow = addMesh(head, new THREE.CapsuleGeometry(0.011, 0.056, 4, 8), browMat, sx * 0.072, 0.122, 0.152);
    brow.rotation.z = Math.PI / 2 + sx * 0.14;
  }

  // Nose
  const nose = addMesh(head, new THREE.SphereGeometry(0.021, 10, 8), mat(skin, { rough: 0.48 }), 0, -0.005, 0.168);
  nose.scale.set(0.9, 0.8, 0.9);

  // Smile (open arc)
  const mouth = new THREE.Mesh(
    new THREE.TorusGeometry(0.042, 0.013, 8, 14, Math.PI * 0.85),
    mat(0x8c4a3c, { rough: 0.5 }),
  );
  mouth.position.set(0, -0.07, 0.158);
  mouth.rotation.z = Math.PI + (Math.PI * 0.85 - Math.PI) * 0.5;
  mouth.rotation.x = -0.15;
  mouth.castShadow = false;
  head.add(mouth);
}

/** Head + hair/headwear per palette. Returns the head joint (pivot at neck). */
function buildHead(parent: THREE.Object3D, p: CharacterPalette): THREE.Group {
  const head = limbGroup(parent, 0, 0.62, 0); // neck pivot
  const skinMat = mat(p.skin, SKIN);

  // Neck
  addMesh(head, new THREE.CylinderGeometry(0.062, 0.078, 0.12, 12), skinMat, 0, -0.04, 0);

  // Skull — egg-shaped with a jaw hint
  const skull = addMesh(head, new THREE.SphereGeometry(0.165, 26, 20), skinMat, 0, 0.13, 0);
  skull.scale.set(1, 1.1, 0.98);
  // Jaw/chin volume in front-bottom
  const jaw = addMesh(head, new THREE.SphereGeometry(0.09, 16, 12), skinMat, 0, 0.065, 0.06);
  jaw.scale.set(0.9, 0.7, 0.95);

  const hairMat = mat(p.hair, HAIR);

  // Base hair: cap the skull back/sides so hairline reads under any headwear
  const underHair = new THREE.Mesh(new THREE.SphereGeometry(0.172, 22, 16, 0, Math.PI * 2, Math.PI * 0.46, Math.PI * 0.36), hairMat);
  underHair.position.set(0, 0.135, -0.012);
  underHair.castShadow = true;
  head.add(underHair);

  switch (p.id) {
    case "max": {
      // Spiky fringe poking out under the backwards cap
      for (let i = 0; i < 5; i++) {
        const spike = addMesh(head, new THREE.ConeGeometry(0.03, 0.11, 6), hairMat, -0.09 + i * 0.045, 0.195, 0.1 - Math.abs(i - 2) * 0.021);
        spike.rotation.x = -0.9 - Math.random() * 0.25;
        spike.rotation.z = (i - 2) * 0.09;
      }
      // Back tuft
      const tuft = addMesh(head, new THREE.ConeGeometry(0.042, 0.14, 7), hairMat, 0, 0.145, -0.15);
      tuft.rotation.x = 1.25;
      break;
    }
    case "zoe": {
      // Glossy bob: rounded side curtains + rolled bangs (no flat slabs)
      for (const sx of [-1, 1]) {
        const curtain = addMesh(head, new THREE.CapsuleGeometry(0.05, 0.15, 6, 12), hairMat, sx * 0.14, 0.08, -0.02);
        curtain.scale.set(0.72, 1, 1);
      }
      const back = addMesh(head, new THREE.SphereGeometry(0.16, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat, 0, 0.1, -0.05);
      back.scale.set(1.02, 1.18, 0.95);
      for (let i = 0; i < 4; i++) {
        const bang = addMesh(head, new THREE.CapsuleGeometry(0.028, 0.07, 4, 10), hairMat, -0.1 + i * 0.067, 0.185, 0.092);
        bang.rotation.x = 0.42;
        bang.rotation.z = Math.PI / 2 + (i - 1.5) * 0.06;
      }
      // Accent streak
      const streak = addMesh(head, new THREE.CapsuleGeometry(0.018, 0.14, 4, 8), mat(p.accent ?? 0xffd43b, { rough: 0.4 }), 0.118, 0.14, 0.045);
      streak.rotation.z = Math.PI / 2 - 0.35;
      break;
    }
    case "rex": {
      // Buzz cut handled by underHair; add beard
      if (p.beard !== false) {
        const beard = new THREE.Mesh(new THREE.SphereGeometry(0.142, 18, 14, Math.PI * 0.15, Math.PI * 1.7, Math.PI * 0.6, Math.PI * 0.4), hairMat);
        beard.position.set(0, 0.05, 0.02);
        beard.castShadow = true;
        head.add(beard);
      }
      break;
    }
  }

  // Cap — crown hugs the skull, brim rounds off with a rim torus
  if (p.cap) {
    const capMat = mat(p.cap, FABRIC);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.187, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.52), capMat);
    crown.position.set(0, 0.21, 0);
    crown.scale.set(1.06, 0.95, 1.06);
    crown.castShadow = true;
    head.add(crown);
    addMesh(head, new THREE.SphereGeometry(0.027, 10, 8), capMat, 0, 0.36, 0).castShadow = false;
    // Brim — squashed dome disc
    const brim = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
      capMat,
    );
    brim.position.set(0, 0.255, p.capBrimBack ? -0.12 : 0.12);
    brim.scale.set(1.02, 0.16, 1.32);
    if (p.capBrimBack) brim.rotation.y = Math.PI;
    brim.rotation.x = p.capBrimBack ? 0.5 : -0.35;
    brim.castShadow = true;
    head.add(brim);
  }

  buildFace(head, p.skin, p);

  // Perks: headphones for Zoe, chain for Rex
  if (p.accent && p.id === "zoe") {
    const bandMat = mat(p.accent, { rough: 0.35, metal: 0.3 });
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.022, 8, 20, Math.PI), bandMat);
    band.position.set(0, 0.15, 0);
    band.rotation.z = -0.06;
    head.add(band);
    for (const sx of [-0.2, 0.2]) {
      const cup = addMesh(head, new THREE.CylinderGeometry(0.063, 0.063, 0.05, 14), bandMat, sx * 0.81, 0.06, 0.01);
      cup.rotation.z = Math.PI / 2;
      const pad = addMesh(head, new THREE.CylinderGeometry(0.053, 0.053, 0.018, 14), mat(0x1c1917, { rough: 0.9 }), sx * 0.85, 0.06, 0.01);
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

/** Rounded sneaker: curved midsole, toe cap, lace roll — zero hard boxes. */
function buildShoe(parent: THREE.Object3D, upper: number, sole: number): void {
  const upperMat = mat(upper, FABRIC);
  const soleMat = mat(sole, RUBBER);
  const shoe = new THREE.Group();
  shoe.position.set(0, -0.42, 0.045);
  parent.add(shoe);

  // Midsole — capsule lying along z, widened, squashed
  const mid = addMesh(shoe, new THREE.CapsuleGeometry(0.056, 0.15, 8, 14), mat(0xf4f2ee, { rough: 0.5 }), 0, -0.06, 0.01);
  mid.rotation.x = Math.PI / 2;
  mid.scale.set(1.35, 1, 0.85);
  // Outsole tread
  const tread = addMesh(shoe, new THREE.CapsuleGeometry(0.058, 0.15, 8, 14), soleMat, 0, -0.082, 0.01);
  tread.rotation.x = Math.PI / 2;
  tread.scale.set(1.34, 1, 0.86);
  tread.scale.y = 0.5;
  // Upper — heel-high wedge
  const up = addMesh(shoe, new THREE.SphereGeometry(0.095, 14, 12), upperMat, 0, 0.005, -0.03);
  up.scale.set(0.95, 0.85, 1.28);
  // Toe cap
  const toe = addMesh(shoe, new THREE.SphereGeometry(0.062, 12, 10), upperMat, 0, -0.028, 0.115);
  toe.scale.set(1.15, 0.7, 1.05);
  // Heel counter
  const heel = addMesh(shoe, new THREE.SphereGeometry(0.062, 10, 10), soleMat, 0, 0.01, -0.125);
  heel.scale.set(1.05, 1.05, 0.7);
  // Lace roll across the throat
  const lace = addMesh(shoe, new THREE.CapsuleGeometry(0.014, 0.1, 4, 8), mat(0xf1f3f5, { rough: 0.6 }), 0, 0.075, 0.02);
  lace.rotation.z = Math.PI / 2;
  // Ankle collar
  const collar = addMesh(shoe, new THREE.TorusGeometry(0.062, 0.022, 8, 14), upperMat, 0, 0.085, -0.05);
  collar.rotation.x = Math.PI / 2;
  collar.castShadow = false;
}

// -------------------------------------------------------------- body build

export function buildCharacter(p: CharacterPalette): CharacterRig {
  const skinMat = mat(p.skin, SKIN);
  const torsoMat = mat(p.torso, FABRIC);
  const sleeveMat = p.sleeves != null ? mat(p.sleeves, FABRIC) : skinMat;
  const pantsMat = mat(p.pants, p.style === "bomber" ? DENIM : FABRIC);

  const root = new THREE.Group();
  const spin = limbGroup(root, 0, 0.55, 0); // pivot for roll flips
  const hips = limbGroup(spin, 0, 0.37, 0); // world y ≈ 0.92

  const stocky = p.id === "rex" ? 1.12 : 1;

  // Pelvis — rounded shell, slightly wider than the waist
  const pelvis = latheBody(
    [
      [0.155, -0.12],
      [0.185, -0.05],
      [0.19, 0.02],
      [0.175, 0.07],
      [0.001, 0.09],
    ],
    pantsMat,
    0.74,
  );
  pelvis.position.y = 0.0;
  pelvis.scale.set(stocky, 1, 1);
  hips.add(pelvis);

  // Torso — one lathe shell: waist taper → chest flare → shoulder slope
  const torso = limbGroup(hips, 0, 0.06, 0);
  const body = latheBody(
    [
      [0.165, 0.0],
      [0.15, 0.1],
      [0.18, 0.3],
      [0.225, 0.44],
      [0.215, 0.52],
      [0.135, 0.575],
      [0.001, 0.59],
    ],
    torsoMat,
    0.72,
  );
  body.scale.x = stocky;
  torso.add(body);

  switch (p.style ?? "hoodie") {
    case "hoodie": {
      // Hood bunched behind the neck — two-lobe roll
      for (const sx of [-0.075, 0.075]) {
        const lobe = addMesh(torso, new THREE.SphereGeometry(0.085, 12, 10), torsoMat, sx, 0.52, -0.135);
        lobe.scale.set(1.15, 0.7, 0.85);
      }
      // Kangaroo pocket — rounded pouch on the belly
      const pocket = addMesh(torso, new THREE.CapsuleGeometry(0.055, 0.14, 6, 12), torsoMat, 0, 0.16, 0.118);
      pocket.rotation.z = Math.PI / 2;
      pocket.scale.set(1, 1, 0.5);
      // Drawstrings + aglets
      for (const sx of [-0.06, 0.06]) {
        const cord = addMesh(torso, new THREE.CylinderGeometry(0.008, 0.008, 0.1, 6), mat(0xf8f5f0, FABRIC), sx, 0.44, 0.132);
        cord.rotation.x = 0.1;
        cord.castShadow = false;
        addMesh(torso, new THREE.CylinderGeometry(0.011, 0.011, 0.024, 6), mat(0xd9d5cf, FABRIC), sx, 0.385, 0.136).castShadow = false;
      }
      // Ribbed hem — torus ring at the waist
      const hem = new THREE.Mesh(new THREE.TorusGeometry(0.163, 0.028, 10, 22), mat(new THREE.Color(p.torso).multiplyScalar(0.82).getHex(), FABRIC));
      hem.rotation.x = Math.PI / 2;
      hem.scale.set(stocky, 1, 0.74);
      hem.position.y = 0.035;
      hem.castShadow = true;
      torso.add(hem);
      break;
    }
    case "bomber": {
      // Collar — upright torus roll around the neck
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.032, 10, 20), mat(p.sleeves ?? p.torso, FABRIC));
      collar.rotation.x = Math.PI / 2 - 0.12;
      collar.position.set(0, 0.545, 0.01);
      collar.castShadow = true;
      torso.add(collar);
      // Zipper — slim metal rail up the chest, following the curve
      const zip = addMesh(torso, new THREE.CapsuleGeometry(0.007, 0.4, 4, 8), mat(0xdfe3e6, { rough: 0.35, metal: 0.6 }), 0, 0.27, 0.128);
      zip.scale.set(1, 1, 0.4);
      zip.castShadow = false;
      // Zipper pull
      addMesh(torso, new THREE.SphereGeometry(0.016, 8, 8), mat(0xced4da, METAL), 0, 0.1, 0.13).castShadow = false;
      // Ribbed cuffs + hem
      const hem = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.03, 10, 22), mat(p.sleeves ?? p.torso, FABRIC));
      hem.rotation.x = Math.PI / 2;
      hem.scale.set(stocky, 1, 0.74);
      hem.position.y = 0.03;
      torso.add(hem);
      break;
    }
    case "tank": {
      // Skin shoulders + chest above the tank line
      for (const sx of [-1, 1]) {
        const delt = addMesh(torso, new THREE.SphereGeometry(0.105, 14, 12), skinMat, sx * 0.155, 0.5, 0);
        delt.scale.set(1.15, 0.9, 0.95);
        delt.castShadow = false;
      }
      // Upper-chest skin plate
      const chestSkin = addMesh(torso, new THREE.SphereGeometry(0.16, 14, 12), skinMat, 0, 0.47, 0.02);
      chestSkin.scale.set(0.95, 0.62, 0.72);
      chestSkin.castShadow = false;
      // Contrast stripe across the tank
      const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.186, 0.024, 10, 22), mat(0xf8f5f0, FABRIC));
      stripe.rotation.x = Math.PI / 2;
      stripe.scale.set(stocky, 1, 0.74);
      stripe.position.y = 0.2;
      stripe.castShadow = false;
      torso.add(stripe);
      break;
    }
    case "uniform": {
      // Shirt collar + tie
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.026, 10, 20), mat(0xf8f5f0, FABRIC));
      collar.rotation.x = Math.PI / 2 - 0.14;
      collar.position.set(0, 0.545, 0.015);
      torso.add(collar);
      const tie = addMesh(torso, new THREE.CapsuleGeometry(0.028, 0.16, 6, 10), mat(0x343a40, FABRIC), 0, 0.36, 0.122);
      tie.scale.set(1.25, 1, 0.42);
      // Belt + brass buckle
      const belt = new THREE.Mesh(new THREE.TorusGeometry(0.166, 0.024, 10, 22), mat(0x212529, FABRIC));
      belt.rotation.x = Math.PI / 2;
      belt.scale.set(stocky, 1, 0.75);
      belt.position.y = 0.05;
      torso.add(belt);
      addMesh(torso, new THREE.CapsuleGeometry(0.02, 0.03, 4, 8), mat(0xffd43b, METAL), 0, 0.05, 0.126).castShadow = false;
      // Epaulettes — rounded shoulder boards
      for (const sx of [-0.17 * stocky, 0.17 * stocky]) {
        const epp = addMesh(torso, new THREE.CapsuleGeometry(0.026, 0.07, 4, 10), mat(0x212529, FABRIC), sx, 0.55, 0);
        epp.rotation.z = Math.PI / 2;
        epp.scale.set(1, 1, 0.8);
      }
      // Chest pockets
      for (const sx of [-0.115 * stocky, 0.115 * stocky]) {
        const pk = addMesh(torso, new THREE.CapsuleGeometry(0.032, 0.05, 4, 10), mat(new THREE.Color(p.torso).multiplyScalar(0.85).getHex(), FABRIC), sx, 0.34, 0.118);
        pk.scale.set(1.1, 1, 0.35);
      }
      break;
    }
  }

  // Backpack — rounded pack with roll-top and straps
  if (p.backpack) {
    const bpMat = mat(p.backpack, FABRIC);
    const bp = addMesh(torso, new THREE.SphereGeometry(0.185, 16, 14), bpMat, 0, 0.3, -0.2);
    bp.scale.set(1.05, 1.3, 0.62);
    bp.name = "backpack";
    // Roll top
    const roll = addMesh(torso, new THREE.CapsuleGeometry(0.055, 0.22, 6, 10), mat(new THREE.Color(p.backpack).multiplyScalar(0.8).getHex(), FABRIC), 0, 0.51, -0.19);
    roll.rotation.z = Math.PI / 2;
    roll.scale.set(1, 1, 0.75);
    // Front pocket
    const fp = addMesh(torso, new THREE.SphereGeometry(0.1, 12, 10), mat(new THREE.Color(p.backpack).multiplyScalar(0.88).getHex(), FABRIC), 0, 0.2, -0.26);
    fp.scale.set(1.1, 0.85, 0.5);
    // Straps over the shoulders
    for (const sx of [-0.11 * stocky, 0.11 * stocky]) {
      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.018, 8, 16, Math.PI * 1.15), bpMat);
      strap.position.set(sx, 0.45, -0.06);
      strap.rotation.y = Math.PI / 2;
      strap.rotation.z = Math.PI / 2;
      strap.castShadow = false;
      torso.add(strap);
    }
  }

  // Head
  const head = buildHead(torso, p);

  // Arms — deltoid cap → upper arm → elbow → forearm → hand
  const limbBulk = p.id === "rex" ? 1.16 : 1;
  const upperArmGeo = new THREE.CapsuleGeometry(0.08 * limbBulk, 0.15, 6, 12);
  const foreArmGeo = new THREE.CapsuleGeometry(0.066 * limbBulk, 0.15, 6, 12);
  const makeArm = (side: -1 | 1): { shoulder: THREE.Group; elbow: THREE.Group } => {
    const shoulder = limbGroup(torso, side * 0.29 * stocky, 0.515, 0);
    const capMesh = addMesh(shoulder, new THREE.SphereGeometry(0.096 * limbBulk, 14, 12), sleeveMat, 0, 0.01, 0);
    capMesh.castShadow = false;
    addMesh(shoulder, upperArmGeo, sleeveMat, 0, -0.125, 0);
    const elbow = limbGroup(shoulder, 0, -0.26, 0);
    // Elbow patch — rounds the joint
    const elbowCap = addMesh(elbow, new THREE.SphereGeometry(0.068 * limbBulk, 12, 10), sleeveMat, 0, 0.005, 0);
    elbowCap.castShadow = false;
    addMesh(elbow, foreArmGeo, skinMat, 0, -0.115, 0);
    // Sleeve cuff rolled just above the elbow
    if (p.sleeves != null) {
      const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.062 * limbBulk, 0.02, 8, 16), sleeveMat);
      cuff.rotation.x = Math.PI / 2;
      cuff.position.y = -0.035;
      cuff.castShadow = false;
      elbow.add(cuff);
    }
    const hand = addMesh(elbow, new THREE.SphereGeometry(0.066 * limbBulk, 12, 10), skinMat, 0, -0.255, 0.005);
    hand.scale.set(0.88, 1.08, 0.9);
    // Thumb bump
    const thumb = addMesh(elbow, new THREE.SphereGeometry(0.024, 8, 8), skinMat, side * 0.05, -0.26, 0.02);
    thumb.castShadow = false;
    if (p.wristbands) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.02, 8, 16), mat(p.accent ?? 0xffd43b, FABRIC));
      band.rotation.x = Math.PI / 2;
      band.position.y = -0.205;
      band.castShadow = false;
      elbow.add(band);
    }
    return { shoulder, elbow };
  };
  const armL = makeArm(-1);
  const armR = makeArm(1);

  // Legs — hip → thigh → knee → shin → rounded sneaker
  const thighGeo = new THREE.CapsuleGeometry(0.092, 0.18, 6, 12);
  const shinGeo = new THREE.CapsuleGeometry(0.074, 0.2, 6, 12);
  const makeLeg = (side: -1 | 1): { hip: THREE.Group; knee: THREE.Group } => {
    const hip = limbGroup(hips, side * 0.13 * stocky, -0.02, 0);
    const thigh = addMesh(hip, thighGeo, pantsMat, 0, -0.17, 0);
    thigh.scale.set(1, 1, 0.92);
    // Hip/shorts cuff rounds the join into the pelvis
    const hipCuff = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.024, 8, 16), pantsMat);
    hipCuff.rotation.x = Math.PI / 2;
    hipCuff.position.y = -0.05;
    hipCuff.castShadow = false;
    hip.add(hipCuff);
    const knee = limbGroup(hip, 0, -0.37, 0.015);
    const kneeCap = addMesh(knee, new THREE.SphereGeometry(0.072, 12, 10), pantsMat, 0, 0.01, 0);
    kneeCap.castShadow = false;
    const shin = addMesh(knee, shinGeo, pantsMat, 0, -0.14, 0);
    shin.scale.set(1, 1, 0.95);
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
        r.torso.scale.set(1 + breathe * 0.012, 1 + breathe * 0.008, 1);
        r.torso.rotation.z = sway * 0.02;
        r.torso.rotation.x = 0.02;
        r.armL.rotation.x = -0.12 - breathe * 0.03;
        r.armR.rotation.x = -0.12 - breathe * 0.03;
        r.armL.rotation.z = -0.05;
        r.armR.rotation.z = 0.05;
        r.elbowL.rotation.x = -0.3 - breathe * 0.05;
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
  const snout = addMesh(head, new THREE.CapsuleGeometry(0.05, 0.09, 6, 10), furMat, 0, -0.005, 0.145);
  snout.rotation.x = Math.PI / 2 + 0.06;
  snout.scale.set(1.15, 1, 0.9);
  const jaw = addMesh(head, new THREE.CapsuleGeometry(0.032, 0.07, 6, 10), darkMat, 0, -0.06, 0.125);
  jaw.rotation.x = Math.PI / 2 + 0.08;
  jaw.scale.set(1.2, 1, 0.9);
  const nose = addMesh(head, new THREE.SphereGeometry(0.032, 8, 8), mat(0x1c1917, RUBBER), 0, 0.02, 0.205);
  nose.castShadow = false;
  // Eyes + brows
  for (const sx of [-1, 1]) {
    const eye = addMesh(head, new THREE.SphereGeometry(0.026, 8, 8), mat(0x241d1a, { rough: 0.3 }), sx * 0.07, 0.06, 0.115);
    eye.scale.set(1, 1, 0.6);
    eye.castShadow = false;
    const brow = addMesh(head, new THREE.CapsuleGeometry(0.007, 0.03, 4, 6), darkMat, sx * 0.07, 0.095, 0.115);
    brow.rotation.z = Math.PI / 2 + sx * -0.2;
    brow.castShadow = false;
    // Floppy ears — rounded flaps
    const ear = addMesh(head, new THREE.CapsuleGeometry(0.03, 0.09, 6, 10), darkMat, sx * 0.14, 0.0, -0.01);
    ear.scale.set(0.8, 1, 1.15);
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
