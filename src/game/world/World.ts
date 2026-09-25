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
import {
  asphaltTexture,
  ballastTexture,
  billboardTexture,
  brickTexture,
  buildingTexture,
  canopyTexture,
  chainLinkTexture,
  cloudSpriteTexture,
  concreteTexture,
  graffitiWallTexture,
  platformEdgeTexture,
  puffSprite,
  skyGradientTexture,
  skylineTexture,
  sleeperTexture,
  stationSignTexture,
  sunGlowTexture,
} from "../textures";
import { CoinManager, SparkleManager } from "../entities/Coins";
import { ObstacleManager, type ObstacleKind } from "../entities/Obstacles";
import { TrainManager } from "../entities/Trains";
import { PowerUpManager, rollPowerUpType } from "../entities/PowerUps";
import type { PowerUpType } from "../types";

/**
 * World = environment + infinite chunk streaming + spawn policies.
 *
 * The corridor is a proper urban railway: gravel ballast with timber
 * sleepers and steel rail on three tracks, raised concrete platforms on
 * both sides with tactile warning edges, a green steel canopy on columns
 * with hanging lamps and station signage, benches and vending machines,
 * brick walls with graffiti, catenary portals with contact wires overhead,
 * and a city of textured buildings behind it all.
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

// Track geometry constants (visual)
const BALLAST_HALF_W = 4.5;
const RAIL_GAUGE = 0.72;
const PLATFORM_INNER = 4.8;
const PLATFORM_OUTER = 8.3;
const PLATFORM_H = 1.1;
const CANOPY_Y = 4.62;
const WIRE_Y = 5.15;

export class World {
  readonly scene = new THREE.Scene();
  readonly coins = new CoinManager(220);
  readonly sparkles: SparkleManager;
  readonly obstacles = new ObstacleManager();
  readonly trains = new TrainManager();
  readonly powerUps = new PowerUpManager(6);

  private chunks: Chunk[] = [];
  private nextChunkFrontZ = 0;
  private clouds: THREE.Sprite[] = [];
  private sunSprite: THREE.Sprite;
  private skylineL: THREE.Mesh;
  private skylineR: THREE.Mesh;
  private skylineFar: THREE.Mesh;
  private movingTrainTimer = 8;
  private sun: THREE.DirectionalLight;
  private hemi: THREE.HemisphereLight;
  private sky: THREE.Mesh;
  private chunkIndex = 0;

  // Shared materials (never disposed during streaming)
  private matCache = new Map<string, THREE.Material>();
  private buildingMatCache = new Map<number, THREE.Material>();

  constructor(private deps: WorldDeps) {
    this.scene.fog = new THREE.Fog(0xf2c498, COLORS.fogNear, COLORS.fogFar);

    // Sky dome (golden-hour gradient on the inside of a big sphere)
    const skyGeo = new THREE.SphereGeometry(300, 32, 16);
    const skyMat = new THREE.MeshBasicMaterial({
      map: skyGradientTexture(COLORS.skyTop, COLORS.skyMid, COLORS.skyHorizon),
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
    });
    this.sky = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.sky);

    this.hemi = new THREE.HemisphereLight(0xc4d6ec, 0x94785e, 1.25);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffdcae, 3.1);
    this.sun.position.set(14, 26, 10);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 90;
    this.sun.shadow.camera.left = -18;
    this.sun.shadow.camera.right = 18;
    this.sun.shadow.camera.top = 18;
    this.sun.shadow.camera.bottom = -34;
    this.sun.shadow.bias = -0.0004;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);
    // Soft fill from the camera side so faces never go flat-black
    const fill = new THREE.DirectionalLight(0xfff0dd, 0.75);
    fill.position.set(-10, 12, 20);
    this.scene.add(fill);

    // Golden-hour sun disc + glow, fixed ahead-left of the runner
    this.sunSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: sunGlowTexture(),
        transparent: true,
        depthWrite: false,
        fog: false,
      }),
    );
    this.sunSprite.scale.set(96, 96, 1);
    this.scene.add(this.sunSprite);

    // Distant city silhouettes framing the corridor
    const mkSkyline = (tint: string, opacity: number): THREE.Mesh => {
      const material = new THREE.MeshBasicMaterial({
        map: skylineTexture(tint),
        transparent: true,
        depthWrite: false,
        fog: false,
        opacity,
      });
      return new THREE.Mesh(new THREE.PlaneGeometry(440, 70), material);
    };
    this.skylineL = mkSkyline("#6d5142", 0.92);
    this.skylineL.rotation.y = Math.PI / 2;
    this.skylineL.position.set(-130, 24, -60);
    this.scene.add(this.skylineL);
    this.skylineR = mkSkyline("#634a3c", 0.92);
    this.skylineR.rotation.y = -Math.PI / 2;
    this.skylineR.position.set(130, 24, -60);
    this.scene.add(this.skylineR);
    this.skylineFar = mkSkyline("#7d5f4c", 0.75);
    this.skylineFar.position.set(0, 28, -235);
    this.scene.add(this.skylineFar);

    this.scene.add(this.coins.group);
    this.scene.add(this.obstacles.group);
    this.scene.add(this.trains.group);
    this.scene.add(this.powerUps.group);
    this.sparkles = new SparkleManager(26, puffSprite());
    this.scene.add(this.sparkles.group);

    this.spawnClouds();
  }

  // ------------------------------------------------------------ materials

  private mat(key: string, make: () => THREE.Material): THREE.Material {
    let m = this.matCache.get(key);
    if (!m) {
      m = make();
      this.matCache.set(key, m);
    }
    return m;
  }

  private flat(color: number, rough = 0.85, metal = 0): THREE.Material {
    return this.mat(`c${color}-${rough}-${metal}`, () =>
      new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }),
    );
  }

  private buildingMat(color: number): THREE.Material {
    let m = this.buildingMatCache.get(color);
    if (!m) {
      m = new THREE.MeshStandardMaterial({ color, map: buildingTexture(), roughness: 0.9 });
      this.buildingMatCache.set(color, m);
    }
    return m;
  }

  // ------------------------------------------------------------- clouds

  private spawnClouds(): void {
    const cloudTex = cloudSpriteTexture();
    for (let i = 0; i < 9; i++) {
      const cloud = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: cloudTex,
          transparent: true,
          opacity: 0.88,
          depthWrite: false,
        }),
      );
      const s = randRange(12, 22);
      cloud.scale.set(s, s * 0.5, 1);
      cloud.position.set(randRange(-80, 80), randRange(22, 46), randRange(-220, 10));
      this.scene.add(cloud);
      this.clouds.push(cloud);
    }
  }

  // ------------------------------------------------------------- chunks

  private buildChunk(frontZ: number): Chunk {
    const group = new THREE.Group();
    const disposables: THREE.BufferGeometry[] = [];
    const base = frontZ - CHUNK_LENGTH / 2; // center z of chunk
    const L = CHUNK_LENGTH;

    // ---------- city asphalt apron under everything
    const apronGeo = new THREE.BoxGeometry(52, 0.24, L);
    disposables.push(apronGeo);
    const apronMat = this.mat(
      "asphalt",
      () => new THREE.MeshStandardMaterial({ map: asphaltTexture(10, 5), roughness: 0.96 }),
    );
    const apron = new THREE.Mesh(apronGeo, apronMat);
    apron.position.set(0, -0.12, base);
    apron.receiveShadow = true;
    group.add(apron);

    // ---------- ballast bed between the platforms
    const bedGeo = new THREE.BoxGeometry(BALLAST_HALF_W * 2, 0.26, L);
    disposables.push(bedGeo);
    const ballastMat = this.mat(
      "ballast",
      () => new THREE.MeshStandardMaterial({ map: ballastTexture(4, 12), roughness: 0.98 }),
    );
    const bed = new THREE.Mesh(bedGeo, ballastMat);
    bed.position.set(0, -0.12, base);
    bed.receiveShadow = true;
    group.add(bed);

    // ---------- timber sleepers (per track, real 0.65 m spacing)
    const sleeperMat = this.mat(
      "sleeper",
      () => new THREE.MeshStandardMaterial({ map: sleeperTexture(), roughness: 0.95 }),
    );
    const sleeperGeos: THREE.BufferGeometry[] = [];
    for (const lx of LANE_X) {
      for (let z = -L / 2 + 0.4; z < L / 2; z += 0.65) {
        const g = new THREE.BoxGeometry(2.4, 0.11, 0.26);
        g.translate(lx, 0.035, z);
        sleeperGeos.push(g);
      }
    }
    const sleepersMerged = mergeGeometries(sleeperGeos, false);
    sleeperGeos.forEach((g) => g.dispose());
    if (sleepersMerged) {
      disposables.push(sleepersMerged);
      const sleepers = new THREE.Mesh(sleepersMerged, sleeperMat);
      sleepers.position.z = base;
      sleepers.receiveShadow = true;
      group.add(sleepers);
    }

    // ---------- steel rails (shiny head + dark web base)
    const railHeadGeos: THREE.BufferGeometry[] = [];
    const railWebGeos: THREE.BufferGeometry[] = [];
    for (const lx of LANE_X) {
      for (const off of [-RAIL_GAUGE, RAIL_GAUGE]) {
        const head = new THREE.BoxGeometry(0.075, 0.05, L);
        head.translate(lx + off, 0.135, 0);
        railHeadGeos.push(head);
        const web = new THREE.BoxGeometry(0.13, 0.1, L);
        web.translate(lx + off, 0.06, 0);
        railWebGeos.push(web);
      }
    }
    const headMerged = mergeGeometries(railHeadGeos, false);
    railHeadGeos.forEach((g) => g.dispose());
    const webMerged = mergeGeometries(railWebGeos, false);
    railWebGeos.forEach((g) => g.dispose());
    if (headMerged) {
      disposables.push(headMerged);
      const railHeadMat = this.mat(
        "railHead",
        () => new THREE.MeshStandardMaterial({ color: COLORS.rail, roughness: 0.28, metalness: 0.85 }),
      );
      const rails = new THREE.Mesh(headMerged, railHeadMat);
      rails.position.z = base;
      group.add(rails);
    }
    if (webMerged) {
      disposables.push(webMerged);
      const rails = new THREE.Mesh(webMerged, this.flat(COLORS.railWeb, 0.6, 0.5));
      rails.position.z = base;
      group.add(rails);
    }

    // ---------- raised platforms on both sides
    const platformMat = this.mat(
      "platform",
      () => new THREE.MeshStandardMaterial({ map: concreteTexture(1.6, 8), roughness: 0.94 }),
    );
    const edgeMat = this.mat(
      "tactile",
      () => new THREE.MeshStandardMaterial({ map: platformEdgeTexture(L / 1.3), roughness: 0.8 }),
    );
    const platGeo = new THREE.BoxGeometry(PLATFORM_OUTER - PLATFORM_INNER, PLATFORM_H, L);
    disposables.push(platGeo);
    const edgeGeo = new THREE.BoxGeometry(0.42, 0.05, L);
    disposables.push(edgeGeo);
    for (const side of [-1, 1]) {
      const plat = new THREE.Mesh(platGeo, platformMat);
      plat.position.set(side * (PLATFORM_INNER + (PLATFORM_OUTER - PLATFORM_INNER) / 2), PLATFORM_H / 2 - 0.05, base);
      plat.receiveShadow = true;
      plat.castShadow = true;
      group.add(plat);

      const edge = new THREE.Mesh(edgeGeo, edgeMat);
      edge.position.set(side * (PLATFORM_INNER + 0.26), PLATFORM_H - 0.03, base);
      group.add(edge);
    }

    // ---------- canopy: green steel columns + sloped roof + lamps
    const steelGreen = this.flat(COLORS.canopySteel, 0.5, 0.45);
    const canopyRoofMat = this.mat(
      "canopyRoof",
      () => new THREE.MeshStandardMaterial({ map: canopyTexture("#cfc7b2"), roughness: 0.7, metalness: 0.2 }),
    );
    const roofGeo = new THREE.BoxGeometry(2.1, 0.08, L);
    disposables.push(roofGeo);
    const fasciaGeo = new THREE.BoxGeometry(0.12, 0.42, L);
    disposables.push(fasciaGeo);
    const colGeo = new THREE.CylinderGeometry(0.09, 0.11, CANOPY_Y - PLATFORM_H, 10);
    disposables.push(colGeo);
    const lampGeo = new THREE.CapsuleGeometry(0.09, 0.3, 4, 10);
    disposables.push(lampGeo);
    const lampMat = new THREE.MeshStandardMaterial({
      color: 0xfff2cf,
      emissive: 0xffd88a,
      emissiveIntensity: 1.4,
    });
    for (const side of [-1, 1]) {
      // columns every ~8.7 m
      for (let i = 0; i < 3; i++) {
        const cz = base + L / 2 - 4.3 - i * 8.7;
        const col = new THREE.Mesh(colGeo, steelGreen);
        col.position.set(side * 6.7, PLATFORM_H + (CANOPY_Y - PLATFORM_H) / 2, cz);
        col.castShadow = true;
        group.add(col);
        // bracket arm toward the track edge
        const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.09, 0.12), steelGreen);
        arm.position.set(side * 5.9, CANOPY_Y - 0.16, cz);
        group.add(arm);
        // hanging lamp under the arm
        const lamp = new THREE.Mesh(lampGeo, lampMat);
        lamp.scale.set(1, 0.55, 1);
        lamp.position.set(side * 5.35, CANOPY_Y - 0.42, cz);
        lamp.castShadow = false;
        group.add(lamp);
      }
      // sloped roof slab (tilted toward the track)
      const roof = new THREE.Mesh(roofGeo, canopyRoofMat);
      roof.position.set(side * 7.05, CANOPY_Y, base);
      roof.rotation.z = side * 0.08;
      roof.castShadow = true;
      group.add(roof);
      // fascia beam on the track edge
      const fascia = new THREE.Mesh(fasciaGeo, steelGreen);
      fascia.position.set(side * 6.06, CANOPY_Y - 0.12, base);
      group.add(fascia);
    }

    // ---------- hanging station sign (every other chunk)
    if (this.chunkIndex % 2 === 0) {
      const side = this.chunkIndex % 4 === 0 ? -1 : 1;
      const signTex = stationSignTexture("SUBB CENTRAL", "PLATFORMS 1 – 3 · CITY EXIT");
      const signMat = new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.6 });
      const signGeo = new THREE.PlaneGeometry(3.1, 0.78);
      disposables.push(signGeo);
      const sign = new THREE.Mesh(signGeo, signMat);
      sign.position.set(side * 5.9, 3.4, base + 2);
      sign.rotation.y = Math.PI; // face the oncoming runner
      group.add(sign);
      // hangers
      for (const dz of [-1.2, 1.2]) {
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.85, 6), this.flat(0x2b2e33, 0.5, 0.6));
        rod.position.set(side * 5.9, 4.2, base + 2 + dz);
        group.add(rod);
      }
    }

    // ---------- platform furniture: benches / vending / bins
    const benchSeatMat = this.mat(
      "benchWood",
      () => new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 0.8 }),
    );
    if (Math.random() < 0.75) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const bz = base + randRange(-8, 8);
      const bx = side * 7.3;
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.07, 1.8), benchSeatMat);
      seat.position.set(bx, PLATFORM_H + 0.45, bz);
      seat.castShadow = true;
      group.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 1.8), benchSeatMat);
      back.position.set(bx + side * 0.24, PLATFORM_H + 0.72, bz);
      back.rotation.x = -side * 0.12;
      group.add(back);
      for (const dz of [-0.7, 0.7]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.08), this.flat(0x3a3d42, 0.5, 0.55));
        leg.position.set(bx, PLATFORM_H + 0.22, bz + dz);
        group.add(leg);
      }
    }
    if (Math.random() < 0.5) {
      // vending machine with a glowing front
      const side = Math.random() < 0.5 ? -1 : 1;
      const vz = base + randRange(-9, 9);
      const vm = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.95, 0.75), this.flat(0xb03a2e, 0.55));
      vm.position.set(side * 7.5, PLATFORM_H + 0.97, vz);
      vm.castShadow = true;
      group.add(vm);
      const front = new THREE.Mesh(
        new THREE.PlaneGeometry(0.7, 1.5),
        new THREE.MeshStandardMaterial({ color: 0xffe9c4, emissive: 0xffb35c, emissiveIntensity: 1.1 }),
      );
      front.position.set(side * 7.02, PLATFORM_H + 1.05, vz);
      front.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      group.add(front);
    }
    if (Math.random() < 0.6) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.22, 0.72, 12), this.flat(0x4a5548, 0.7, 0.2));
      bin.position.set(side * 5.4, PLATFORM_H + 0.36, base + randRange(-10, 10));
      bin.castShadow = true;
      group.add(bin);
    }

    // ---------- brick back walls with graffiti / fence variation
    const brickMat = this.mat("brick", () => {
      const tex = brickTexture(0).clone();
      tex.needsUpdate = true;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(9, 1.4);
      return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 });
    });
    const brickGreyMat = this.mat("brickGrey", () => {
      const tex = brickTexture(1).clone();
      tex.needsUpdate = true;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(9, 1.4);
      return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 });
    });
    const capMat = this.flat(0x9a948c, 0.9);
    const wallGeo = new THREE.BoxGeometry(0.4, 3.0, L);
    disposables.push(wallGeo);
    const capGeo = new THREE.BoxGeometry(0.55, 0.16, L);
    disposables.push(capGeo);
    for (const side of [-1, 1]) {
      const wall = new THREE.Mesh(wallGeo, Math.random() < 0.5 ? brickMat : brickGreyMat);
      wall.position.set(side * (PLATFORM_OUTER + 0.2), PLATFORM_H + 1.4, base);
      wall.receiveShadow = true;
      wall.castShadow = true;
      group.add(wall);
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.set(side * (PLATFORM_OUTER + 0.2), PLATFORM_H + 2.98, base);
      group.add(cap);
    }

    // graffiti banner section mounted on one wall
    if (Math.random() < 0.45) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const graffMat = this.mat(
        "graffiti",
        () => new THREE.MeshStandardMaterial({ map: graffitiWallTexture(), roughness: 0.9 }),
      );
      const gGeo = new THREE.PlaneGeometry(7.5, 2.6);
      disposables.push(gGeo);
      const gr = new THREE.Mesh(gGeo, graffMat);
      gr.position.set(side * (PLATFORM_OUTER + 0.02), PLATFORM_H + 1.4, base + randRange(-6, 6));
      gr.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      group.add(gr);
    }

    // chain-link fence above one wall (city peeks over)
    if (Math.random() < 0.4) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const fenceMat = this.mat(
        "chainlink",
        () =>
          new THREE.MeshStandardMaterial({
            map: chainLinkTexture(),
            transparent: true,
            alphaTest: 0.35,
            side: THREE.DoubleSide,
            roughness: 0.5,
            metalness: 0.6,
            color: 0xb9bdc2,
          }),
      );
      const fGeo = new THREE.PlaneGeometry(L, 1.0);
      disposables.push(fGeo);
      const fenceMatInstance = fenceMat.clone() as THREE.MeshStandardMaterial;
      const fenceTex = chainLinkTexture().clone();
      fenceTex.needsUpdate = true;
      fenceTex.wrapS = THREE.RepeatWrapping;
      fenceTex.repeat.set(L / 1.2, 1);
      fenceMatInstance.map = fenceTex;
      const fence = new THREE.Mesh(fGeo, fenceMatInstance);
      fence.position.set(side * (PLATFORM_OUTER + 0.2), PLATFORM_H + 3.55, base);
      fence.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2; // run along the wall
      group.add(fence);
      for (let i = 0; i < 3; i++) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.15, 8), this.flat(0x565b63, 0.5, 0.6));
        post.position.set(side * (PLATFORM_OUTER + 0.2), PLATFORM_H + 3.55, base + L / 2 - 2 - i * 10);
        group.add(post);
      }
    }

    // ---------- buildings behind the walls
    for (const side of [-1, 1]) {
      const count = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        const w = randRange(4, 7);
        const h = randRange(7, 20);
        const d = randRange(5, 8);
        const color = pick(COLORS.buildings);
        const bGeo = new THREE.BoxGeometry(w, h, d);
        disposables.push(bGeo);
        const b = new THREE.Mesh(bGeo, this.buildingMat(color));
        b.position.set(side * randRange(11.5, 17), h / 2 - 0.1, frontZ - randRange(2, L - 2));
        b.castShadow = true;
        group.add(b);
        const roofGeo = new THREE.BoxGeometry(w + 0.45, 0.45, d + 0.45);
        disposables.push(roofGeo);
        const roof = new THREE.Mesh(roofGeo, this.flat(0x5c554d, 0.9));
        roof.position.set(b.position.x, h + 0.1, b.position.z);
        group.add(roof);
        // rooftop clutter: water tower or AC bank
        if (Math.random() < 0.5) {
          if (Math.random() < 0.5) {
            const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 1.3, 12), this.flat(0x7a5a42, 0.85));
            tank.position.set(b.position.x + 0.6, h + 1.4, b.position.z - 0.5);
            group.add(tank);
            const cone = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.6, 12), this.flat(0x5d452e, 0.85));
            cone.position.set(b.position.x + 0.6, h + 2.35, b.position.z - 0.5);
            group.add(cone);
          } else {
            for (let ac = 0; ac < 3; ac++) {
              const box = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.8), this.flat(0x9aa0a6, 0.6, 0.4));
              box.position.set(b.position.x - 1 + ac * 0.9, h + 0.55, b.position.z + 0.4);
              group.add(box);
            }
          }
        }
      }
    }

    // ---------- catenary: contact wires + steel portals
    const wireMat = this.flat(0x2b2e33, 0.5, 0.4);
    const wireGeo = new THREE.BoxGeometry(0.02, 0.02, L);
    disposables.push(wireGeo);
    for (const lx of LANE_X) {
      const wire = new THREE.Mesh(wireGeo, wireMat);
      wire.position.set(lx, WIRE_Y, base);
      group.add(wire);
    }
    // one lattice-ish portal per chunk
    const portalZ = base + randRange(-9, 9);
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, WIRE_Y + 1.3, 0.18), this.flat(COLORS.catenary, 0.55, 0.55));
      post.position.set(side * 4.62, (WIRE_Y + 1.3) / 2, portalZ);
      post.castShadow = true;
      group.add(post);
      // cross braces on the post
      for (const dy of [1.6, 3.4, 5.0]) {
        const brace = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.06), this.flat(COLORS.catenary, 0.55, 0.55));
        brace.position.set(side * 4.62, dy, portalZ);
        group.add(brace);
      }
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.24, 0.2), this.flat(COLORS.catenary, 0.55, 0.55));
    beam.position.set(0, WIRE_Y + 1.2, portalZ);
    beam.castShadow = true;
    group.add(beam);
    // droppers + signal head
    for (const lx of LANE_X) {
      const dropper = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.85, 0.03), wireMat);
      dropper.position.set(lx, WIRE_Y + 0.45, portalZ);
      group.add(dropper);
    }
    if (Math.random() < 0.5) {
      const sx = pick([-1, 1]);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.6, 0.16), this.flat(0x1d2126, 0.5, 0.3));
      head.position.set(sx * 4.62, WIRE_Y - 0.55, portalZ + 0.3);
      group.add(head);
      const lampMat = new THREE.MeshStandardMaterial({
        color: 0x8ce99a,
        emissive: 0x2f9e44,
        emissiveIntensity: 2.2,
      });
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), lampMat);
      lamp.position.set(sx * 4.62, WIRE_Y - 0.38, portalZ + 0.39);
      lamp.castShadow = false;
      group.add(lamp);
    }

    // ---------- occasional trackside ad board (low, off the run line)
    if (Math.random() < 0.35) {
      const words = ["SUBB", "RUN!", "GO GO", "ZAP", "WILD"];
      const word = pick(words);
      const tex = billboardTexture(word, ["#b4400f", "#146356", "#9c4a1d"][Math.floor(Math.random() * 3)], "#1f1f24");
      const side = Math.random() < 0.5 ? -1 : 1;
      const boardGeo = new THREE.BoxGeometry(5.2, 1.5, 0.14);
      disposables.push(boardGeo);
      const board = new THREE.Mesh(boardGeo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }));
      board.position.set(side * 4.0, 1.9, base + randRange(-8, 8));
      board.rotation.y = -side * Math.PI / 2;
      group.add(board);
      const legGeo = new THREE.BoxGeometry(0.1, 1.2, 0.1);
      disposables.push(legGeo);
      for (const dz of [-2, 2]) {
        const leg = new THREE.Mesh(legGeo, this.flat(0x3d4249, 0.5, 0.55));
        leg.position.set(side * 4.0, 0.6, base + board.position.z - base + dz);
        group.add(leg);
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
      1.2, // 5: open station stretch + zigzag
      0.85, // 6: powerup + coin ring
      d > 0.6 ? 1.2 : 0.01, // 7: blockade gauntlet
    ];
    return weightedIndex(weights);
  }

  private populateChunk(frontZ: number, difficulty: number, safe = false, plannedTemplate?: number): void {
    const zStart = frontZ - 3; // coins/obstacles start a bit inside
    const template = plannedTemplate ?? (safe ? 0 : this.pickTemplate(difficulty));

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
        this.spawnCoinLine(lane, zStart - 5, 6, 1.9, TRAIN_HEIGHT + 1.2);
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
        // Station stretch: zigzag coin trail down the corridor
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
      // Safe runway: the first ~60 m of a fresh run never spawns obstacles
      // or trains, so every run starts with a fair, dodgeable world.
      const safe = running && this.nextChunkFrontZ > playerZ - 62;
      const template = running ? (safe ? 0 : this.pickTemplate(difficulty)) : -1;
      const chunk = this.buildChunk(this.nextChunkFrontZ);
      this.chunks.push(chunk);
      this.chunkIndex++;
      if (running) {
        this.populateChunk(this.nextChunkFrontZ, difficulty, safe, template);
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

    // Clouds drift lazily; sky dome, sun and skylines follow the runner
    for (const c of this.clouds) {
      c.position.z += dt * 0.7;
      if (c.position.z > playerZ + 40) {
        c.position.z = playerZ - 220;
        c.position.x = randRange(-80, 80);
        c.position.y = randRange(22, 46);
      }
    }
    this.sky.position.set(playerX * 0.2, 0, playerZ);
    this.sunSprite.position.set(playerX * 0.2 - 52, 38, playerZ - 125);
    this.skylineL.position.z = playerZ - 70;
    this.skylineR.position.z = playerZ - 70;
    this.skylineFar.position.z = playerZ - 235;
  }

  /** Camera-space sun + shadow frustum tracking. */
  trackLight(playerX: number, playerZ: number): void {
    this.sun.position.set(playerX + 14, 26, playerZ + 10);
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
