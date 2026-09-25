import * as THREE from "three";
import { COLORS, COIN_COLLECT_RADIUS, MAGNET_PULL, MAGNET_RADIUS } from "../Config";
import { falloff } from "../utils";

/**
 * Pooled coin system. Coins spin upright (YXZ euler order), get vacuumed by
 * the magnet powerup with an easing pull, and play a pop-scale collect anim.
 */

interface Coin {
  mesh: THREE.Mesh;
  baseY: number;
  x: number;
  y: number;
  z: number;
  spin: number;
  collected: number; // 0 = idle, >0 = collect anim progress (seconds)
  vx: number;
  vy: number;
  vz: number;
  active: boolean;
}

export class CoinManager {
  readonly group = new THREE.Group();
  private pool: Coin[] = [];
  private active: Coin[] = [];

  private geo = new THREE.CylinderGeometry(0.32, 0.32, 0.09, 18);
  private material: THREE.MeshLambertMaterial;

  constructor(count = 200) {
    this.material = new THREE.MeshLambertMaterial({
      color: COLORS.coin,
      emissive: COLORS.coinEmissive,
      emissiveIntensity: 0.45,
    });
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(this.geo, this.material);
      mesh.rotation.order = "YXZ";
      mesh.rotation.x = Math.PI / 2; // face the runner, spin around Y
      mesh.visible = false;
      this.group.add(mesh);
      this.pool.push({
        mesh, baseY: 0, x: 0, y: 0, z: 0, spin: 0,
        collected: 0, vx: 0, vy: 0, vz: 0, active: false,
      });
    }
  }

  spawn(x: number, y: number, z: number): void {
    const coin = this.pool.pop();
    if (!coin) return; // pool exhausted — silently drop, world stays valid
    coin.active = true;
    coin.collected = 0;
    coin.x = x;
    coin.y = y;
    coin.baseY = y;
    coin.z = z;
    coin.vx = coin.vy = coin.vz = 0;
    coin.spin = Math.random() * Math.PI * 2;
    coin.mesh.visible = true;
    coin.mesh.scale.setScalar(1);
    coin.mesh.position.set(x, y, z);
    this.active.push(coin);
  }

  update(
    dt: number,
    player: { x: number; y: number; z: number },
    magnetActive: boolean,
    onCollect: () => void,
  ): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const c = this.active[i];
      c.spin += dt * 4.2;

      if (c.collected > 0) {
        // Pop-up collect animation then release.
        c.collected += dt;
        const t = c.collected / 0.22;
        c.mesh.scale.setScalar(1 + t * 0.9);
        c.mesh.position.y = c.y + t * 1.1;
        if (t >= 1) this.release(i);
        continue;
      }

      if (magnetActive) {
        const dx = player.x - c.x;
        const dy = player.y + 0.9 - c.y;
        const dz = player.z - c.z;
        const dist = Math.hypot(dx, dy, dz);
        if (dist < MAGNET_RADIUS) {
          const pull = MAGNET_PULL * falloff(dist, MAGNET_RADIUS) * dt;
          const inv = dist > 0.001 ? 1 / dist : 0;
          c.x += dx * inv * pull;
          c.y += dy * inv * pull;
          c.z += dz * inv * pull;
        }
      }

      const dx = player.x - c.x;
      const dy = player.y + 0.9 - c.y;
      const dz = player.z - c.z;
      const dist = Math.hypot(dx, dy, dz);
      if (dist < COIN_COLLECT_RADIUS) {
        c.collected = 0.0001;
        onCollect();
        continue;
      }

      c.mesh.position.set(c.x, c.y, c.z);
      c.mesh.rotation.y = c.spin;
    }
  }

  /** Coins this far behind the player are recycled. */
  cull(playerZ: number, behind: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      if (this.active[i].z > playerZ + behind) this.release(i);
    }
  }

  private release(index: number): void {
    const c = this.active[index];
    c.active = false;
    c.mesh.visible = false;
    this.active.splice(index, 1);
    this.pool.push(c);
  }

  reset(): void {
    while (this.active.length) this.release(this.active.length - 1);
  }

  get activeCount(): number {
    return this.active.length;
  }
}

/**
 * Short-lived "pop" sparkles reused for pickups — one shared sprite pool.
 */
export class SparkleManager {
  readonly group = new THREE.Group();
  private pool: Array<{ sprite: THREE.Sprite; life: number }> = [];
  private active: Array<{ sprite: THREE.Sprite; life: number }> = [];

  constructor(count = 24, texture: THREE.Texture) {
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    });
    for (let i = 0; i < count; i++) {
      const sprite = new THREE.Sprite(material.clone());
      sprite.visible = false;
      sprite.scale.setScalar(0.6);
      this.group.add(sprite);
      this.pool.push({ sprite, life: 0 });
    }
  }

  burst(x: number, y: number, z: number, n = 5, color = 0xffd43b): void {
    for (let i = 0; i < n; i++) {
      const s = this.pool.pop() ?? this.active.shift();
      if (!s) return;
      (s.sprite.material as THREE.SpriteMaterial).color.setHex(color);
      s.life = 0.0001;
      s.sprite.visible = true;
      s.sprite.position.set(
        x + (Math.random() - 0.5) * 0.5,
        y + (Math.random() - 0.5) * 0.5,
        z + (Math.random() - 0.5) * 0.5,
      );
      s.sprite.scale.setScalar(0.35 + Math.random() * 0.3);
      this.active.push(s);
    }
  }

  update(dt: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const s = this.active[i];
      s.life += dt;
      const t = s.life / 0.45;
      s.sprite.scale.setScalar(0.4 + t * 0.7);
      (s.sprite.material as THREE.SpriteMaterial).opacity = Math.max(0, 1 - t);
      s.sprite.position.y += dt * 1.2;
      if (t >= 1) {
        s.sprite.visible = false;
        this.active.splice(i, 1);
        this.pool.push(s);
      }
    }
  }
}
