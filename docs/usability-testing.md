# Usability testing plan & results template

## Purpose

Evaluate whether students and working adults can complete a TableTalk reservation with Ava using typing and (when available) voice, recover from mistakes, and understand system status.

## Participants

Recruit **at least 3** users matching the primary persona (students / working adults booking a meal).

| ID | Role | Device / browser | Voice available? |
|----|------|------------------|------------------|
| P1 | | Desktop Chrome/Edge | |
| P2 | | | |
| P3 | | | |

## Tasks

1. **Happy path (typed)** — Complete a reservation with valid details end-to-end.
2. **Missing info** — Give an incomplete answer once; continue when Ava follows up.
3. **Invalid / unavailable** — Try a past date or Friday 6:00 PM; recover using Ava’s suggestions.
4. **Correction** — Change seating or time from the summary without restarting.
5. **Voice** (if supported) — Answer at least one question by mic; if misheard, retry or type.
6. **Confirm** — Read the modal summary and confirm; note the confirmation code.

## Observation sheet

| Task | Completed? (Y/N) | Time | Errors / hesitations | Notes |
|------|------------------|------|----------------------|-------|
| 1 Happy path | | | | |
| 2 Missing info | | | | |
| 3 Invalid / unavailable | | | | |
| 4 Correction | | | | |
| 5 Voice | | | | |
| 6 Confirm | | | | |

### Post-task questions

- How clear was Ava’s status (waiting / listening / speaking)?
- Could you finish without voice?
- What was confusing or slow?
- What would you change?

## Findings section (fill after sessions)

| # | Finding | Severity | Evidence | Suggested change | Status |
|---|---------|----------|----------|------------------|--------|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |

## Example / synthetic findings (structure only — labeled)

> **Labeled as example structure — replace with live tester data when available.**

1. **Example:** One participant missed the mic button and assumed voice was required → *Severity: medium* → Emphasize typed composer and banner when STT unsupported → *Addressed in prototype with typed-first composer + fallback banner.*
2. **Example:** Friday 6:00 PM failure surprised a user until they read Ava’s alternatives → *Severity: low* → Keep suggestion chips after unavailable times → *Implemented.*
3. **Example:** Users liked editing from the summary instead of scrolling chat → *Severity: positive* → Keep Edit actions on each row → *Retained.*
