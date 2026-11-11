import { BEAM_H, BEAM_W } from "./geometry";
import { clamp, lerp } from "./math";

// The beam, drawn on a 360 × 400 canvas every frame: a soft body, nine rays that breathe at their own pace, a bright
// core thread and 46 motes of dust drifting up through it. `focus` 1 is the open cone that sits over a resting pill;
// as it drops towards 0 the cone narrows to the thread (what stays while the pill travels). `pulse` is the flash
// on arrival. The rays and the dust are random, picked once per page load.

interface Mote {
  x: number;
  y: number;
  s: number;
  v: number;
  p: number;
}

interface Ray {
  o: number;
  w: number;
  a: number;
  p: number;
  s: number;
}

/** Dust: position across and up the cone (0–1), radius (px), rise speed (cone heights per s) and phase. */
const DUST: Mote[] = Array.from({ length: 46 }, () => ({
  x: Math.random(),
  y: Math.random(),
  s: 0.4 + Math.random() * 1.3,
  v: 0.03 + Math.random() * 0.08,
  p: Math.random() * 6,
}));

/** Rays: offset across the cone (−1 to 1), width (× the cone's foot), strength, phase and breathing speed. */
const RAYS: Ray[] = Array.from({ length: 9 }, (_, i) => ({
  o: (i - 4) / 4,
  w: 0.08 + Math.random() * 0.12,
  a: 0.25 + Math.random() * 0.5,
  p: Math.random() * 6,
  s: 0.6 + Math.random() * 0.8,
}));

/**
 * Draws one frame of the beam.
 * @param T the clock in seconds (the rays and dust move with it)
 * @param w the active pill's width (design px): the open cone's foot is 95% of it
 * @param focus the beam's focus (clamped to 0–1 here)
 * @param pulse the arrival flash, 1 → 0
 */
export function drawBeam(g: CanvasRenderingContext2D, T: number, w: number, focus: number, pulse: number) {
  const W = BEAM_W,
    H = BEAM_H;
  g.clearRect(0, 0, W, H);
  const f = clamp(focus);
  const top = 4 + 6 * f,
    bot = lerp(14, w * 0.95, f);
  g.globalCompositeOperation = "lighter";
  // a trapezoid from the top edge (half-width half0) to the bottom edge (half1), brightest at the foot
  const body = (half0: number, half1: number, alpha: number) => {
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, "rgba(220,255,246,0)");
    gr.addColorStop(0.45, `rgba(220,255,246,${alpha * 0.25})`);
    gr.addColorStop(0.92, `rgba(225,255,248,${alpha})`);
    gr.addColorStop(1, `rgba(240,255,252,${alpha * 1.2})`);
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(W / 2 - half0, 0);
    g.lineTo(W / 2 + half0, 0);
    g.lineTo(W / 2 + half1, H);
    g.lineTo(W / 2 - half1, H);
    g.closePath();
    g.fill();
  };
  body(top / 2, bot / 2, 0.07 + 0.05 * pulse);
  // each ray breathes at its own pace
  RAYS.forEach((r) => {
    const br = 0.55 + 0.45 * Math.sin(T * r.s + r.p);
    const cx = r.o * bot * 0.36;
    const hw = bot * r.w * 0.5;
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, "rgba(230,255,250,0)");
    gr.addColorStop(0.6, `rgba(230,255,250,${0.04 * r.a * br * f})`);
    gr.addColorStop(1, `rgba(235,255,252,${(0.14 * r.a * br * f + 0.1 * pulse).toFixed(3)})`);
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(W / 2 + cx * 0.05 - 1, 0);
    g.lineTo(W / 2 + cx * 0.05 + 1, 0);
    g.lineTo(W / 2 + cx + hw, H);
    g.lineTo(W / 2 + cx - hw, H);
    g.closePath();
    g.fill();
  });
  // the bright core thread: what stays when the beam focuses while the pill moves
  body(1, lerp(3, bot * 0.14, f), 0.16 + 0.12 * (1 - f) + 0.15 * pulse);
  g.globalCompositeOperation = "source-over";
  DUST.forEach((d) => {
    const yy = (((d.y - T * d.v) % 1) + 1) % 1,
      half = lerp(top, bot, yy) / 2,
      xx = W / 2 + (d.x - 0.5) * 2 * half * 0.9 + Math.sin(T + d.p) * 3;
    g.fillStyle = `rgba(235,255,250,${((0.12 + 0.45 * yy) * (0.5 + 0.5 * Math.sin(T * 2 + d.p)) * f).toFixed(3)})`;
    g.beginPath();
    g.arc(xx, yy * H, d.s, 0, Math.PI * 2);
    g.fill();
  });
}
