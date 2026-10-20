import type * as React from 'react';
/** Names of the 47 icons the Icon component draws (Lucide paths, ISC). */
export type IconName = 'library' | 'book-open' | 'contents' | 'bookmark' | 'bookmark-plus' | 'highlight' | 'note' | 'search' | 'close' | 'back' | 'forward' | 'expand' | 'collapse' | 'text-settings' | 'sun' | 'moon' | 'sepia' | 'zoom-in' | 'zoom-out' | 'minus' | 'plus' | 'fit-width' | 'fit-page' | 'listen' | 'play' | 'pause' | 'skip-back' | 'skip-forward' | 'mic' | 'stop' | 'share' | 'export' | 'import' | 'delete' | 'more' | 'cloud' | 'offline' | 'sync' | 'check' | 'copy' | 'filter' | 'sort' | 'grid' | 'list' | 'voice' | 'alert' | 'info';
export interface IconProps extends React.SVGAttributes<SVGSVGElement> {
    name: IconName;
    size?: number;
    /** Accessible name. Omit for decorative icons next to a text label. */
    title?: string;
}
export declare function Icon({ name, size, title, className, ...rest }: IconProps): React.JSX.Element;
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md';
    icon?: IconName;
    block?: boolean;
}
export declare function Button({ variant, size, icon, block, className, children, type, ...rest }: ButtonProps): React.JSX.Element;
export interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
    icon: IconName;
    /** Required: becomes aria-label and the tooltip. */
    label: string;
    /** Makes it a toggle (aria-pressed). */
    pressed?: boolean;
    variant?: 'plain' | 'filled' | 'accent';
    size?: 'sm' | 'md' | 'lg';
}
export declare function IconButton({ icon, label, pressed, variant, size, className, type, ...rest }: IconButtonProps): React.JSX.Element;
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
export declare function SegmentedControl<V extends string>({ options, value, onChange, label, iconOnly, block }: SegmentedControlProps<V>): React.JSX.Element;
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
export declare function Slider({ label, value, min, max, step, onChange, format }: SliderProps): React.JSX.Element;
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
export declare function SearchField({ value, onChange, placeholder, status, onPrev, onNext, onClear, autoFocus }: SearchFieldProps): React.JSX.Element;
export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    selected?: boolean;
    icon?: IconName;
    count?: number;
}
export declare function Chip({ selected, icon, count, className, children, type, ...rest }: ChipProps): React.JSX.Element;
export interface BadgeProps {
    tone?: 'neutral' | 'accent' | 'positive' | 'danger';
    icon?: IconName;
    children: React.ReactNode;
}
export declare function Badge({ tone, icon, children }: BadgeProps): React.JSX.Element;
export interface ProgressBarProps {
    /** 0 to 1. */
    value: number;
    label?: string;
    showValue?: boolean;
}
export declare function ProgressBar({ value, label, showValue }: ProgressBarProps): React.JSX.Element;
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
export declare function BookCard({ title, author, coverUrl, progress, availability, layout, onOpen, onMore }: BookCardProps): React.JSX.Element;
export interface EmptyStateProps {
    icon?: IconName;
    title: string;
    children?: React.ReactNode;
    action?: React.ReactNode;
}
export declare function EmptyState({ icon, title, children, action }: EmptyStateProps): React.JSX.Element;
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
export declare function ReaderToolbar({ title, chapter, onBack, bookmarked, onBookmark, onContents, onSearch, onSettings, onListen, active, compact, onMore, hidden }: ReaderToolbarProps): React.JSX.Element;
export interface PagePillProps {
    page: number;
    pageCount: number;
    /** Optional, e.g. "12 min left in chapter". */
    detail?: string;
}
export declare function PagePill({ page, pageCount, detail }: PagePillProps): React.JSX.Element;
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
export declare function ReadingSettings({ theme, onTheme, zoom, onZoom, fit, onFit }: ReadingSettingsProps): React.JSX.Element;
export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink';
export declare const HIGHLIGHT_COLORS: HighlightColor[];
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
export declare function HighlightMenu({ color, onColor, onNote, onCopy, onShare, onListen, onDelete, placement }: HighlightMenuProps): React.JSX.Element;
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
export declare function ListenBar({ playing, onToggle, rate, onRate, onPrevSentence, onNextSentence, onClose, position, voice }: ListenBarProps): React.JSX.Element;
export interface TabItem<V extends string> {
    value: V;
    label: string;
    count?: number;
}
export interface TabsProps<V extends string> {
    items: TabItem<V>[];
    value: V;
    onChange?: (v: V) => void;
    label: string;
}
export declare function Tabs<V extends string>({ items, value, onChange, label }: TabsProps<V>): React.JSX.Element;
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
export declare function SidePanel({ title, presentation, onClose, header, footer, children }: SidePanelProps): React.JSX.Element;
export interface TocEntry {
    id: string;
    title: string;
    page: number;
    children?: TocEntry[];
}
export interface TocListProps {
    items: TocEntry[];
    currentId?: string;
    onSelect?: (e: TocEntry) => void;
    /** Ids of expanded parents; uncontrolled when omitted (all expanded). */
    expanded?: string[];
    onToggle?: (id: string) => void;
}
export declare function TocList({ items, currentId, onSelect, expanded, onToggle }: TocListProps): React.JSX.Element;
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
export declare function AnnotationRow({ kind, quote, color, note, voice, page, chapter, date, onSelect, onMore }: AnnotationRowProps): React.JSX.Element;
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
export declare function SearchResult({ before, match, after, page, chapter, active, onSelect }: SearchResultProps): React.JSX.Element;
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
export declare function VoiceNote({ state, duration, elapsed, onRecord, onStop, onPlay, onPause, onDelete, levels }: VoiceNoteProps): React.JSX.Element;
export interface ToastProps {
    tone?: 'neutral' | 'positive' | 'danger';
    /** Short, plain, says what happened and what to do. */
    children: React.ReactNode;
    action?: {
        label: string;
        onClick?: () => void;
    };
    onDismiss?: () => void;
}
export declare function Toast({ tone, children, action, onDismiss }: ToastProps): React.JSX.Element;

declare global { interface Window { BookReader: { Icon: typeof Icon; Button: typeof Button; IconButton: typeof IconButton; SegmentedControl: typeof SegmentedControl; Slider: typeof Slider; SearchField: typeof SearchField; Chip: typeof Chip; Badge: typeof Badge; ProgressBar: typeof ProgressBar; BookCard: typeof BookCard; EmptyState: typeof EmptyState; ReaderToolbar: typeof ReaderToolbar; PagePill: typeof PagePill; ReadingSettings: typeof ReadingSettings; HighlightMenu: typeof HighlightMenu; ListenBar: typeof ListenBar; Tabs: typeof Tabs; SidePanel: typeof SidePanel; TocList: typeof TocList; AnnotationRow: typeof AnnotationRow; SearchResult: typeof SearchResult; VoiceNote: typeof VoiceNote; Toast: typeof Toast; HIGHLIGHT_COLORS: typeof HIGHLIGHT_COLORS } } }
