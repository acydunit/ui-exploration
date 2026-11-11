import {
  BAR_END,
  CENTER,
  CURSOR_HIT_BOTTOM,
  CURSOR_HIT_TOP,
  CURSOR_ON_BAR_Y,
  CURSOR_ON_TAB,
  CURSOR_REST_X,
  CURSOR_REST_Y,
  TAB_GAP,
  TAB_START,
} from "./geometry";
import { clamp } from "./math";
import {
  BLOOM,
  CLICK_WINDOW,
  CURSOR_RATE,
  DEMO,
  DT_FIRST,
  DT_MAX,
  FADE_C,
  FADE_K,
  FOCUS_C,
  FOCUS_K,
  FOCUS_MAX,
  FOCUS_THIN,
  FOLLOW_RATE,
  HAND_BACK,
  HOVER_C,
  HOVER_K,
  LIT_RATE,
  LOOP,
  LOOP_REARM,
  PILL_DAMPING,
  PILL_K0,
  PILL_K_LEAD,
  PILL_K_RATE,
  PILL_K_TRAIL,
  PRESS,
  PULSE_DECAY,
  REARM,
  SPEED_THIN,
  TILT,
  TILT_RATE,
} from "./motion";

// The tab bar's state, stepped once per animation frame. Positions are design px: tab and pill x along the bar,
// the beam and the cursor in stage x. The controller measures the tabs, feeds in clicks and hovers, and writes the
// result to the DOM.

export interface Spring {
  x: number;
  v: number;
  k: number;
  c: number;
}

const spring = (k: number, c: number): Spring => ({ x: 0, v: 0, k, c });

/** One semi-implicit Euler step towards `target`. */
function pull(s: Spring, target: number, dt: number) {
  s.v += (s.k * (target - s.x) - s.c * s.v) * dt;
  s.x += s.v * dt;
}

export interface Spotlight {
  /** Each tab's left edge and width along the bar, and the bar's width (set by `layout`). */
  X: number[];
  Wd: number[];
  BW: number;
  /** The active pill's two edges, the hover pill's two edges and its opacity. */
  L: Spring;
  R: Spring;
  HL: Spring;
  HR: Spring;
  HO: Spring;
  /** The beam's focus (x, v), its x on the stage, its tilt (deg), and the arrival pulse. */
  FO: { x: number; v: number };
  BM: number;
  SK: number;
  bloomed: boolean;
  pulse: number;
  /** Active tab, hovered tab (−1 for none), which way the pill last set off (1 right, −1 left, 0 not yet), and how
   *  lit each tab is. */
  act: number;
  hov: number;
  dirK: number;
  lit: number[];
  /** Input: whether someone is using it, and when they last did (s, performance.now() clock). */
  user: boolean;
  lastUser: number;
  /** The clock: the first frame's time and the last frame's (s); the time the beam is drawn at. */
  start: number | null;
  last: number | null;
  beamT: number;
  /** The demo: the last click it fired, its cursor (stage x, y), whether the cursor shows and is pressed. */
  demoK: number;
  cx: number;
  cy: number;
  demo: boolean;
  down: boolean;
}

export function createSpotlight(): Spotlight {
  return {
    X: [],
    Wd: [],
    BW: 0,
    // the pill's damping is set from its stiffness every frame
    L: spring(PILL_K0, 0),
    R: spring(PILL_K0, 0),
    HL: spring(HOVER_K, HOVER_C),
    HR: spring(HOVER_K, HOVER_C),
    HO: spring(FADE_K, FADE_C),
    FO: { x: 1, v: 0 },
    BM: 0,
    SK: 0,
    bloomed: true,
    pulse: 0,
    act: 0,
    hov: -1,
    dirK: 0,
    lit: [],
    user: false,
    lastUser: -9,
    start: null,
    last: null,
    beamT: 0,
    demoK: -1,
    cx: CURSOR_REST_X,
    cy: CURSOR_REST_Y,
    demo: true,
    down: false,
  };
}

/** Lays the tabs out from their widths (design px), left to right with a 2-px gap. */
export function layout(s: Spotlight, widths: number[]) {
  let x = TAB_START;
  s.X = [];
  s.Wd = [];
  widths.forEach((w) => {
    s.X.push(x);
    s.Wd.push(w);
    x += w + TAB_GAP;
  });
  s.BW = x + BAR_END;
  s.lit = widths.map((_, i) => (i === s.act ? 1 : 0));
}

/** The bar's left edge on the stage. */
export const barLeft = (s: Spotlight) => CENTER - s.BW / 2;

export function select(s: Spotlight, i: number) {
  if (i === s.act) return;
  s.dirK = i > s.act ? 1 : -1;
  s.act = i;
}

/** Someone hovered, clicked or pressed a key: the demo holds off for HAND_BACK seconds. */
export function touch(s: Spotlight, now: number) {
  s.user = true;
  s.lastUser = now / 1000;
}

