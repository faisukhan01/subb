import * as THREE from "three";
import type { PowerUpType } from "./types";

/**
 * Procedural CanvasTexture factory. Every texture is generated at runtime —
 * the game ships zero binary art assets, which keeps the bundle tiny and the
 * visual style consistent. Textures are cached and shared between all meshes.
 */

const cache = new Map<string, THREE.Texture>();

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");
  return [canvas, ctx];
}

function finish(
  key: string,
  canvas: HTMLCanvasElement,
  repeat?: [number, number],
): THREE.CanvasTexture {
  if (cache.has(key)) return cache.get(key) as THREE.CanvasTexture;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  if (repeat) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat[0], repeat[1]);
  }
  cache.set(key, tex);
  return tex;
}

const hex = (n: number): string => `#${n.toString(16).padStart(6, "0")}`;

/** Subway train side: body band, dark window strip, doors, skirt. */
export function trainSideTexture(bodyColor: number, stripe: number): THREE.CanvasTexture {
  const key = `trainSide-${bodyColor}-${stripe}`;
  if (cache.has(key)) return cache.get(key) as THREE.CanvasTexture;
  const [canvas, ctx] = makeCanvas(512, 128);
  ctx.fillStyle = hex(bodyColor);
  ctx.fillRect(0, 0, 512, 128);

  // Roof lip
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.fillRect(0, 0, 512, 10);

  // Window strip
  ctx.fillStyle = "#2e2e33";
  ctx.fillRect(24, 24, 464, 42);
  ctx.fillStyle = "#9fb6c4";
  for (let i = 0; i < 8; i++) {
    const x = 34 + i * 58;
    ctx.fillRect(x, 28, 40, 34);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.moveTo(x + 4, 62);
    ctx.lineTo(x + 18, 28);
    ctx.lineTo(x + 26, 28);
    ctx.lineTo(x + 10, 62);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#9fb6c4";
  }

  // Doors
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 3;
  for (const dx of [140, 320]) {
    ctx.strokeRect(dx, 20, 4, 96);
    ctx.strokeRect(dx + 56, 20, 4, 96);
    ctx.beginPath();
    ctx.moveTo(dx + 30, 70);
    ctx.lineTo(dx + 30, 116);
    ctx.stroke();
  }

  // Accent stripe
  ctx.fillStyle = hex(stripe);
  ctx.fillRect(0, 74, 512, 10);

  // Skirt + grime
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(0, 108, 512, 20);
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * 512;
    const y = 90 + Math.random() * 30;
    ctx.fillRect(x, y, 6 + Math.random() * 14, 3);
  }
  return finish(key, canvas);
}

/** Train front: windshield + headlights. */
export function trainFrontTexture(bodyColor: number): THREE.CanvasTexture {
  const key = `trainFront-${bodyColor}`;
  if (cache.has(key)) return cache.get(key) as THREE.CanvasTexture;
  const [canvas, ctx] = makeCanvas(128, 128);
  ctx.fillStyle = hex(bodyColor);
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = "#23262b";
  ctx.fillRect(18, 22, 92, 38);
  ctx.fillStyle = "#aebfca";
  ctx.fillRect(22, 26, 84, 30);
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.moveTo(28, 56);
  ctx.lineTo(48, 26);
  ctx.lineTo(58, 26);
  ctx.lineTo(38, 56);
  ctx.closePath();
  ctx.fill();
  // Headlights
  ctx.fillStyle = "#fff7d6";
  ctx.beginPath();
  ctx.arc(26, 92, 10, 0, Math.PI * 2);
  ctx.arc(102, 92, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(0, 112, 128, 16);
  return finish(key, canvas);
}

/** Building facade with a grid of windows (some lit warm). */
export function buildingTexture(): THREE.CanvasTexture {
  const key = "building";
  if (cache.has(key)) return cache.get(key) as THREE.CanvasTexture;
  const [canvas, ctx] = makeCanvas(128, 256);
  ctx.fillStyle = "#ffffff"; // tinted by material color
  ctx.fillRect(0, 0, 128, 256);
  for (let row = 0; row < 12; row++) {
    for (let col = 0; col < 5; col++) {
      const lit = Math.random() < 0.28;
      ctx.fillStyle = lit ? "#ffdf9e" : "rgba(40,45,55,0.85)";
      ctx.fillRect(10 + col * 24, 12 + row * 20, 14, 12);
    }
  }
  return finish(key, canvas);
}

/** Graffiti billboard: given word on a painted wall. */
export function billboardTexture(word: string, bg: string, fg: string): THREE.CanvasTexture {
  const key = `billboard-${word}-${bg}-${fg}`;
  if (cache.has(key)) return cache.get(key) as THREE.CanvasTexture;
  const [canvas, ctx] = makeCanvas(512, 160);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 160);
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  for (let i = 0; i < 40; i++) {
    ctx.fillRect(Math.random() * 512, Math.random() * 160, 30, 8);
  }
  ctx.save();
  ctx.translate(256, 84);
  ctx.rotate(-0.03);
  ctx.font = "italic 900 92px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 14;
  ctx.strokeStyle = fg;
  ctx.strokeText(word, 0, 0);
  ctx.fillStyle = "#fffdf7";
  ctx.fillText(word, 0, 0);
  ctx.restore();
  return finish(key, canvas);
}

