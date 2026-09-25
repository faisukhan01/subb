import * as THREE from "three";
import type { CharacterPalette } from "./Config";

/**
 * SUBB SURFERS — realistic character rigs (GTA-grade anatomy).
 *
 * Every runner is built to real human proportions (~7.5 heads tall, 1.78 m
 * reference height): a proper skull with brow ridge, deep-set small eyes,
 * nose bridge, lips and jawline; lathe-turned organic torso shells with a
 * natural chest/waist silhouette; capsule limb chains with real joints
 * (shoulder→elbow→wrist, hip→knee→ankle); layered clothing (tees with
 * sleeves that actually end mid-bicep, bombers with ribbed collar/cuffs,
 * belts, chains) and realistic sneakers with midsoles and lace rows.
 * Zero primitive boxes anywhere.
 *
 * Joint map (all pivots at joint origin, meshes offset outward):
 *   root (feet, y=0) → spin (y=0.98, waist — flips/rolls pivot here)
 *     ├→ hips (legs: hipL/R → kneeL/R → shoe)
 *     └→ torso (+0.12) → neck → head
 *                      └→ shoulderL/R (→ elbowL/R → hand)
 *
 * Realistic reference landmarks (rig authored facing +z, metres):
 *   ankle 0.09 · knee 0.51 · hip 0.94 · waist 0.98 · chest 1.26
 *   shoulder line 1.44 · neck base 1.50 · head centre 1.615 · top ≈ 1.78
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
    roughness: opts.rough ?? 0.8,
    metalness: opts.metal ?? 0,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
  });

const SKIN = { rough: 0.52 };
const HAIR = { rough: 0.38 };
const FABRIC = { rough: 0.92 };
const DENIM = { rough: 0.84 };
const LEATHER = { rough: 0.45 };
const RUBBER = { rough: 0.55 };
const METAL = { rough: 0.3, metal: 0.8 };

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
 * Lathe-turned organic shell from a (radius, height) profile. Elliptical
 * depth via z-scale gives the natural chest/back cross-section — the core
 * of the realistic silhouette.
 */
function latheBody(
  profile: Array<[number, number]>,
  material: THREE.Material,
  zSquash = 0.62,
): THREE.Mesh {
  const pts = profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.001), y));
  const geo = new THREE.LatheGeometry(pts, 24);
  const m = new THREE.Mesh(geo, material);
  m.scale.z = zSquash;
  m.castShadow = true;
  return m;
}

// ------------------------------------------------------------------- pieces

/**
 * Realistic face on a life-scale head: small deep-set eyes with lash lines,
 * brow ridge, nose bridge + tip, two-part lips, ears, and a jaw mass that
 * gives the skull a real chin line. Feature placement is tuned for the
 * game camera distance (2.5–9 m) so the face reads without cartoon oversize.
 */
