import { useEffect, useRef, useState } from 'react';
import { formatDuration, waveformLevels } from '../core/voice-notes';
import { IconButton, cx } from './controls';

const BARS = 28;
/** Levels already worked out this session, by recording. */
const levelsCache = new WeakMap<ArrayBuffer, number[]>();

type DecodingContext = typeof OfflineAudioContext;

/**
 * A recording's waveform (phase 23), decoded once per session after its row shows. Null until it is
 * ready, or when the browser can't decode it (the strip then draws a flat line).
 */
function useWaveform(audio: ArrayBuffer): number[] | null {
  const [levels, setLevels] = useState<number[] | null>(() => levelsCache.get(audio) ?? null);
  useEffect(() => {
    if (levelsCache.has(audio)) return;
    const Context: DecodingContext | undefined =
      globalThis.OfflineAudioContext ??
      (globalThis as unknown as { webkitOfflineAudioContext?: DecodingContext })
        .webkitOfflineAudioContext;
    if (!Context) return;
    let cancelled = false;
    // decodeAudioData takes the buffer over, so it gets a copy.
    new Context(1, 1, 44100).decodeAudioData(audio.slice(0)).then(
      (decoded) => {
        const found = waveformLevels(decoded.getChannelData(0), BARS);
        levelsCache.set(audio, found);
        if (!cancelled) setLevels(found);
      },
      (error: unknown) => console.warn("Could not draw a voice note's waveform", error),
    );
    return () => {
      cancelled = true;
    };
  }, [audio]);
  return levels;
}

/**
 * A voice note's player (phase 23, the design's VoiceNote strip): an accent play/pause, the
 * waveform with the played part filled, and the time. The audio element has no controls of its own.
 */
export function VoiceNotePlayer({
  url,
  audio,
  durationMs,
  label,
}: {
  url: string;
  audio: ArrayBuffer;
  durationMs: number;
  /** Names the recording, such as "Voice note on page 3". */
  label: string;
}) {
  const element = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const levels = useWaveform(audio);
  const bars = levels ?? Array.from({ length: BARS }, () => 0);
  const played = durationMs > 0 ? elapsedMs / durationMs : 0;

  function toggle() {
    const player = element.current;
    if (!player) return;
    if (!player.paused) {
      player.pause();
      return;
    }
    player.play().catch((error: unknown) => {
      console.error('Playing a voice note failed', error);
      setPlaying(false);
    });
  }

  return (
    <div className="br-voice">
      <IconButton
        icon={playing ? 'pause' : 'play'}
        label={playing ? 'Pause voice note' : 'Play voice note'}
        variant="accent"
        onClick={toggle}
      />
      <span className="br-voice__wave" aria-hidden="true">
        {bars.map((level, index) => (
          <span
            key={index}
            className={cx('br-voice__bar', index / bars.length < played && 'is-played')}
            style={{ height: `${Math.max(12, level * 100)}%` }}
          />
        ))}
      </span>
      <span className="br-voice__time">
        {playing || elapsedMs > 0 ? `${formatDuration(elapsedMs)} / ` : ''}
        {formatDuration(durationMs)}
      </span>
      <audio
        ref={element}
        src={url}
        preload="metadata"
        aria-label={label}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(event) => setElapsedMs(event.currentTarget.currentTime * 1000)}
        onEnded={() => {
          setPlaying(false);
          setElapsedMs(0);
        }}
      />
    </div>
  );
}