/** Power-up crate icon rendered onto all faces. */
export function powerUpIconTexture(type: PowerUpType): THREE.CanvasTexture {
  const key = `pw-${type}`;
  if (cache.has(key)) return cache.get(key) as THREE.CanvasTexture;
  const [canvas, ctx] = makeCanvas(128, 128);

  const meta: Record<PowerUpType, { bg: string; draw: (c: CanvasRenderingContext2D) => void }> = {
    magnet: {
      bg: "#e03131",
      draw: (c) => {
        c.strokeStyle = "#f8f5f0";
        c.lineWidth = 16;
        c.beginPath();
        c.arc(64, 58, 28, Math.PI, 0, true);
        c.moveTo(36, 58);
        c.lineTo(36, 96);
        c.moveTo(92, 58);
        c.lineTo(92, 96);
        c.stroke();
      },
    },
    jetpack: {
      bg: "#1971c2",
      draw: (c) => {
        c.fillStyle = "#f8f5f0";
        c.beginPath();
        c.moveTo(64, 22);
        c.quadraticCurveTo(88, 52, 78, 84);
        c.lineTo(50, 84);
        c.quadraticCurveTo(40, 52, 64, 22);
        c.fill();
        c.fillStyle = "#ffa94d";
        c.beginPath();
        c.moveTo(52, 88);
        c.lineTo(76, 88);
        c.lineTo(64, 112);
        c.closePath();
        c.fill();
      },
    },
    multiplier: {
      bg: "#2f9e44",
      draw: (c) => {
        c.fillStyle = "#f8f5f0";
        c.font = "900 64px system-ui, sans-serif";
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText("x2", 64, 66);
      },
    },
    sneakers: {
      bg: "#f08c00",
      draw: (c) => {
        c.fillStyle = "#f8f5f0";
        c.beginPath();
        c.moveTo(30, 78);
        c.lineTo(30, 52);
        c.quadraticCurveTo(52, 54, 62, 70);
        c.lineTo(96, 70);
        c.quadraticCurveTo(102, 74, 100, 84);
        c.lineTo(30, 84);
        c.closePath();
        c.fill();
        c.fillStyle = "#2b2b30";
        c.fillRect(28, 86, 74, 8);
      },
    },
    hoverboard: {
      bg: "#7048e8",
      draw: (c) => {
        c.fillStyle = "#f8f5f0";
        c.beginPath();
        c.ellipse(64, 64, 40, 12, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "#ffd43b";
        c.beginPath();
        c.ellipse(64, 88, 26, 6, 0, 0, Math.PI * 2);
        c.fill();
      },
    },
  };

  const m = meta[type];
  ctx.fillStyle = m.bg;
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 112, 112);
  m.draw(ctx);
  return finish(key, canvas);
}

/** Soft radial sprite used for the coin sparkle / landing dust. */
export function puffSprite(): THREE.CanvasTexture {
  const key = "puff";
  if (cache.has(key)) return cache.get(key) as THREE.CanvasTexture;
  const [canvas, ctx] = makeCanvas(64, 64);
  const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
  grad.addColorStop(0, "rgba(255,255,255,0.9)");
  grad.addColorStop(0.6, "rgba(255,255,255,0.35)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, tex);
  return tex;
}

/** Gradient sky dome texture (vertical). */
export function skyGradientTexture(top: number, bottom: number): THREE.CanvasTexture {
  const key = `sky-${top}-${bottom}`;
  if (cache.has(key)) return cache.get(key) as THREE.CanvasTexture;
  const [canvas, ctx] = makeCanvas(16, 256);
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, hex(top));
  grad.addColorStop(0.62, hex(bottom));
  grad.addColorStop(1, hex(bottom));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 16, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, tex);
  return tex;
}

export function disposeTextures(): void {
  for (const tex of cache.values()) tex.dispose();
  cache.clear();
}
