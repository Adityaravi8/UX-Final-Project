import { useCallback, useEffect, useRef, useState } from 'react';

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly 0: { transcript: string };
}

interface SpeechRecognitionEventLike {
  readonly resultIndex: number;
  readonly results: ArrayLike<SpeechRecognitionResultLike> & { length: number };
}

interface SpeechRecognitionErrorEventLike {
  readonly error: string;
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
  return typeof window !== 'undefined' && getSpeechRecognitionCtor() !== null;
}

interface Options {
  onFinal: (transcript: string) => void;
  onInterim?: (transcript: string) => void;
  onError?: (message: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

export function useSpeechRecognition({
  onFinal,
  onInterim,
  onError,
  onStart,
  onEnd,
}: Options) {
  const [supported] = useState(() => isSpeechRecognitionSupported());
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const shouldListenRef = useRef(false);

  const onFinalRef = useRef(onFinal);
  const onInterimRef = useRef(onInterim);
  const onErrorRef = useRef(onError);
  const onStartRef = useRef(onStart);
  const onEndRef = useRef(onEnd);

  useEffect(() => {
    onFinalRef.current = onFinal;
    onInterimRef.current = onInterim;
    onErrorRef.current = onError;
    onStartRef.current = onStart;
    onEndRef.current = onEnd;
  });

  const stop = useCallback(() => {
    shouldListenRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      onErrorRef.current?.(
        'Voice input is not supported in this browser. Please type your answers instead.',
      );
      return;
    }

    try {
      recognitionRef.current?.abort();
    } catch {
      /* ignore */
    }

    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-CA';
    recognitionRef.current = recognition;
    shouldListenRef.current = true;

    recognition.onstart = () => {
      setListening(true);
      onStartRef.current?.();
    };

    recognition.onresult = (event) => {
      let interim = '';
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += piece;
        else interim += piece;
      }
      if (interim) onInterimRef.current?.(interim);
      if (finalText.trim()) {
        onFinalRef.current(finalText.trim());
      }
    };

    recognition.onerror = (event) => {
      const err = event.error;
      if (err === 'aborted' || err === 'no-speech') {
        onErrorRef.current?.(
          err === 'no-speech'
            ? 'I did not hear anything. Tap the mic to try again, or type your answer.'
            : 'Listening stopped. You can retry with the mic or type instead.',
        );
      } else if (err === 'not-allowed') {
        onErrorRef.current?.(
          'Microphone permission was blocked. You can still complete the booking by typing.',
        );
      } else {
        onErrorRef.current?.(
          'Voice recognition had trouble. Please retry or type your answer.',
        );
      }
      setListening(false);
      shouldListenRef.current = false;
    };

    recognition.onend = () => {
      setListening(false);
      onEndRef.current?.();
    };

    try {
      recognition.start();
    } catch {
      onErrorRef.current?.(
        'Could not start the microphone. Please type your answer instead.',
      );
      setListening(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      try {
        recognitionRef.current?.abort();
      } catch {
        /* ignore */
      }
    };
  }, []);

  return { supported, listening, start, stop };
}
