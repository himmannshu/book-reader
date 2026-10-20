import { useEffect, useState } from 'react';
import type { NoteTarget } from '../core/notes';
import { formatDuration, MAX_VOICE_NOTE_MS } from '../core/voice-notes';
import type { useVoiceNotes } from './useVoiceNotes';

/** The running time of a recording, updated a few times a second. */
export function Elapsed({ since }: { since: number }) {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(performance.now()), 250);
    return () => clearInterval(timer);
  }, []);
  return <>{formatDuration(now - since)}</>;
}

/** Voice notes in the Notes panel (phase 15): record on this page, play, go to, delete. */
export function VoiceNotes({
  voice,
  currentPage,
  unavailableReason,
  quoteFor,
  onGoTo,
}: {
  voice: ReturnType<typeof useVoiceNotes>;
  currentPage: number;
  /** Why voice notes can't be recorded (book not saved), or null. */
  unavailableReason: string | null;
  quoteFor(target: NoteTarget): string | undefined;
  onGoTo(target: NoteTarget): void;
}) {
  const recording = voice.recording;
  return (
    <section className="voice-notes" aria-label="Voice notes">
      <h2>Voice notes</h2>
      {recording ? (
        <div className="voice-recording" role="status">
          <span className="recording-dot" aria-hidden="true" />
          <span>
            Recording {recording.target.kind === 'page' ? 'on page' : 'on a highlight on page'}{' '}
            {recording.target.pageIndex + 1} · <Elapsed since={recording.startedAt} /> of{' '}
            {formatDuration(MAX_VOICE_NOTE_MS)}
          </span>
          <div className="note-buttons">
            <button type="button" className="button" onClick={() => void voice.save()}>
              Stop and save
            </button>
            <button type="button" className="button secondary" onClick={voice.cancel}>
              Cancel recording
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="panel-entry"
          disabled={unavailableReason !== null || voice.busy}
          onClick={() => void voice.start({ kind: 'page', pageIndex: currentPage })}
        >
          Record voice note on this page
        </button>
      )}
      {unavailableReason && <p className="panel-note">{unavailableReason}</p>}
      {voice.error && (
        <p className="error" role="alert">
          {voice.error}
        </p>
      )}
      {voice.items && voice.items.length > 0 && (
        <ul aria-label="Book voice notes">
          {voice.items.map((note) => {
            const quote = quoteFor(note.target);
            return (
              <li key={note.id} className="note-row voice-row">
                <strong>
                  {note.target.kind === 'page' ? 'Page' : 'Highlight'} · Page{' '}
                  {note.target.pageIndex + 1} · {formatDuration(note.durationMs)}
                </strong>
                {quote && <span className="note-quote">“{quote}”</span>}
                <audio
                  controls
                  preload="metadata"
                  src={note.url}
                  aria-label={`Voice note on page ${note.target.pageIndex + 1}`}
                />
                <div className="note-buttons">
                  <button type="button" className="panel-entry" onClick={() => onGoTo(note.target)}>
                    Go to page {note.target.pageIndex + 1}
                  </button>
                  <button
                    type="button"
                    className="panel-entry"
                    onClick={() => void voice.remove(note)}
                  >
                    Delete voice note
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
