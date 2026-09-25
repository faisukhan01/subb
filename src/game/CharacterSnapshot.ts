import * as THREE from "three";
import { CHARACTERS, type CharacterPalette } from "./Config";
import { CharacterAnimator, buildCharacter } from "./CharacterRig";
import type { CharacterId } from "./types";

/**
 * Offscreen 3D portrait renderer.
 *
 * Renders the real in-game character rigs into crisp PNG data-URLs used by
 * the menu's character cards — the roster always shows exactly what you
 * play, with zero binary art assets. Rendered once per character, cached
 * for the session.
 */

const cache = new Map<CharacterId, string>();
let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;

const SIZE = 320;

function ensureStudio(): void {
  if (renderer) return;
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });
  renderer.setSize(SIZE, SIZE);
  renderer.setPixelRatio(2);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  renderer.setClearColor(0x000000, 0);

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(34, 1, 0.1, 30);
  camera.position.set(1.05, 1.5, 3.6);
  camera.lookAt(0, 1.02, 0);

  // Soft three-point studio lighting
  const key = new THREE.DirectionalLight(0xfff2e0, 2.9);
  key.position.set(2.4, 3.6, 3.2);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xcfe0ff, 0.9);
  fill.position.set(-3, 1.6, 1.4);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffd8a8, 1.7);
  rim.position.set(-1.2, 2.8, -3.4);
  scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xe8f4ff, 0x6a5646, 1.05));
}

function renderPortrait(p: CharacterPalette): string {
  ensureStudio();
  const rig = buildCharacter(p);
  scene!.add(rig.root);

  // Signature pose: confident idle, slight 3/4 turn toward camera.
  // The rig is authored facing +z and the studio camera sits at +z, so a
  // small positive turn gives the classic three-quarter portrait.
  rig.root.rotation.y = 0.45;
  const animator = new CharacterAnimator(rig);
  animator.setMode("idle");
  animator.update(0.35, 0); // settle into the breathing pose
  animator.update(0.016, 0);

  renderer!.render(scene!, camera!);
  const url = renderer!.domElement.toDataURL("image/png");

  // Free this rig's GPU resources; shared studio stays alive
  rig.root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      (o.material as THREE.Material).dispose();
    }
  });
  scene!.remove(rig.root);
  return url;
}

/** Synchronous cached portrait (data-URL) for a character id. */
export function getCharacterSnapshot(id: CharacterId): string {
  const hit = cache.get(id);
  if (hit) return hit;
  const palette = CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
  const url = renderPortrait(palette);
  cache.set(id, url);
  return url;
}

/** Dispose the shared studio (called on engine teardown). */
export function disposeSnapshotStudio(): void {
  renderer?.dispose();
  renderer = null;
  scene = null;
  camera = null;
  cache.clear();
}
