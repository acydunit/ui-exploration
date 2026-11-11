import styles from "./Cursor.module.css";

// The demo's hand cursor. It shows only while the demo plays; the controller moves and presses it.

export function Cursor() {
  return (
    <svg data-part="cursor" className={styles.cursor} viewBox="0 0 22 24" aria-hidden="true">
      <path
        className={styles.hand}
        d="M7.5 11.2V3.6a1.6 1.6 0 0 1 3.2 0v6.2l.1-1.4a1.5 1.5 0 0 1 3 .1v1.6l.1-.9a1.5 1.5 0 0 1 3 .2v1.3a1.4 1.4 0 0 1 2.8.2v4.6c0 3.6-2.6 6.3-6.2 6.3h-1.4c-2.1 0-3.6-.9-4.8-2.6l-3.2-4.6a1.5 1.5 0 0 1 2.3-1.9z"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path className={styles.creases} d="M11 13v3.6M13.8 13v3.6M16.6 13.2v3.4" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}