function buildFace(head: THREE.Group, skin: number, palette: CharacterPalette): void {
  const skinMat = mat(skin, SKIN);
  const darkMat = mat(0x201a17, { rough: 0.3 });
  const whiteMat = mat(0xf4f1ec, { rough: 0.22 });
  const irisMat = mat(0x3c2a1c, { rough: 0.28 });

  // Ears — small, close to the skull
  for (const sx of [-1, 1]) {
    const ear = addMesh(head, new THREE.SphereGeometry(0.023, 10, 8), skinMat, sx * 0.092, 0.115, -0.004);
    ear.scale.set(0.5, 1.05, 0.78);
    ear.castShadow = false;
  }

  if (palette.sunglasses) {
    // Transit-inspector shades: flat dark visor + metal arms
    const lens = addMesh(head, new THREE.CapsuleGeometry(0.030, 0.115, 4, 12), mat(0x0d0f12, { rough: 0.16, metal: 0.45 }), 0, 0.132, 0.096);
    lens.rotation.z = Math.PI / 2;
    lens.scale.set(1, 1, 0.42);
    for (const sx of [-1, 1]) {
      const arm = addMesh(head, new THREE.CapsuleGeometry(0.005, 0.075, 4, 6), mat(0x2a2d33, METAL), sx * 0.086, 0.138, 0.028);
      arm.rotation.z = Math.PI / 2;
      arm.castShadow = false;
    }
    return;
  }

  // Eyes — small whites, brown iris, pupil, catchlight, upper lash
  for (const sx of [-1, 1]) {
    const white = addMesh(head, new THREE.SphereGeometry(0.0205, 14, 12), whiteMat, sx * 0.034, 0.126, 0.078);
    white.scale.set(1, 1.02, 0.5);
    white.castShadow = false;
    const iris = addMesh(head, new THREE.SphereGeometry(0.0112, 10, 8), irisMat, sx * 0.034, 0.124, 0.0935);
    iris.scale.set(1, 1, 0.5);
    iris.castShadow = false;
    const pupil = addMesh(head, new THREE.SphereGeometry(0.0056, 8, 6), darkMat, sx * 0.034, 0.124, 0.1005);
    pupil.castShadow = false;
    const glint = addMesh(head, new THREE.SphereGeometry(0.0026, 6, 6), whiteMat, sx * 0.0385, 0.1305, 0.1035);
    glint.castShadow = false;
    // Upper lash line — defines the eye without cartoon scale
    const lash = addMesh(head, new THREE.CapsuleGeometry(0.0038, 0.028, 4, 8), darkMat, sx * 0.034, 0.1435, 0.089);
    lash.rotation.z = Math.PI / 2 + sx * 0.05;
    lash.scale.z = 0.5;
    lash.castShadow = false;
  }

  // Brows — straight, masculine/neutral, hair coloured
  const browMat = mat(palette.hair, HAIR);
  for (const sx of [-1, 1]) {
    const brow = addMesh(head, new THREE.CapsuleGeometry(0.0062, 0.036, 4, 8), browMat, sx * 0.037, 0.167, 0.086);
    brow.rotation.z = Math.PI / 2 + sx * 0.04;
    brow.scale.z = 0.55;
    brow.castShadow = false;
  }

  // Nose — bridge wedge + tip ball + nostril shading hint
  const bridge = addMesh(head, new THREE.ConeGeometry(0.0105, 0.052, 8), skinMat, 0, 0.116, 0.0985);
  bridge.rotation.x = -1.36;
  bridge.castShadow = false;
  const noseTip = addMesh(head, new THREE.SphereGeometry(0.0125, 10, 8), skinMat, 0, 0.0945, 0.1085);
  noseTip.scale.set(1.1, 0.92, 1);
  noseTip.castShadow = false;

  // Lips — two-part, muted terracotta
  const lipMat = mat(0xa8685a, { rough: 0.5 });
  const lipUp = addMesh(head, new THREE.CapsuleGeometry(0.0048, 0.026, 4, 8), lipMat, 0, 0.0595, 0.0955);
  lipUp.rotation.z = Math.PI / 2;
  lipUp.scale.z = 0.55;
  lipUp.castShadow = false;
  const lipLo = addMesh(head, new THREE.CapsuleGeometry(0.0064, 0.027, 4, 8), lipMat, 0, 0.0445, 0.095);
  lipLo.rotation.z = Math.PI / 2;
  lipLo.scale.z = 0.6;
  lipLo.castShadow = false;
}

