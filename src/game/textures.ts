import * as THREE from "three";
import type { PowerUpType } from "./types";

/**
 * Procedural CanvasTexture factory — every texture is generated at runtime,
 * zero binary art assets. Seeded RNG keeps results stable per session.
 * All textures are cached and shared between every mesh that uses them.
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

/** Deterministic RNG so a given texture always paints identically. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ================================================================= gravel

/** Track ballast: packed angular stones, dark warm grey. */
export function ballastTexture(rx = 6, ry = 6): THREE.CanvasTexture {
  const key = `ballast-${rx}-${ry}`;
  if (cache.has(key)) return cache.get(key) as THREE.CanvasTexture;
  const [canvas, ctx] = makeCanvas(256, 256);
  const rand = rng(1234);
  ctx.fillStyle = "#3d3833";
  ctx.fillRect(0, 0, 256, 256);
  // Large stones
  for (let i = 0; i < 900; i++) {
    const x = rand() * 256;
    const y = rand() * 256;
    const r = 1.6 + rand() * 3.4;
    const g = 52 + rand() * 62;
    const warm = rand() * 16;
    ctx.fillStyle = `rgb(${g + warm | 0},${g + 2 | 0},${g - 6 | 0})`;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (0.55 + rand() * 0.5), rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
    // top-left glint
    ctx.fillStyle = "rgba(255,240,220,0.14)";
    ctx.beginPath();
    ctx.ellipse(x - r * 0.25, y - r * 0.3, r * 0.4, r * 0.22, -0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Packed dust between stones
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(30,26,22,${0.08 + rand() * 0.1})`;
    ctx.beginPath();
    ctx.ellipse(rand() * 256, rand() * 256, 8 + rand() * 22, 6 + rand() * 16, rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  return finish(key, canvas, [rx, ry]);
}

// =============================================================== concrete

/** Weathered concrete slab with expansion joints and stains. */
export function concreteTexture(rx = 4, ry = 4): THREE.CanvasTexture {
  const key = `concrete-${rx}-${ry}`;
  if (cache.has(key)) return cache.get(key) as THREE.CanvasTexture;
  const [canvas, ctx] = makeCanvas(256, 256);
  const rand = rng(777);
  ctx.fillStyle = "#a8a29a";
  ctx.fillRect(0, 0, 256, 256);
  // Broad tonal patches
  for (let i = 0; i < 60; i++) {
    const g = 150 + rand() * 40;
    ctx.fillStyle = `rgba(${g | 0},${g - 6 | 0},${g - 14 | 0},0.18)`;
    ctx.beginPath();
    ctx.ellipse(rand() * 256, rand() * 256, 10 + rand() * 40, 8 + rand() * 30, rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  // Fine speckle
  for (let i = 0; i < 1200; i++) {
    ctx.fillStyle = rand() < 0.5 ? "rgba(60,55,50,0.16)" : "rgba(255,250,240,0.14)";
    ctx.fillRect(rand() * 256, rand() * 256, 1.4, 1.4);
  }
  // Expansion joints (vertical, panel seams)
  ctx.strokeStyle = "rgba(40,36,32,0.5)";
  ctx.lineWidth = 2.4;
  for (const x of [0.5, 128]) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(40,36,32,0.28)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, 128);
  ctx.lineTo(256, 128);
  ctx.stroke();
  // Hairline cracks
  ctx.strokeStyle = "rgba(50,45,40,0.4)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    let x = rand() * 256;
    let y = rand() * 256;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let s = 0; s < 6; s++) {
      x += (rand() - 0.5) * 40;
      y += (rand() - 0.5) * 40;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  return finish(key, canvas, [rx, ry]);
}

/** Platform edge: concrete strip + yellow tactile warning band with dots. */
export function platformEdgeTexture(rx = 8): THREE.CanvasTexture {
  const key = `platformEdge-${rx}`;
  if (cache.has(key)) return cache.get(key) as THREE.CanvasTexture;
  const [canvas, ctx] = makeCanvas(128, 64);
  const rand = rng(555);
  // concrete base
  ctx.fillStyle = "#a8a29a";
  ctx.fillRect(0, 0, 128, 64);
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = rand() < 0.5 ? "rgba(60,55,50,0.15)" : "rgba(255,250,240,0.12)";
    ctx.fillRect(rand() * 128, rand() * 64, 1.2, 1.2);
  }
  // yellow tactile band (right 60% of tile = track side)
  ctx.fillStyle = "#e6b23c";
  ctx.fillRect(50, 0, 78, 64);
  ctx.fillStyle = "rgba(255,235,170,0.55)";
  ctx.fillRect(50, 0, 78, 5);
  ctx.fillStyle = "rgba(120,80,10,0.35)";
  ctx.fillRect(50, 59, 78, 5);
  // raised dots
  for (let yy = 10; yy < 60; yy += 14) {
    for (let xx = 58; xx < 122; xx += 14) {
      ctx.fillStyle = "rgba(255,230,150,0.75)";
      ctx.beginPath();
      ctx.arc(xx + (yy % 28 === 10 ? 0 : 4), yy, 3.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(140,95,15,0.5)";
      ctx.beginPath();
      ctx.arc(xx + (yy % 28 === 10 ? 0 : 4) + 1.4, yy + 1.6, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // worn grime at lip
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = `rgba(70,60,50,${0.06 + rand() * 0.12})`;
    ctx.fillRect(50 + rand() * 78, rand() * 64, 3 + rand() * 8, 2);
  }
  return finish(key, canvas, [rx, 1]);
}

// ============================================================ wood sleeper

/** Creosote-dark wooden sleeper with grain and end bolts. */
export function sleeperTexture(): THREE.CanvasTexture {
  const key = "sleeper";
  if (cache.has(key)) return cache.get(key) as THREE.CanvasTexture;
  const [canvas, ctx] = makeCanvas(128, 64);
  const rand = rng(88);
  ctx.fillStyle = "#4a382a";
  ctx.fillRect(0, 0, 128, 64);
  // grain streaks
  for (let i = 0; i < 46; i++) {
    const y = rand() * 64;
    ctx.strokeStyle = `rgba(${rand() < 0.5 ? "20,14,10" : "110,86,60"},${0.18 + rand() * 0.22})`;
    ctx.lineWidth = 0.8 + rand() * 1.8;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(40, y + (rand() - 0.5) * 6, 90, y + (rand() - 0.5) * 6, 128, y + (rand() - 0.5) * 4);
    ctx.stroke();
  }
  // weathering patches
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = `rgba(25,18,12,${0.1 + rand() * 0.16})`;
    ctx.beginPath();
    ctx.ellipse(rand() * 128, rand() * 64, 6 + rand() * 16, 3 + rand() * 8, rand(), 0, Math.PI * 2);
    ctx.fill();
  }
  // rail-seat bolts
  for (const bx of [16, 112]) {
    for (const by of [20, 44]) {
      ctx.fillStyle = "#2a2018";
      ctx.beginPath();
      ctx.arc(bx, by, 4.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(190,180,160,0.35)";
      ctx.beginPath();
      ctx.arc(bx - 1.2, by - 1.4, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return finish(key, canvas);
}

// ================================================================== brick

/** Brick wall. variant: 0 = red brick, 1 = painted grey, 2 = sooty brown. */
export function brickTexture(variant = 0): THREE.CanvasTexture {
  const key = `brick-${variant}`;
  if (cache.has(key)) return cache.get(key) as THREE.CanvasTexture;
  const [canvas, ctx] = makeCanvas(256, 256);
  const rand = rng(90 + variant);
  const mortar = ["#7d746a", "#5c5c5e", "#4c423a"][variant];
  const bricks = [
    ["#8e4a38", "#9c5a44", "#7c4030", "#a5624c"],
    ["#8a8d92", "#9aa0a6", "#787d84", "#a4aab0"],
    ["#6e5648", "#7d6252", "#5d483c", "#886d5b"],
  ][variant];
  ctx.fillStyle = mortar;
  ctx.fillRect(0, 0, 256, 256);
  const bw = 32;
  const bh = 16;
  for (let row = 0; row < 16; row++) {
    for (let col = -1; col < 9; col++) {
      const off = row % 2 ? bw / 2 : 0;
      const x = col * bw + off + 1;
      const y = row * bh + 1;
      ctx.fillStyle = bricks[Math.floor(rand() * bricks.length)];
      ctx.fillRect(x, y, bw - 2, bh - 2);
      // per-brick shading
      ctx.fillStyle = `rgba(0,0,0,${rand() * 0.14})`;
      ctx.fillRect(x, y, bw - 2, bh - 2);
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      ctx.fillRect(x, y, bw - 2, 2);
    }
  }
  // grime
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = `rgba(20,16,12,${0.05 + rand() * 0.12})`;
    ctx.beginPath();
    ctx.ellipse(rand() * 256, rand() * 256, 8 + rand() * 26, 6 + rand() * 18, rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  return finish(key, canvas);
}

/** Concrete wall segment covered in spray-paint graffiti pieces. */
export function graffitiWallTexture(): THREE.CanvasTexture {
  const key = "graffitiWall";
  if (cache.has(key)) return cache.get(key) as THREE.CanvasTexture;
  const [canvas, ctx] = makeCanvas(512, 256);
  const rand = rng(4242);
  // grey concrete base + panel lines
  ctx.fillStyle = "#8f8a84";
  ctx.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 400; i++) {
    ctx.fillStyle = rand() < 0.5 ? "rgba(50,46,42,0.14)" : "rgba(255,250,240,0.1)";
    ctx.fillRect(rand() * 512, rand() * 256, 1.4, 1.4);
  }
  ctx.strokeStyle = "rgba(45,42,38,0.5)";
  ctx.lineWidth = 2;
  for (const x of [128, 256, 384]) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  ctx.strokeRect(0.5, 0.5, 511, 255);
  // graffiti pieces
  const words = ["SUBB", "RUSH", "WAVE", "JAM", "VOX", "DUSK"];
  const colors = ["#e8590c", "#0ca678", "#e03131", "#f59f00", "#1098ad", "#be4bdb"];
  for (let p = 0; p < 4; p++) {
    const x = 24 + p * 122 + rand() * 30;
    const y = 60 + rand() * 100;
    const word = words[Math.floor(rand() * words.length)];
    const c1 = colors[Math.floor(rand() * colors.length)];
    const c2 = colors[Math.floor(rand() * colors.length)];
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((rand() - 0.5) * 0.14);
    ctx.font = "900 58px system-ui, sans-serif";
    ctx.textBaseline = "middle";
    // spray halo
    ctx.fillStyle = `${c1}33`;
    ctx.beginPath();
    ctx.ellipse(46, 4, 74, 40, 0, 0, Math.PI * 2);
    ctx.fill();
    // outline + fill
    ctx.lineWidth = 13;
    ctx.strokeStyle = "#17181c";
    ctx.strokeText(word, 0, 0);
    ctx.fillStyle = c1;
    ctx.fillText(word, 0, 0);
    ctx.lineWidth = 5;
    ctx.strokeStyle = c2;
    ctx.strokeText(word, 2.5, -3);
    // drips
    ctx.fillStyle = c1;
    for (let d = 0; d < 4; d++) {
      const dx = 6 + rand() * 84;
      ctx.fillRect(dx, 26, 3.4, 8 + rand() * 16);
    }
    ctx.restore();
  }
  return finish(key, canvas);
}

/** Chain-link fence — transparent with steel diamond mesh. */
export function chainLinkTexture(): THREE.CanvasTexture {
  const key = "chainLink";
  if (cache.has(key)) return cache.get(key) as THREE.CanvasTexture;
  const [canvas, ctx] = makeCanvas(64, 64);
  ctx.clearRect(0, 0, 64, 64);
  ctx.strokeStyle = "rgba(148,152,158,0.9)";
  ctx.lineWidth = 2.6;
  for (let i = -64; i <= 128; i += 16) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 64, 64);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(i + 64, 0);
    ctx.lineTo(i, 64);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  cache.set(key, tex);
  return tex;
}

// ============================================================== station

/** Hanging station sign: "SUBB CENTRAL" house style. */
export function stationSignTexture(name: string, sub: string): THREE.CanvasTexture {
  const key = `sign-${name}-${sub}`;
  if (cache.has(key)) return cache.get(key) as THREE.CanvasTexture;
  const [canvas, ctx] = makeCanvas(512, 128);
  ctx.fillStyle = "#15242e";
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = "#1d3240";
  ctx.fillRect(0, 0, 512, 10);
  ctx.fillStyle = "#0d181f";
  ctx.fillRect(0, 118, 512, 10);
  // amber accent bar
  ctx.fillStyle = "#f2a33c";
  ctx.fillRect(24, 18, 8, 92);
  ctx.font = "800 52px system-ui, sans-serif";
  ctx.fillStyle = "#f7f5f0";
  ctx.textBaseline = "middle";
  ctx.fillText(name, 52, 52);
  ctx.font = "600 24px system-ui, sans-serif";
  ctx.fillStyle = "#f2a33c";
  ctx.fillText(sub, 54, 94);
  // right arrow chevrons
  ctx.strokeStyle = "rgba(247,245,240,0.4)";
  ctx.lineWidth = 6;
  for (let i = 0; i < 3; i++) {
    const x = 430 + i * 26;
    ctx.beginPath();
    ctx.moveTo(x, 40);
    ctx.lineTo(x + 14, 64);
    ctx.lineTo(x, 88);
    ctx.stroke();
  }
  return finish(key, canvas);
}

/** Corrugated metal canopy underside / roof panels. */
export function canopyTexture(tint: string): THREE.CanvasTexture {
  const key = `canopy-${tint}`;
  if (cache.has(key)) return cache.get(key) as THREE.CanvasTexture;
  const [canvas, ctx] = makeCanvas(128, 128);
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, 128, 128);
  for (let x = 0; x < 128; x += 16) {
    const g = ctx.createLinearGradient(x, 0, x + 16, 0);
    g.addColorStop(0, "rgba(0,0,0,0.34)");
    g.addColorStop(0.5, "rgba(255,255,255,0.13)");
    g.addColorStop(1, "rgba(0,0,0,0.28)");
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, 16, 128);
  }
  return finish(key, canvas);
}

/** City asphalt with patches and faint tyre wear. */
export function asphaltTexture(rx = 8, ry = 8): THREE.CanvasTexture {
  const key = `asphalt-${rx}-${ry}`;
  if (cache.has(key)) return cache.get(key) as THREE.CanvasTexture;
  const [canvas, ctx] = makeCanvas(256, 256);
  const rand = rng(31337);
  ctx.fillStyle = "#33312e";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1500; i++) {
    ctx.fillStyle = rand() < 0.5 ? "rgba(255,255,255,0.045)" : "rgba(0,0,0,0.14)";
    ctx.fillRect(rand() * 256, rand() * 256, 1.5, 1.5);
  }
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = `rgba(18,17,15,${0.1 + rand() * 0.15})`;
    ctx.beginPath();
    ctx.ellipse(rand() * 256, rand() * 256, 10 + rand() * 30, 8 + rand() * 20, rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  return finish(key, canvas, [rx, ry]);
}

// ================================================================= trains

/**
 * Subway car side — ONE repeat per car: window band with glass reflections,
 * paired doors with windows, accent stripe, panel seams, rivets, grime.
 */
export function trainSideTexture(bodyColor: number, stripe: number): THREE.CanvasTexture {
  const key = `trainSide-${bodyColor}-${stripe}`;
  if (cache.has(key)) return cache.get(key) as THREE.CanvasTexture;
  const [canvas, ctx] = makeCanvas(1024, 256);
  const rand = rng(2024);

  const body = hex(bodyColor);
  // Body base + vertical shading (light roof curve → dark skirt)
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, "#00000044");
  grad.addColorStop(0.08, "#ffffff26");
  grad.addColorStop(0.3, "#00000000");
  grad.addColorStop(0.82, "#00000030");
  grad.addColorStop(1, "#00000066");
  ctx.fillStyle = body;
  ctx.fillRect(0, 0, 1024, 256);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 256);

  // Roof lip shadow
  ctx.fillStyle = "rgba(0,0,0,0.42)";
  ctx.fillRect(0, 0, 1024, 14);

  // Panel seams
  ctx.strokeStyle = "rgba(0,0,0,0.16)";
  ctx.lineWidth = 2;
  for (const x of [256, 512, 768]) {
    ctx.beginPath();
    ctx.moveTo(x, 14);
    ctx.lineTo(x, 242);
    ctx.stroke();
  }

  // Window band (dark recess) with 5 windows
  ctx.fillStyle = "#14161a";
  ctx.fillRect(96, 52, 832, 74);
  const drawWindow = (x: number, w: number): void => {
    const g = ctx.createLinearGradient(x, 52, x + w, 126);
    g.addColorStop(0, "#3d4a55");
    g.addColorStop(0.32, "#6e8291");
    g.addColorStop(0.5, "#46545f");
    g.addColorStop(0.72, "#8ba3b2");
    g.addColorStop(1, "#2e3840");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(x + 5, 57, w - 10, 64, 8);
    ctx.fill();
    // diagonal reflection streak
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x + 5, 57, w - 10, 64, 8);
    ctx.clip();
    ctx.fillStyle = "rgba(255,244,220,0.16)";
    ctx.beginPath();
    ctx.moveTo(x + w * 0.12, 121);
    ctx.lineTo(x + w * 0.42, 57);
    ctx.lineTo(x + w * 0.56, 57);
    ctx.lineTo(x + w * 0.26, 121);
    ctx.closePath();
    ctx.fill();
    // seat back silhouettes
    ctx.fillStyle = "rgba(10,12,16,0.55)";
    for (let s = 0; s < 3; s++) {
      const sx = x + 12 + s * ((w - 24) / 3);
      ctx.beginPath();
      ctx.roundRect(sx, 92, 16, 29, 4);
      ctx.fill();
    }
    ctx.restore();
  };
  drawWindow(120, 150);
  drawWindow(292, 150);
  drawWindow(464, 150); // becomes door window pair region handled below? keep as window
  drawWindow(636, 150);
  drawWindow(808, 96);

  // Door pairs (two sliding doors with narrow windows) around x=470..620
  const doorX = 452;
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(doorX - 4, 36, 4, 190);
  ctx.fillRect(doorX + 164, 36, 4, 190);
  ctx.fillRect(doorX + 80, 40, 4, 186); // center split
  // door windows
  ctx.fillStyle = "#14161a";
  ctx.fillRect(doorX + 12, 56, 56, 70);
  ctx.fillRect(doorX + 96, 56, 56, 70);
  for (const wx of [doorX + 17, doorX + 101]) {
    const g = ctx.createLinearGradient(wx, 56, wx + 46, 126);
    g.addColorStop(0, "#46545f");
    g.addColorStop(0.45, "#7c93a3");
    g.addColorStop(1, "#2e3840");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(wx, 60, 46, 62, 6);
    ctx.fill();
  }
  // door base vents
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(doorX + 14, 168, 52, 26);
  ctx.fillRect(doorX + 98, 168, 52, 26);

  // Accent stripe (double)
  ctx.fillStyle = hex(stripe);
  ctx.fillRect(0, 138, 1024, 12);
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.fillRect(0, 138, 1024, 3);
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.fillRect(0, 147, 1024, 3);

  // Rivet rows along top/bottom of body
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  for (let x = 16; x < 1024; x += 24) {
    ctx.beginPath();
    ctx.arc(x, 34, 2.1, 0, Math.PI * 2);
    ctx.arc(x, 212, 2.1, 0, Math.PI * 2);
    ctx.fill();
  }

  // Skirt + grime streaks
  ctx.fillStyle = "rgba(12,12,14,0.6)";
  ctx.fillRect(0, 226, 1024, 30);
  for (let i = 0; i < 46; i++) {
    const x = rand() * 1024;
    ctx.fillStyle = `rgba(30,26,22,${0.05 + rand() * 0.12})`;
    ctx.fillRect(x, 150 + rand() * 60, 3 + rand() * 5, 30 + rand() * 60);
  }
  // graffiti tag near one end (subtle)
  ctx.save();
  ctx.translate(870, 196);
  ctx.rotate(-0.04);
  ctx.font = "900 26px system-ui, sans-serif";
  ctx.fillStyle = "rgba(232,89,12,0.8)";
  ctx.strokeStyle = "rgba(20,20,24,0.9)";
  ctx.lineWidth = 6;
  ctx.strokeText("SUBB", 0, 0);
  ctx.fillText("SUBB", 0, 0);
  ctx.restore();
  return finish(key, canvas);
}

/** Train cab front: windshield, LED destination sign, headlights, coupler. */
export function trainFrontTexture(bodyColor: number): THREE.CanvasTexture {
  const key = `trainFront-${bodyColor}`;
  if (cache.has(key)) return cache.get(key) as THREE.CanvasTexture;
  const [canvas, ctx] = makeCanvas(256, 256);

  // body
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, hex(bodyColor));
  grad.addColorStop(1, "#00000055");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(0, 0, 256, 10);

  // LED destination sign
  ctx.fillStyle = "#101114";
  ctx.beginPath();
  ctx.roundRect(78, 18, 100, 26, 5);
  ctx.fill();
  ctx.font = "800 17px system-ui, monospace";
  ctx.fillStyle = "#ffb340";
  ctx.textAlign = "center";
  ctx.fillText("SUBB LINE", 128, 36);

  // Windshield
  const ws = ctx.createLinearGradient(30, 50, 226, 130);
  ws.addColorStop(0, "#41505c");
  ws.addColorStop(0.35, "#8ba3b2");
  ws.addColorStop(0.6, "#3c4a55");
  ws.addColorStop(1, "#262e35");
  ctx.fillStyle = ws;
  ctx.beginPath();
  ctx.roundRect(26, 52, 204, 84, 14);
  ctx.fill();
  ctx.strokeStyle = "#191c20";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(26, 52, 204, 84, 14);
  ctx.stroke();
  // wiper
  ctx.strokeStyle = "rgba(15,15,18,0.85)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(70, 132);
  ctx.lineTo(104, 78);
  ctx.stroke();
  // reflection streak
  ctx.fillStyle = "rgba(255,244,220,0.15)";
  ctx.beginPath();
  ctx.moveTo(52, 136);
  ctx.lineTo(120, 52);
  ctx.lineTo(150, 52);
  ctx.lineTo(82, 136);
  ctx.closePath();
  ctx.fill();

  // Stripe
  ctx.fillStyle = "#f2b705";
  ctx.fillRect(0, 148, 256, 12);

  // Headlight housings
  for (const hx of [52, 204]) {
    ctx.fillStyle = "#1a1c20";
    ctx.beginPath();
    ctx.arc(hx, 190, 24, 0, Math.PI * 2);
    ctx.fill();
    const lg = ctx.createRadialGradient(hx, 190, 2, hx, 190, 20);
    lg.addColorStop(0, "#fffbe8");
    lg.addColorStop(0.5, "#ffe9a8");
    lg.addColorStop(1, "#c9973c");
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.arc(hx, 190, 17, 0, Math.PI * 2);
    ctx.fill();
  }

  // Emergency door + skirt
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.roundRect(108, 152, 40, 70, 4);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 2;
  ctx.strokeRect(108, 152, 40, 70);
  ctx.fillStyle = "rgba(10,10,12,0.72)";
  ctx.fillRect(0, 228, 256, 28);
  // coupler
  ctx.fillStyle = "#22242a";
  ctx.fillRect(112, 230, 32, 20);
  return finish(key, canvas);
}

/** Building facade: window grid, mullions, AC units, parapet shadow. */
export function buildingTexture(): THREE.CanvasTexture {
  const key = "building";
  if (cache.has(key)) return cache.get(key) as THREE.CanvasTexture;
  const [canvas, ctx] = makeCanvas(256, 512);
  const rand = rng(60466);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 256, 512);
  // vertical mullion columns
  const cols = 5;
  const rows = 14;
  const cw = 256 / cols;
  const ch = 512 / rows;
  for (let r = 0; r < rows; r++) {
    // floor slab shadow
    ctx.fillStyle = "rgba(0,0,0,0.14)";
    ctx.fillRect(0, r * ch, 256, 4);
    for (let c = 0; c < cols; c++) {
      const x = c * cw + 7;
      const y = r * ch + 8;
      const w = cw - 14;
      const h = ch - 16;
      const lit = rand() < 0.3;
      // window recess
      ctx.fillStyle = "rgba(0,0,0,0.32)";
      ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
      const g = ctx.createLinearGradient(x, y, x, y + h);
      if (lit) {
        g.addColorStop(0, "#ffe9b8");
        g.addColorStop(1, "#e8b877");
      } else {
        g.addColorStop(0, "#4a5763");
        g.addColorStop(0.6, "#5d6b78");
        g.addColorStop(1, "#333d46");
      }
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, h);
      // reflection
      ctx.fillStyle = "rgba(255,255,255,0.14)";
      ctx.beginPath();
      ctx.moveTo(x + 3, y + h);
      ctx.lineTo(x + w * 0.45, y);
      ctx.lineTo(x + w * 0.62, y);
      ctx.lineTo(x + w * 0.2, y + h);
      ctx.closePath();
      ctx.fill();
      // sill
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(x - 3, y + h + 1, w + 6, 3);
      // AC box on some
      if (rand() < 0.22) {
        ctx.fillStyle = "#b9bdc2";
        ctx.fillRect(x + w * 0.28, y + h * 0.52, w * 0.42, h * 0.4);
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.fillRect(x + w * 0.31, y + h * 0.56, w * 0.36, h * 0.32);
      }
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
      bg: "#f76707",
      draw: (c) => {
        c.fillStyle = "#f8f5f0";
        c.beginPath();
        c.moveTo(64, 22);
        c.quadraticCurveTo(88, 52, 78, 84);
        c.lineTo(50, 84);
        c.quadraticCurveTo(40, 52, 64, 22);
        c.fill();
        c.fillStyle = "#ffd43b";
        c.beginPath();
        c.moveTo(52, 88);
        c.lineTo(76, 88);
        c.lineTo(64, 112);
        c.closePath();
        c.fill();
      },
    },
    multiplier: {
      bg: "#f2b705",
      draw: (c) => {
        c.fillStyle = "#241c05";
        c.font = "900 64px system-ui, sans-serif";
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText("x2", 64, 66);
      },
    },
    sneakers: {
      bg: "#e8590c",
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
      bg: "#1098ad",
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

/** Hazard chevron board (orange/white diagonals, worn). */
export function hazardBoardTexture(): THREE.CanvasTexture {
  const key = "hazardBoard";
  if (cache.has(key)) return cache.get(key) as THREE.CanvasTexture;
  const [canvas, ctx] = makeCanvas(256, 64);
  const rand = rng(64);
  ctx.fillStyle = "#e8590c";
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = "#fff4e6";
  for (let x = -64; x < 320; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 64);
    ctx.lineTo(x + 32, 0);
    ctx.lineTo(x + 64, 0);
    ctx.lineTo(x + 32, 64);
    ctx.closePath();
    ctx.fill();
  }
  // frame + grime
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(0, 0, 256, 5);
  ctx.fillRect(0, 59, 256, 5);
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = `rgba(40,30,20,${0.05 + rand() * 0.12})`;
    ctx.fillRect(rand() * 256, rand() * 64, 4 + rand() * 10, 2 + rand() * 5);
  }
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

/** Fluffy cumulus cloud built from soft blobs — used on a billboard. */
export function cloudSpriteTexture(): THREE.CanvasTexture {
  const key = "cloudSprite";
  if (cache.has(key)) return cache.get(key) as THREE.CanvasTexture;
  const [canvas, ctx] = makeCanvas(256, 128);
  const blob = (x: number, y: number, r: number, a: number): void => {
    const g = ctx.createRadialGradient(x, y, r * 0.15, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${a})`);
    g.addColorStop(0.7, `rgba(255,255,255,${a * 0.55})`);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  blob(128, 84, 62, 0.95);
  blob(74, 90, 44, 0.9);
  blob(186, 88, 48, 0.9);
  blob(108, 62, 38, 0.95);
  blob(156, 64, 34, 0.9);
  const warm = ctx.createLinearGradient(0, 40, 0, 120);
  warm.addColorStop(0, "rgba(255,236,210,0)");
  warm.addColorStop(1, "rgba(255,196,150,0.4)");
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, 256, 128);
  ctx.globalCompositeOperation = "source-over";
  return finish(key, canvas);
}

