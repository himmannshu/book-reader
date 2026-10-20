import * as React from 'react';
import { ICONS, type IconName } from './icons';

/* Book Reader components. Every colour, length and font comes from a token
   custom property (tokens.css); class names are prefixed `br-`. */

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');

/* ---------------- Basics ---------------- */

export interface IconProps extends React.SVGAttributes<SVGSVGElement> {
  name: IconName;
  size?: number;
  /** Accessible name. Omit for decorative icons next to a text label. */
  title?: string;
}
export function Icon({ name, size = 20, title, className, ...rest }: IconProps) {
  return (
    <svg
      {...rest}
      className={cx('br-icon', className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      dangerouslySetInnerHTML={{ __html: ICONS[name] }}
    />
  );
}

/* ---------------- Actions ---------------- */

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  icon?: IconName;
  block?: boolean;
}
export function Button({ variant = 'secondary', size = 'md', icon, block, className, children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button {...rest} type={type} className={cx('br-btn', `br-btn--${variant}`, `br-btn--${size}`, block && 'br-btn--block', className)}>
      {icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} />}
      {children != null && <span>{children}</span>}
    </button>
  );
}

export interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: IconName;
  /** Required: becomes aria-label and the tooltip. */
  label: string;
  /** Makes it a toggle (aria-pressed). */
  pressed?: boolean;
  variant?: 'plain' | 'filled' | 'accent';
  size?: 'sm' | 'md' | 'lg';
}
export function IconButton({ icon, label, pressed, variant = 'plain', size = 'md', className, type = 'button', ...rest }: IconButtonProps) {
  const px = size === 'lg' ? 24 : size === 'sm' ? 18 : 20;
  return (
    <button
      {...rest}
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={cx('br-iconbtn', `br-iconbtn--${variant}`, `br-iconbtn--${size}`, pressed && 'is-pressed', className)}
    >
      <Icon name={icon} size={px} />
    </button>
  );
}

/* ---------------- Controls ---------------- */

export interface SegmentOption<V extends string> {
  value: V;
  label: string;
  icon?: IconName;
  /** A colour swatch shown before the label (theme picker). Any CSS colour or var(). */
  swatch?: string;
}
export interface SegmentedControlProps<V extends string> {
  options: SegmentOption<V>[];
  value: V;
  onChange?: (v: V) => void;
  /** Accessible name of the group. */
  label: string;
  /** Show icons only (label still announced). */
  iconOnly?: boolean;
  block?: boolean;
}
export function SegmentedControl<V extends string>({ options, value, onChange, label, iconOnly, block }: SegmentedControlProps<V>) {
  return (
    <div role="radiogroup" aria-label={label} className={cx('br-seg', block && 'br-seg--block')}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          aria-label={iconOnly ? o.label : undefined}
          title={iconOnly ? o.label : undefined}
          className={cx('br-seg__opt', o.value === value && 'is-selected')}
          onClick={() => onChange?.(o.value)}
        >
          {o.swatch && <span className="br-seg__swatch" style={{ background: o.swatch }} />}
          {o.icon && <Icon name={o.icon} size={18} />}
          {!iconOnly && <span>{o.label}</span>}
        </button>
      ))}
    </div>
  );
}

export interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange?: (v: number) => void;
  /** Formats the value shown at the right, e.g. v => `${v}×`. */
  format?: (v: number) => string;
}
export function Slider({ label, value, min, max, step = 1, onChange, format = String }: SliderProps) {
  const id = React.useId();
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="br-slider">
      <div className="br-slider__head">
        <label htmlFor={id} className="caption">{label}</label>
        <output htmlFor={id} className="br-slider__val">{format(value)}</output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange?.(Number(e.target.value))}
        style={{ ['--br-pct' as string]: `${pct}%` }}
      />
    </div>
  );
}

