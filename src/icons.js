const paths = {
  home: "M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z",
  calendar:
    "M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2ZM16 3v4M8 3v4M3 11h18M8 15h1m6 0h1m-8 3h1",
  tasks:
    "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm2 9 3 3 7-7",
  goals: "M21 12a9 9 0 1 1-9-9m5 9a5 5 0 1 1-5-5m0 5 9-9m-5 0h5v5",
  projects: "M3 7h7l2-3h7a2 2 0 0 1 2 2v14H3Zm6 4v5m4-5v5m4-5v5",
  finance:
    "M20 7H5a2 2 0 0 1 0-4h14v4M3 5v14a2 2 0 0 0 2 2h16V7m0 5h-6v5h6m-3-2h.01",
  health:
    "M20 4c-3-2-6 0-8 3-2-3-5-5-8-3-4 3-1 8 8 15 9-7 12-12 8-15ZM2 12h5l2-3 3 6 2-3h8",
  study: "m2 9 10-5 10 5-10 5Zm4 3v6c4 3 8 3 12 0v-6m4-3v9",
  notes: "M5 3h10l4 4v14H5Zm10 0v5h4M9 12h6m-6 4h6",
  grid: "M3 3h7v7H3Zm11 0h7v7h-7ZM3 14h7v7H3Zm11 0h7v7h-7Z",
  stats: "M4 14h4v7H4Zm6-6h4v13h-4Zm6-5h4v18h-4Z",
  settings:
    "m10 3-1 3-3 1-3 2 1 3-1 3 3 2 3 1 1 3h4l1-3 3-1 3-2-1-3 1-3-3-2-3-1-1-3Zm2 6a3 3 0 1 1 0 6 3 3 0 0 1 0-6",
  spark:
    "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5ZM20 2v4m-2-2h4",
  search: "M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm5 12 6 6",
  plus: "M12 5v14M5 12h14",
  arrow: "M5 12h14m-5-5 5 5-5 5",
  chevron: "m9 5 7 7-7 7",
  chevronDown: "m6 9 6 6 6-6",
  check: "m5 12 4 4L19 6",
  close: "m6 6 12 12M6 18 18 6",
  trash: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7",
  edit: "m16 3 5 5-12 12-6 1 1-6Zm-1 1 5 5",
  leaf: "M12 21V10M12 16C2 17 2 7 2 5c8 0 10 4 10 11Zm0-4c0-8 6-10 10-10 1 8-2 12-10 10",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v5l4 2",
  bell: "M6 8a6 6 0 0 1 12 0v7l2 3H4l2-3Zm4 13h4",
  user: "M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM4 21v-3a8 8 0 0 1 16 0v3",
  sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1",
  moon: "M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12",
  bag: "M4 7h16l1 14H3ZM8 7V5a4 4 0 0 1 8 0v2",
  plane: "m22 2-7 20-4-9-9-4Zm-11 11L22 2",
  food: "M4 3v7m3-7v7m3-7v7M4 8h6m-3 2v11M19 3c-4 3-4 8 0 9v9m0-18v9",
  workout: "M3 8v8m3-11v14m0-7h12m0-7v14m3-11v8",
  download: "M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4",
  link: "m9 15 6-6M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 10a4 4 0 0 0 6 0l4-4a4 4 0 0 0-6-6l-1 1",
  menu: "M3 6h18M3 12h18M3 18h18",
  logout: "M10 3H3v18h7m-1-9h12m-5-5 5 5-5 5",
  mail: "M3 5h18v14H3Zm0 0 9 8 9-8",
  shield: "M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7Zm-4 9 3 3 5-6",
};
export const icon = (name, cls = "") =>
  `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.grid}"/></svg>`;
export const logo = () =>
  `<svg viewBox="0 0 42 48" class="logo-mark" aria-hidden="true"><path fill="#99e5ea" d="M19 23C5 21 3 14 4 5c10 0 15 5 15 18Z"/><path fill="#04c9a5" d="M23 23C36 21 39 14 38 5c-10 0-15 5-15 18Z"/><path fill="#c9eff7" d="M19 46C5 40 3 32 4 25c10 0 15 7 15 21Z"/><path fill="#8dd8dc" d="M23 46c13-6 16-14 15-21-10 0-15 7-15 21Z"/></svg>`;
