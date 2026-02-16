<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

/**
 * GalaxyBackground.vue (Starscape Edition)
 *
 * A refined, high-performance background with "fixed" stars that sway
 * and react to mouse movements without flying away.
 */

const canvasRef = ref<HTMLCanvasElement | null>(null);
let animationId: number | null = null;
let ctx: CanvasRenderingContext2D | null = null;

// --- CONFIGURATION ---
const PARTICLE_COUNT = 500;     // Increased for better starscape density
const PARTICLE_BLUR = 0.3;     // 0.1 (sharp) to 1.0 (soft glow)
const CONNECTION_DISTANCE = 1;
const CONNECTION_DIST_SQ = CONNECTION_DISTANCE * CONNECTION_DISTANCE;
const FOCAL_LENGTH = 1000;

// Mouse Interaction
const MOUSE_RADIUS = 300;
const MOUSE_PUSH_STRENGTH = 50; // How much stars "flee" from the cursor

// Sway / Organic Movement
const SWAY_AMPLITUDE = 25;
const SWAY_SPEED = 0.0001;

// Star Sizes
const STAR_BASE_SIZE = 1;
const STAR_VARIATION = 3;
const STAR_RENDER_SCALE = 10; // Overall scale multiplier in draw loop

// Colors
const PALETTE = ['#00f2ff', '#8f00ff', '#ffffff', '#7df9ff', '#b4f0ff'];

// --- SHARED SPRITES (Pre-rendering) ---
const spriteCache = new Map<string, HTMLCanvasElement>();

const createParticleSprite = (color: string) => {
  const size = 32;
  const offscreen = document.createElement('canvas');
  offscreen.width = size;
  offscreen.height = size;
  const octx = offscreen.getContext('2d');
  if (!octx) return offscreen;

  const center = size / 2;
  const gradient = octx.createRadialGradient(center, center, 0, center, center, center);

  // Blur control: Lower blur = sharper core
  const coreEdge = 0.1 * (1 - PARTICLE_BLUR);
  const glowEdge = Math.max(0.15, PARTICLE_BLUR);

  gradient.addColorStop(0, color);
  gradient.addColorStop(coreEdge, color);
  gradient.addColorStop(glowEdge, 'rgba(0, 0, 0, 0)');

  octx.fillStyle = gradient;
  octx.fillRect(0, 0, size, size);
  return offscreen;
};

const preRenderSprites = () => {
  spriteCache.clear();
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
  originX: number; originY: number; originZ: number;
  x: number; y: number; z: number;
  size: number;
  color: string;
  noiseOffset: number;
  sprite: HTMLCanvasElement | null;

  // Projected results
  px = 0; py = 0; pscale = 0;

  constructor() {
    // Spread stars in a wider volume for parallax depth
    this.originX = (Math.random() - 0.5) * 2500;
    this.originY = (Math.random() - 0.5) * 2000;
    this.originZ = (Math.random() - 0.5) * 1200;

    this.x = this.originX;
    this.y = this.originY;
    this.z = this.originZ;

    this.size = Math.random() * STAR_VARIATION + STAR_BASE_SIZE;
    this.noiseOffset = Math.random() * 10000;

    this.color = PALETTE[Math.floor(Math.random() * PALETTE.length)] ?? '#ffffff';
    this.sprite = spriteCache.get(this.color) || null;
  }

  update(time: number) {
    // 1. Organic Sway
    const swayX = Math.sin(time * SWAY_SPEED + this.noiseOffset) * SWAY_AMPLITUDE;
    const swayY = Math.cos(time * SWAY_SPEED * 1.1 + this.noiseOffset) * SWAY_AMPLITUDE;
    const swayZ = Math.sin(time * SWAY_SPEED * 0.8 + this.noiseOffset) * SWAY_AMPLITUDE;

    // 2. Projection (Initial for mouse math)
    const tempScale = FOCAL_LENGTH / (FOCAL_LENGTH + this.originZ + swayZ);
    const tempPx = (this.originX + swayX) * tempScale + width / 2;
    const tempPy = (this.originY + swayY) * tempScale + height / 2;

    // 3. Mouse Reaction (Push away effect)
    let mouseOffsetX = 0;
    let mouseOffsetY = 0;

    if (mouse.isActive) {
      const dx = tempPx - mouse.x;
      const dy = tempPy - mouse.y;
      const distSq = dx * dx + dy * dy;

      if (distSq < MOUSE_RADIUS * MOUSE_RADIUS) {
        const dist = Math.sqrt(distSq) || 1;
        const force = (1 - dist / MOUSE_RADIUS) * MOUSE_PUSH_STRENGTH;
        mouseOffsetX = (dx / dist) * force;
        mouseOffsetY = (dy / dist) * force;
      }
    }

    // 4. Final Position
    this.x = this.originX + swayX;
    this.y = this.originY + swayY;
    this.z = this.originZ + swayZ;

    this.pscale = FOCAL_LENGTH / (FOCAL_LENGTH + this.z);
    this.px = this.x * this.pscale + width / 2 + mouseOffsetX;
    this.py = this.y * this.pscale + height / 2 + mouseOffsetY;
  }
}

let particles: Particle[] = [];

const initParticles = () => {
  particles = [];
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

  const dt = Math.min(time - lastTime, 100);
  lastTime = time;
  const dtScale = dt / 16.6;

  const c = ctx;
  c.clearRect(0, 0, width, height);

  if (mouse.isActive) {
    mouse.x += (mouse.targetX - mouse.x) * 0.08 * dtScale;
    mouse.y += (mouse.targetY - mouse.y) * 0.08 * dtScale;
  }

  c.globalCompositeOperation = 'lighter';

  // Update and Sort
  for (const p of particles) p.update(time);
  particles.sort((a, b) => b.z - a.z);

  // Connection Phase (Constellations)
  c.lineWidth = 0.5;
  c.strokeStyle = 'rgba(180, 240, 255, 0.12)';
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const p1 = particles[i]!;
    if (p1.pscale <= 0.35) continue;

    let connections = 0;
    // We only connect fixed neighbors or a few close ones to avoid flickering
    for (let j = i + 1; j < PARTICLE_COUNT && connections < 2; j++) {
      const p2 = particles[j]!;
      const adx = Math.abs(p1.px - p2.px);
      if (adx > CONNECTION_DISTANCE) continue;

      const dy = p1.py - p2.py;
      const dSq = adx * adx + dy * dy;

      if (dSq < CONNECTION_DIST_SQ) {
        connections++;
        const alpha = (1 - Math.sqrt(dSq) / CONNECTION_DISTANCE) * 0.12 * Math.min(p1.pscale, p2.pscale);
        c.globalAlpha = alpha;
        c.beginPath();
        c.moveTo(p1.px, p1.py);
        c.lineTo(p2.px, p2.py);
        c.stroke();
      }
    }
  }

  // Draw Phase
  for (const p of particles) {
    if (p.pscale <= 0.1 || !p.sprite) continue;

    const size = p.size * p.pscale * STAR_RENDER_SCALE;
    c.globalAlpha = Math.min(p.pscale * 1.2, 1);
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
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  background: radial-gradient(circle at center, #0a0a12 0%, #020205 100%);
  pointer-events: none;
}

.galaxy-canvas {
  display: block;
}
</style>

