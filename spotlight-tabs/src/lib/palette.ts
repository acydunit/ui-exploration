// The colours written every frame (the static ones are in tokens.css), as RGB channels.

export type RGB = readonly [number, number, number];

/** A tab's label from dim to lit, and its icon from dim to a cool mint once the tab is active. */
export const TAB_DIM: RGB = [92, 92, 100];
export const TAB_LIT: RGB = [246, 247, 246];
export const ICON_LIT: RGB = [196, 255, 232];
/** The icon's glow. */
export const ICON_GLOW = "150,255,220";
/** The pool of light on the floor, and the light in the active pill. */
export const FLOOR = "190,255,236";
export const CAUSTIC = "215,255,244";
