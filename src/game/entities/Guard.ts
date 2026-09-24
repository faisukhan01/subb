import * as THREE from "three";
import { GUARD_FOLLOW_DIST, GUARD_INTRO_DIST, GUARD_INTRO_TIME } from "../Config";
import { CharacterAnimator, DogAnimator, buildCharacter, buildDog, type DogRig, type RigMode } from "../CharacterRig";
import { damp } from "../utils";
import type { CharacterPalette } from "../Config";

/**
 * The Inspector and his dog — pure drama. They chase during the run
 * (cosmetic, slightly behind), and sprint in for the grab when the player
 * wipes out.
 */

const GUARD_PALETTE: CharacterPalette = {
  id: "max", // reuses rig topology; visuals overridden below
  displayName: "Inspector",
  tagline: "",
  unlockCost: 0,
  perk: "",
  skin: 0xe8b088,
  hair: 0x2b2b2b,
  cap: 0x2f3138,
  capBrimBack: false,
  torso: 0x3d4148,
  sleeves: 0x34383f,
  pants: 0x2b2d33,
  shoes: 0x1c1d21,
  soleColor: 0x14161a,
  accent: 0xffd43b, // badge glint
  style: "uniform",
  sunglasses: true,
};

export type GuardPhase = "intro" | "follow" | "catch" | "hidden";

export class GuardManager {
  readonly group = new THREE.Group();

  private guardRig = buildCharacter(GUARD_PALETTE);
  private guardAnim = new CharacterAnimator(this.guardRig);
  private dog: DogRig = buildDog();
  private dogAnim = new DogAnimator(this.dog);

  private phase: GuardPhase = "hidden";
  private introTimer = 0;
  private catchTimer = 0;
  private followTime = 0;
  private followDist = GUARD_FOLLOW_DIST;
  private x = 0;
  private dogX = 1.0;
  private barking = false;

  constructor() {
    // Gold badge on the cap
    const badge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.02, 10),
      new THREE.MeshStandardMaterial({ color: 0xffd43b, metalness: 0.8, roughness: 0.25, emissive: 0x8a6d00, emissiveIntensity: 0.35 }),
    );
    badge.rotation.x = Math.PI / 2;
    badge.position.set(0, 0.28, 0.218);
    this.guardRig.head.add(badge);

    this.group.add(this.guardRig.root);
    this.group.add(this.dog.root);
    this.setHidden();
  }

  setHidden(): void {
    this.phase = "hidden";
    this.group.visible = false;
  }

  startIntro(playerZ: number, playerX: number): void {
    this.phase = "intro";
    this.group.visible = true;
    this.introTimer = 0;
    this.followDist = GUARD_INTRO_DIST;
    this.x = playerX;
    this.place(playerZ, playerX);
  }

  /** Called on fatal crash — the grab that ends the run. */
  startCatch(): void {
    this.phase = "catch";
    this.catchTimer = 0;
    this.group.visible = true;
    this.guardAnim.setMode("run");
  }

  update(
    dt: number,
    playerZ: number,
    playerX: number,
    speedNorm: number,
    running: boolean,
  ): void {
    if (this.phase === "hidden") return;
    this.barking = false;

    switch (this.phase) {
      case "intro": {
        this.introTimer += dt;
        this.followDist = damp(this.followDist, GUARD_FOLLOW_DIST, 0.55, dt);
        this.guardAnim.setMode("run");
        if (this.introTimer > GUARD_INTRO_TIME) this.phase = "follow";
        break;
      }
      case "follow": {
        this.followTime += dt;
        this.followDist = damp(
          this.followDist,
          GUARD_FOLLOW_DIST + Math.sin(this.followTime * 0.7) * 0.5,
          0.8,
          dt,
        );
        this.guardAnim.setMode("run");
        break;
      }
      case "catch": {
        this.catchTimer += dt;
        this.followDist = damp(this.followDist, 0.6, 7, dt);
        if (this.followDist < 1.6) {
          this.guardAnim.setMode("caught"); // grab pose
          this.barking = true;
        } else {
          this.guardAnim.setMode("run");
        }
        break;
      }
    }

    this.x = damp(this.x, playerX, 2.4, dt);
    this.dogX = damp(this.dogX, playerX + 1.05, 2.2, dt);
    this.place(playerZ, playerX);
    this.guardAnim.update(dt, 0.5 + speedNorm * 0.5);
    this.dogAnim.update(dt, 0.5 + speedNorm * 0.5, this.barking);

    if (!running && this.phase !== "catch") this.guardAnim.setMode("idle");
  }

  private place(playerZ: number, _playerX: number): void {
    this.guardRig.root.position.set(this.x, 0, playerZ + this.followDist);
    this.guardRig.root.rotation.y = Math.PI; // facing forward (−z) — rig built facing +z
    this.dog.root.position.set(this.dogX, 0, playerZ + this.followDist + 0.7);
    this.dog.root.rotation.y = Math.PI;
  }
}
