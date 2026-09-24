import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  CAMERA_LOOK,
  CHUNKS_AHEAD,
  CHUNK_LENGTH,
  COLORS,
  DESPAWN_BEHIND,
  JETPACK_HEIGHT,
  LANE_X,
  TRAIN_HEIGHT,
} from "../Config";
import { pick, randRange, weightedIndex } from "../utils";
import { billboardTexture, buildingTexture, puffSprite, skyGradientTexture } from "../textures";
import { CoinManager, SparkleManager } from "../entities/Coins";
import { ObstacleManager, type ObstacleKind } from "../entities/Obstacles";
import { TrainManager } from "../entities/Trains";
import { PowerUpManager, rollPowerUpType } from "../entities/PowerUps";
import type { PowerUpType } from "../types";

/**
 * World = environment + infinite chunk streaming + spawn policies.
 *
 * Fairness rules baked into the templates:
 *  - never more than 2 lanes hard-blocked at the same z window
 *  - every obstacle pattern has a guaranteed clear path (jump/roll/dodge)
 *  - oncoming trains spawn far out with a horn + headlight telegraph
 */

interface Chunk {
  group: THREE.Group;
  frontZ: number; // world z of the chunk's +z edge; body extends to frontZ - CHUNK_LENGTH
  disposables: THREE.BufferGeometry[];
}

export interface WorldDeps {
  onHorn: () => void;
}

const BUILDING_TEX = () => buildingTexture();

export class World {
  readonly scene = new THREE.Scene();
  readonly coins = new CoinManager(220);
  readonly sparkles: SparkleManager;
  readonly obstacles = new ObstacleManager();
  readonly trains = new TrainManager();
  readonly powerUps = new PowerUpManager(6);

  private chunks: Chunk[] = [];
  private nextChunkFrontZ = 0;
  private clouds: THREE.Mesh[] = [];
  private movingTrainTimer = 8;
  private sun: THREE.DirectionalLight;
  private hemi: THREE.HemisphereLight;
  private sky: THREE.Mesh;

  // Shared materials (never disposed during streaming)
  private matCache = new Map<string, THREE.MeshLambertMaterial>();
  private buildingMatCache = new Map<number, THREE.MeshLambertMaterial>();

  constructor(private deps: WorldDeps) {
    this.scene.fog = new THREE.Fog(COLORS.skyHorizon, COLORS.fogNear, COLORS.fogFar);

    // Sky dome (gradient on the inside of a big sphere)
    const skyGeo = new THREE.SphereGeometry(260, 24, 14);
    const skyMat = new THREE.MeshBasicMaterial({
      map: skyGradientTexture(COLORS.skyTop, COLORS.skyHorizon),
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
    });
    this.sky = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.sky);

