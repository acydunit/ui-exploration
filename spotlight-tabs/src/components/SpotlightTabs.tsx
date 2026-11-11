import { useEffect, useRef } from "react";
import { mountSpotlightTabs } from "../lib/controller";
import { Beam } from "./Beam";
import { Cursor } from "./Cursor";
import { TabBar } from "./TabBar";
import styles from "./SpotlightTabs.module.css";

// The page: the backdrop, the 1080 × 1080 stage in the middle of it, the scene (beam, bar, demo cursor) drawn at
// 1.45× around the stage's centre, and the film grain over everything. The scene shows from its first frame.

export function SpotlightTabs() {
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    return mountSpotlightTabs(scene);
  }, []);

  return (
    <main className={styles.page}>
      <div className={styles.stage}>
        <div ref={sceneRef} className={styles.scene}>
          <Beam />
          <TabBar />
          <Cursor />
        </div>
        <div className={styles.grain} />
      </div>
    </main>
  );
}
