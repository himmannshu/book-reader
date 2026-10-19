import { useEffect, useId, useRef } from 'react';
import type { Confirmation } from './useNotes';

/** A small keyboard/touch confirmation shared by draft and annotation deletion actions. */
export function ConfirmDialog({
  question,
  onConfirm,
  onCancel,
}: {
  question: Confirmation;
  onConfirm(): void;
  onCancel(): void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const previous = useRef<HTMLElement | null>(null);
  const title = useId();
  const description = useId();
  useEffect(() => {
    previous.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancel.current?.focus();
  }, []);
  function dismiss() {
    if (previous.current?.isConnected) previous.current.focus();
    onCancel();
  }
  return (
    <div className="confirmation-backdrop">
      <div
        ref={ref}
        className="confirmation-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={title}
        aria-describedby={description}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Escape') {
            event.preventDefault();
            dismiss();
          }
          if (event.key === 'Tab') {
            const buttons = [...(ref.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
            const first = buttons[0];
            const last = buttons.at(-1);
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <h2 id={title}>{question.title}</h2>
        <p id={description}>{question.message}</p>
        <div className="note-buttons">
          <button type="button" className="button" onClick={onConfirm}>
            {question.label}
          </button>
          <button ref={cancel} type="button" className="button secondary" onClick={dismiss}>
            {question.cancelLabel ?? 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}
