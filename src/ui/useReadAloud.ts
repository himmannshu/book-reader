// Reading the open book aloud (phase 16): sentence by sentence from where the reader is, the
// spoken sentence marked and followed on the page. Pause keeps the place; stop clears it.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  nextSpeed,
  passageSentence,
  sentenceAt,
  splitSentences,
  type Sentence,
} from '../core/read-aloud';
import { findMatches } from '../core/search';
import type { PdfDoc } from '../engine/types';
import type { Viewer } from '../viewer/viewer';
import type { Speaker } from './speech';

export type ReadAloudState =
  { status: 'idle' } | { status: 'reading' | 'paused'; pageIndex: number; sentence: number };

export function useReadAloud({
  doc,
  viewer,
  speaker,
  onError,
}: {
  doc: PdfDoc;
  viewer: { readonly current: Viewer | null };
  speaker: Speaker;
  onError(message: string): void;
}) {
  const [state, setState] = useState<ReadAloudState>({ status: 'idle' });
  const [rate, setRate] = useState(1);
  const run = useRef(0);
  const texts = useRef(new Map<number, string>());
  const place = useRef<{ pageIndex: number; sentence: number } | null>(null);
  const rateRef = useRef(rate);
  useEffect(() => {
    rateRef.current = rate;
  }, [rate]);

  const pageText = useCallback(
    async (pageIndex: number) => {
      let text = texts.current.get(pageIndex);
      if (text === undefined) {
        text = await doc.pageText(pageIndex);
        texts.current.set(pageIndex, text);
      }
      return text;
    },
    [doc],
  );

  /** Marks a sentence on the page. The same words may appear earlier on the page: mark the right one. */
  const mark = useCallback(
    (pageIndex: number, text: string, piece: Sentence) => {
      const spoken = text.slice(piece.start, piece.end);
      const occurrence = Math.max(
        0,
        findMatches(text, spoken).findIndex((match) => match.start >= piece.start),
      );
      viewer.current?.setSpoken({ pageIndex, text: spoken, occurrence });
      return spoken;
    },
    [viewer],
  );

  const read = useCallback(
    async (fromPage: number, fromSentence: number) => {
      const id = ++run.current;
      let spokeAny = false;
      try {
        for (let pageIndex = fromPage; pageIndex < doc.pageCount; pageIndex++) {
          const text = await pageText(pageIndex);
          if (id !== run.current) return;
          const sentences = splitSentences(text);
          const first = pageIndex === fromPage ? fromSentence : 0;
          for (let sentence = first; sentence < sentences.length; sentence++) {
            const piece = sentences[sentence];
            if (!piece) continue;
            place.current = { pageIndex, sentence };
            setState({ status: 'reading', pageIndex, sentence });
            const spoken = mark(pageIndex, text, piece);
            spokeAny = true;
            const result = await speaker.speak(spoken, rateRef.current);
            if (id !== run.current || result === 'stopped') return;
          }
        }
        // The end of the book (or a book with no text at all from here on).
        if (!spokeAny) onError('There is no text to read aloud from here.');
        place.current = null;
        setState({ status: 'idle' });
        viewer.current?.setSpoken(null);
      } catch (error) {
        if (id !== run.current || doc.destroyed) return;
        console.error('Reading aloud failed', error);
        onError("The book couldn't be read aloud. Try again.");
        place.current = null;
        setState({ status: 'idle' });
        viewer.current?.setSpoken(null);
      }
    },
    [doc, pageText, speaker, viewer, onError, mark],
  );

  /** Starts from the place at the top of the window. */
  const start = useCallback(async () => {
    const current = viewer.current;
    if (!current) return;
    if (!speaker.supported) {
      onError("Listening isn't available in this browser.");
      return;
    }
    const { pageIndex, fraction } = current.position;
    try {
      const text = await pageText(pageIndex);
      const sentences = splitSentences(text);
      void read(pageIndex, sentenceAt(sentences, text.length, fraction));
    } catch (error) {
      console.error('Reading aloud failed', error);
      onError("The book couldn't be read aloud. Try again.");
    }
  }, [viewer, speaker, pageText, read, onError]);

  /** Starts at the sentence where a passage starts (phase 21, Listen from here). */
  const startAt = useCallback(
    async (pageIndex: number, passage: string) => {
      if (!speaker.supported) {
        onError("Listening isn't available in this browser.");
        return;
      }
      try {
        const text = await pageText(pageIndex);
        void read(pageIndex, passageSentence(text, passage));
      } catch (error) {
        console.error('Reading aloud failed', error);
        onError("The book couldn't be read aloud. Try again.");
      }
    },
    [speaker, pageText, read, onError],
  );

  /**
   * Moves the reading one sentence on or back (phase 23), across pages (skipping pages without
   * text). While reading it goes on from there; while paused it only moves the place and the mark.
   * At either end of the book it stays where it is.
   */
  const skip = useCallback(
    async (step: 1 | -1) => {
      const from = place.current;
      if (!from) return;
      const reading = state.status === 'reading';
      if (reading) {
        run.current++;
        speaker.stop();
      }
      try {
        let pageIndex = from.pageIndex;
        let sentence = from.sentence + step;
        let text = await pageText(pageIndex);
        let sentences = splitSentences(text);
        while (sentence < 0 || sentence >= sentences.length) {
          const nextPage = pageIndex + step;
          if (nextPage < 0 || nextPage >= doc.pageCount) {
            ({ pageIndex, sentence } = from);
            text = await pageText(pageIndex);
            sentences = splitSentences(text);
            break;
          }
          pageIndex = nextPage;
          text = await pageText(pageIndex);
          sentences = splitSentences(text);
          sentence = step > 0 ? 0 : sentences.length - 1;
        }
        if (reading) {
          void read(pageIndex, sentence);
          return;
        }
        const piece = sentences[sentence];
        place.current = { pageIndex, sentence };
        setState({ status: 'paused', pageIndex, sentence });
        if (piece) mark(pageIndex, text, piece);
      } catch (error) {
        if (doc.destroyed) return;
        console.error('Moving the reading failed', error);
        onError("The book couldn't be read aloud. Try again.");
      }
    },
    [state.status, speaker, pageText, doc, read, mark, onError],
  );

  const pause = useCallback(() => {
    run.current++;
    speaker.stop();
    if (place.current) setState({ status: 'paused', ...place.current });
  }, [speaker]);

  const resume = useCallback(() => {
    if (place.current) void read(place.current.pageIndex, place.current.sentence);
  }, [read]);

  const stop = useCallback(() => {
    run.current++;
    speaker.stop();
    place.current = null;
    setState({ status: 'idle' });
    viewer.current?.setSpoken(null);
  }, [speaker, viewer]);

  /** A new speed applies at once: the current sentence starts again at it. */
  const changeRate = useCallback(
    (next: number) => {
      setRate(next);
      rateRef.current = next;
      if (state.status === 'reading' && place.current) {
        speaker.stop();
        void read(place.current.pageIndex, place.current.sentence);
      }
    },
    [state.status, speaker, read],
  );

  // Silence when the reader closes.
  useEffect(
    () => () => {
      run.current++;
      speaker.stop();
    },
    [speaker],
  );

  /** The next speed in the cycle (phase 23, the listen bar's speed button). */
  const cycleRate = useCallback(() => changeRate(nextSpeed(rate)), [changeRate, rate]);

  return { state, rate, start, startAt, pause, resume, stop, changeRate, cycleRate, skip };
}
