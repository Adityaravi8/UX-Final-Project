import { useCallback, useEffect, useRef, useState } from 'react';

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

interface Options {
  enabled: boolean;
  onStart?: () => void;
  onEnd?: () => void;
}

export function useSpeechSynthesis({ enabled, onStart, onEnd }: Options) {
  const [supported] = useState(() => isSpeechSynthesisSupported());
  const [speaking, setSpeaking] = useState(false);
  const onStartRef = useRef(onStart);
  const onEndRef = useRef(onEnd);
  const currentUtterance = useRef<SpeechSynthesisUtterance | null>(null);
  const watchdog = useRef<number | undefined>(undefined);

  useEffect(() => {
    onStartRef.current = onStart;
    onEndRef.current = onEnd;
  });

  const cancel = useCallback(() => {
    if (!supported) return;
    currentUtterance.current = null; // so the cancelled utterance's end event is ignored
    window.clearTimeout(watchdog.current);
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  const speak = useCallback(
    (text: string) => {
      if (!supported || !enabled || !text.trim()) {
        onEndRef.current?.();
        return;
      }
      currentUtterance.current = null;
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      currentUtterance.current = utter;
      utter.rate = 1.02;
      utter.pitch = 1.05;
      utter.lang = 'en-CA';

      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find((v) => /en-CA/i.test(v.lang) && /female|samantha|karen|moira|victoria/i.test(v.name)) ||
        voices.find((v) => /en-(CA|US|GB)/i.test(v.lang) && /female|samantha|google us english/i.test(v.name)) ||
        voices.find((v) => /en-/i.test(v.lang));
      if (preferred) utter.voice = preferred;

      utter.onstart = () => {
        if (currentUtterance.current !== utter) return;
        setSpeaking(true);
        onStartRef.current?.();
      };
      const finish = () => {
        if (currentUtterance.current !== utter) return;
        currentUtterance.current = null;
        window.clearTimeout(watchdog.current);
        setSpeaking(false);
        onEndRef.current?.();
      };
      utter.onend = finish;
      utter.onerror = finish;

      // Some browsers (Chrome especially, on long sentences) never fire the end event.
      // If speech has not reported finishing well after it should have, treat it as done
      // so hands-free listening does not wait forever.
      window.clearTimeout(watchdog.current);
      const expectedMs = 2500 + text.length * 85;
      watchdog.current = window.setTimeout(() => {
        if (currentUtterance.current !== utter) return;
        window.speechSynthesis.cancel();
        finish();
      }, expectedMs);

      window.speechSynthesis.speak(utter);
    },
    [supported, enabled],
  );

  useEffect(() => {
    return () => {
      window.clearTimeout(watchdog.current);
      if (supported) window.speechSynthesis.cancel();
    };
  }, [supported]);

  return { supported, speaking, speak, cancel };
}
