import * as THREE from "three";
import { COLORS } from "../Config";
import { hazardBoardTexture } from "../textures";

/**
 * Jump/roll obstacles with pooled instances.
 *  - LowBarrier: steel work barrier with hazard board — pass by ROLLING
 *    under (bar bottom 0.74 m) or jumping over.
 *  - Blockade: framed plywood blockade with chevron panels — must be jumped
 *    (feet above 1.35 m at contact).
 * Collision volumes are simple AABBs exposed to the Game's solver.
 */

export type ObstacleKind = "lowBar" | "blockade";

export interface Obstacle {
  kind: ObstacleKind;
  obj: THREE.Object3D;
  lane: number;
  z: number;
  halfLen: number; // z half-extent
  halfWidth: number; // x half-extent
  yMin: number;
  yMax: number;
  active: boolean;
}

const steelMat = (): THREE.Material =>
  new THREE.MeshStandardMaterial({ color: 0x565b63, roughness: 0.45, metalness: 0.6 });
const rubberMat = (): THREE.Material =>
  new THREE.MeshStandardMaterial({ color: 0x24262a, roughness: 0.85 });

function makeLowBarrierMesh(): THREE.Group {
  const g = new THREE.Group();
  const steel = steelMat();
  const boardMat = new THREE.MeshStandardMaterial({ map: hazardBoardTexture(), roughness: 0.6 });
  const rubber = rubberMat();

  // Hazard board
  const board = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.34, 0.1), boardMat);
  board.position.y = 0.99;
  board.castShadow = true;
  g.add(board);

  // Frame: top and bottom rails + vertical stanchions
  const railTop = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 2.05, 4, 10), steel);
  railTop.rotation.z = Math.PI / 2;
  railTop.position.y = 1.19;
  g.add(railTop);
  const railBottom = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 2.05, 4, 10), steel);
  railBottom.rotation.z = Math.PI / 2;
  railBottom.position.y = 0.78;
  g.add(railBottom);
  for (let i = 0; i < 5; i++) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.45, 8), steel);
    post.position.set(-0.8 + i * 0.4, 0.99, 0.05);
    post.castShadow = false;
    g.add(post);
  }

  // A-frame feet (angled steel legs + foot pads)
  for (const sx of [-0.92, 0.92]) {
    for (const dir of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.85, 4, 10), steel);
      leg.position.set(sx, 0.46, dir * 0.28);
      leg.rotation.x = dir * 0.5;
      leg.castShadow = true;
      g.add(leg);
    }
    const pad = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.5, 4, 8), rubber);
    pad.rotation.z = Math.PI / 2;
    pad.position.set(sx, 0.045, 0);
    g.add(pad);
  }
  return g;
}

function makeBlockadeMesh(): THREE.Group {
  const g = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 0.85 });
  const woodDark = new THREE.MeshStandardMaterial({ color: 0x5d452e, roughness: 0.9 });
  const boardMat = new THREE.MeshStandardMaterial({ map: hazardBoardTexture(), roughness: 0.65 });
  const steel = steelMat();

  // Plywood panels (two layers, slight offset for depth)
  const panel = new THREE.Mesh(new THREE.BoxGeometry(1.98, 1.06, 0.09), boardMat);
  panel.position.y = 0.72;
  panel.castShadow = true;
  panel.receiveShadow = true;
  g.add(panel);

  // Timber frame: posts + cross braces
  for (const sx of [-0.94, 0.94]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.3, 0.14), woodDark);
    post.position.set(sx, 0.65, 0);
    post.castShadow = true;
    g.add(post);
    // diagonal brace behind
    const brace = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 1.15, 4, 8), woodMat);
    brace.position.set(sx - Math.sign(sx) * 0.16, 0.62, -0.14);
    brace.rotation.z = Math.sign(sx) * 0.5;
    g.add(brace);
  }
  const topRail = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.14, 0.16), woodDark);
  topRail.position.y = 1.31;
  topRail.rotation.z = 0.015;
  topRail.castShadow = true;
  g.add(topRail);
  const midRail = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.09, 0.05), woodDark);
  midRail.position.y = 0.28;
  g.add(midRail);

  // Top warning lights (small amber lanterns)
  for (const sx of [-0.6, 0.6]) {
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xffc078, emissive: 0xe8590c, emissiveIntensity: 1.6 }),
    );
    lamp.position.set(sx, 1.46, 0);
    lamp.castShadow = false;
    g.add(lamp);
    const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.07, 0.03, 10), steel);
    cage.position.set(sx, 1.4, 0);
    cage.castShadow = false;
    g.add(cage);
  }
  return g;
}

export class ObstacleManager {
  readonly group = new THREE.Group();
  readonly active: Obstacle[] = [];

  private pool: Record<ObstacleKind, Obstacle[]> = {
    lowBar: [],
    blockade: [],
  };

  constructor() {
    for (let i = 0; i < 14; i++) this.pool.lowBar.push(this.make("lowBar"));
    for (let i = 0; i < 14; i++) this.pool.blockade.push(this.make("blockade"));
  }

  private make(kind: ObstacleKind): Obstacle {
    const obj = kind === "lowBar" ? makeLowBarrierMesh() : makeBlockadeMesh();
    obj.visible = false;
    this.group.add(obj);
    const base: Obstacle = {
      kind,
      obj,
      lane: 0,
      z: 0,
      halfLen: kind === "lowBar" ? 0.18 : 0.32,
      halfWidth: 1.05,
      yMin: kind === "lowBar" ? 0.74 : 0,
      yMax: kind === "lowBar" ? 1.15 : 1.35,
      active: false,
    };
    return base;
  }

  spawn(kind: ObstacleKind, lane: number, laneX: number, z: number): void {
    const o = this.pool[kind].pop();
    if (!o) return;
    o.active = true;
    o.lane = lane;
    o.z = z;
    o.obj.position.set(laneX, 0, z);
    o.obj.visible = true;
    this.active.push(o);
  }

  cull(playerZ: number, behind: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const o = this.active[i];
      if (o.z - o.halfLen > playerZ + behind) {
        o.active = false;
        o.obj.visible = false;
        this.active.splice(i, 1);
        this.pool[o.kind].push(o);
      }
    }
  }

  reset(): void {
    while (this.active.length) {
      const o = this.active.pop() as Obstacle;
      o.active = false;
      o.obj.visible = false;
      this.pool[o.kind].push(o);
    }
  }
}
