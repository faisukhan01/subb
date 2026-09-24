import * as THREE from "three";
import { COLORS } from "../Config";

/**
 * Jump/roll obstacles with pooled instances.
 *  - LowBarrier: pass by ROLLING under (bar bottom 0.74 m) or jumping over.
 *  - Blockade: solid wall, must be jumped (feet above 1.35 m at contact).
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

function makeLowBarrierMesh(): THREE.Group {
  const g = new THREE.Group();
  const frameMat = new THREE.MeshLambertMaterial({ color: COLORS.barrier, flatShading: true });
  const stripeMat = new THREE.MeshLambertMaterial({ color: COLORS.barrierStripe, flatShading: true });

  const bar = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.34, 0.22), frameMat);
  bar.position.y = 0.98;
  bar.castShadow = true;
  g.add(bar);

  // Hazard stripes
  for (let i = 0; i < 4; i++) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.36, 0.24), stripeMat);
    stripe.position.set(-0.75 + i * 0.5, 0.98, 0);
    stripe.rotation.z = 0.6;
    g.add(stripe);
  }
  for (const sx of [-0.85, 0.85]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.15, 0.2), frameMat);
    leg.position.set(sx, 0.575, 0);
    leg.castShadow = true;
    g.add(leg);
  }
  return g;
}

function makeBlockadeMesh(): THREE.Group {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: COLORS.blockade, flatShading: true });
  const capMat = new THREE.MeshLambertMaterial({ color: 0x862e0c, flatShading: true });

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.1, 0.5), bodyMat);
  body.position.y = 0.55;
  body.castShadow = true;
  g.add(body);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.25, 0.6), capMat);
  cap.position.y = 1.22;
  cap.castShadow = true;
  g.add(cap);
  // Warning chevrons
  const chevMat = new THREE.MeshLambertMaterial({ color: 0xffe066, flatShading: true });
  for (let i = 0; i < 3; i++) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.54), chevMat);
    c.position.set(-0.6 + i * 0.6, 0.55, 0);
    c.rotation.z = 0.7;
    g.add(c);
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
