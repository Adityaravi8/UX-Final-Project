# Wireframes — main states (hi-fi equivalents)

TableTalk ships as a working desktop prototype. The screens below are the **hi-fi wireframe equivalents** of the required states. Capture screenshots from `npm run dev` for the course zip if needed.

## Layout (all states)

```
┌─────────────────────────────────────────────────────────────┐
│  TableTalk  (hero brand)                                    │
│  short tagline                                              │
├──────────────┬────────────────────────────┬─────────────────┤
│  Ava avatar  │  Conversation transcript   │ Booking summary │
│  status      │  quick chips               │ editable rows   │
│  Pause/Back  │  [ text input ] [mic][Send]│ privacy note    │
└──────────────┴────────────────────────────┴─────────────────┘
│  Desktop target · docs links                                │
└─────────────────────────────────────────────────────────────┘
```

## State 1 — Waiting (ready for input)

- Ava status label: **Waiting**
- Soft idle eye blink
- Composer focused / ready; chips for the current question

## State 2 — Listening (voice)

- Mic button pressed (`aria-pressed=true`)
- Ava ring pulses; waveform bars animate
- Interim transcript: “Hearing: …”
- Ava’s prior reply remains visible as text

## State 3 — Processing

- Brief processing status after submit / final transcript
- Dashed ring rotation on Ava
- Prevents double-submit confusion via status visibility

## State 4 — Speaking / feedback

- TTS optional (“Ava speaks” toggle)
- Mouth motion while speaking
- Full reply always in the chat log (text alternative)

## State 5 — Confirmation

- Modal: summary sentence + **Confirm booking** / **Edit details**
- Summary panel still editable underneath
- No finalize without explicit confirm

## State 6 — Completed

- Ava status: **Completed**
- Success band with confirmation code
- Restart / “book another” available

## Notes for course reviewers

- Platform target called out in hero eyebrow and footer: **desktop**.
- No Lorem ipsum; realistic restaurant-reservation copy only.
- Cards are limited to interactive surfaces (chat, summary, modal).