export interface SearchFieldProps {
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  /** e.g. "3 of 41". Shown inside the field when there is a query. */
  status?: string;
  onPrev?: () => void;
  onNext?: () => void;
  onClear?: () => void;
  autoFocus?: boolean;
}
export function SearchField({ value, onChange, placeholder = 'Search in book', status, onPrev, onNext, onClear, autoFocus }: SearchFieldProps) {
  return (
    <div className="br-search" role="search">
      <Icon name="search" size={18} className="br-search__lead" />
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={placeholder}
        autoFocus={autoFocus}
        onChange={(e) => onChange?.(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.shiftKey ? onPrev : onNext)?.();
          if (e.key === 'Escape') onClear?.();
        }}
      />
      {value && status && <span className="br-search__status" aria-live="polite">{status}</span>}
      {value && onPrev && <IconButton icon="collapse" label="Previous match" size="sm" onClick={onPrev} />}
      {value && onNext && <IconButton icon="expand" label="Next match" size="sm" onClick={onNext} />}
      {value && onClear && <IconButton icon="close" label="Clear search" size="sm" onClick={onClear} />}
    </div>
  );
}

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  icon?: IconName;
  count?: number;
}
export function Chip({ selected, icon, count, className, children, type = 'button', ...rest }: ChipProps) {
  return (
    <button {...rest} type={type} aria-pressed={selected} className={cx('br-chip', selected && 'is-selected', className)}>
      {selected ? <Icon name="check" size={16} /> : icon && <Icon name={icon} size={16} />}
      <span>{children}</span>
      {count != null && <span className="br-chip__count">{count}</span>}
    </button>
  );
}

export interface BadgeProps {
  tone?: 'neutral' | 'accent' | 'positive' | 'danger';
  icon?: IconName;
  children: React.ReactNode;
}
export function Badge({ tone = 'neutral', icon, children }: BadgeProps) {
  return (
    <span className={cx('br-badge', `br-badge--${tone}`)}>
      {icon && <Icon name={icon} size={13} />}
      {children}
    </span>
  );
}

/* ---------------- Library ---------------- */

export interface ProgressBarProps {
  /** 0 to 1. */
  value: number;
  label?: string;
  showValue?: boolean;
}
export function ProgressBar({ value, label = 'Reading progress', showValue }: ProgressBarProps) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className="br-progress">
      <div className="br-progress__track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <div className="br-progress__fill" style={{ width: `${pct}%` }} />
      </div>
      {showValue && <span className="br-progress__val">{pct}%</span>}
    </div>
  );
}

export interface BookCardProps {
  title: string;
  author?: string;
  /** Rendered first page as an image URL. Without it a typographic cover is drawn. */
  coverUrl?: string;
  /** 0 to 1; undefined = never opened. */
  progress?: number;
  /** 'cloud' = only in the cloud copy, not downloaded on this device. */
  availability?: 'local' | 'cloud' | 'downloading';
  layout?: 'grid' | 'row';
  onOpen?: () => void;
  onMore?: () => void;
}
export function BookCard({ title, author, coverUrl, progress, availability = 'local', layout = 'grid', onOpen, onMore }: BookCardProps) {
  const finished = progress != null && progress >= 0.995;
  const status =
    availability === 'cloud' ? <Badge icon="cloud">In cloud</Badge>
    : availability === 'downloading' ? <Badge icon="sync" tone="accent">Downloading</Badge>
    : progress == null ? <Badge tone="accent">New</Badge>
    : finished ? <Badge icon="check" tone="positive">Finished</Badge>
    : null;
  return (
    <article className={cx('br-book', `br-book--${layout}`, availability === 'cloud' && 'is-remote')}>
      <button type="button" className="br-book__open" onClick={onOpen} aria-label={`Open ${title}`}>
        <span className="br-book__cover">
          {coverUrl ? <img src={coverUrl} alt="" /> : (
            <span className="br-book__gen" aria-hidden="true">
              <span className="br-book__gen-title">{title}</span>
              {author && <span className="br-book__gen-author">{author}</span>}
            </span>
          )}
        </span>
      </button>
      <div className="br-book__info">
        <h3 className="book-title br-book__title">{title}</h3>
        {author && <p className="caption br-book__author">{author}</p>}
        <div className="br-book__meta">
          {progress != null && !finished && <ProgressBar value={progress} showValue label={`${title} progress`} />}
          {status}
        </div>
      </div>
      {onMore && <IconButton className="br-book__more" icon="more" label={`More for ${title}`} size="sm" onClick={onMore} />}
    </article>
  );
}

export interface EmptyStateProps {
  icon?: IconName;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}
export function EmptyState({ icon = 'library', title, children, action }: EmptyStateProps) {
  return (
    <div className="br-empty">
      <span className="br-empty__icon"><Icon name={icon} size={28} /></span>
      <h2 className="title-lg">{title}</h2>
      {children && <p className="body br-empty__body">{children}</p>}
      {action && <div className="br-empty__action">{action}</div>}
    </div>
  );
}

