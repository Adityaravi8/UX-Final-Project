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

  useEffect(() => {
    onStartRef.current = onStart;
    onEndRef.current = onEnd;
  });

  const cancel = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  const speak = useCallback(
    (text: string) => {
      if (!supported || !enabled || !text.trim()) {
        onEndRef.current?.();
        return;
      }
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
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
        setSpeaking(true);
        onStartRef.current?.();
      };
      utter.onend = () => {
        setSpeaking(false);
        onEndRef.current?.();
      };
      utter.onerror = () => {
        setSpeaking(false);
        onEndRef.current?.();
      };

      window.speechSynthesis.speak(utter);
    },
    [supported, enabled],
  );

  useEffect(() => {
    return () => {
      if (supported) window.speechSynthesis.cancel();
    };
  }, [supported]);

  return { supported, speaking, speak, cancel };
}
