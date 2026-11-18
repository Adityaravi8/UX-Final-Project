# User journey / task flow — Complete a reservation

## Goal

Book a restaurant table with Ava using voice and/or typed text, then confirm.

```mermaid
flowchart TD
  A[Land on TableTalk desktop page] --> B[See brand + Ava greeting]
  B --> C{Choose input}
  C -->|Type| D[Type answers in composer]
  C -->|Voice| E[Tap mic · speak · see transcript]
  C -->|Chips| F[Tap quick choices]
  D --> G[Ava updates booking summary]
  E --> G
  F --> G
  G --> H{All fields present?}
  H -->|No| I[Ava asks only for missing field]
  I --> C
  H -->|Yes| J[Editable summary + confirmation modal]
  J --> K{User confirms?}
  K -->|Edit / No| L[Change field without full restart]
  L --> C
  K -->|Yes| M[Success · confirmation code · Ava completed]
```

## Step-by-step

1. **Start** — User opens the site; TableTalk branding and Ava are the first viewport.
2. **Orient** — Ava greets, explains she books tables, and lists what she needs.
3. **Collect** — Date → time → guests → seating → name → one contact (phone or email). Multi-field utterances are accepted when parseable.
4. **Recover** — Invalid date, unavailable time, incomplete answer, or voice error → clear recovery without wiping the session.
5. **Control** — Pause, go back, edit summary rows, switch mic ↔ keyboard, or restart deliberately.
6. **Confirm** — Modal + spoken/visible summary; user must confirm before finalize.
7. **Complete** — Confirmation code; status **Completed**; option to book another.

## Success criteria for the journey

- Task completable by keyboard alone.
- Voice path available where SpeechRecognition is supported; graceful typed fallback otherwise.
- No payment or unnecessary sensitive data requested.
