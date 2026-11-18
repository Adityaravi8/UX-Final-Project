# Conversation flow — Ava / TableTalk

## Overview

Controlled dialogue with session memory. Ava asks for missing fields only, supports corrections, and requires explicit confirmation.

```mermaid
flowchart TD
  Start([Greeting]) --> AskDate[Ask date]
  AskDate --> U1{User reply}
  U1 -->|Valid date| AskTime[Ask time]
  U1 -->|Invalid / past / far| ErrDate[Explain supported dates]
  ErrDate --> AskDate
  U1 -->|Incomplete| AskDate
  U1 -->|Multi-field e.g. tomorrow 7pm for 2 outdoor| FillMany[Fill parsed fields]
  FillMany --> NextMissing[Ask next missing field]

  AskTime --> U2{User reply}
  U2 -->|Available time| AskGuests[Ask guests]
  U2 -->|Unavailable / outside hours| ErrTime[Explain + suggest times]
  ErrTime --> AskTime

  AskGuests --> AskSeat[Ask seating]
  AskSeat --> AskName[Ask name]
  AskName --> AskContact[Ask phone or email]
  AskContact --> Review[Summary + confirm modal]

  NextMissing --> AskTime
  NextMissing --> AskGuests
  NextMissing --> AskSeat
  NextMissing --> AskName
  NextMissing --> AskContact
  NextMissing --> Review

  Review --> Conf{Confirm?}
  Conf -->|Yes| Done([Completed + code])
  Conf -->|No / edit| Correct[Pick field to change]
  Correct --> AskDate
  Correct --> AskTime
  Correct --> AskGuests
  Correct --> AskSeat
  Correct --> AskName
  Correct --> AskContact

  VoiceBad[Voice mishear / no-speech] --> Retry[Retry mic or type]
  Retry --> U1
  Retry --> U2

  Pause[Pause] --> Resume[Resume · same draft]
  Resume --> NextMissing
  Back[Go back] --> PrevField[Re-ask previous filled field]
  Restart[Restart] --> Start
```

## Dialogue elements (required)

| Element | Implementation |
|--------|----------------|
| Opening / greeting | Ava introduces TableTalk and the booking task |
| Main goal | Reserve a table |
| Questions | date, time, guests, seating, name, contact |
| Possible answers | Natural language + quick-choice chips |
| Follow-ups | Ask only missing / ambiguous fields |
| Invalid / incomplete / unexpected | Clear explanations + examples |
| Correction path | Summary Edit, “change …”, Go back |
| Final confirmation | Modal + spoken/visible summary |
| Completion | Confirmation code + completed status |

## Error / recovery cases (≥2)

1. **Invalid or past date** — Ava explains and re-asks.
2. **Unavailable time** (e.g. Friday 6:00 PM demo sell-out) — Ava explains and suggests alternatives.
3. **Incomplete answer** — Ava restates what is still needed.
4. **Voice recognition problem** — Banner + retry mic or type instead.
