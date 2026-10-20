import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAX_VOICE_NOTE_MS } from '../core/voice-notes';
import { RecorderError, recorderMessage, startRecording } from './recorder';

/** A MediaRecorder that hands out one chunk when stopped. */
class FakeRecorder extends EventTarget {
  static isTypeSupported = (type: string) => type === 'audio/webm;codecs=opus';
  state: 'inactive' | 'recording' = 'inactive';
  mimeType = 'audio/webm;codecs=opus';
  start() {
    this.state = 'recording';
  }
  stop() {
    if (this.state === 'inactive') return;
    this.state = 'inactive';
    const data = new Event('dataavailable') as Event & { data: Blob };
    Object.assign(data, { data: new Blob([new Uint8Array(200)], { type: this.mimeType }) });
    this.dispatchEvent(data);
    this.dispatchEvent(new Event('stop'));
  }
}

function fakeMicrophone() {
  const track = { stop: vi.fn() };
  vi.stubGlobal('MediaRecorder', FakeRecorder);
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn(async () => ({ getTracks: () => [track] })) },
  });
  return track;
}

describe('startRecording', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('stops by itself at the time limit, keeps what was recorded, and frees the microphone', async () => {
    vi.useFakeTimers();
    const track = fakeMicrophone();
    const recording = await startRecording();
    let limited = false;
    void recording.limitReached.then(() => (limited = true));
    await vi.advanceTimersByTimeAsync(MAX_VOICE_NOTE_MS - 1);
    expect(limited).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(limited).toBe(true);
    const recorded = await recording.stop();
    expect(recorded.type).toBe('audio/webm');
    expect(recorded.audio.byteLength).toBe(200);
    expect(recorded.durationMs).toBeGreaterThanOrEqual(MAX_VOICE_NOTE_MS - 1);
    expect(track.stop).toHaveBeenCalled();
  });

  it('cancel frees the microphone', async () => {
    const track = fakeMicrophone();
    const recording = await startRecording();
    recording.cancel();
    expect(track.stop).toHaveBeenCalled();
  });

  it('explains a refused microphone and a missing recorder', async () => {
    vi.stubGlobal('MediaRecorder', FakeRecorder);
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: async () => {
          throw new DOMException('no', 'NotAllowedError');
        },
      },
    });
    const denied = await startRecording().catch((error: unknown) => error);
    expect(denied).toBeInstanceOf(RecorderError);
    expect(recorderMessage(denied)).toBe(
      'Allow the microphone for this app to record voice notes.',
    );
    vi.stubGlobal('MediaRecorder', undefined);
    const missing = await startRecording().catch((error: unknown) => error);
    expect(recorderMessage(missing)).toBe("Recording isn't available in this browser.");
  });
});
