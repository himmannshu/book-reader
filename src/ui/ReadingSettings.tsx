// Reading settings (phase 19), from the design's ReadingSettings
// (harness/context/design-system/components/ReadingSettings.md): theme, zoom and fit, behind the
// Aa button. A popover under the toolbar; a bottom sheet on phones (app.css).
import { useEffect, useRef } from 'react';
import { THEMES, type FitMode, type Theme } from '../core/reading-state';
import { IconButton, SegmentedControl } from './controls';
import { THEME_LABELS } from './theme';

const FIT_OPTIONS = [
  { value: 'width', label: 'Width', icon: 'fit-width' },
  { value: 'page', label: 'Page', icon: 'fit-page' },
  { value: 'custom', label: 'Custom' },
] as const;

export function ReadingSettings({
  id,
  theme,
  onTheme,
  zoomPercent,
  canZoomOut,
  canZoomIn,
  onZoomOut,
  onZoomIn,
  fit,
  onFit,
  onDismiss,
}: {
  id: string;
  theme: Theme;
  onTheme?(theme: Theme): void;
  /** The zoom now shown, in Width and Page modes too. */
  zoomPercent: number;
  canZoomOut: boolean;
  canZoomIn: boolean;
  onZoomOut(): void;
  onZoomIn(): void;
  fit: FitMode;
  onFit(fit: FitMode): void;
  /** A tap or click outside (the opening button excepted, which toggles it). */
  onDismiss(): void;
}) {
  const panel = useRef<HTMLElement>(null);
  const dismiss = useRef(onDismiss);
  useEffect(() => {
    dismiss.current = onDismiss;
  });

  useEffect(() => {
    // Start on the chosen theme, so the arrow keys work at once.
    panel.current?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]')?.focus();
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || panel.current?.contains(target)) return;
      if (target.closest(`[aria-controls="${id}"]`)) return;
      dismiss.current();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [id]);

  return (
    <section
      ref={panel}
      id={id}
      className="br-settings"
      role="dialog"
      aria-label="Reading settings"
    >
      {onTheme && (
        <div className="br-settings__group">
          <h3 className="caption br-settings__label">Theme</h3>
          <SegmentedControl<Theme>
            label="Theme"
            block
            value={theme}
            onChange={onTheme}
            options={THEMES.map((value) => ({ value, label: THEME_LABELS[value], swatch: value }))}
          />
        </div>
      )}
      <div className="br-settings__group">
        <h3 className="caption br-settings__label">Zoom</h3>
        <div className="br-zoom">
          <IconButton
            icon="zoom-out"
            label="Zoom out"
            variant="filled"
            disabled={!canZoomOut}
            onClick={onZoomOut}
          />
          <span className="br-zoom__val" data-testid="zoom-value" aria-live="polite">
            {Math.round(zoomPercent)}%
          </span>
          <IconButton
            icon="zoom-in"
            label="Zoom in"
            variant="filled"
            disabled={!canZoomIn}
            onClick={onZoomIn}
          />
        </div>
      </div>
      <div className="br-settings__group">
        <h3 className="caption br-settings__label">Fit</h3>
        <SegmentedControl<FitMode>
          label="Fit"
          block
          value={fit}
          onChange={onFit}
          options={FIT_OPTIONS}
        />
      </div>
    </section>
  );
}
