A calm, paper-warm reader for PDF books on Mac, iPad and iPhone. The chrome stays quiet and gets out of the way. The book is the brightest, most important thing on screen, and the reader's own marks (highlights, notes, bookmarks) come second. Everything else is there when needed and fades when it is not.

## Principles

- **The page leads.** Chrome sits on `surface` and `canvas`, never louder than the page. No decorative colour, gradients or illustrations in the reader.
- **One accent.** Ink blue (`accent`) marks what is selected, active or in progress. If two things on a screen are blue, one of them is wrong.
- **Paper, not glass.** Warm neutrals, hairlines (`line`) and soft page shadows. Panels are flat sheets of `surface-raised`, not floating cards.
- **Fast feels calm.** Nothing animates longer than 200ms, nothing bounces, and nothing waits on the network to appear.
- **Thumb first.** Every target is at least `touch-target` (44px) on touch screens, and the most used reader tools sit at the right end of the toolbar.

## Content and voice

- Plain, short and specific. Sentence case everywhere, including buttons and titles ("Add book", "Reading settings").
- Speak to the reader as "you" only when needed; most labels are verbs or nouns with no pronoun.
- Numbers as numerals: "Page 142 of 380", "23 notes", "1.25×". Use "p. 142" in dense lists.
- Errors say what happened and what to do, without blame or jargon: "This PDF couldn't be opened. It may be damaged or password-protected." Never "Error 500", never "Oops".
- Empty states say what will appear and how: "Highlight a passage and it will appear here."
- No emoji, no exclamation marks, no em dashes in UI copy.

## Themes and colour

- Three themes, set as `data-theme="light" | "sepia" | "dark"` on the root element. They match the app's existing `Theme` values. A theme change applies to the chrome and the pages together.
- Backgrounds: `surface` for screens, `surface-raised` for panels, popovers and toasts, `surface-sunken` for insets inside them (fields, tracks), `canvas` only behind PDF pages.
- Text: `ink` for primary text and icons, `ink-muted` for everything secondary. Both hold 4.5:1 on every surface in every theme. Do not add a lighter grey for text.
- Lines: `line` for hairline dividers (decorative), `line-strong` for any border that defines a control (3:1 everywhere).
- Accent: `accent` for active states, progress and the primary button; text on an accent fill is `on-accent`, never literal white (it is dark in the Dark theme). Quiet selection (current chapter, active result, selected chip) is `accent-soft` with `ink` or `accent` text.
- Status: `danger` with `danger-soft`, `positive` with `positive-soft`. Each always comes with a word or icon. Positive and danger differ in lightness as well as hue.
- Focus: a 2px solid `focus-ring` outline with a 2px offset on every interactive element. Never remove it.

### On the page

- PDF pages sit on `canvas` with `shadow-page`. In Sepia each page gets a `page-tint` multiply overlay. In Dark, pages are inverted with `filter: invert(0.9) hue-rotate(180deg)`, as the viewer does today; `page-tint` is transparent there.
- Highlights are filled with the translucent `hl-yellow`, `hl-green`, `hl-blue` and `hl-pink`, drawn under the text so it stays readable. Yellow is the default. Menus and lists use the solid `swatch-*` tokens, always ringed with `line-strong`.
- The sentence being read aloud gets a `listen-mark` tint and a 2px `accent` underline. Search matches on the page use `hl-yellow` with the active match outlined in `accent`.
- Text selection uses `selection`.

## Typography

- Two families. **Literata** (`--font-serif`) is for anything that belongs to the book: book titles, chapter names, quoted passages, screen and panel titles. **Source Sans 3** (`--font-sans`) is for the interface: buttons, labels, metadata, body text in panels.
- Both are self-hosted from `fonts/` and should be precached by the service worker so they work offline. Their stacks fall back to New York and SF Pro (`ui-serif`, `-apple-system`, `system-ui`), so a slow first load still looks native.
- Serif styles: `title-xl` (one per screen, the Library title), `title-lg`, `title-md` (panel titles), `book-title`, `chapter`, `quote`.
- Sans styles: `body`, `body-strong`, `label` (buttons, tabs, segments), `caption` (secondary text), `meta` (badges, the page pill).
- Every text input is at least 16px (`body`) so iOS does not zoom the page.
- Page numbers, percentages, times and counts use `font-variant-numeric: tabular-nums`.
- Never set UI text in the serif below 15px or in the sans below 12px.