/** Head + realistic hair/headwear per palette. Returns the head joint (pivot at neck base). */
function buildHead(parent: THREE.Object3D, p: CharacterPalette): THREE.Group {
  const head = limbGroup(parent, 0, 0.4, 0); // neck base, world y ≈ 1.50
  const skinMat = mat(p.skin, SKIN);

  // Neck + trapezius blend
  addMesh(head, new THREE.CylinderGeometry(0.047, 0.058, 0.09, 12), skinMat, 0, -0.015, -0.004);
  const traps = addMesh(head, new THREE.SphereGeometry(0.05, 12, 10), skinMat, 0, -0.038, -0.012);
  traps.scale.set(1.7, 0.55, 1);
  traps.castShadow = false;

  // Skull — realistic cranium (half-axes ≈ 93 × 108 × 97 mm)
  const skull = addMesh(head, new THREE.SphereGeometry(0.093, 28, 22), skinMat, 0, 0.115, 0);
  skull.scale.set(1, 1.16, 1.04);
  // Jaw mass — real chin/jawline under the skull
  const jaw = addMesh(head, new THREE.SphereGeometry(0.088, 20, 16), skinMat, 0, 0.068, 0.014);
  jaw.scale.set(0.87, 0.56, 0.93);

  const hairMat = mat(p.hair, HAIR);

  // Base hair: tight scalp shell so the hairline reads under any headwear
  const scalp = new THREE.Mesh(
    new THREE.SphereGeometry(0.0945, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.52),
    hairMat,
  );
  scalp.position.set(0, 0.118, -0.004);
  scalp.scale.set(1.0, 1.14, 1.02);
  scalp.castShadow = true;
  head.add(scalp);

  switch (p.id) {
    case "max": {
      // Short crop with a crisp lineup — flat-ish top via squashed cap shell
      const top = addMesh(head, new THREE.SphereGeometry(0.09, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.38), hairMat, 0, 0.128, -0.004);
      top.scale.set(1.0, 0.85, 1.0);
      top.castShadow = false;
      break;
    }
    case "zoe": {
      // Sleek pulled-back hair gathered into a high bun
      const back = new THREE.Mesh(
        new THREE.SphereGeometry(0.0975, 20, 16, 0, Math.PI * 2, Math.PI * 0.18, Math.PI * 0.52),
        hairMat,
      );
      back.position.set(0, 0.115, -0.012);
      back.scale.set(1.0, 1.12, 1.0);
      back.castShadow = true;
      head.add(back);
      const bun = addMesh(head, new THREE.SphereGeometry(0.048, 14, 12), hairMat, 0, 0.235, -0.055);
      bun.scale.set(1, 0.9, 1);
      const tie = addMesh(head, new THREE.TorusGeometry(0.03, 0.008, 8, 14), mat(0x1c1917, FABRIC), 0, 0.205, -0.042);
      tie.rotation.x = 0.5;
      tie.castShadow = false;
      // Gold hoops
      for (const sx of [-1, 1]) {
        const hoop = addMesh(head, new THREE.TorusGeometry(0.017, 0.0032, 6, 14), mat(0xd4a53a, METAL), sx * 0.095, 0.098, 0.004);
        hoop.rotation.y = Math.PI / 2;
        hoop.castShadow = false;
      }
      break;
    }
    case "rex": {
      // Dense beard + connected mustache over the buzzed scalp
      const beard = new THREE.Mesh(
        new THREE.SphereGeometry(0.089, 20, 16, Math.PI * 0.62, Math.PI * 1.76, Math.PI * 0.55, Math.PI * 0.42),
        hairMat,
      );
      beard.position.set(0, 0.052, 0.012);
      beard.scale.set(0.94, 0.82, 1.0);
      beard.castShadow = true;
      head.add(beard);
      const stache = addMesh(head, new THREE.CapsuleGeometry(0.009, 0.042, 4, 8), hairMat, 0, 0.072, 0.094);
      stache.rotation.z = Math.PI / 2;
      stache.scale.z = 0.7;
      stache.castShadow = false;
      break;
    }
  }

  // Cap — low crown that hugs the skull, real flat brim
  if (p.cap) {
    const capMat = mat(p.cap, FABRIC);
    const crown = new THREE.Mesh(
      new THREE.SphereGeometry(0.0995, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.55),
      capMat,
    );
    crown.position.set(0, 0.175, -0.002);
    crown.scale.set(1.04, 0.92, 1.06);
    crown.castShadow = true;
    head.add(crown);
    // Squatchee
    addMesh(head, new THREE.SphereGeometry(0.012, 8, 6), capMat, 0, 0.262, -0.002).castShadow = false;
    // Flat brim (snapback): thin cylinder disc, slightly curved down at edges
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.083, 0.0075, 20, 1, false), capMat);
    brim.scale.set(1.05, 1, 0.92);
    brim.position.set(0, 0.196, p.capBrimBack ? -0.072 : 0.095);
    if (!p.capBrimBack) brim.rotation.x = -0.14;
    else brim.rotation.x = 0.1;
    brim.castShadow = true;
    head.add(brim);
  }

  buildFace(head, p.skin, p);

  // Zoe: headphones resting around the neck (band under the jaw, cups at collar)
  if (p.accent && p.id === "zoe") {
    const bandMat = mat(0x23262b, { rough: 0.4, metal: 0.3 });
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.014, 8, 20, Math.PI), bandMat);
    band.position.set(0, 0.02, -0.01);
    band.rotation.set(0.35, 0, 0);
    head.add(band);
    for (const sx of [-0.105, 0.105]) {
      const cup = addMesh(head, new THREE.CylinderGeometry(0.045, 0.045, 0.036, 14), bandMat, sx, -0.055, 0.02);
      cup.rotation.z = Math.PI / 2;
      cup.castShadow = false;
    }
  }

  return head;
}

/** Realistic low-profile sneaker: midsole, outsole, toe cap, lace rows, collar. */
function buildShoe(parent: THREE.Object3D, upper: number, sole: number): void {
  const upperMat = mat(upper, FABRIC);
  const soleMat = mat(sole, RUBBER);
  const shoe = new THREE.Group();
  shoe.position.set(0, -0.415, 0.03);
  parent.add(shoe);

  // Midsole — white foam wedge
  const mid = addMesh(shoe, new THREE.CapsuleGeometry(0.0305, 0.15, 6, 12), mat(0xe9e6df, { rough: 0.5 }), 0, -0.052, 0.012);
  mid.rotation.x = Math.PI / 2;
  mid.scale.set(1.28, 1, 0.9);
  // Outsole — dark rubber tread
  const tread = addMesh(shoe, new THREE.CapsuleGeometry(0.0315, 0.152, 6, 12), soleMat, 0, -0.075, 0.012);
  tread.rotation.x = Math.PI / 2;
  tread.scale.set(1.26, 0.55, 0.9);
  // Upper — heel-high vamp
  const up = addMesh(shoe, new THREE.SphereGeometry(0.052, 14, 12), upperMat, 0, 0.004, -0.018);
  up.scale.set(0.88, 0.78, 1.5);
  // Toe cap
  const toe = addMesh(shoe, new THREE.SphereGeometry(0.038, 12, 10), upperMat, 0, -0.022, 0.104);
  toe.scale.set(1.05, 0.62, 1.0);
  // Heel counter
  const heel = addMesh(shoe, new THREE.SphereGeometry(0.038, 10, 8), soleMat, 0, 0.006, -0.098);
  heel.scale.set(0.95, 1.0, 0.6);
  // Lace rows — two slim bars across the throat
  const laceMat = mat(0xe8e8e4, { rough: 0.6 });
  for (const [lz, ll] of [
    [0.005, 0.052],
    [0.048, 0.044],
  ] as const) {
    const lace = addMesh(shoe, new THREE.CapsuleGeometry(0.0055, ll, 4, 6), laceMat, 0, 0.048, lz);
    lace.rotation.z = Math.PI / 2;
    lace.castShadow = false;
  }
  // Ankle collar
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.038, 0.014, 8, 14), upperMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, 0.052, -0.038);
  collar.castShadow = false;
  shoe.add(collar);
}