/** One frame at time `now` (ms, the animation frame's timestamp). */
export function step(s: Spotlight, now: number, reduced: boolean) {
  const T = now / 1000;
  if (s.start === null) {
    s.start = T;
    s.beamT = T;
    s.L.x = s.X[0];
    s.R.x = s.X[0] + s.Wd[0];
    s.BM = barLeft(s) + s.X[0] + s.Wd[0] / 2;
    s.HL.x = s.L.x;
    s.HR.x = s.R.x;
  }
  const dt = s.last === null ? DT_FIRST : Math.min(DT_MAX, T - s.last);
  s.last = T;
  // with reduced motion the rays and the dust hold still
  if (!reduced) s.beamT = T;

  // the demo: when nobody has touched it for HAND_BACK seconds, its cursor glides to each tab and clicks it
  let tx = s.cx,
    ty = s.cy;
  s.down = false;
  s.demo = !reduced && (!s.user || T - s.lastUser > HAND_BACK);
  if (s.demo) {
    s.user = false;
    const t = (T - s.start) % LOOP;
    let target: number | null = null;
    for (let k = 0; k < DEMO.length; k++) {
      const [tt, i, c] = DEMO[k];
      if (t >= tt) {
        target = i;
        if (c && s.demoK !== k && t < tt + CLICK_WINDOW) {
          s.demoK = k;
          select(s, i);
        }
      }
    }
    if (t < LOOP_REARM) s.demoK = -1;
    if (target !== null) {
      tx = barLeft(s) + s.X[target] + s.Wd[target] * CURSOR_ON_TAB;
      ty = CURSOR_ON_BAR_Y;
    } else {
      tx = CURSOR_REST_X;
      ty = CURSOR_REST_Y;
    }
    s.down = DEMO.some((d) => d[2] && t >= d[0] && t < d[0] + PRESS);
    s.cx += (tx - s.cx) * Math.min(1, dt * CURSOR_RATE);
    s.cy += (ty - s.cy) * Math.min(1, dt * CURSOR_RATE);
    const bx = s.cx - barLeft(s);
    s.hov = -1;
    if (s.cy > CURSOR_HIT_TOP && s.cy < CURSOR_HIT_BOTTOM)
      s.X.forEach((x, i) => {
        if (bx >= x && bx <= x + s.Wd[i]) s.hov = i;
      });
  }

  // the active pill: the edge in front is stiffer, so it runs ahead and the pill stretches
  const { L, R, HL, HR, HO, FO } = s;
  const lead = s.dirK > 0 ? "R" : "L";
  const kL = lead === "L" ? PILL_K_LEAD : PILL_K_TRAIL,
    kR = lead === "R" ? PILL_K_LEAD : PILL_K_TRAIL;
  L.k += (kL - L.k) * Math.min(1, dt * PILL_K_RATE);
  R.k += (kR - R.k) * Math.min(1, dt * PILL_K_RATE);
  L.c = 2 * Math.sqrt(L.k) * PILL_DAMPING;
  R.c = 2 * Math.sqrt(R.k) * PILL_DAMPING;
  pull(L, s.X[s.act], dt);
  pull(R, s.X[s.act] + s.Wd[s.act], dt);
  if (reduced) {
    snap(L, s.X[s.act]);
    snap(R, s.X[s.act] + s.Wd[s.act]);
  }

  // the hover pill: only on a tab that isn't active; it follows softly and fades in and out
  const hv = s.hov >= 0 && s.hov !== s.act;
  if (hv) {
    pull(HL, s.X[s.hov], dt);
    pull(HR, s.X[s.hov] + s.Wd[s.hov], dt);
    if (reduced) {
      snap(HL, s.X[s.hov]);
      snap(HR, s.X[s.hov] + s.Wd[s.hov]);
    }
  }
  pull(HO, hv ? 1 : 0, dt);

  // the beam focuses into a thread while the pill moves fast, and blooms with a pulse when it opens up again
  const speed = Math.abs(L.v) + Math.abs(R.v);
  const fT = speed > SPEED_THIN ? FOCUS_THIN : 1;
  FO.v += (FOCUS_K * (fT - FO.x) - FOCUS_C * FO.v) * dt;
  FO.x += FO.v * dt;
  const fo = clamp(FO.x, 0, FOCUS_MAX);
  if (fo > BLOOM && !s.bloomed) {
    s.bloomed = true;
    s.pulse = 1;
  }
  if (fo < REARM) s.bloomed = false;
  s.pulse *= Math.pow(PULSE_DECAY, dt);

  // it follows the pill's centre with its own lag, leaning into the lag
  const w = R.x - L.x;
  const midT = barLeft(s) + L.x + w / 2;
  s.BM += (midT - s.BM) * Math.min(1, dt * FOLLOW_RATE);
  s.SK += ((midT - s.BM) * TILT - s.SK) * Math.min(1, dt * TILT_RATE);
  if (reduced) {
    s.BM = midT;
    s.SK = 0;
  }

  // tabs light up while active, and fade back when the pill leaves
  s.lit.forEach((l, i) => {
    s.lit[i] = l + ((i === s.act ? 1 : 0) - l) * Math.min(1, dt * LIT_RATE);
  });
  return { w, fo };
}

function snap(s: Spring, x: number) {
  s.x = x;
  s.v = 0;
}
