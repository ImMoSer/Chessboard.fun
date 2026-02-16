<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

/**
 * GalaxyBackground.vue (Production Grade)
 *
 * High-performance 3D particle swarm background.
 * Optimizations:
 * 1. Delta Time (FPS independence)
 * 2. Sprite Caching (drawImage instead of shadowBlur)
 * 3. Array Reuse (No map/object creation in loop)
 * 4. Early-exit Connection Checks
 */

const canvasRef = ref<HTMLCanvasElement | null>(null);
let animationId: number | null = null;
let ctx: CanvasRenderingContext2D | null = null;

// --- CONFIGURATION ---
const PARTICLE_COUNT = 150;
const CONNECTION_DISTANCE = 150;
const CONNECTION_DIST_SQ = CONNECTION_DISTANCE * CONNECTION_DISTANCE;
const FOCAL_LENGTH = 500;
const MOUSE_RADIUS = 300;
const ATTRACTION_FORCE = 0.03;
const SEPARATION_FORCE = 0.1;
const SEPARATION_DISTANCE = 50;
const SEPARATION_DIST_SQ = SEPARATION_DISTANCE * SEPARATION_DISTANCE;
const DAMPING = 0.92;
const ROAM_SPEED = 0.1;

// Colors
const PALETTE = ['#00f2ff', '#8f00ff', '#ffffff', '#7df9ff', '#b4f0ff'];

// --- SHARED SPRITES (Pre-rendering) ---
const spriteCache = new Map<string, HTMLCanvasElement>();

const createParticleSprite = (color: string) => {
  const size = 32; // Sprite size
  const offscreen = document.createElement('canvas');
  offscreen.width = size;
  offscreen.height = size;
  const octx = offscreen.getContext('2d');
  if (!octx) return offscreen;

  const center = size / 2;
  const gradient = octx.createRadialGradient(center, center, 0, center, center, center);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.2, color);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  octx.fillStyle = gradient;
  octx.fillRect(0, 0, size, size);
  return offscreen;
};

const preRenderSprites = () => {
  PALETTE.forEach(color => {
    spriteCache.set(color, createParticleSprite(color));
  });
};

// --- STATE ---
let width = 0;
let height = 0;
let dpr = 1;
let lastTime = 0;

const mouse = {
  x: -1000,
  y: -1000,
  targetX: -1000,
  targetY: -1000,
  isActive: false,
};

class Particle {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  size: number;
  color: string;
  noiseOffset: number;
  sprite: HTMLCanvasElement | null;

  // Projected results (Object Reuse)
  px = 0; py = 0; pscale = 0;

  constructor() {
    this.x = (Math.random() - 0.5) * 2000;
    this.y = (Math.random() - 0.5) * 2000;
    this.z = (Math.random() - 0.5) * 1000;
    this.vx = (Math.random() - 0.5) * 5;
    this.vy = (Math.random() - 0.5) * 5;
    this.vz = (Math.random() - 0.5) * 5;
    this.size = Math.random() * 1.5 + 0.5;
    this.noiseOffset = Math.random() * 1000;

    this.color = PALETTE[Math.floor(Math.random() * PALETTE.length)] ?? '#ffffff';
    this.sprite = spriteCache.get(this.color) || null;
  }

  update(dt: number, time: number, particles: Particle[]) {
    const dtScale = dt / 16.6; // Scale relative to 60fps

    // 1. Organic Roaming
    const rx = Math.sin(time * 0.001 + this.noiseOffset) * ROAM_SPEED * dtScale;
    const ry = Math.cos(time * 0.0012 + this.noiseOffset) * ROAM_SPEED * dtScale;
    const rz = Math.sin(time * 0.0008 + this.noiseOffset) * ROAM_SPEED * dtScale;
    this.vx += rx; this.vy += ry; this.vz += rz;

    // 2. Mouse Attraction
    if (mouse.isActive) {
      const dx = mouse.x - this.px;
      const dy = mouse.y - this.py;
      const dSq = dx * dx + dy * dy;

      if (dSq < MOUSE_RADIUS * MOUSE_RADIUS) {
        const dist = Math.sqrt(dSq);
        const strength = (1 - dist / MOUSE_RADIUS) * ATTRACTION_FORCE * dtScale;
        this.vx += dx * strength;
        this.vy += dy * strength;
        this.vz += (Math.random() - 0.5) * strength * 5;
      }
    }

    // 3. Separation (Sampled for perf)
    const len = particles.length;
    for (let i = 0; i < 5; i++) {
      const other = particles[Math.floor(Math.random() * len)];
      if (!other || other === this) continue;

      const dx = this.x - other.x;
      const dy = this.y - other.y;
      const dz = this.z - other.z;
      const dSq = dx * dx + dy * dy + dz * dz;

      if (dSq < SEPARATION_DIST_SQ) {
        const dist = Math.sqrt(dSq) || 1;
        const force = (SEPARATION_DISTANCE - dist) / SEPARATION_DISTANCE * SEPARATION_FORCE * dtScale;
        this.vx += (dx / dist) * force;
        this.vy += (dy / dist) * force;
        this.vz += (dz / dist) * force;
      }
    }

    // 4. Integration
    const drag = Math.pow(DAMPING, dtScale);
    this.vx *= drag; this.vy *= drag; this.vz *= drag;
    this.x += this.vx * dtScale;
    this.y += this.vy * dtScale;
    this.z += this.vz * dtScale;

    // 5. Center Pull
    const limit = 1200;
    const distSq = this.x * this.x + this.y * this.y + this.z * this.z;
    if (distSq > limit * limit) {
      const dist = Math.sqrt(distSq);
      const pull = (dist - limit) * 0.001 * dtScale;
      this.vx -= (this.x / dist) * pull;
      this.vy -= (this.y / dist) * pull;
      this.vz -= (this.z / dist) * pull;
    }

    // 6. Projection
    this.pscale = FOCAL_LENGTH / (FOCAL_LENGTH + this.z);
    this.px = this.x * this.pscale + width / 2;
    this.py = this.y * this.pscale + height / 2;
  }
}

