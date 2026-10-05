'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Read-aloud through the browser's speech synthesis.
 *
 * `canSpeak` starts `false` and is settled in an effect, so the server render
 * and the first client render agree (the button only appears where speech is
 * actually supported). Anything still being spoken is cancelled on unmount.
 */
export function useSpeech() {
  const [canSpeak, setCanSpeak] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setCanSpeak('speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined');
    return () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  const stop = useCallback(() => {
    if (!('speechSynthesis' in window)) return;
    utterance.current = null; // so the cancelled utterance's onerror is ignored
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  /** Stops if already speaking, otherwise reads `text` aloud. */
  const toggle = useCallback(
    (text: string) => {
      if (speaking) {
        stop();
        return;
      }
      const spoken = new SpeechSynthesisUtterance(text);
      const finish = () => {
        if (utterance.current === spoken) {
          utterance.current = null;
          setSpeaking(false);
        }
      };
      spoken.onend = finish;
      spoken.onerror = finish;
      window.speechSynthesis.cancel();
      utterance.current = spoken;
      window.speechSynthesis.speak(spoken);
      setSpeaking(true);
    },
    [speaking, stop],
  );

  return { canSpeak, speaking, stop, toggle };
}
