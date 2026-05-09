import React, { useRef, useEffect } from 'react';
import { useAtmosphere } from '../atmosphere/AtmosphereProvider';

// ============================================================
// vAIb Sacred Prototype — AtmosphereCanvas
// Full-screen Canvas 2D particle system. Background layer only.
// ============================================================

// Base color palette (6 colors, shifting over time)
const PALETTE = [
  '#6B8CAE', '#8FA8C8', '#A8C4A2', '#C9B1D4', '#D4A89A', '#9AB8D4'
];

// Kelvin to RGB approximation for color temperature
// 2000K = warm amber, 4500K = neutral white, 6500K = cool blue-white
function kelvinToRGB(kelvin) {
  let r, g, b;
  const k = Math.max(2000, Math.min(6500, kelvin));

  if (k <= 4500) {
    // 2000K .. 4500K
    const t = (k - 2000) / 2500;
    r = 255;
    g = Math.round(160 + (240 - 160) * t);
    b = Math.round(80 + (220 - 80) * t);
  } else {
    // 4500K .. 6500K
    const t = (k - 4500) / 2000;
    r = Math.round(255 + (220 - 255) * t);
    g = Math.round(240 + (240 - 240) * t);
    b = Math.round(220 + (255 - 220) * t);
  }

  return `rgb(${r}, ${g}, ${b})`;
}

// Simple hex to RGB array helper
function hexToRGB(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Create a single particle
function createParticle(width, height, ri) {
  const colorHex = PALETTE[Math.floor(Math.random() * PALETTE.length)];
  const rgb = hexToRGB(colorHex);
  const jitterBase = 0.5 + ri * 1.5; // 0.5 at low RI, 2.0 at high RI

  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.3 * (0.3 + ri * 0.7),
    vy: (Math.random() - 0.5) * 0.3 * (0.3 + ri * 0.7),
    radius: 1 + Math.random() * 3,
    rgb,
    opacity: 0.1 + Math.random() * 0.5,
    pulsePhase: Math.random() * Math.PI * 2,
    pulseSpeed: 0.3 + Math.random() * 1.5,
    jitterBase,
  };
}

// Update particle position and state
function updateParticle(p, dt, { speedMultiplier, w, h, bloom, ri }) {
  // Apply velocity with speed multiplier
  const speed = speedMultiplier || 1;
  p.x += p.vx * speed;
  p.y += p.vy * speed;

  // Add drift noise (jitter) based on RI
  const jitter = p.jitterBase || (0.5 + (ri || 0.5) * 1.5);
  p.x += (Math.random() - 0.5) * jitter * dt * 60;
  p.y += (Math.random() - 0.5) * jitter * dt * 60;

  // Wrap around edges (with margin for glow)
  const margin = p.radius * 4;
  if (p.x < -margin) p.x = w + margin;
  if (p.x > w + margin) p.x = -margin;
  if (p.y < -margin) p.y = h + margin;
  if (p.y > h + margin) p.y = -margin;

  // Update pulse phase
  p.pulsePhase += p.pulseSpeed * dt;

  // Slight velocity drift over time
  p.vx += (Math.random() - 0.5) * 0.001;
  p.vy += (Math.random() - 0.5) * 0.001;

  // Clamp velocity to prevent runaway particles
  const maxV = 0.8;
  p.vx = Math.max(-maxV, Math.min(maxV, p.vx));
  p.vy = Math.max(-maxV, Math.min(maxV, p.vy));
}

// Draw a single particle with soft radial glow
function drawParticle(ctx, p, { bloom, saturation }) {
  const sat = typeof saturation === 'number' ? saturation : 1;
  const pulse = 0.7 + 0.3 * Math.sin(p.pulsePhase);
  const alpha = p.opacity * pulse * (1 - (bloom || 0) * 0.3);
  const r = p.rgb[0];
  const g = Math.round(p.rgb[1] * sat + 180 * (1 - sat));
  const b = Math.round(p.rgb[2] * sat + 200 * (1 - sat));

  const glowRadius = p.radius * 4;

  // Outer soft glow
  const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowRadius);
  gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
  gradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${alpha * 0.4})`);
  gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2);
  ctx.fill();

  // Bright inner core
  const coreGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
  coreGrad.addColorStop(0, `rgba(${r}, ${g + 20}, ${b + 30}, ${alpha * 1.2})`);
  coreGrad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
  ctx.fill();
}

// ============================================================
// React Component
// ============================================================
export default function AtmosphereCanvas() {
  const canvasRef = useRef(null);
  const { ri, parameters } = useAtmosphere();
  const particlesRef = useRef([]);
  const animFrameRef = useRef(null);
  const lastTimeRef = useRef(0);
  // Keep latest values in a ref so the rAF loop always sees them
  const paramsRef = useRef(parameters);
  const riRef = useRef(ri);

  // Sync refs whenever parameters/ri change
  useEffect(() => {
    paramsRef.current = parameters;
  }, [parameters]);
  useEffect(() => {
    riRef.current = ri;
  }, [ri]);

  // Resize canvas to window
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Animation loop (single, continuous — never restarts)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio, 2);

    const animate = (time) => {
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.05); // cap at 50ms
      lastTimeRef.current = time;

      const params = paramsRef.current || {};
      const currentRI = typeof riRef.current === 'number' ? riRef.current : 0.7;
      const w = window.innerWidth;
      const h = window.innerHeight;

      // Clear — draw background gradient based on RI and color temperature
      const bgGradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.8);
      const tempColor = kelvinToRGB(params.colorTemperature || 6500);
      const saturation = (params.saturation || 100) / 100;
      const luminance = (params.luminance || 100) / 100;

      bgGradient.addColorStop(0, `hsla(220, ${30 * saturation}%, ${12 + 18 * luminance}%, 1)`);
      bgGradient.addColorStop(0.6, `hsla(230, ${22 * saturation}%, ${7 + 12 * luminance}%, 1)`);
      bgGradient.addColorStop(1, `hsla(240, ${18 * saturation}%, ${4 + 8 * luminance}%, 1)`);

      // Account for DPR scaling when clearing
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, w, h);

      // 2. Manage particle pool size
      const targetCount = Math.floor(params.particleCount || (20 + currentRI * 80));
      while (particlesRef.current.length < targetCount) {
        particlesRef.current.push(createParticle(w, h, currentRI));
      }
      while (particlesRef.current.length > targetCount) {
        particlesRef.current.pop();
      }

      // 3. Update and draw particles
      const speedMultiplier = params.motionSpeed || (0.3 + currentRI * 0.7);
      const bloom = params.bloomIntensity || 0.3;

      particlesRef.current.forEach((p) => {
        updateParticle(p, dt, { speedMultiplier, w, h, bloom, ri: currentRI });
        drawParticle(ctx, p, { bloom, saturation });
      });

      // 4. Subtle bloom overlay
      if (bloom > 0.01) {
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = `rgba(100, 140, 180, ${bloom * 0.025})`;
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'source-over';
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []); // run once

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
