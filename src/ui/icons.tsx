// A small icon set for the toolbars (phase 14): 24 × 24 strokes in the current text colour,
// drawn for this app (no icon dependency). Icons are decorative; buttons carry the names.

const PATHS = {
  back: 'M15 18l-6-6 6-6',
  contents: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  bookmark: 'M6 3h12v18l-6-4-6 4z',
  bookmarks: 'M9 3h11v15l-5.5-3.5L9 18zM5 7v14l5.5-3.5',
  notes: 'M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16zM13.5 6.5l4 4',
  search: 'M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zM20 20l-4-4',
  minus: 'M5 12h14',
  plus: 'M12 5v14M5 12h14',
  open: 'M12 15V4M7 9l5-5 5 5M5 15v4h14v-4',
  display: 'M3 19l5-14 5 14M5 14h6M15 19l3-9 3 9M16 16h4',
  close: 'M6 6l12 12M18 6L6 18',
  listen: 'M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11',
  pause: 'M8 5v14M16 5v14',
  play: 'M7 5l12 7-12 7z',
  stop: 'M6 6h12v12H6z',
  up: 'M6 15l6-6 6 6',
  down: 'M6 9l6 6 6-6',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, filled = false }: { name: IconName; filled?: boolean }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden="true"
      focusable="false"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