## Space, size and layout

- Spacing steps: `space-1` (4) to `space-12` (48). Use `space-4` for panel padding and the iPhone side gutter, `space-8` for the side gutter on iPad and Mac, `space-6` between library cards.
- Fixed sizes: `toolbar-height` 52px plus the top safe-area inset; `listen-bar-height` 64px; `panel-width` 380px; `popover-width` 300px; `cover-width` 132px.
- Breakpoints: under 720px wide (iPhone, iPad split view) panels are bottom sheets and the toolbar is `compact`; 720px and up, panels dock right beside the page.
- Respect `env(safe-area-inset-*)` on every edge-pinned element: toolbar, listen bar, sheets, page pill, toasts.
- Long text inside panels (note editors) stops at `reading-measure`.

## Shape and elevation

- Radii: `radius-xs` for covers, highlight marks and badges; `radius-sm` for chips, fields and segments; `radius-md` for buttons, popovers and menus; `radius-lg` for the listen bar and the iPad panel; `radius-xl` for iPhone sheet tops; `radius-full` for icon buttons, swatches and the page pill.
- Shadows: `shadow-page` on PDF pages and book covers only, `shadow-raised` on anything floating (popovers, highlight menu, toasts, listen bar, page pill), `shadow-sheet` on panels and sheets. Lists and rows never have shadows.
- Group list content with `line` hairlines, never with boxed cards or coloured side borders.

## Motion

- 160ms ease-out for colour and background changes; 200ms ease-out for things that move or fade (toolbar hide, sheet, cover lift). Sheets slide; nothing scales or bounces.
- The only looping animation is the recording dot.
- Under `prefers-reduced-motion: reduce`, drop movement and keep instant state changes.

## Iconography

- One icon set: Lucide paths at a 1.75px stroke on a 24px grid, drawn in `currentColor` by the `Icon` component. The 47 icons live in `components/src/icons.ts` under the reader's own names (`contents`, `highlight`, `text-settings`, `listen`, `fit-width`).
- Sizes: 20px in toolbars and rows, 18px in buttons and segments, 16px in chips and metadata.
- Icon-only buttons always go through `IconButton`, which requires a `label`.
- The SVGs in the Icons asset group are the same paths in `ink` (#29241e) for use outside the app. In code, use the component.
- There is no app logo in this system yet. Set the app's name in Literata `title-md` where a mark would go.

## Screens, composed

- **Library:** `title-xl` heading, a row of `Chip` filters and a `SegmentedControl` for sort and grid/list view, then `BookCard`s on `surface`. Primary action: Add book. Empty: `EmptyState`.
- **Reader:** `ReaderToolbar` over pages on `canvas`, the `PagePill` at the bottom centre, `ListenBar` above the bottom safe area while listening. Selecting text opens the `HighlightMenu`.
- **Panels:** one `SidePanel` with `Tabs` for Contents (`TocList`), Bookmarks and Notes (`AnnotationRow`, with `VoiceNote` for spoken notes); Search is its own `SidePanel` with a `SearchField` and `SearchResult`s. Reading settings is the `ReadingSettings` popover.
- **Feedback:** `Toast` for failures the person can act on and for completed exports. Sync status shows as a `Badge` (Offline, Downloading), never as a modal.

## Using the components

- `components/bundle.js` defines `window.BookReader` (React 18 on the page); `components/bundle.css` styles it with the tokens above; `components/index.d.ts` documents every prop. The TypeScript sources are in `components/src/`; port them into `src/ui/` rather than loading the bundle in the app.
- Class names are prefixed `br-`. Type styles are classes named after the style (`.title-md`, `.caption`).
- Every value comes from a token custom property of the same name (`--surface`, `--space-4`, `--radius-md`, `--font-serif`). Do not hard-code a colour, size or font in a component.
