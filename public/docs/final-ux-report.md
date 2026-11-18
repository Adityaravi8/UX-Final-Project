# TableTalk — Final UX Report

**Course:** SOFE4850 / User Experience Design  
**Product:** TableTalk with avatar Ava  
**Platform:** Desktop web prototype (React + TypeScript)  
**Scope note:** Simulated availability only; no real payments or restaurant API.

## 1. Design decisions

**Conversation over forms.** Ava guides a multi-step reservation (date, time, guests, seating, name, one contact) while a live summary keeps collected facts visible — supporting memory, correction, and confirmation without restarting.

**Dual input with text as equal citizen.** Browser SpeechRecognition and optional speechSynthesis are available, but every Ava reply is on-screen text, chips accelerate common answers, and unsupported browsers get a clear typed-only path.

**Status as a first-class signal.** Ava’s visible states (waiting, listening, processing, speaking, completed, plus paused) map to UX “visibility of system status,” reinforced by mic `aria-pressed`, interim transcripts, and a confirmation modal before commit.

**Privacy by minimization.** Only booking fields and one contact method are requested; the UI states that nothing is sent to a server in this prototype and that no payment data is collected.

**Visual direction.** Espresso atmosphere, champagne accent, moss secondary, Fraunces + Figtree — brand **TableTalk** leads the first viewport with Ava as the visual anchor (not a generic purple “AI” look).

## 2. Testing approach & results structure

We planned moderated desktop sessions with ≥3 students/working adults (see `usability-testing.md`). Tasks cover the six minimum conversation cases: normal completion, missing info, invalid answer, correction, voice problem, and final confirmation. Observation sheets capture completion, time, errors, and quotes; findings feed prioritized changes.

Synthetic example findings in the testing doc illustrate the reporting format for the course zip when live sessions are still pending; replace them with real evidence before Canvas submission.

## 3. Changes driven by evaluation thinking

- Unavailable-time recovery includes **suggested time chips**, not only an error sentence.
- **Edit** on each summary row enables correction without chat archaeology.
- Voice failures surface a **banner + “Type instead”** control rather than failing silently.
- Pause / go back / restart are explicit toolbar actions so control is discoverable.

## 4. Limitations

- Speech APIs vary by browser; Chrome/Edge on desktop are the reliable voice targets.
- Availability is **simulated** (including a deterministic Friday 6:00 PM sell-out for demos).
- Natural-language parsing covers common Canadian-English phrases, not full NLU.
- No real booking backend, accounts, or payments (per proposal).

## 5. Lessons learned

Strong conversational UX is less about model sophistication and more about **clear questions, visible memory, recoverable errors, and confirmation**. Offering voice without making it mandatory preserved accessibility. Keeping TableTalk’s brand and Ava dominant in the first viewport made the prototype feel like a product, not a chatbot demo bolted onto a form.

---

*Report length target: ≤5 pages when printed from Markdown.*
