// The reader's toolbar (phase 19), from the design's ReaderToolbar
// (harness/context/design-system/components/ReaderToolbar.md): Library and the panels on the left,
// the book and chapter in the middle, the reading tools on the right with the bookmark last.
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react';
import { IconButton } from './controls';
import { Icon, type IconName } from './icons';

export type PanelTool = 'contents' | 'bookmarks' | 'notes' | 'search';

const PANEL_TOOLS: { panel: PanelTool; label: string; icon: IconName }[] = [
  { panel: 'contents', label: 'Contents', icon: 'contents' },
  { panel: 'bookmarks', label: 'Bookmarks', icon: 'list' },
  { panel: 'notes', label: 'Notes', icon: 'note' },
  { panel: 'search', label: 'Search', icon: 'search' },
];

export interface ReaderToolbarProps {
  title: string;
  chapter?: string;
  /** Phones: the panels move into More and the title aligns left. */
  compact: boolean;
  /** Faded while the reader scrolls; keeps its space. */
  hidden: boolean;
  onLibrary(): void;
  openPanel: PanelTool | null;
  panelIds: Record<PanelTool, string>;
  panelButtons: Record<PanelTool, RefObject<HTMLButtonElement | null>>;
  onPanel(panel: PanelTool): void;
  listening: boolean;
  onListen(): void;
  settingsOpen: boolean;
  settingsId: string;
  settingsButton: Ref<HTMLButtonElement>;
  onSettings(): void;
  bookmarked: boolean;
  /** Set while the bookmarks can't be changed yet (loading); a click is then ignored. */
  bookmarkDisabled: boolean;
  /** Why bookmarks are unavailable (the book isn't saved); a click says so instead. */
  bookmarkUnavailable: string | null;
  onBookmark(): void;
  moreButton: Ref<HTMLButtonElement>;
  onMenuChange(open: boolean): void;
  /** Sync status, shown only when it needs the reader. */
  status?: ReactNode;
}

const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ');

export function ReaderToolbar({
  title,
  chapter,
  compact,
  hidden,
  onLibrary,
  openPanel,
  panelIds,
  panelButtons,
  onPanel,
  listening,
  onListen,
  settingsOpen,
  settingsId,
  settingsButton,
  onSettings,
  bookmarked,
  bookmarkDisabled,
  bookmarkUnavailable,
  onBookmark,
  moreButton,
  onMenuChange,
  status,
}: ReaderToolbarProps) {
  const panelTool = (panel: PanelTool) => {
    const tool = PANEL_TOOLS.find((candidate) => candidate.panel === panel);
    if (!tool) return null;
    const open = openPanel === panel;
    return (
      <IconButton
        key={panel}
        ref={panelButtons[panel]}
        icon={tool.icon}
        label={tool.label}
        className={cx(open && 'is-pressed')}
        aria-expanded={open}
        aria-controls={open ? panelIds[panel] : undefined}
        onClick={() => onPanel(panel)}
      />
    );
  };

  return (
    <div
      className={cx('br-toolbar', compact && 'is-compact', hidden && 'is-hidden')}
      role="toolbar"
      aria-label="Reader"
      data-hidden={hidden}
    >
      <div className="br-toolbar__lead">
        <IconButton icon="back" label="Library" onClick={onLibrary} />
        {!compact && (['contents', 'bookmarks', 'notes'] as const).map(panelTool)}
      </div>
      <div className="br-toolbar__title">
        <span className="book-title br-truncate" data-testid="book-title">
          {title}
        </span>
        {chapter && (
          <span className="caption br-truncate br-toolbar__chapter" data-testid="chapter">
            {chapter}
          </span>
        )}
      </div>
      <div className="br-toolbar__trail">
        {status}
        {!compact && panelTool('search')}
        <IconButton
          icon="listen"
          label="Listen"
          className={cx(listening && 'is-pressed')}
          aria-pressed={listening}
          onClick={onListen}
        />
        <IconButton
          ref={settingsButton}
          icon="text-settings"
          label="Reading settings"
          className={cx(settingsOpen && 'is-pressed')}
          aria-haspopup="dialog"
          aria-expanded={settingsOpen}
          aria-controls={settingsOpen ? settingsId : undefined}
          onClick={onSettings}
        />
        <IconButton
          icon="bookmark"
          filled={bookmarked}
          // The label says what a press does (the design's), so it carries no aria-pressed.
          label={bookmarked ? 'Remove bookmark' : 'Bookmark this page'}
          className={cx('bookmark-toggle', bookmarked && 'is-pressed')}
          // Not disabled while a change is saving: that would drop keyboard focus. Clicks are
          // ignored instead. While the book isn't saved it is only marked disabled, so a tap can
          // say why (iOS shows no tooltips; phase 05 review).
          disabled={bookmarkDisabled}
          aria-disabled={bookmarkUnavailable !== null ? true : undefined}
          {...(bookmarkUnavailable !== null && { title: bookmarkUnavailable })}
          onClick={onBookmark}
        />
        {compact && (
          <MoreMenu
            buttonRef={moreButton}
            openPanel={openPanel}
            onPanel={onPanel}
            onOpenChange={onMenuChange}
          />
        )}
      </div>
    </div>
  );
}

/** The phone toolbar's More menu: the panels that don't fit in the bar. */
function MoreMenu({
  buttonRef,
  openPanel,
  onPanel,
  onOpenChange,
}: {
  buttonRef: Ref<HTMLButtonElement>;
  openPanel: PanelTool | null;
  onPanel(panel: PanelTool): void;
  onOpenChange(open: boolean): void;
}) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  function change(next: boolean) {
    setOpen(next);
    onOpenChange(next);
  }

  // Closes on a tap or click outside it.
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !wrapper.current?.contains(event.target)) {
        setOpen(false);
        onOpenChange(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, onOpenChange]);

  function focusButton() {
    wrapper.current?.querySelector<HTMLButtonElement>('.more-button')?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const items = [
      ...(menu.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []),
    ];
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === 'Escape') {
      // The reader's own Escape (closing a panel) must not also run.
      event.stopPropagation();
      change(false);
      focusButton();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      items[(at + step + items.length) % items.length]?.focus();
    } else if (event.key === 'Tab') {
      change(false);
    }
  }

  return (
    <div ref={wrapper} className="more-menu">
      <IconButton
        ref={buttonRef}
        icon="more"
        label="More"
        className={cx('more-button', open && 'is-pressed')}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => change(!open)}
      />
      {open && (
        <div ref={menu} className="br-menu" role="menu" aria-label="More" onKeyDown={onKeyDown}>
          {PANEL_TOOLS.map((tool) => (
            <button
              key={tool.panel}
              type="button"
              role="menuitem"
              className={cx('br-menu__item', openPanel === tool.panel && 'is-current')}
              onClick={() => {
                change(false);
                onPanel(tool.panel);
              }}
            >
              <Icon name={tool.icon} />
              {tool.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