const particles: Particle[] = [];

const initParticles = () => {
  particles.length = 0;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(new Particle());
  }
};

const handleMouseMove = (e: MouseEvent) => {
  mouse.targetX = e.clientX;
  mouse.targetY = e.clientY;
  mouse.isActive = true;
};
const handleMouseLeave = () => { mouse.isActive = false; };

const updateSize = () => {
  if (!canvasRef.value) return;
  dpr = window.devicePixelRatio || 1;
  width = window.innerWidth;
  height = window.innerHeight;
  canvasRef.value.width = width * dpr;
  canvasRef.value.height = height * dpr;
  canvasRef.value.style.width = `${width}px`;
  canvasRef.value.style.height = `${height}px`;
  ctx = canvasRef.value.getContext('2d');
  if (ctx) ctx.scale(dpr, dpr);
};

const draw = (time: number) => {
  if (!ctx) return;

  // Fix for first frame explosion (Delta Time stability)
  if (!lastTime) {
    lastTime = time;
    animationId = requestAnimationFrame(draw);
    return;
  }

  const dt = Math.min(time - lastTime, 100); // Cap DT to prevent large jumps
  lastTime = time;
  const dtScale = dt / 16.6;

  const c = ctx;
  c.clearRect(0, 0, width, height);

  if (mouse.isActive) {
    mouse.x += (mouse.targetX - mouse.x) * 0.1 * dtScale;
    mouse.y += (mouse.targetY - mouse.y) * 0.1 * dtScale;
  }

  c.globalCompositeOperation = 'lighter';

  // Sort by depth (less particles makes this feasible, stable for visual depth)
  particles.sort((a, b) => b.z - a.z);

  // Connection Phase
  c.lineWidth = 0.4;
  c.strokeStyle = 'rgba(180, 240, 255, 0.15)';
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const p1 = particles[i]!;
    p1.update(dt, time, particles);
    if (p1.pscale <= 0.25) continue;

    let connections = 0;
    for (let j = i + 1; j < PARTICLE_COUNT && connections < 3; j++) {
      const p2 = particles[j]!;
      // Optimization: Early exit based on DX
      const adx = Math.abs(p1.px - p2.px);
      if (adx > CONNECTION_DISTANCE) continue;

      const dy = p1.py - p2.py;
      const dSq = adx * adx + dy * dy;

      if (dSq < CONNECTION_DIST_SQ) {
        connections++;
        const alpha = (1 - Math.sqrt(dSq) / CONNECTION_DISTANCE) * 0.15 * Math.min(p1.pscale, p2.pscale);
        c.globalAlpha = alpha;
        c.beginPath();
        c.moveTo(p1.px, p1.py);
        c.lineTo(p2.px, p2.py);
        c.stroke();
      }
    }
  }

  // Draw Phase
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const p = particles[i]!;
    if (p.pscale <= 0.15 || !p.sprite) continue;

    const size = p.size * p.pscale * 12; // Adjusted for sprite size
    c.globalAlpha = Math.min(p.pscale, 1);
    c.drawImage(p.sprite, p.px - size / 2, p.py - size / 2, size, size);
  }

  c.globalAlpha = 1;
  animationId = requestAnimationFrame(draw);
};

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  if (canvasRef.value) {
    preRenderSprites();
    updateSize();
    initParticles();
    animationId = requestAnimationFrame(draw);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    resizeObserver = new ResizeObserver(() => updateSize());
    resizeObserver.observe(document.body);
  }
});

onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId);
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('mouseleave', handleMouseLeave);
  if (resizeObserver) resizeObserver.disconnect();
});
</script>

<template>
  <div class="galaxy-wrapper">
    <canvas ref="canvasRef" class="galaxy-canvas"></canvas>
  </div>
</template>

<style scoped>
.galaxy-wrapper {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  background: radial-gradient(circle at center, #10101a 0%, #050508 100%);
  pointer-events: none;
}

.galaxy-canvas {
  display: block;
}
</style>
