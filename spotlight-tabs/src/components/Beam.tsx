import { BEAM_H, BEAM_W } from "../lib/geometry";
import styles from "./Beam.module.css";

// The beam of light over the active tab (a canvas, redrawn every frame) and the pool of light it makes on the floor
// under the bar. The controller places both every frame.

export function Beam() {
  return (
    <>
      <canvas data-part="beam" className={styles.beam} width={BEAM_W} height={BEAM_H} aria-hidden="true" />
      <div data-part="floor" className={styles.floor} />
    </>
  );
}