/* ---------------- Reader ---------------- */

export interface ReaderToolbarProps {
  title: string;
  chapter?: string;
  onBack?: () => void;
  bookmarked?: boolean;
  onBookmark?: () => void;
  onContents?: () => void;
  onSearch?: () => void;
  onSettings?: () => void;
  onListen?: () => void;
  /** Which tool is open, so its button shows pressed. */
  active?: 'contents' | 'search' | 'settings' | 'listen' | null;
  /** iPhone: Contents and Search fold into More. */
  compact?: boolean;
  onMore?: () => void;
  /** Hide while reading; the toolbar fades but keeps its space for the safe area. */
  hidden?: boolean;
}
export function ReaderToolbar({ title, chapter, onBack, bookmarked, onBookmark, onContents, onSearch, onSettings, onListen, active, compact, onMore, hidden }: ReaderToolbarProps) {
  return (
    <header className={cx('br-toolbar', hidden && 'is-hidden', compact && 'is-compact')}>
      <div className="br-toolbar__lead">
        <IconButton icon="back" label="Library" onClick={onBack} />
        {!compact && <IconButton icon="contents" label="Contents" pressed={active === 'contents'} onClick={onContents} />}
      </div>
      <div className="br-toolbar__title">
        <span className="book-title br-truncate">{title}</span>
        {chapter && <span className="caption br-truncate br-toolbar__chapter">{chapter}</span>}
      </div>
      <div className="br-toolbar__trail">
        {!compact && <IconButton icon="search" label="Search" pressed={active === 'search'} onClick={onSearch} />}
        <IconButton icon="listen" label="Listen" pressed={active === 'listen'} onClick={onListen} />
        <IconButton icon="text-settings" label="Reading settings" pressed={active === 'settings'} onClick={onSettings} />
        <IconButton icon="bookmark" label={bookmarked ? 'Remove bookmark' : 'Bookmark this page'} pressed={bookmarked} className="br-bookmark-toggle" onClick={onBookmark} />
        {compact && <IconButton icon="more" label="More" onClick={onMore} />}
      </div>
    </header>
  );
}

export interface PagePillProps {
  page: number;
  pageCount: number;
  /** Optional, e.g. "12 min left in chapter". */
  detail?: string;
}
export function PagePill({ page, pageCount, detail }: PagePillProps) {
  const pct = Math.round((page / pageCount) * 100);
  return (
    <div className="br-pagepill" aria-live="polite">
      <span>Page {page} of {pageCount}</span>
      <span className="br-pagepill__dot" aria-hidden="true" />
      <span>{detail ?? `${pct}%`}</span>
    </div>
  );
}

