import { IconButton } from './controls';

/**
 * The bar that floats at the bottom of the reader while the book is read aloud (phase 23, the
 * design's ListenBar): the state and the place, previous and next sentence around the accent
 * play/pause, a speed button that steps through the speeds, and Stop. Under 480 px the status text
 * hides (app.css).
 */
export function ListenBar({
  reading,
  place,
  rate,
  onPause,
  onResume,
  onPrevious,
  onNext,
  onSpeed,
  onStop,
}: {
  reading: boolean;
  /** Where the reading is, such as "p. 12 · Chapter 3". */
  place: string;
  rate: number;
  onPause(): void;
  onResume(): void;
  onPrevious(): void;
  onNext(): void;
  onSpeed(): void;
  onStop(): void;
}) {
  return (
    <div className="br-listen" role="toolbar" aria-label="Read aloud">
      <div className="br-listen__info" role="status">
        <span className="br-listen__state">{reading ? 'Reading aloud' : 'Paused'}</span>
        <span className="caption br-listen__place">{place}</span>
      </div>
      <div className="br-listen__controls">
        <IconButton icon="skip-back" label="Previous sentence" onClick={onPrevious} />
        {reading ? (
          <IconButton icon="pause" label="Pause" variant="accent" size="lg" onClick={onPause} />
        ) : (
          <IconButton icon="play" label="Resume" variant="accent" size="lg" onClick={onResume} />
        )}
        <IconButton icon="skip-forward" label="Next sentence" onClick={onNext} />
      </div>
      <div className="br-listen__trail">
        <button
          type="button"
          className="br-rate"
          aria-label={`Speed ${rate}×, change`}
          title="Change the speed"
          onClick={onSpeed}
        >
          {rate}×
        </button>
        <IconButton icon="close" label="Stop reading" onClick={onStop} />
      </div>
    </div>
  );
}
