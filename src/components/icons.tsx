import type { CSSProperties, ReactNode } from "react";

const paths: Record<string, ReactNode> = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.3"/><rect x="14" y="3" width="7" height="7" rx="1.3"/><rect x="3" y="14" width="7" height="7" rx="1.3"/><rect x="14" y="14" width="7" height="7" rx="1.3"/></>,
  layers: <><path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5"/></>,
  compare: <><rect x="3" y="4" width="7" height="16" rx="1.5"/><rect x="14" y="4" width="7" height="16" rx="1.5"/></>,
  trophy: <><path d="M8 3h8v5c0 4-2 6-4 6s-4-2-4-6V3Zm0 2H4v2c0 3 2 4 5 4m7-6h4v2c0 3-2 4-5 4M12 14v5m-5 2h10m-8-2h6"/></>,
  book: <><path d="M12 6C8 3 5 4 2.5 4.5V18c3-1 6-1 9.5 1.5C15.5 17 19 17 21.5 18V4.5C19 4 16 3 12 6Zm0 0v13.5"/></>,
  github: <path d="M9 20c-4.5 1.4-4.5-2-6-2.5m12 4v-3.8c.1-1.2-.4-2-.9-2.4 3.3-.4 6.8-1.6 6.8-7.4 0-1.6-.5-2.9-1.4-3.9.2-.4.6-1.9-.2-3.8 0 0-1.2-.4-4 1.5a14 14 0 0 0-7.3 0C5.2-.2 4 0 4 0c-.8 1.9-.4 3.4-.2 3.8a5.5 5.5 0 0 0-1.5 3.9c0 5.8 3.5 7 6.8 7.4-.4.4-.8 1.1-.9 2.2v4.2" transform="translate(1 1) scale(.92)"/>,
  arrow: <path d="M5 12h14m-6-6 6 6-6 6"/>,
  upRight: <path d="M6 18 18 6M6 6h12v12"/>,
  chevron: <path d="m7 10 5 5 5-5"/>,
  left: <path d="m14 6-6 6 6 6"/>,
  right: <path d="m9 6 6 6-6 6"/>,
  down: <path d="M12 4v16m-6-6 6 6 6-6"/>,
  search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
  bookmark: <path d="M6 4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17l-6-4-6 4V4Z"/>,
  list: <><path d="M8 5h13M8 12h13M8 19h13"/><circle cx="3.5" cy="5" r=".7"/><circle cx="3.5" cy="12" r=".7"/><circle cx="3.5" cy="19" r=".7"/></>,
  chip: <><rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx=".7"/><path d="M9 3v3m6-3v3M9 18v3m6-3v3M3 9h3m-3 6h3m12-6h3m-3 6h3"/></>,
  box: <><path d="m12 2.5 9 5v9l-9 5-9-5v-9l9-5Zm-9 5 9 5 9-5m-9 5v9"/></>,
  stack: <><rect x="3" y="3" width="15" height="13" rx="2"/><path d="M7 20h12a2 2 0 0 0 2-2V8m-14 0h7m-7 4h4"/></>,
  axis: <><path d="M4 4v16h16M8 15v-3m5 3V7m5 8v-5"/></>,
  sliders: <><path d="M4 6h4m4 0h8M4 12h9m4 0h3M4 18h2m4 0h10"/><circle cx="10" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="8" cy="18" r="2"/></>,
  sort: <><path d="M4 5h11M4 10h8M4 15h5m9-7v12m-4-4 4 4 4-4"/></>,
  globe: <><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/></>,
  game: <><path d="M8 7h8c3 0 4 2 5 7 1 7-2 7-6 2H9c-4 5-7 5-6-2 1-5 2-7 5-7Z"/><path d="M8 10v5m-2.5-2.5h5m4.5-1.5h.1m2.4 2.4h.1"/></>,
  food: <><path d="M5 3v5c0 4 6 4 6 0V3M8 3v18m11 0V3c-4 3-5 11 0 11"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  minus: <path d="M5 12h14"/>,
  check: <path d="m5 12 4 4L19 6"/>,
  close: <path d="m6 6 12 12M6 18 18 6"/>,
  spark: <><path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Z"/></>,
  terminal: <><rect x="2.5" y="4" width="19" height="16" rx="2"/><path d="m6 8 4 4-4 4m7 0h5"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/></>,
  play: <path d="m7 4 13 8-13 8V4Z"/>,
  monitor: <><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M12 17v4m-5 0h10"/></>,
  phone: <><rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M10 18h4"/></>,
  tablet: <><rect x="3.5" y="2" width="17" height="20" rx="2.5"/><path d="M10 18h4"/></>,
  download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></>,
  upload: <><path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/></>,
  copy: <><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3"/></>,
  menu: <path d="M3 6h18M3 12h18M3 18h18"/>,
  hash: <path d="m10 3-4 18m12-18-4 18M4 8h17M2 16h17"/>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.5"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></>,
  color: <><circle cx="8" cy="14" r="6"/><circle cx="16" cy="14" r="6"/><circle cx="12" cy="7" r="5"/></>,
  world: <><path d="m2 19 7-13 4 8 3-6 6 11H2Z"/><path d="m6.5 10.5 2.5 2 2-2"/></>,
  code: <><path d="m7 7-5 5 5 5m10-10 5 5-5 5M14 4l-4 16"/></>,
  shield: <><path d="m12 2 8 3v6c0 6-8 11-8 11S4 17 4 11V5l8-3Z"/><path d="m8 11 3 3 5-5"/></>,
  star: <path d="m12 2 3 6 7 .9-5 4.8 1.3 7-6.3-3.3-6.3 3.3 1.2-7L2 8.9 9 8l3-6Z"/>,
};
export function Icon({ name, size = 18, className = "", style, filled = false }: { name: string; size?: number; className?: string; style?: CSSProperties; filled?: boolean }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>{paths[name] || paths.box}</svg>;
}
export function BrandMark({ size = 34 }: { size?: number }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 36 36" fill="none"><rect width="36" height="36" rx="8" fill="#1C201B"/><path d="m6.5 24 6.8-14h4.5l-6.5 14H6.5Zm10.1 0-3.3-7 2.4-5 3.3 7-2.4 5Zm1.7 0 6.5-14h4.7L23 24h-4.7Z" fill="#C4F478"/></svg>;
}
export const familyIcon = (family: string) => ({ "Websites": "globe", "HTML/CSS": "code", "JavaScript": "code", "Three.js": "box", "Visual": "color", "Applications": "layers", "Data": "axis" }[family] || "box");
export const familyTone = (family: string) => ({ "Websites": "web", "HTML/CSS": "web", "JavaScript": "games", "Three.js": "worlds", "Visual": "visual", "Applications": "web", "Data": "worlds" }[family] || "web");
export const categoryIcon = (slug: string) => slug === "restaurant" ? "food" : slug.includes("game") ? "game" : slug === "saas" ? "layers" : "globe";
