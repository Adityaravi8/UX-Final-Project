# TableTalk

Restaurant reservation prototype with conversational avatar **Ava** (SOFE4850 / Group 16 proposal).

Desktop-first React + TypeScript app. Simulated availability only — no real payments or booking API.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL Vite prints (typically `http://localhost:5173/`).

```bash
npm run build    # production build + typecheck
npm run preview  # serve the build
```

## Demo tips

### Typed happy path

1. Answer Ava’s prompts (or use quick-choice chips): date → time → guests → seating → name → phone or email.
2. Review the booking summary; confirm in the modal.
3. Note the confirmation code and Ava’s **Completed** status.

Try a multi-field line early: `tomorrow at 7 for 2 outdoor`.

### Voice (Chrome / Edge recommended)

1. Allow the microphone when prompted.
2. Tap the mic, speak, watch the interim “Hearing…” transcript and the final user bubble.
3. Toggle **Ava speaks** for optional TTS; replies always appear as text.
4. If recognition fails, use **Type instead** — the full task remains completable without voice.

If SpeechRecognition is unsupported, a banner explains the typed-only fallback.

### Error / recovery demos

- Past date → Ava rejects and re-asks.
- **Friday at 6:00 PM** → simulated full booking + alternative times.
- Incomplete reply → Ava asks for what is missing.
- **Edit** on the summary (or say “change time”) → update without restart.
- **Pause / Go back / Restart** in the toolbar.

## Platform & privacy

- **Target platform: desktop** (stated in the UI hero/footer). Responsive enough for laptop usability tests.
- Collects only reservation details + one contact for the session. No payment or ID. Prototype does not persist answers on a server.

## Minimum conversation test cases

| # | Case | How to demonstrate |
|---|------|--------------------|
| 1 | Normal completion | Valid answers via type or chips → confirm |
| 2 | Missing information | Reply with only “Saturday” → Ava asks for time, etc. |
| 3 | Invalid answer | Past date or unsupported seating wording → Ava explains choices |
| 4 | Correction | Summary **Edit** or “change seating” mid-flow |
| 5 | Voice recognition problem | Deny mic / no-speech → banner + type retry |
| 6 | Final confirmation | Modal summary before finalize |

## Documentation

| Deliverable | Path |
|-------------|------|
| Persona | [docs/persona.md](docs/persona.md) |
| User journey / task flow | [docs/user-journey.md](docs/user-journey.md) |
| Conversation flow | [docs/conversation-flow.md](docs/conversation-flow.md) |
| Wireframes | [docs/wireframes.md](docs/wireframes.md) |
| Usability testing plan | [docs/usability-testing.md](docs/usability-testing.md) |
| Final UX report | [docs/final-ux-report.md](docs/final-ux-report.md) |

Proposal topic is TableTalk (restaurant reservation with Ava) — unchanged from the submitted proposal.
