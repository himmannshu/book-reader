// Speech for reading aloud (phase 16): the browser's own speechSynthesis, on the device and free.

export interface Speaker {
  readonly supported: boolean;
  /** Speaks one piece; 'stopped' when stop() (or another speak) cut it short. */
  speak(text: string, rate: number): Promise<'done' | 'stopped'>;
  stop(): void;
}

export function browserSpeaker(): Speaker {
  const synth = typeof speechSynthesis === 'undefined' ? null : speechSynthesis;
  // Chrome drops utterances that nothing references before they finish; keep the current one.
  let current: SpeechSynthesisUtterance | null = null;
  return {
    supported: synth !== null && typeof SpeechSynthesisUtterance !== 'undefined',
    speak(text, rate) {
      if (!synth) return Promise.resolve('stopped');
      return new Promise((resolve, reject) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = rate;
        utterance.lang = document.documentElement.lang || navigator.language;
        current = utterance;
        utterance.onend = () => {
          if (current === utterance) current = null;
          resolve('done');
        };
        utterance.onerror = (event) => {
          if (current === utterance) current = null;
          if (event.error === 'interrupted' || event.error === 'canceled') resolve('stopped');
          else reject(new Error(`Speech failed: ${event.error}`));
        };
        synth.speak(utterance);
      });
    },
    stop() {
      current = null;
      synth?.cancel();
    },
  };
}
