import { TABS } from "../lib/tabs";
import { Icon } from "./icons";
import styles from "./TabBar.module.css";

// The glass bar: the light line on its rim, its rim, the faint hover pill, the raised active pill (with the light
// that falls into it), and the five tabs. A hidden copy of the tabs at the design's own size is what the controller
// measures to lay them out, so the layout is the same at every window size.

export function TabBar() {
  return (
    <div data-part="bar" className={styles.bar}>
      <div data-part="rimlight" className={styles.rimlight} />
      <div className={`${styles.rim} ${styles.barRim}`} />
      <div data-part="hover" className={`${styles.pill} ${styles.hover}`}>
        <div className={`${styles.rim} ${styles.hoverRim}`} />
      </div>
      <div data-part="active" className={`${styles.pill} ${styles.active}`}>
        <div data-part="caustic" className={styles.caustic} />
        <div className={`${styles.rim} ${styles.activeRim}`} />
      </div>
      <div data-part="tablist" role="tablist" aria-label="Sections">
        {TABS.map(({ icon, label }, i) => (
          <button
            key={label}
            type="button"
            role="tab"
            data-part="tab"
            className={styles.tab}
            aria-selected={i === 0}
            tabIndex={i === 0 ? 0 : -1}
          >
            <Icon name={icon} className={styles.icon} />
            <span>{label}</span>
          </button>
        ))}
      </div>
      <div className={styles.probe} aria-hidden="true">
        {TABS.map(({ label }) => (
          <div key={label} data-part="probe" className={styles.probeTab}>
            <span className={styles.probeIcon} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
