// Records from the microphone with the browser's MediaRecorder (phase 15). On the device; no
// network. The recording stops by itself at MAX_VOICE_NOTE_MS.
import { MAX_VOICE_NOTE_MS, pickAudioType } from '../core/voice-notes';

export type RecorderErrorKind = 'unsupported' | 'denied' | 'no-microphone' | 'failed';

export class RecorderError extends Error {
  readonly kind: RecorderErrorKind;
  constructor(kind: RecorderErrorKind, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'RecorderError';
    this.kind = kind;
  }
}

export interface Recorded {
  audio: ArrayBuffer;
  type: string;
  durationMs: number;
}

export interface Recording {
  /** When recording started (performance.now()), for the timer. */
  readonly startedAt: number;
  /** Stops and returns the audio. Also resolves when the time limit stopped it. */
  stop(): Promise<Recorded>;
  /** Stops and throws the audio away. */
  cancel(): void;
  /** Resolves when recording has stopped by itself (the time limit). */
  readonly limitReached: Promise<void>;
}

export function recorderMessage(error: unknown): string {
  const kind = error instanceof RecorderError ? error.kind : 'failed';
  switch (kind) {
    case 'unsupported':
      return "Recording isn't available in this browser.";
    case 'denied':
      return 'Allow the microphone for this app to record voice notes.';
    case 'no-microphone':
      return 'No microphone was found.';
    case 'failed':
      return "The voice note couldn't be recorded. Try again.";
  }
}

export async function startRecording(): Promise<Recording> {
  if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new RecorderError('unsupported', 'MediaRecorder or getUserMedia is missing');
  }
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (error) {
    const name = error instanceof DOMException ? error.name : '';
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      throw new RecorderError('denied', 'Microphone permission denied', { cause: error });
    }
    if (name === 'NotFoundError' || name === 'OverconstrainedError') {
      throw new RecorderError('no-microphone', 'No microphone', { cause: error });
    }
    throw new RecorderError('failed', 'Could not open the microphone', { cause: error });
  }
  const mimeType = pickAudioType((type) => MediaRecorder.isTypeSupported(type));
  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  } catch (error) {
    stream.getTracks().forEach((track) => track.stop());
    throw new RecorderError('unsupported', 'MediaRecorder refused the stream', { cause: error });
  }
  const chunks: Blob[] = [];
  recorder.addEventListener('dataavailable', (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  });
  const stopped = new Promise<void>((resolve) =>
    recorder.addEventListener('stop', () => resolve()),
  );
  const startedAt = performance.now();
  let endedAt = startedAt;
  recorder.start(1000);
  const release = () => stream.getTracks().forEach((track) => track.stop());
  let resolveLimit!: () => void;
  const limitReached = new Promise<void>((resolve) => (resolveLimit = resolve));
  const timer = setTimeout(() => {
    if (recorder.state !== 'inactive') {
      endedAt = performance.now();
      recorder.stop();
      resolveLimit();
    }
  }, MAX_VOICE_NOTE_MS);

  return {
    startedAt,
    limitReached,
    async stop() {
      clearTimeout(timer);
      if (recorder.state !== 'inactive') {
        endedAt = performance.now();
        recorder.stop();
      }
      await stopped;
      release();
      const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' });
      if (blob.size === 0) throw new RecorderError('failed', 'The recording is empty');
      return {
        audio: await blob.arrayBuffer(),
        type: blob.type.split(';')[0] || 'audio/webm',
        durationMs: Math.round(endedAt - startedAt),
      };
    },
    cancel() {
      clearTimeout(timer);
      if (recorder.state !== 'inactive') recorder.stop();
      release();
    },
  };
}