export type ReaderTheme = 'light' | 'sepia' | 'dark';
export type FitMode = 'width' | 'page' | 'custom';
export interface ReadingSettingsProps {
  theme: ReaderTheme;
  onTheme?: (t: ReaderTheme) => void;
  /** Percent, 25 to 400. */
  zoom: number;
  onZoom?: (z: number) => void;
  fit: FitMode;
  onFit?: (f: FitMode) => void;
}
const ZOOM_STEPS = [25, 50, 67, 75, 90, 100, 110, 125, 150, 175, 200, 250, 300, 400];
export function ReadingSettings({ theme, onTheme, zoom, onZoom, fit, onFit }: ReadingSettingsProps) {
  const step = (dir: 1 | -1) => {
    const next = dir > 0 ? ZOOM_STEPS.find((z) => z > zoom) : [...ZOOM_STEPS].reverse().find((z) => z < zoom);
    if (next != null) onZoom?.(next);
  };
  return (
    <section className="br-settings" aria-label="Reading settings">
      <div className="br-settings__group">
        <h3 className="caption br-settings__label">Theme</h3>
        <SegmentedControl<ReaderTheme>
          label="Theme"
          block
          value={theme}
          onChange={onTheme}
          options={[
            { value: 'light', label: 'Light', swatch: '#fffdf9' },
            { value: 'sepia', label: 'Sepia', swatch: '#f3ead6' },
            { value: 'dark', label: 'Dark', swatch: '#24211d' },
          ]}
        />
      </div>
      <div className="br-settings__group">
        <h3 className="caption br-settings__label">Zoom</h3>
        <div className="br-zoom">
          <IconButton icon="zoom-out" label="Zoom out" variant="filled" disabled={zoom <= 25} onClick={() => step(-1)} />
          <span className="br-zoom__val" aria-live="polite">{zoom}%</span>
          <IconButton icon="zoom-in" label="Zoom in" variant="filled" disabled={zoom >= 400} onClick={() => step(1)} />
        </div>
      </div>
      <div className="br-settings__group">
        <h3 className="caption br-settings__label">Fit</h3>
        <SegmentedControl<FitMode>
          label="Fit"
          block
          value={fit}
          onChange={onFit}
          options={[
            { value: 'width', label: 'Width', icon: 'fit-width' },
            { value: 'page', label: 'Page', icon: 'fit-page' },
            { value: 'custom', label: 'Custom' },
          ]}
        />
      </div>
    </section>
  );
}

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink';
export const HIGHLIGHT_COLORS: HighlightColor[] = ['yellow', 'green', 'blue', 'pink'];
export interface HighlightMenuProps {
  /** Set when the selection is an existing highlight. */
  color?: HighlightColor;
  onColor?: (c: HighlightColor) => void;
  onNote?: () => void;
  onCopy?: () => void;
  onShare?: () => void;
  onListen?: () => void;
  onDelete?: () => void;
  /** Where the arrow points. */
  placement?: 'above' | 'below';
}
export function HighlightMenu({ color, onColor, onNote, onCopy, onShare, onListen, onDelete, placement = 'above' }: HighlightMenuProps) {
  return (
    <div className={cx('br-hlmenu', `br-hlmenu--${placement}`)} role="toolbar" aria-label="Highlight">
      <div className="br-hlmenu__swatches" role="radiogroup" aria-label="Highlight colour">
        {HIGHLIGHT_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={color === c}
            aria-label={c[0].toUpperCase() + c.slice(1)}
            className={cx('br-swatch', `br-swatch--${c}`, color === c && 'is-selected')}
            onClick={() => onColor?.(c)}
          />
        ))}
      </div>
      <span className="br-hlmenu__sep" aria-hidden="true" />
      <IconButton icon="note" label="Add note" onClick={onNote} />
      <IconButton icon="copy" label="Copy" onClick={onCopy} />
      <IconButton icon="share" label="Share" onClick={onShare} />
      {onListen && <IconButton icon="listen" label="Listen from here" onClick={onListen} />}
      {color && onDelete && <IconButton icon="delete" label="Remove highlight" onClick={onDelete} />}
    </div>
  );
}

export interface ListenBarProps {
  playing: boolean;
  onToggle?: () => void;
  /** 0.5 to 2. */
  rate: number;
  onRate?: () => void;
  onPrevSentence?: () => void;
  onNextSentence?: () => void;
  onClose?: () => void;
  /** e.g. "Chapter 3 · p. 42". */
  position?: string;
  voice?: string;
}
export function ListenBar({ playing, onToggle, rate, onRate, onPrevSentence, onNextSentence, onClose, position, voice }: ListenBarProps) {
  return (
    <div className="br-listen" role="region" aria-label="Listening">
      <div className="br-listen__info">
        <span className="body-strong br-truncate">{playing ? 'Reading aloud' : 'Paused'}</span>
        {(position || voice) && <span className="caption br-truncate">{[position, voice].filter(Boolean).join(' · ')}</span>}
      </div>
      <div className="br-listen__controls">
        <IconButton icon="skip-back" label="Previous sentence" onClick={onPrevSentence} />
        <IconButton icon={playing ? 'pause' : 'play'} label={playing ? 'Pause' : 'Resume'} variant="accent" size="lg" onClick={onToggle} />
        <IconButton icon="skip-forward" label="Next sentence" onClick={onNextSentence} />
      </div>
      <div className="br-listen__trail">
        <button type="button" className="br-rate" onClick={onRate} aria-label={`Speed ${rate} times, change`}>{rate}×</button>
        <IconButton icon="close" label="Stop listening" onClick={onClose} />
      </div>
    </div>
  );
}

/* ---------------- Panels ---------------- */