/** Radial sun glow for the golden-hour sky. */
export function sunGlowTexture(): THREE.CanvasTexture {
  const key = "sunGlow";
  if (cache.has(key)) return cache.get(key) as THREE.CanvasTexture;
  const [canvas, ctx] = makeCanvas(256, 256);
  const g = ctx.createRadialGradient(128, 128, 8, 128, 128, 124);
  g.addColorStop(0, "rgba(255,244,214,1)");
  g.addColorStop(0.18, "rgba(255,214,140,0.9)");
  g.addColorStop(0.45, "rgba(255,166,88,0.42)");
  g.addColorStop(1, "rgba(255,140,60,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, tex);
  return tex;
}

/** Distant city silhouette band with lit windows, drawn twice per side. */
export function skylineTexture(tint: string): THREE.CanvasTexture {
  const key = `skyline-${tint}`;
  if (cache.has(key)) return cache.get(key) as THREE.CanvasTexture;
  const [canvas, ctx] = makeCanvas(1024, 256);
  ctx.clearRect(0, 0, 1024, 256);
  let x = 0;
  const rand = rng(7);
  while (x < 1024) {
    const w = 40 + rand() * 70;
    const h = 70 + rand() * 150;
    ctx.fillStyle = tint;
    ctx.fillRect(x, 256 - h, w, h);
    if (rand() < 0.3) {
      ctx.fillRect(x + w / 2 - 2, 256 - h - 22, 4, 22);
    }
    ctx.fillStyle = "rgba(255,214,150,0.5)";
    for (let wy = 256 - h + 10; wy < 246; wy += 14) {
      for (let wx = x + 6; wx < x + w - 8; wx += 12) {
        if (rand() < 0.12) ctx.fillRect(wx, wy, 5, 7);
      }
    }
    ctx.fillStyle = tint;
    x += w + 4 + rand() * 14;
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, tex);
  return tex;
}

/** Gradient sky dome texture (vertical). */
export function skyGradientTexture(top: number, mid: number, bottom: number): THREE.CanvasTexture {
  const key = `sky-${top}-${mid}-${bottom}`;
  if (cache.has(key)) return cache.get(key) as THREE.CanvasTexture;
  const [canvas, ctx] = makeCanvas(16, 256);
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, hex(top));
  grad.addColorStop(0.45, hex(mid));
  grad.addColorStop(0.8, hex(bottom));
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