// -------------------------------------------------------------- body build

export function buildCharacter(p: CharacterPalette): CharacterRig {
  const skinMat = mat(p.skin, SKIN);
  const torsoMat = mat(p.torso, FABRIC);
  const sleeveMat = p.sleeves != null ? mat(p.sleeves, FABRIC) : skinMat;
  const pantsMat = mat(p.pants, p.style === "bomber" ? DENIM : FABRIC);

  const stocky = p.id === "rex" ? 1.16 : p.id === "zoe" ? 0.94 : 1;
  const tall = p.id === "rex" ? 1.045 : p.id === "zoe" ? 0.945 : 1;

  const root = new THREE.Group();
  root.scale.setScalar(tall);
  const spin = limbGroup(root, 0, 0.98, 0); // waist pivot (world y ≈ 0.98)
  const hips = limbGroup(spin, 0, 0, 0); // hip joints hang at -0.05

  // Pelvis — organic shell with real hip width
  const pelvis = latheBody(
    [
      [0.108, -0.135],
      [0.138, -0.075],
      [0.15, -0.005],
      [0.142, 0.05],
      [0.09, 0.085],
      [0.001, 0.1],
    ],
    pantsMat,
    0.68,
  );
  pelvis.scale.x = stocky;
  hips.add(pelvis);

  // Torso — one lathe shell: waist taper → ribcage flare → shoulder slope
  const torso = limbGroup(hips, 0, 0.12, 0);
  const body = latheBody(
    [
      [0.121, 0.0],
      [0.115, 0.055],
      [0.128, 0.14],
      [0.15, 0.235],
      [0.155, 0.3],
      [0.118, 0.355],
      [0.052, 0.375],
      [0.001, 0.383],
    ],
    torsoMat,
    0.62,
  );
  body.scale.x = stocky;
  torso.add(body);

  // Chest/pec volume in front (skin or fabric depending on style)
  if (p.style === "tank") {
    const chest = addMesh(torso, new THREE.SphereGeometry(0.118, 16, 14), skinMat, 0, 0.27, 0.035);
    chest.scale.set(stocky * 0.95, 0.68, 0.72);
    chest.castShadow = false;
    // Deltoids — bare shoulders
    for (const sx of [-1, 1]) {
      const delt = addMesh(torso, new THREE.SphereGeometry(0.062, 14, 12), skinMat, sx * 0.135 * stocky, 0.325, 0);
      delt.scale.set(1.15, 0.95, 1);
      delt.castShadow = false;
    }
    // Gold chain over the tank
    const chain = new THREE.Mesh(new THREE.TorusGeometry(0.098, 0.011, 8, 22), mat(0xd4a53a, METAL));
    chain.rotation.x = Math.PI / 2 - 0.5;
    chain.position.set(0, 0.315, 0.045);
    chain.scale.set(stocky, 1, 0.85);
    chain.castShadow = false;
    torso.add(chain);
  }

  switch (p.style ?? "tee") {
    case "tee": {
      // Crew neckline + hem line; sleeves are separate short caps on the arms
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.016, 8, 18), mat(new THREE.Color(p.torso).multiplyScalar(0.88).getHex(), FABRIC));
      collar.rotation.x = Math.PI / 2 - 0.18;
      collar.position.set(0, 0.362, 0.012);
      collar.castShadow = false;
      torso.add(collar);
      const hem = new THREE.Mesh(new THREE.TorusGeometry(0.128, 0.02, 8, 22), mat(new THREE.Color(p.torso).multiplyScalar(0.9).getHex(), FABRIC));
      hem.rotation.x = Math.PI / 2;
      hem.scale.set(stocky, 1, 0.64);
      hem.position.y = 0.028;
      hem.castShadow = false;
      torso.add(hem);
      // Belt over baggy jeans
      const belt = new THREE.Mesh(new THREE.TorusGeometry(0.142, 0.02, 8, 22), mat(0x2a2622, LEATHER));
      belt.rotation.x = Math.PI / 2;
      belt.scale.set(stocky, 1, 0.7);
      belt.position.y = 0.065;
      belt.castShadow = false;
      torso.add(belt);
      addMesh(torso, new THREE.CapsuleGeometry(0.016, 0.02, 4, 8), mat(0xb8b2a6, METAL), 0, 0.065, 0.098).castShadow = false;
      break;
    }
    case "bomber": {
      // Upright ribbed collar, zip rail, ribbed hem — classic MA-1 lines
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.024, 10, 20), mat(p.sleeves ?? p.torso, FABRIC));
      collar.rotation.x = Math.PI / 2 - 0.16;
      collar.position.set(0, 0.358, 0.008);
      collar.castShadow = true;
      torso.add(collar);
      const zip = addMesh(torso, new THREE.CapsuleGeometry(0.006, 0.3, 4, 8), mat(0x9aa0a8, { rough: 0.35, metal: 0.6 }), 0, 0.19, 0.098);
      zip.scale.set(1, 1, 0.4);
      zip.castShadow = false;
      const hem = new THREE.Mesh(new THREE.TorusGeometry(0.126, 0.022, 8, 22), mat(p.sleeves ?? p.torso, FABRIC));
      hem.rotation.x = Math.PI / 2;
      hem.scale.set(stocky, 1, 0.64);
      hem.position.y = 0.026;
      hem.castShadow = false;
      torso.add(hem);
      break;
    }
    case "tank": {
      // Scoop hem + contrast stripe across the chest
      const hem = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.018, 8, 22), mat(new THREE.Color(p.torso).multiplyScalar(0.9).getHex(), FABRIC));
      hem.rotation.x = Math.PI / 2;
      hem.scale.set(stocky, 1, 0.64);
      hem.position.y = 0.05;
      hem.castShadow = false;
      torso.add(hem);
      break;
    }
    case "uniform": {
      // Transit inspector: shirt collar + tie + duty belt + epaulettes
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.064, 0.02, 8, 18), mat(0xf2f0ea, FABRIC));
      collar.rotation.x = Math.PI / 2 - 0.2;
      collar.position.set(0, 0.358, 0.012);
      collar.castShadow = false;
      torso.add(collar);
      const tie = addMesh(torso, new THREE.CapsuleGeometry(0.019, 0.13, 6, 10), mat(0x27313d, FABRIC), 0, 0.24, 0.094);
      tie.scale.set(1.25, 1, 0.4);
      const belt = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.022, 8, 22), mat(0x1b1d22, LEATHER));
      belt.rotation.x = Math.PI / 2;
      belt.scale.set(stocky, 1, 0.68);
      belt.position.y = 0.05;
      belt.castShadow = false;
      torso.add(belt);
      addMesh(torso, new THREE.CapsuleGeometry(0.017, 0.022, 4, 8), mat(0xd4a53a, METAL), 0, 0.05, 0.096).castShadow = false;
      for (const sx of [-0.128 * stocky, 0.128 * stocky]) {
        const epp = addMesh(torso, new THREE.CapsuleGeometry(0.017, 0.052, 4, 8), mat(0x1b1d22, FABRIC), sx, 0.352, 0);
        epp.rotation.z = Math.PI / 2;
        epp.scale.set(1, 1, 0.8);
        epp.castShadow = false;
      }
      // Radio on the belt
      const radio = addMesh(torso, new THREE.CapsuleGeometry(0.02, 0.05, 4, 8), mat(0x14161a, { rough: 0.5 }), -0.105 * stocky, 0.02, 0.098);
      radio.rotation.x = 0.25;
      radio.castShadow = false;
      break;
    }
  }

  // Backpack — rounded trail pack with roll-top and shoulder straps
  if (p.backpack) {
    const bpMat = mat(p.backpack, FABRIC);
    const bp = addMesh(torso, new THREE.SphereGeometry(0.13, 16, 14), bpMat, 0, 0.21, -0.135);
    bp.scale.set(1.0, 1.28, 0.62);
    bp.name = "backpack";
    const roll = addMesh(torso, new THREE.CapsuleGeometry(0.038, 0.16, 6, 10), mat(new THREE.Color(p.backpack).multiplyScalar(0.8).getHex(), FABRIC), 0, 0.35, -0.13);
    roll.rotation.z = Math.PI / 2;
    roll.scale.set(1, 1, 0.8);
    const fp = addMesh(torso, new THREE.SphereGeometry(0.07, 12, 10), mat(new THREE.Color(p.backpack).multiplyScalar(0.88).getHex(), FABRIC), 0, 0.13, -0.175);
    fp.scale.set(1.1, 0.85, 0.5);
    for (const sx of [-0.08 * stocky, 0.08 * stocky]) {
      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.013, 8, 16, Math.PI * 1.2), bpMat);
      strap.position.set(sx, 0.3, -0.045);
      strap.rotation.y = Math.PI / 2;
      strap.rotation.z = Math.PI / 2;
      strap.castShadow = false;
      torso.add(strap);
    }
  }

  // Head
  const head = buildHead(torso, p);

  // Arms — deltoid → upper arm → elbow → forearm → hand (real lengths)
  const limbBulk = p.id === "rex" ? 1.14 : 1;
  const upperArmGeo = new THREE.CapsuleGeometry(0.043 * limbBulk, 0.17, 6, 12);
  const foreArmGeo = new THREE.CapsuleGeometry(0.036 * limbBulk, 0.15, 6, 12);
  const makeArm = (side: -1 | 1): { shoulder: THREE.Group; elbow: THREE.Group } => {
    const shoulder = limbGroup(torso, side * 0.178 * stocky, 0.325, 0);
    // Deltoid cap — fabric or skin per style
    const capMat = p.style === "tank" ? skinMat : sleeveMat;
    const delt = addMesh(shoulder, new THREE.SphereGeometry(0.056 * limbBulk, 14, 12), capMat, side * 0.008, -0.005, 0);
    delt.castShadow = false;
    addMesh(shoulder, upperArmGeo, capMat, 0, -0.135, 0);

    const shortSleeve = p.style === "tee";
    const elbow = limbGroup(shoulder, 0, -0.295, 0);
    const elbowCap = addMesh(elbow, new THREE.SphereGeometry(0.04 * limbBulk, 12, 10), shortSleeve ? skinMat : sleeveMat, 0, 0.004, 0);
    elbowCap.castShadow = false;
    addMesh(elbow, foreArmGeo, shortSleeve ? skinMat : sleeveMat, 0, -0.12, 0);

    if (!shortSleeve && p.style !== "tank") {
      // Cuff at the wrist for long sleeves
      const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.038 * limbBulk, 0.012, 8, 14), sleeveMat);
      cuff.rotation.x = Math.PI / 2;
      cuff.position.y = -0.222;
      cuff.castShadow = false;
      elbow.add(cuff);
    }

    // Hand — palm + thumb, relaxed cup
    const palm = addMesh(elbow, new THREE.SphereGeometry(0.038 * limbBulk, 12, 10), skinMat, 0, -0.265, 0.004);
    palm.scale.set(0.82, 1.18, 0.5);
    const thumb = addMesh(elbow, new THREE.SphereGeometry(0.015 * limbBulk, 8, 8), skinMat, side * 0.026, -0.24, 0.014);
    thumb.castShadow = false;

    if (p.wristbands) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.012, 8, 14), mat(p.accent ?? 0xd4a53a, FABRIC));
      band.rotation.x = Math.PI / 2;
      band.position.y = -0.212;
      band.castShadow = false;
      elbow.add(band);
    }
    return { shoulder, elbow };
  };
  const armL = makeArm(-1);
  const armR = makeArm(1);

  // Tee sleeves — fabric caps over the top half of the upper arm
  if (p.style === "tee" && p.sleeves != null) {
    for (const sh of [armL.shoulder, armR.shoulder]) {
      const sleeve = addMesh(sh, new THREE.CapsuleGeometry(0.052 * limbBulk, 0.085, 6, 12), sleeveMat, 0, -0.075, 0);
      sleeve.castShadow = false;
      const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.05 * limbBulk, 0.012, 8, 14), sleeveMat);
      cuff.rotation.x = Math.PI / 2;
      cuff.position.y = -0.13;
      cuff.castShadow = false;
      sh.add(cuff);
    }
  }

  // Legs — hip → thigh → knee → shin → calf → sneaker (real lengths)
  const thighGeo = new THREE.CapsuleGeometry(0.062, 0.26, 6, 12);
  const shinGeo = new THREE.CapsuleGeometry(0.047, 0.24, 6, 12);
  const baggy = p.style === "tee" ? 1.14 : 1; // Marcus's baggy jeans
  const makeLeg = (side: -1 | 1): { hip: THREE.Group; knee: THREE.Group } => {
    const hip = limbGroup(hips, side * 0.096 * stocky, -0.05, 0);
    const thigh = addMesh(hip, thighGeo, pantsMat, 0, -0.185, 0);
    thigh.scale.set(baggy, 1, 0.95);
    // Hip blend into the pelvis
    const hipCuff = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.02, 8, 16), pantsMat);
    hipCuff.rotation.x = Math.PI / 2;
    hipCuff.position.y = -0.045;
    hipCuff.castShadow = false;
    hip.add(hipCuff);

    const knee = limbGroup(hip, 0, -0.425, 0.008);
    const kneeCap = addMesh(knee, new THREE.SphereGeometry(0.052, 12, 10), pantsMat, 0, 0.008, 0);
    kneeCap.castShadow = false;
    const shin = addMesh(knee, shinGeo, pantsMat, 0, -0.16, 0);
    shin.scale.set(1, 1, 0.95);
    // Calf bulge toward the back-upper shin
    const calf = addMesh(knee, new THREE.SphereGeometry(0.048, 12, 10), pantsMat, 0, -0.1, -0.02);
    calf.scale.set(1, 1.35, 0.9);
    calf.castShadow = false;
    buildShoe(knee, p.shoes, p.soleColor ?? 0x2a2622);
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
 * Roll flips are owned by the animator via `setRollProgress` (0..1).
 *
 * Conventions (rig authored facing +z):
 *  - negative rotation.x on a hanging limb swings it forward
 *  - knees only flex positive (heel back), elbows only flex negative
 */