export interface TabItem<V extends string> { value: V; label: string; count?: number }
export interface TabsProps<V extends string> {
  items: TabItem<V>[];
  value: V;
  onChange?: (v: V) => void;
  label: string;
}
export function Tabs<V extends string>({ items, value, onChange, label }: TabsProps<V>) {
  return (
    <div role="tablist" aria-label={label} className="br-tabs">
      {items.map((t) => (
        <button key={t.value} type="button" role="tab" aria-selected={t.value === value} className={cx('br-tab', t.value === value && 'is-selected')} onClick={() => onChange?.(t.value)}>
          {t.label}
          {t.count != null && <span className="br-tab__count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export interface SidePanelProps {
  title: string;
  /** 'side' docks right (Mac, iPad); 'sheet' rises from the bottom (iPhone, width < 720px). */
  presentation?: 'side' | 'sheet';
  onClose?: () => void;
  /** Tabs or a search field, pinned under the title. */
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
}
export function SidePanel({ title, presentation = 'side', onClose, header, footer, children }: SidePanelProps) {
  return (
    <aside className={cx('br-panel', `br-panel--${presentation}`)} aria-label={title}>
      {presentation === 'sheet' && <span className="br-panel__grabber" aria-hidden="true" />}
      <div className="br-panel__head">
        <h2 className="title-md">{title}</h2>
        {onClose && <IconButton icon="close" label={`Close ${title}`} variant="filled" size="sm" onClick={onClose} />}
      </div>
      {header && <div className="br-panel__sub">{header}</div>}
      <div className="br-panel__body">{children}</div>
      {footer && <div className="br-panel__foot">{footer}</div>}
    </aside>
  );
}

export interface TocEntry { id: string; title: string; page: number; children?: TocEntry[] }
export interface TocListProps {
  items: TocEntry[];
  currentId?: string;
  onSelect?: (e: TocEntry) => void;
  /** Ids of expanded parents; uncontrolled when omitted (all expanded). */
  expanded?: string[];
  onToggle?: (id: string) => void;
}
export function TocList({ items, currentId, onSelect, expanded, onToggle }: TocListProps) {
  const render = (list: TocEntry[], depth: number): React.ReactNode => (
    <ul className="br-toc" role={depth === 0 ? 'tree' : 'group'} aria-label={depth === 0 ? 'Contents' : undefined}>
      {list.map((e) => {
        const open = !expanded || expanded.includes(e.id);
        const has = !!e.children?.length;
        return (
          <li key={e.id} role="treeitem" aria-expanded={has ? open : undefined} aria-current={e.id === currentId ? 'location' : undefined}>
            <div className={cx('br-toc__row', e.id === currentId && 'is-current')} style={{ ['--br-depth' as string]: depth }}>
              {has ? (
                <button type="button" className="br-toc__twisty" aria-label={open ? 'Collapse' : 'Expand'} onClick={() => onToggle?.(e.id)}>
                  <Icon name={open ? 'expand' : 'forward'} size={16} />
                </button>
              ) : <span className="br-toc__twisty" aria-hidden="true" />}
              <button type="button" className="br-toc__link" onClick={() => onSelect?.(e)}>
                <span className="chapter br-toc__title">{e.title}</span>
                <span className="br-toc__page">{e.page}</span>
              </button>
            </div>
            {has && open && render(e.children!, depth + 1)}
          </li>
        );
      })}
    </ul>
  );
  return <>{render(items, 0)}</>;
}

export interface AnnotationRowProps {
  kind: 'bookmark' | 'highlight' | 'note';
  /** The highlighted passage, or the first line of the page for a bookmark. */
  quote?: string;
  color?: HighlightColor;
  /** The reader's own written note. */
  note?: string;
  /** Attach a VoiceNote here when the note was spoken. */
  voice?: React.ReactNode;
  page: number;
  chapter?: string;
  date?: string;
  onSelect?: () => void;
  onMore?: () => void;
}
export function AnnotationRow({ kind, quote, color = 'yellow', note, voice, page, chapter, date, onSelect, onMore }: AnnotationRowProps) {
  const icon: IconName = kind === 'bookmark' ? 'bookmark' : kind === 'note' ? 'note' : 'highlight';
  return (
    <article className={cx('br-anno', `br-anno--${kind}`)}>
      <button type="button" className="br-anno__main" onClick={onSelect}>
        <span className="br-anno__meta caption">
          <Icon name={icon} size={15} />
          <span>p. {page}</span>
          {chapter && <span className="br-truncate">· {chapter}</span>}
          {date && <span className="br-anno__date">{date}</span>}
        </span>
        {quote && (
          <span className={cx('quote br-anno__quote', kind === 'highlight' && 'has-mark')}>
            <mark className={`br-mark br-mark--${color}`}>{quote}</mark>
          </span>
        )}
        {note && <span className="body br-anno__note">{note}</span>}
      </button>
      {voice && <div className="br-anno__voice">{voice}</div>}
      {onMore && <IconButton className="br-anno__more" icon="more" label="More actions" size="sm" onClick={onMore} />}
    </article>
  );
}

export interface SearchResultProps {
  /** Text before the match, the match, text after. */
  before: string;
  match: string;
  after: string;
  page: number;
  chapter?: string;
  active?: boolean;
  onSelect?: () => void;
}
export function SearchResult({ before, match, after, page, chapter, active, onSelect }: SearchResultProps) {
  return (
    <button type="button" className={cx('br-result', active && 'is-active')} aria-current={active || undefined} onClick={onSelect}>
      <span className="caption br-result__meta">
        <span>p. {page}</span>
        {chapter && <span className="br-truncate">· {chapter}</span>}
      </span>
      <span className="body br-result__text">…{before}<mark className="br-result__hit">{match}</mark>{after}…</span>
    </button>
  );
}

export interface VoiceNoteProps {
  state: 'idle' | 'recording' | 'playing' | 'paused';
  /** Seconds. */
  duration?: number;
  elapsed?: number;
  onRecord?: () => void;
  onStop?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onDelete?: () => void;
  /** Bar heights 0..1 for the waveform; a flat line is drawn without it. */
  levels?: number[];
}
const mmss = (s = 0) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
export function VoiceNote({ state, duration = 0, elapsed = 0, onRecord, onStop, onPlay, onPause, onDelete, levels }: VoiceNoteProps) {
  if (state === 'idle')
    return <Button icon="mic" variant="secondary" onClick={onRecord}>Record voice note</Button>;
  if (state === 'recording')
    return (
      <div className="br-voice is-recording" role="status">
        <span className="br-voice__dot" aria-hidden="true" />
        <span className="body-strong">Recording</span>
        <span className="br-voice__time">{mmss(elapsed)}</span>
        <Button size="sm" variant="danger" icon="stop" onClick={onStop}>Stop</Button>
      </div>
    );
  const bars = levels ?? Array.from({ length: 28 }, () => 0.15);
  const played = duration ? elapsed / duration : 0;
  return (
    <div className="br-voice">
      <IconButton icon={state === 'playing' ? 'pause' : 'play'} label={state === 'playing' ? 'Pause voice note' : 'Play voice note'} variant="accent" size="sm" onClick={state === 'playing' ? onPause : onPlay} />
      <span className="br-voice__wave" aria-hidden="true">
        {bars.map((l, i) => <span key={i} className={cx('br-voice__bar', i / bars.length < played && 'is-played')} style={{ height: `${Math.max(12, l * 100)}%` }} />)}
      </span>
      <span className="br-voice__time">{state === 'playing' || elapsed ? `${mmss(elapsed)} / ` : ''}{mmss(duration)}</span>
      {onDelete && <IconButton icon="delete" label="Delete voice note" size="sm" onClick={onDelete} />}
    </div>
  );
}

/* ---------------- Feedback ---------------- */

export interface ToastProps {
  tone?: 'neutral' | 'positive' | 'danger';
  /** Short, plain, says what happened and what to do. */
  children: React.ReactNode;
  action?: { label: string; onClick?: () => void };
  onDismiss?: () => void;
}
export function Toast({ tone = 'neutral', children, action, onDismiss }: ToastProps) {
  const icon: IconName = tone === 'danger' ? 'alert' : tone === 'positive' ? 'check' : 'info';
  return (
    <div className={cx('br-toast', `br-toast--${tone}`)} role={tone === 'danger' ? 'alert' : 'status'}>
      <Icon name={icon} size={20} className="br-toast__icon" />
      <span className="body br-toast__msg">{children}</span>
      {action && <button type="button" className="br-toast__action" onClick={action.onClick}>{action.label}</button>}
      {onDismiss && <IconButton icon="close" label="Dismiss" size="sm" onClick={onDismiss} />}
    </div>
  );
}
