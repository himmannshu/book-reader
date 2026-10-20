// Reading the open book aloud (phase 16): sentence by sentence from where the reader is, the
// spoken sentence marked and followed on the page. Pause keeps the place; stop clears it.
import { useCallback, useEffect, useRef, useState } from 'react';
import { sentenceAt, splitSentences } from '../core/read-aloud';
import { findMatches } from '../core/search';
import type { PdfDoc } from '../engine/types';
import type { Viewer } from '../viewer/viewer';
import type { Speaker } from './speech';

export const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;

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

  const read = useCallback(
    async (fromPage: number, fromSentence: number) => {
      const id = ++run.current;
      try {
        for (let pageIndex = fromPage; pageIndex < doc.pageCount; pageIndex++) {
          const text = await pageText(pageIndex);
          if (id !== run.current) return;
          const sentences = splitSentences(text);
          const first = pageIndex === fromPage ? fromSentence : 0;
          for (let sentence = first; sentence < sentences.length; sentence++) {
            const piece = sentences[sentence];
            if (!piece) continue;
            const spoken = text.slice(piece.start, piece.end);
            // The same words may appear earlier on the page: mark the right one.
            const occurrence = Math.max(
              0,
              findMatches(text, spoken).findIndex((match) => match.start >= piece.start),
            );
            place.current = { pageIndex, sentence };
            setState({ status: 'reading', pageIndex, sentence });
            viewer.current?.setSpoken({ pageIndex, text: spoken, occurrence });
            const result = await speaker.speak(spoken, rateRef.current);
            if (id !== run.current || result === 'stopped') return;
          }
        }
        // The end of the book.
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
    [doc, pageText, speaker, viewer, onError],
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

  return { state, rate, start, pause, resume, stop, changeRate };
}
