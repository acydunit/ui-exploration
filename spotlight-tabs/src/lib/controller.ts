import { drawBeam } from "./beam";
import { BEAM_W, CURSOR_TIP_X, CURSOR_TIP_Y } from "./geometry";
import { clamp, lerp } from "./math";
import {
  BEAM_OPACITY,
  CAUSTIC_FOCUS,
  CAUSTIC_PULSE,
  COVER,
  COVER_SPAN,
  CURSOR_PRESSED,
  FLOOR_ALPHA,
  FLOOR_FOCUS,
  FLOOR_LEFT,
  FLOOR_PULSE,
  FLOOR_WIDTH,
  GLOW,
  GLOW_ALPHA,
  GLOW_ON,
  HOVER_LIT,
  ICON_ON,
  RIM_OPACITY,
  RIM_OPACITY_GAIN,
  RIM_WIDTH,
  TILT_MAX,
} from "./motion";
import { CAUSTIC, FLOOR, ICON_GLOW, ICON_LIT, TAB_DIM, TAB_LIT, type RGB } from "./palette";
import { barLeft, createSpotlight, layout, select, step, touch } from "./spotlight";

// Runs the tab bar on the rendered scene: waits for the font, measures the tabs, steps the state every animation
// frame and writes the frame to the DOM. Positions and sizes go out as unitless custom properties in design px (the
// CSS multiplies them by --u); opacity, colours, the beam's tilt and the canvas are written directly. Every write is
// skipped when the value hasn't changed. Returns a cleanup.

const REDUCED = "(prefers-reduced-motion: reduce)";
/** The face the tabs are set in; the bar is measured once it has loaded (or after FONT_WAIT ms without it). */
const FONT = '500 15.5px "Geist"';
const FONT_WAIT = 3000;

function part<T extends Element>(root: Element, name: string): T {
  const el = root.querySelector<T>(`[data-part="${name}"]`);
  if (!el) throw new Error(`spotlight-tabs: missing [data-part="${name}"]`);
  return el;
}

function parts<T extends Element>(root: Element, name: string): T[] {
  return [...root.querySelectorAll<T>(`[data-part="${name}"]`)];
}

/** A colour between two, channels rounded. */
const mix = (a: RGB, b: RGB, u: number) =>
  `rgb(${Math.round(lerp(a[0], b[0], u))},${Math.round(lerp(a[1], b[1], u))},${Math.round(lerp(a[2], b[2], u))})`;

