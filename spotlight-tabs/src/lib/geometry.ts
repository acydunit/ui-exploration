// The scene's measurements in design px (the 1080 × 1080 stage, before the scene's 1.45× scale). The CSS side of
// these is in tokens.css; these are the ones the frame loop needs.

/** The stage's centre, on both axes. The bar is centred on it. */
export const CENTER = 540;

/** Where the first tab starts inside the bar, the gap after each tab, and what the bar adds after the last tab's gap
 *  (so the bar ends 6 px after the last tab, as it starts 6 px before the first). */
export const TAB_START = 6;
export const TAB_GAP = 2;
export const BAR_END = 4;

/** The beam's canvas: its bitmap size (also its size in design px). */
export const BEAM_W = 360;
export const BEAM_H = 400;

/** The demo cursor: where it rests, the height it points at on the bar, how far along a tab it points (0–1), and
 *  the band (top and bottom, in stage y) in which it counts as over the bar. */
export const CURSOR_REST_X = 760;
export const CURSOR_REST_Y = 700;
export const CURSOR_ON_BAR_Y = 548;
export const CURSOR_ON_TAB = 0.62;
export const CURSOR_HIT_TOP = 512;
export const CURSOR_HIT_BOTTOM = 570;
/** The fingertip inside the 22 × 24 cursor drawing. */
export const CURSOR_TIP_X = 8;
export const CURSOR_TIP_Y = 4;
