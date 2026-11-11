// The tabs, left to right. Icons are Lucide's (ISC), drawn in components/icons.tsx.

export type IconName = "layout-grid" | "folder-open" | "library" | "users" | "settings-2";

export const TABS: readonly { icon: IconName; label: string }[] = [
  { icon: "layout-grid", label: "Overview" },
  { icon: "folder-open", label: "Projects" },
  { icon: "library", label: "Library" },
  { icon: "users", label: "Team" },
  { icon: "settings-2", label: "Settings" },
];