export class CharacterAnimator {
  private runPhase = 0;
  private animTime = 0;
  private mode: RigMode = "idle";
  private rollT = 0;

  constructor(private rig: CharacterRig) {}

  setMode(mode: RigMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.animTime = 0;
    if (mode !== "roll") this.rollT = 0;
  }

  get current(): RigMode {
    return this.mode;
  }

  /** Forward-somersault progress 0..1 (Player feeds this while rolling). */
  setRollProgress(t: number): void {
    this.rollT = Math.min(1, Math.max(0, t));
  }

  update(dt: number, speedNorm: number): void {
    this.animTime += dt;
    const r = this.rig;
    const t = this.animTime;

    // Reset baseline every frame, then apply mode offsets.
    r.spin.rotation.set(0, 0, 0);
    r.spin.position.y = 0.98;
    r.spin.scale.set(1, 1, 1);
    r.torso.rotation.set(0, 0, 0);
    r.torso.position.set(0, 0.12, 0);
    r.head.rotation.set(0, 0, 0);
    r.elbowL.rotation.set(0, 0, 0);
    r.elbowR.rotation.set(0, 0, 0);
    r.kneeL.rotation.set(0, 0, 0);
    r.kneeR.rotation.set(0, 0, 0);

    switch (this.mode) {
      case "idle": {
        const breathe = Math.sin(t * 1.9) * 0.5 + 0.5;
        const sway = Math.sin(t * 1.3);
        r.torso.rotation.z = sway * 0.018;
        r.torso.rotation.x = 0.015;
        r.armL.rotation.x = -0.1 - breathe * 0.025;
        r.armR.rotation.x = -0.1 - breathe * 0.025;
        r.armL.rotation.z = -0.09;
        r.armR.rotation.z = 0.09;
        r.elbowL.rotation.x = -0.28 - breathe * 0.04;
        r.elbowR.rotation.x = -0.3 - breathe * 0.04;
        r.kneeL.rotation.x = 0.045;
        r.kneeR.rotation.x = 0.045;
        r.head.rotation.y = Math.sin(t * 0.5) * 0.24;
        r.head.rotation.x = -0.02 + breathe * 0.012;
        break;
      }
      case "run":
      case "board": {
        if (this.mode === "run") {
          this.runPhase += dt * (7.8 + speedNorm * 10.5);
          const ph = this.runPhase;
          const s = Math.sin(ph);
          const stride = 0.78 + speedNorm * 0.2;

          // Legs: thigh swing + knee flex on recovery (real gait)
          r.legL.rotation.x = -s * stride;
          r.legR.rotation.x = s * stride;
          r.kneeL.rotation.x = 0.12 + Math.max(0, Math.cos(ph - 0.85)) * (1.0 + speedNorm * 0.35);
          r.kneeR.rotation.x = 0.12 + Math.max(0, Math.cos(ph - 0.85 + Math.PI)) * (1.0 + speedNorm * 0.35);

          // Arms opposite phase, elbows ~90° pumping
          r.armL.rotation.x = s * (0.58 + speedNorm * 0.18);
          r.armR.rotation.x = -s * (0.58 + speedNorm * 0.18);
          r.armL.rotation.z = -0.1;
          r.armR.rotation.z = 0.1;
          r.elbowL.rotation.x = -0.72 - Math.max(0, -s) * 0.45;
          r.elbowR.rotation.x = -0.72 - Math.max(0, s) * 0.45;

          // Torso counter-rotation + forward lean + flight-phase bob
          r.torso.rotation.x = 0.12 + speedNorm * 0.1;
          r.torso.rotation.y = s * 0.08;
          r.torso.position.y = 0.12 + Math.abs(Math.cos(ph)) * 0.035;
          r.head.rotation.x = -0.07 - speedNorm * 0.04;
          r.head.rotation.y = -s * 0.045;
        } else {
          // Surf stance: staggered legs, twisted torso, balance arms
          const carve = Math.sin(t * 2.6);
          r.legL.rotation.x = -0.4;
          r.legR.rotation.x = 0.28;
          r.legL.rotation.y = 0.3;
          r.legR.rotation.y = -0.36;
          r.kneeL.rotation.x = 0.38;
          r.kneeR.rotation.x = 0.42;
          r.torso.rotation.y = 0.4;
          r.torso.rotation.z = carve * 0.05;
          r.torso.rotation.x = 0.05;
          r.armL.rotation.x = -0.45;
          r.armL.rotation.z = -0.8;
          r.armR.rotation.x = 0.22;
          r.armR.rotation.z = 0.9;
          r.elbowL.rotation.x = -0.38;
          r.elbowR.rotation.x = -0.28;
          r.head.rotation.y = -0.3;
        }
        break;
      }
      case "jump": {
        const rise = clamp01(t / 0.16);
        r.legL.rotation.x = -0.85 * rise;
        r.legR.rotation.x = -0.3 * rise;
        r.kneeL.rotation.x = 1.55 * rise;
        r.kneeR.rotation.x = 0.8 * rise;
        r.armL.rotation.x = -2.1 * rise;
        r.armR.rotation.x = -2.0 * rise;
        r.armL.rotation.z = -0.32;
        r.armR.rotation.z = 0.32;
        r.elbowL.rotation.x = -0.5 * rise;
        r.elbowR.rotation.x = -0.5 * rise;
        r.torso.rotation.x = -0.08 * rise;
        r.head.rotation.x = 0.1 * rise;
        break;
      }
      case "roll": {
        // Somersault owned by setRollProgress; limbs tucked hard.
        r.legL.rotation.x = -1.85;
        r.legR.rotation.x = -1.7;
        r.kneeL.rotation.x = 2.05;
        r.kneeR.rotation.x = 1.95;
        r.armL.rotation.x = -1.45;
        r.armR.rotation.x = -1.45;
        r.elbowL.rotation.x = -1.35;
        r.elbowR.rotation.x = -1.35;
        r.torso.rotation.x = 0.42;
        r.head.rotation.x = 0.45;

        const p = this.rollT;
        const ease = p * p * (3 - 2 * p);
        r.spin.rotation.x = -Math.PI * 2 * ease;
        // Dip the waist toward the ground mid-flip so the tuck clears the ballast
        const dip = Math.sin(Math.PI * p);
        r.spin.position.y = 0.98 - dip * 0.37;
        const squash = 1 - dip * 0.1;
        r.spin.scale.set(1, squash, 1);
        break;
      }
      case "fly": {
        const flap = Math.sin(t * 7.0) * 0.13;
        r.legL.rotation.x = -0.3 + flap;
        r.legR.rotation.x = 0.12 - flap;
        r.kneeL.rotation.x = 0.5;
        r.kneeR.rotation.x = 0.38;
        r.armL.rotation.x = -1.3;
        r.armR.rotation.x = -1.3;
        r.armL.rotation.z = -0.4;
        r.armR.rotation.z = 0.4;
        r.elbowL.rotation.x = -1.1;
        r.elbowR.rotation.x = -1.1;
        r.torso.rotation.x = 0.26;
        r.head.rotation.x = -0.26;
        break;
      }
      case "caught": {
        const drop = clamp01(t / 0.4);
        const flail = Math.sin(t * 16) * (1 - drop) * 0.28;
        r.spin.rotation.x = -1.3 * drop;
        r.spin.position.y = 0.98 - drop * 0.25;
        r.armL.rotation.x = -2.6 * drop + flail;
        r.armR.rotation.x = -2.45 * drop - flail;
        r.elbowL.rotation.x = -0.35;
        r.elbowR.rotation.x = -0.35;
        r.legL.rotation.x = -0.5 * drop;
        r.legR.rotation.x = 0.28 * drop;
        r.kneeL.rotation.x = 0.7 * drop;
        r.kneeR.rotation.x = 0.48 * drop;
        r.head.rotation.x = 0.24 * drop;
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
  }

  // Tail: two segments, held up and wagging
  const tail = limbGroup(spin, 0, 0.16, -0.32);
  const tailMesh = addMesh(tail, new THREE.CapsuleGeometry(0.038, 0.16, 6, 8), furMat, 0, 0.09, -0.03);
  tailMesh.rotation.x = -0.65;
  const tailTip = limbGroup(tail, 0, 0.17, -0.07);
  addMesh(tailTip, new THREE.CapsuleGeometry(0.03, 0.1, 6, 8), darkMat, 0, 0.06, -0.05).rotation.x = -0.5;

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
      this.lowerRefs = this.dog.legs
        .map((leg) => {
          const lower = leg.children.find((c) => c instanceof THREE.Group);
          return (lower as THREE.Group) ?? null;
        })
        .filter(Boolean) as THREE.Group[];
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
