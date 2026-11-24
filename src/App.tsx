import { useEffect, useId, useRef, useState } from 'react';
import { AvaAvatar } from './components/AvaAvatar';
import { BookingSummary } from './components/BookingSummary';
import { ConfirmModal } from './components/ConfirmModal';
import { MessageList } from './components/MessageList';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useSpeechSynthesis } from './hooks/useSpeechSynthesis';
import {
  createInitialEngine,
  fieldPrompt,
  processUserInput,
  quickChoicesFor,
} from './lib/conversation';
import type { AvatarStatus, BookingField, EngineResult } from './lib/types';

export default function App() {
  const [engine, setEngine] = useState<EngineResult>(() => createInitialEngine());
  const [input, setInput] = useState('');
  const [interim, setInterim] = useState('');
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [paused, setPaused] = useState(false);
  const [status, setStatus] = useState<AvatarStatus>('speaking');
  const [voiceHint, setVoiceHint] = useState<string | null>(null);
  // Hands-free: after one tap on the mic, Ava listens again after each of her replies.
  const [handsFree, setHandsFree] = useState(false);
  const handsFreeRef = useRef(false);
  const pausedRef = useRef(false);
  const noSpeechCount = useRef(0);
  const resumeTimer = useRef<number | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSpokenRef = useRef<string>('');
  const engineRef = useRef(engine);
  const formId = useId();

  useEffect(() => {
    engineRef.current = engine;
  }, [engine]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  function setHandsFreeMode(on: boolean) {
    handsFreeRef.current = on;
    setHandsFree(on);
    if (!on) window.clearTimeout(resumeTimer.current);
  }

  /** In hands-free mode, start listening again once Ava has finished her reply. */
  function resumeListening() {
    window.clearTimeout(resumeTimer.current);
    if (!handsFreeRef.current) return;
    // Short pause so the mic doesn't catch the tail of Ava's voice.
    resumeTimer.current = window.setTimeout(() => {
      if (!handsFreeRef.current || pausedRef.current) return;
      if (engineRef.current.phase === 'completed') {
        setHandsFreeMode(false);
        return;
      }
      if (typeof window !== 'undefined' && window.speechSynthesis?.speaking) return;
      start();
    }, 400);
  }

  const { speak, cancel, supported: ttsSupported, speaking } = useSpeechSynthesis({
    enabled: ttsEnabled && !paused,
    onStart: () => setStatus('speaking'),
    onEnd: () => {
      setStatus((s) => (s === 'completed' ? 'completed' : 'waiting'));
      resumeListening();
    },
  });

  const { supported: sttSupported, listening, start, stop } = useSpeechRecognition({
    onStart: () => {
      setStatus('listening');
      setVoiceHint(null);
    },
    onInterim: (t) => setInterim(t),
    onFinal: (transcript) => {
      noSpeechCount.current = 0;
      setInterim('');
      setStatus('processing');
      window.setTimeout(() => {
        submitText(transcript, 'voice');
      }, 280);
    },
    onError: (message, code) => {
      setStatus('waiting');
      setInterim('');
      // Hands-free: a couple of silent turns just restart listening.
      if (handsFreeRef.current && code === 'no-speech' && noSpeechCount.current < 2) {
        noSpeechCount.current += 1;
        setVoiceHint('Still listening — say your answer, or type it below.');
        resumeListening();
        return;
      }
      if (handsFreeRef.current) {
        setHandsFreeMode(false);
        setVoiceHint(
          code === 'no-speech'
            ? 'Hands-free stopped because I didn’t hear anything. Tap the mic to keep talking, or type your answer.'
            : message,
        );
        return;
      }
      setVoiceHint(message);
    },
    onEnd: () => {
      setInterim('');
    },
  });

  useEffect(() => {
    if (!engine.avaReply || engine.avaReply === lastSpokenRef.current) return;
    lastSpokenRef.current = engine.avaReply;
    if (engine.phase === 'completed') {
      setStatus('completed');
    }
    if (ttsEnabled && !paused) {
      speak(engine.avaReply); // resumes listening when speech ends
    } else if (engine.phase === 'completed') {
      setStatus('completed');
      resumeListening();
    } else {
      setStatus('waiting');
      resumeListening();
    }
    // resumeListening only reads refs, so it does not need to be a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine.avaReply, engine.phase, ttsEnabled, paused, speak]);

  useEffect(() => {
    if (listening) setStatus('listening');
  }, [listening]);

  useEffect(() => {
    if (speaking && !listening) setStatus('speaking');
  }, [speaking, listening]);

  function submitText(text: string, source: 'typed' | 'voice' | 'chip' = 'typed') {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (paused && !/^(continue|resume|i'?m ready)$/i.test(trimmed)) {
      setVoiceHint('Session is paused. Press Resume or say “continue”.');
      return;
    }

    stop();
    cancel();
    setStatus('processing');
    setInput('');
    setInterim('');
    setVoiceHint(null);

    window.setTimeout(() => {
      if (/^(restart|start over|reset|book another)$/i.test(trimmed)) {
        const fresh = createInitialEngine();
        lastSpokenRef.current = '';
        setPaused(false);
        setEngine(fresh);
        return;
      }

      const next = processUserInput(engineRef.current, trimmed, source);
      if (/\b(pause|hold on)\b/i.test(trimmed) && !/\b(continue|resume)\b/i.test(trimmed)) {
        setPaused(true);
        setStatus('paused');
      } else if (/^(continue|resume|i'?m ready)$/i.test(trimmed)) {
        setPaused(false);
      }
      setEngine(next);
      if (next.phase === 'completed') setStatus('completed');
    }, 220);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitText(input, 'typed');
  }

  function handleEditField(field: BookingField) {
    cancel();
    stop();
    setPaused(false);
    const reply = `Sure — let’s update your ${field}. ${fieldPrompt(field)}`;
    setEngine((prev) => ({
      ...prev,
      currentField: field,
      phase: 'collecting',
      showConfirmModal: false,
      avaReply: reply,
      quickChoices: quickChoicesFor(field, prev.draft),
      messages: [
        ...prev.messages,
        {
          id: `m-edit-${Date.now()}`,
          role: 'ava',
          text: reply,
          timestamp: Date.now(),
        },
      ],
    }));
    lastSpokenRef.current = '';
    inputRef.current?.focus();
  }

  function handleMicToggle() {
    if (paused) {
      setVoiceHint('Resume the session before using the microphone.');
      return;
    }
    if (handsFree || listening) {
      setHandsFreeMode(false);
      stop();
      setInterim('');
      setStatus('waiting');
      return;
    }
    setHandsFreeMode(true);
    noSpeechCount.current = 0;
    setVoiceHint(null);
    cancel();
    setInterim('');
    start();
  }

  function handleRestart() {
    cancel();
    stop();
    lastSpokenRef.current = '';
    setPaused(false);
    setInput('');
    setInterim('');
    setVoiceHint(null);
    setEngine(createInitialEngine());
  }

  function handlePauseToggle() {
    if (paused) {
      setPaused(false);
      submitText('continue', 'chip');
      return;
    }
    cancel();
    stop();
    setHandsFreeMode(false);
    setPaused(true);
    setStatus('paused');
    const reply =
      'Paused. Press Resume when you are ready to continue — your answers are saved.';
    setEngine((prev) => ({
      ...prev,
      avaReply: reply,
      messages: [
        ...prev.messages,
        {
          id: `m-pause-${Date.now()}`,
          role: 'ava',
          text: reply,
          timestamp: Date.now(),
        },
      ],
      quickChoices: [{ label: 'Resume', value: 'continue' }],
    }));
    lastSpokenRef.current = reply;
  }

  const displayStatus: AvatarStatus =
    engine.phase === 'completed' ? 'completed' : paused ? 'paused' : status;

  return (
    <div className="page">
      <div className="atmosphere" aria-hidden="true" />

      <header className="hero">
        <p className="hero__eyebrow">Restaurant reservations · Desktop prototype</p>
        <h1 className="hero__brand">TableTalk</h1>
        <p className="hero__tagline">
          Book a table with Ava — speak or type, correct anytime, confirm before we finalize.
        </p>
      </header>

      <main className="stage">
        <section className="stage__avatar" aria-label="Ava, reservation assistant">
          <AvaAvatar status={displayStatus} />
          <p className="sr-only" aria-live="polite">
            Ava is {displayStatus}.
          </p>
          <div className="controls" role="toolbar" aria-label="Session controls">
            <button type="button" className="btn btn--ghost" onClick={handlePauseToggle}>
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => submitText('go back', 'chip')}
              disabled={engine.phase === 'completed' || paused}
            >
              Go back
            </button>
            <button type="button" className="btn btn--ghost" onClick={handleRestart}>
              Restart
            </button>
            <label className="toggle">
              <input
                type="checkbox"
                checked={ttsEnabled}
                onChange={(e) => {
                  setTtsEnabled(e.target.checked);
                  if (!e.target.checked) cancel();
                }}
                disabled={!ttsSupported}
              />
              <span>Ava speaks</span>
            </label>
          </div>
          {!sttSupported && (
            <p className="banner banner--info" role="status">
              Voice input is unavailable in this browser. Typed answers work fully — nothing else
              required.
            </p>
          )}
          {voiceHint && (
            <p className="banner banner--warn" role="status">
              {voiceHint}{' '}
              <button type="button" className="linkish" onClick={() => inputRef.current?.focus()}>
                Type instead
              </button>
            </p>
          )}
        </section>

        <section className="stage__chat" aria-label="Conversation with Ava">
          <MessageList messages={engine.messages} />

          {engine.quickChoices.length > 0 && engine.phase !== 'completed' && !paused && (
            <div className="chips" role="group" aria-label="Quick choices">
              {engine.quickChoices.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  className="chip"
                  onClick={() => submitText(c.value, 'chip')}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}

          {interim && (
            <p className="interim" aria-live="polite">
              Hearing: “{interim}”
            </p>
          )}

          <form id={formId} className="composer" onSubmit={handleSubmit}>
            <label htmlFor="user-input" className="sr-only">
              Your reply to Ava
            </label>
            <input
              id="user-input"
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                paused
                  ? 'Paused — press Resume to continue'
                  : engine.phase === 'completed'
                    ? 'Type restart to book another table'
                    : 'Type your answer…'
              }
              autoComplete="off"
              disabled={false}
            />
            <button
              type="button"
              className={`mic ${listening ? 'mic--on' : handsFree ? 'mic--armed' : ''}`}
              onClick={handleMicToggle}
              aria-pressed={handsFree || listening}
              aria-label={handsFree || listening ? 'Stop hands-free voice' : 'Start hands-free voice'}
              disabled={!sttSupported || engine.phase === 'completed'}
              title={
                sttSupported
                  ? handsFree || listening
                    ? 'Stop hands-free voice'
                    : 'Talk to Ava hands-free — she listens again after each reply'
                  : 'Voice not supported — type instead'
              }
            >
              <MicIcon />
            </button>
            <button type="submit" className="btn btn--primary" disabled={!input.trim()}>
              Send
            </button>
          </form>
          {handsFree && (
            <p className="handsfree-note" role="status">
              <span className="handsfree-note__dot" aria-hidden="true" />
              Hands-free on — Ava listens again after each reply. Tap the mic to stop.
            </p>
          )}
        </section>

        <BookingSummary
          draft={engine.draft}
          editable={engine.phase !== 'completed'}
          onEdit={handleEditField}
        />
      </main>

      {engine.phase === 'completed' && engine.confirmationCode && (
        <section className="success" aria-live="polite">
          <h2>Reservation confirmed</h2>
          <p>
            Confirmation code <strong>{engine.confirmationCode}</strong>. You can restart anytime to
            book another table.
          </p>
        </section>
      )}

      <footer className="footer">
        <p>
          TableTalk targets <strong>desktop</strong> browsers (Chrome/Edge recommended for voice).
          Simulated availability only — no real payments or restaurant booking API.
        </p>
        <p>
          Course docs (open in a new tab):{' '}
          <a href={`${import.meta.env.BASE_URL}docs/persona.md`} target="_blank" rel="noreferrer">
            Persona
          </a>
          {' · '}
          <a href={`${import.meta.env.BASE_URL}docs/user-journey.md`} target="_blank" rel="noreferrer">
            User journey
          </a>
          {' · '}
          <a
            href={`${import.meta.env.BASE_URL}docs/conversation-flow.md`}
            target="_blank"
            rel="noreferrer"
          >
            Conversation flow
          </a>
          {' · '}
          <a href={`${import.meta.env.BASE_URL}docs/wireframes.md`} target="_blank" rel="noreferrer">
            Wireframes
          </a>
          {' · '}
          <a
            href={`${import.meta.env.BASE_URL}docs/usability-testing.md`}
            target="_blank"
            rel="noreferrer"
          >
            Usability testing
          </a>
          {' · '}
          <a
            href={`${import.meta.env.BASE_URL}docs/final-ux-report.md`}
            target="_blank"
            rel="noreferrer"
          >
            Final UX report
          </a>
        </p>
      </footer>

      <ConfirmModal
        open={engine.showConfirmModal && engine.phase === 'review'}
        draft={engine.draft}
        onConfirm={() => submitText('yes', 'chip')}
        onEdit={() => submitText('change', 'chip')}
        onClose={() =>
          setEngine((prev) => ({
            ...prev,
            showConfirmModal: false,
          }))
        }
      />
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="2" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="2" />
      <path
        d="M5 11a7 7 0 0 0 14 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M12 18v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