    this.hemi = new THREE.HemisphereLight(0xcfe8ff, 0xd9c2a3, 0.85);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff1dd, 1.5);
    this.sun.position.set(12, 22, 10);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 80;
    this.sun.shadow.camera.left = -16;
    this.sun.shadow.camera.right = 16;
    this.sun.shadow.camera.top = 16;
    this.sun.shadow.camera.bottom = -30;
    this.sun.shadow.bias = -0.0004;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    this.scene.add(this.coins.group);
    this.scene.add(this.obstacles.group);
    this.scene.add(this.trains.group);
    this.scene.add(this.powerUps.group);
    this.sparkles = new SparkleManager(26, puffSprite());
    this.scene.add(this.sparkles.group);

    this.spawnClouds();
  }

  // ------------------------------------------------------------ materials

  private mat(color: number): THREE.MeshLambertMaterial {
    const key = String(color);
    let m = this.matCache.get(key);
    if (!m) {
      m = new THREE.MeshLambertMaterial({ color, flatShading: true });
      this.matCache.set(key, m);
    }
    return m;
  }

  private buildingMat(color: number): THREE.MeshLambertMaterial {
    let m = this.buildingMatCache.get(color);
    if (!m) {
      m = new THREE.MeshLambertMaterial({ color, map: BUILDING_TEX() });
      this.buildingMatCache.set(color, m);
    }
    return m;
  }

  // ------------------------------------------------------------- clouds

  private spawnClouds(): void {
    const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.92 });
    for (let i = 0; i < 7; i++) {
      const cloud = new THREE.Group();
      const puffs = 3 + Math.floor(Math.random() * 3);
      for (let j = 0; j < puffs; j++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(randRange(2.2, 4.2), 10, 8), cloudMat);
        s.position.set(j * 2.4 - puffs * 1.1, randRange(-0.5, 0.8), randRange(-1, 1));
        s.scale.y = 0.55;
        cloud.add(s);
      }
      cloud.position.set(randRange(-60, 60), randRange(22, 40), randRange(-200, -20));
      this.scene.add(cloud);
      this.clouds.push(cloud as unknown as THREE.Mesh);
    }
  }

  // ------------------------------------------------------------- chunks

  private buildChunk(frontZ: number): Chunk {
    const group = new THREE.Group();
    const disposables: THREE.BufferGeometry[] = [];
    const base = frontZ - CHUNK_LENGTH / 2; // center z of chunk

    // Ground (gravel bed)
    const groundGeo = new THREE.BoxGeometry(12.4, 0.24, CHUNK_LENGTH);
    disposables.push(groundGeo);
    const ground = new THREE.Mesh(groundGeo, this.mat(COLORS.gravel));
    ground.position.set(0, -0.12, base);
    ground.receiveShadow = true;
    group.add(ground);

    // Rails + sleepers (merged per chunk for draw-call economy)
    const railGeos: THREE.BufferGeometry[] = [];
    for (const lx of LANE_X) {
      for (const off of [-0.55, 0.55]) {
        const g = new THREE.BoxGeometry(0.09, 0.13, CHUNK_LENGTH);
        g.translate(lx + off, 0.065, 0);
        railGeos.push(g);
      }
    }
    const railsMerged = mergeGeometries(railGeos, false);
    railGeos.forEach((g) => g.dispose());
    if (railsMerged) {
      disposables.push(railsMerged);
      const rails = new THREE.Mesh(railsMerged, this.mat(COLORS.rail));
      rails.position.z = base;
      group.add(rails);
    }

    const sleeperGeos: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 10; i++) {
      const g = new THREE.BoxGeometry(7.6, 0.07, 0.42);
      g.translate(0, 0.035, CHUNK_LENGTH / 2 - 1.3 - i * 2.6);
      sleeperGeos.push(g);
    }
    const sleepersMerged = mergeGeometries(sleeperGeos, false);
    sleeperGeos.forEach((g) => g.dispose());
    if (sleepersMerged) {
      disposables.push(sleepersMerged);
      const sleepers = new THREE.Mesh(sleepersMerged, this.mat(COLORS.sleeper));
      sleepers.position.z = base;
      group.add(sleepers);
    }

    // Side walls
    for (const sx of [-5.7, 5.7]) {
      const wallGeo = new THREE.BoxGeometry(0.55, 1.35, CHUNK_LENGTH);
      disposables.push(wallGeo);
      const wall = new THREE.Mesh(wallGeo, this.mat(COLORS.wall));
      wall.position.set(sx, 0.675, base);
      wall.receiveShadow = true;
      group.add(wall);
      const capGeo = new THREE.BoxGeometry(0.75, 0.14, CHUNK_LENGTH);
      disposables.push(capGeo);
      const cap = new THREE.Mesh(capGeo, this.mat(COLORS.wallTop));
      cap.position.set(sx, 1.4, base);
      group.add(cap);
    }

    // Buildings behind the walls
    for (const side of [-1, 1]) {
      const count = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        const w = randRange(3.5, 6);
        const h = randRange(5, 17);
        const d = randRange(4, 7);
        const color = pick(COLORS.buildings);
        const bGeo = new THREE.BoxGeometry(w, h, d);
        disposables.push(bGeo);
        const b = new THREE.Mesh(bGeo, this.buildingMat(color));
        b.position.set(side * randRange(9, 15), h / 2, frontZ - randRange(2, CHUNK_LENGTH - 2));
        group.add(b);
        const roofGeo = new THREE.BoxGeometry(w + 0.4, 0.4, d + 0.4);
        disposables.push(roofGeo);
        const roof = new THREE.Mesh(roofGeo, this.mat(0x6b5d52));
        roof.position.set(b.position.x, h + 0.2, b.position.z);
        group.add(roof);
      }
    }

    // Lamp posts (alternating sides)
    const lampSide = Math.random() < 0.5 ? -1 : 1;
    for (const dz of [4, CHUNK_LENGTH - 4]) {
      const poleGeo = new THREE.CylinderGeometry(0.07, 0.09, 3.6, 8);
      disposables.push(poleGeo);
      const pole = new THREE.Mesh(poleGeo, this.mat(COLORS.lampPost));
      pole.position.set(lampSide * 5.0, 1.8, frontZ - dz);
      group.add(pole);
      const headGeo = new THREE.BoxGeometry(0.5, 0.16, 0.3);
      disposables.push(headGeo);
      const head = new THREE.Mesh(
        headGeo,
        new THREE.MeshLambertMaterial({ color: 0xfff3bf, emissive: 0xcf9f2f }),
      );
      head.position.set(lampSide * 4.72, 3.62, frontZ - dz);
      group.add(head);
    }

    // Occasional graffiti billboard gantry
    if (Math.random() < 0.34) {
      const words = ["SUBB", "RUN!", "GO GO", "ZAP", "WILD"];
      const word = pick(words);
      const tex = billboardTexture(word, ["#b4400f", "#0f7b4f", "#8a2f8f"][Math.floor(Math.random() * 3)], "#1f1f24");
      const boardGeo = new THREE.BoxGeometry(7.2, 2.1, 0.18);
      disposables.push(boardGeo);
      const board = new THREE.Mesh(boardGeo, new THREE.MeshLambertMaterial({ map: tex }));
      board.position.set(0, 4.6, frontZ - randRange(5, CHUNK_LENGTH - 5));
      group.add(board);
      for (const sx of [-3.4, 3.4]) {
        const postGeo = new THREE.BoxGeometry(0.24, 4.6, 0.24);
        disposables.push(postGeo);
        const post = new THREE.Mesh(postGeo, this.mat(COLORS.lampPost));
        post.position.set(sx, 2.3, board.position.z);
        group.add(post);
      }
    }

    this.scene.add(group);
    return { group, frontZ, disposables };
  }

  private cullChunks(playerZ: number): void {
    for (let i = this.chunks.length - 1; i >= 0; i--) {
      const c = this.chunks[i];
      if (c.frontZ - CHUNK_LENGTH > playerZ + DESPAWN_BEHIND) {
        this.scene.remove(c.group);
        c.disposables.forEach((g) => g.dispose());
        this.chunks.splice(i, 1);
      }
    }
  }

  // ------------------------------------------------------ spawn policies

  private laneX(lane: number): number {
    return LANE_X[Math.max(0, Math.min(2, lane))];
  }

  private spawnCoinLine(lane: number, zStart: number, count: number, spacing = 1.7, y = 0.62): void {
    for (let i = 0; i < count; i++) this.coins.spawn(this.laneX(lane), y, zStart - i * spacing);
  }

  /** Parabolic coin arc sized to clear an obstacle — mirrors jump physics. */
  private spawnCoinArc(lane: number, zCenter: number, height = 2.1): void {
    const x = this.laneX(lane);
    const n = 7;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const z = zCenter + 3.4 - t * 6.8;
      const y = 0.62 + Math.sin(t * Math.PI) * height;
      this.coins.spawn(x, y, z);
    }
  }

  private spawnCoinZigzag(zStart: number, count: number): void {
    let lane = Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      this.coins.spawn(this.laneX(lane), 0.62, zStart - i * 1.9);
      if (i > 0 && i % 4 === 0) lane = Math.max(0, Math.min(2, lane + (Math.random() < 0.5 ? -1 : 1)));
    }
  }

  /** Difficulty 0..1 shapes template weights. */
  private pickTemplate(d: number): number {
    const weights = [
      3.0, // 0: open + coin lines
      2.2, // 1: low barriers + arc coins
      d > 0.18 ? 2.0 : 0.01, // 2: blockade + lowBar mix
      2.6, // 3: single parked train + side/roof coins
      d > 0.45 ? 1.6 + d : 0.01, // 4: double trains
      1.2, // 5: station pillars zigzag
      0.85, // 6: powerup + coin ring
      d > 0.6 ? 1.2 : 0.01, // 7: blockade gauntlet
    ];
    return weightedIndex(weights);
  }

  private populateChunk(frontZ: number, difficulty: number, safe = false): void {
    const zStart = frontZ - 3; // coins/obstacles start a bit inside
    const template = safe ? 0 : this.pickTemplate(difficulty);

    switch (template) {
      case 0: {
        const lane = Math.floor(Math.random() * 3);
        this.spawnCoinLine(lane, zStart, 9);
        if (Math.random() < 0.6) {
          const other = (lane + 1 + Math.floor(Math.random() * 2)) % 3;
          this.spawnCoinLine(other, zStart - 6, 5);
        }
        break;
      }
      case 1: {
        const lane = Math.floor(Math.random() * 3);
        this.obstacles.spawn("lowBar", lane, this.laneX(lane), zStart - 5);
        this.spawnCoinArc(lane, zStart - 5, 1.9);
        if (difficulty > 0.25) {
          const lane2 = (lane + 1 + Math.floor(Math.random() * 2)) % 3;
          this.obstacles.spawn("lowBar", lane2, this.laneX(lane2), zStart - 14);
          this.spawnCoinArc(lane2, zStart - 14, 1.9);
        } else {
          this.spawnCoinLine((lane + 1) % 3, zStart - 10, 6);
        }
        break;
      }
      case 2: {
        // Blockade forces a jump; a lowBar sits in one other lane → pick wisely
        const lane = Math.floor(Math.random() * 3);
        this.obstacles.spawn("blockade", lane, this.laneX(lane), zStart - 6);
        this.spawnCoinArc(lane, zStart - 6, 2.3);
        const lane2 = (lane + 1 + Math.floor(Math.random() * 2)) % 3;
        this.obstacles.spawn("lowBar", lane2, this.laneX(lane2), zStart - 13);
        this.spawnCoinLine((lane + 2) % 3, zStart - 10, 5);
        break;
      }
      case 3: {
        const lane = Math.floor(Math.random() * 3);
        this.trains.spawn(lane, this.laneX(lane), zStart - 10, false);
        // reward coins along the roof
        this.spawnCoinLine(lane, zStart - 5, 6, 1.9, TRAIN_HEIGHT + 0.85);
        // escape lanes beside the train
        const safe = (lane + 1 + Math.floor(Math.random() * 2)) % 3;
        this.spawnCoinLine(safe, zStart - 4, 8);
        break;
      }
      case 4: {
        const lane = Math.floor(Math.random() * 3);
        const lane2 = (lane + 1 + Math.floor(Math.random() * 2)) % 3;
        this.trains.spawn(lane, this.laneX(lane), zStart - 10, false);
        this.trains.spawn(lane2, this.laneX(lane2), zStart - 14, false);
        const safe = 3 - lane - lane2;
        this.spawnCoinZigzag(zStart - 3, 8);
        this.spawnCoinLine(safe, zStart - 4, 9);
        break;
      }
      case 5: {
        // Station: pillar rows on both sides + zigzag coins
        this.spawnCoinZigzag(zStart, 10);
        break;
      }
      case 6: {
        const lane = Math.floor(Math.random() * 3);
        this.powerUps.spawn(rollPowerUpType(), this.laneX(lane), 1.1, zStart - 6);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          this.coins.spawn(this.laneX(lane) + Math.cos(a) * 1.5, 1.1 + Math.sin(a) * 1.5, zStart - 6);
        }
        this.spawnCoinLine((lane + 1) % 3, zStart - 2, 5);
        break;
      }
      default: {
        // gauntlet: blockades staggered so you weave or jump
        const a = Math.floor(Math.random() * 3);
        const b = (a + 1 + Math.floor(Math.random() * 2)) % 3;
        this.obstacles.spawn("blockade", a, this.laneX(a), zStart - 6);
        this.obstacles.spawn("blockade", b, this.laneX(b), zStart - 15);
        this.spawnCoinArc(a, zStart - 6, 2.3);
        this.spawnCoinArc(b, zStart - 15, 2.3);
        break;
      }
    }
  }

  /** Sky-high coin trails while the jetpack is active. */
  spawnSkyCoins(playerZ: number): void {
    const lane = Math.floor(Math.random() * 3);
    for (let i = 0; i < 10; i++) {
      this.coins.spawn(this.laneX(lane), JETPACK_HEIGHT - 0.4 + Math.sin(i * 0.6) * 0.35, playerZ - 26 - i * 2.1);
    }
  }

  // -------------------------------------------------------------- update

  update(dt: number, playerZ: number, playerX: number, difficulty: number, running: boolean): void {
    // Stream scenery
    while (this.nextChunkFrontZ > playerZ - CHUNK_LENGTH * CHUNKS_AHEAD) {
      const chunk = this.buildChunk(this.nextChunkFrontZ);
      this.chunks.push(chunk);
      if (running) {
        // Safe runway: the first ~60 m of a fresh run never spawns obstacles
        // or trains, so every run starts with a fair, dodgeable world.
        const safe = this.nextChunkFrontZ > playerZ - 62;
        this.populateChunk(this.nextChunkFrontZ, difficulty, safe);
      }
      this.nextChunkFrontZ -= CHUNK_LENGTH;
    }
    this.cullChunks(playerZ);

    // Oncoming train events
    if (running && difficulty > 0.28) {
      this.movingTrainTimer -= dt;
      if (this.movingTrainTimer <= 0) {
        this.movingTrainTimer = randRange(8, 15);
        const lane = Math.floor(Math.random() * 3);
        this.trains.spawn(lane, this.laneX(lane), playerZ - 150, true);
        this.deps.onHorn();
      }
    }

    this.trains.update(dt);
    this.coins.cull(playerZ, DESPAWN_BEHIND);
    this.obstacles.cull(playerZ, DESPAWN_BEHIND);
    this.trains.cull(playerZ, DESPAWN_BEHIND);
    this.powerUps.cull(playerZ, DESPAWN_BEHIND);

    // Clouds drift lazily; sky dome follows the camera
    for (const c of this.clouds) {
      c.position.z += dt * 0.7;
      if (c.position.z > playerZ + 40) c.position.z = playerZ - 210;
    }
    this.sky.position.set(playerX * 0.2, 0, playerZ);
  }

  /** Camera-space sun + shadow frustum tracking. */
  trackLight(playerX: number, playerZ: number): void {
    this.sun.position.set(playerX + 12, 22, playerZ + 10);
    this.sun.target.position.set(playerX, 0, playerZ - 6);
  }

  /** Support height (train roof or ground) under a point at caller height. */
  supportHeightAt(x: number, z: number, callerY: number): number {
    return this.trains.supportHeightAt(x, z, callerY);
  }

  /** Camera look target helper (kept in one place for menu/run parity). */
  static readonly lookTarget = CAMERA_LOOK;

  reset(): void {
    for (const c of this.chunks) {
      this.scene.remove(c.group);
      c.disposables.forEach((g) => g.dispose());
    }
    this.chunks = [];
    this.coins.reset();
    this.obstacles.reset();
    this.trains.reset();
    this.powerUps.reset();
    this.movingTrainTimer = 8;
  }

  /** Re-seed streaming around a fresh run start. */
  reseed(playerZ: number): void {
    this.reset();
    this.nextChunkFrontZ = playerZ + CHUNK_LENGTH;
  }
}