export function mountSpotlightTabs(scene: HTMLElement): () => void {
  const beam = part<HTMLCanvasElement>(scene, "beam");
  const floor = part<HTMLElement>(scene, "floor");
  const bar = part<HTMLElement>(scene, "bar");
  const rimlight = part<HTMLElement>(scene, "rimlight");
  const hover = part<HTMLElement>(scene, "hover");
  const active = part<HTMLElement>(scene, "active");
  const caustic = part<HTMLElement>(scene, "caustic");
  const tablist = part<HTMLElement>(scene, "tablist");
  const tabs = parts<HTMLButtonElement>(scene, "tab");
  const icons = tabs.map((tab) => part<SVGSVGElement>(tab, "icon"));
  const probes = parts<HTMLElement>(scene, "probe");
  const cursor = part<SVGSVGElement>(scene, "cursor");
  const g = beam.getContext("2d");
  if (!g) return () => {};

  const query = window.matchMedia(REDUCED);
  const s = createSpotlight();
  let raf = 0;
  let disposed = false;

  const last = new WeakMap<Element, Map<string, string>>();
  /** A style property or a custom property ('' removes it). */
  const css = (el: HTMLElement | SVGElement, prop: string, value: string | number) => {
    const v = String(value);
    let seen = last.get(el);
    if (!seen) last.set(el, (seen = new Map()));
    if (seen.get(prop) === v) return;
    seen.set(prop, v);
    if (v === "") el.style.removeProperty(prop);
    else el.style.setProperty(prop, v);
  };
  const attr = (el: Element, name: string, value: string) => {
    if (el.getAttribute(name) !== value) el.setAttribute(name, value);
  };

  // input: a hover or click on a tab, or any key, holds the demo off; arrow keys, Home and End move between tabs
  const enter = (i: number) => () => {
    s.hov = i;
    touch(s, performance.now());
  };
  const leave = () => {
    s.hov = -1;
  };
  const click = (i: number) => () => {
    select(s, i);
    touch(s, performance.now());
  };
  const onKey = () => {
    // the demo's hover goes with its cursor
    if (s.demo) s.hov = -1;
    touch(s, performance.now());
  };
  const onTabKey = (e: KeyboardEvent) => {
    const n = tabs.length;
    const from = tabs.indexOf(document.activeElement as HTMLButtonElement);
    const at = from < 0 ? s.act : from;
    const to =
      e.key === "ArrowRight" ? (at + 1) % n
      : e.key === "ArrowLeft" ? (at + n - 1) % n
      : e.key === "Home" ? 0
      : e.key === "End" ? n - 1
      : -1;
    if (to < 0 || e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    select(s, to);
    tabs[to].focus();
  };
  const listeners = tabs.map((tab, i) => {
    const on = { enter: enter(i), click: click(i) };
    tab.addEventListener("pointerenter", on.enter);
    tab.addEventListener("pointerleave", leave);
    tab.addEventListener("click", on.click);
    return on;
  });
  tablist.addEventListener("keydown", onTabKey);
  window.addEventListener("keydown", onKey);

  const frame = (now: number) => {
    if (s.start === null) {
      layout(
        s,
        probes.map((p) => p.offsetWidth),
      );
      css(bar, "--x", barLeft(s));
      css(bar, "--w", s.BW);
      tabs.forEach((tab, i) => {
        css(tab, "--x", s.X[i]);
        css(tab, "--w", s.Wd[i]);
      });
    }
    const reduced = query.matches;
    const { w, fo } = step(s, now, reduced);
    const f = clamp(fo);

    // the demo cursor
    if (s.demo) {
      css(cursor, "display", "");
      css(cursor, "--x", s.cx - CURSOR_TIP_X);
      css(cursor, "--y", s.cy - CURSOR_TIP_Y);
      css(cursor, "transform", `scale(${s.down ? CURSOR_PRESSED : 1})`);
    } else css(cursor, "display", "none");

    // the pills
    css(active, "--x", s.L.x);
    css(active, "--w", w);
    css(hover, "--x", s.HL.x);
    css(hover, "--w", s.HR.x - s.HL.x);
    css(hover, "opacity", clamp(s.HO.x));

    // the beam, the pool of light under it, the light line on the rim and the light in the pill
    css(beam, "--x", s.BM - BEAM_W / 2);
    css(beam, "opacity", lerp(BEAM_OPACITY[0], BEAM_OPACITY[1], f));
    css(beam, "transform", `skewX(${clamp(s.SK, -TILT_MAX, TILT_MAX).toFixed(2)}deg)`);
    drawBeam(g, s.beamT, w, fo, s.pulse);
    css(floor, "--x", s.BM - w * FLOOR_LEFT);
    css(floor, "--w", w * FLOOR_WIDTH);
    css(
      floor,
      "background",
      `radial-gradient(closest-side,rgba(${FLOOR},${(FLOOR_ALPHA + FLOOR_FOCUS * f + FLOOR_PULSE * s.pulse).toFixed(3)}),transparent)`,
    );
    const rw = w * lerp(RIM_WIDTH[0], RIM_WIDTH[1], f);
    css(rimlight, "--x", s.BM - barLeft(s) - rw / 2);
    css(rimlight, "--w", rw);
    css(rimlight, "opacity", (RIM_OPACITY + RIM_OPACITY_GAIN * f).toFixed(3));
    css(
      caustic,
      "background",
      `radial-gradient(60% 90% at 50% 0%,rgba(${CAUSTIC},${(CAUSTIC_FOCUS * f + CAUSTIC_PULSE * s.pulse).toFixed(3)}),transparent 70%)`,
    );

    // labels and icons light up as the pill covers them
    tabs.forEach((tab, i) => {
      const c = s.X[i] + s.Wd[i] / 2,
        cov = clamp(1 - Math.abs(c - (s.L.x + w / 2)) / (s.Wd[i] * COVER_SPAN));
      const lit = s.lit[i];
      const k = Math.max(cov * COVER, lit),
        hk = s.hov === i && i !== s.act ? HOVER_LIT : 0,
        v = Math.max(k, hk);
      css(tab, "color", mix(TAB_DIM, TAB_LIT, v));
      css(icons[i], "color", lit > ICON_ON ? mix(TAB_DIM, ICON_LIT, lit) : "");
      css(
        icons[i],
        "filter",
        lit > GLOW_ON ? `drop-shadow(0 0 calc(${GLOW * lit} * var(--u)) rgba(${ICON_GLOW},${GLOW_ALPHA * lit}))` : "none",
      );
      attr(tab, "aria-selected", String(i === s.act));
      attr(tab, "tabindex", i === s.act ? "0" : "-1");
    });
    attr(scene, "data-ready", "");
    raf = requestAnimationFrame(frame);
  };

  const fontReady = document.fonts
    ? Promise.race([document.fonts.load(FONT), new Promise((r) => setTimeout(r, FONT_WAIT))])
    : Promise.resolve();
  fontReady
    .catch(() => {})
    .then(() => {
      if (!disposed) raf = requestAnimationFrame(frame);
    });

  return () => {
    disposed = true;
    cancelAnimationFrame(raf);
    tabs.forEach((tab, i) => {
      tab.removeEventListener("pointerenter", listeners[i].enter);
      tab.removeEventListener("pointerleave", leave);
      tab.removeEventListener("click", listeners[i].click);
    });
    tablist.removeEventListener("keydown", onTabKey);
    window.removeEventListener("keydown", onKey);
  };
}
