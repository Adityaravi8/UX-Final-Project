# TableTalk — Final Presentation Script

**Course:** SOFE4850 · **Length:** 5–10 min (this script runs about **8½ min**, leaving room for questions)
**Graded on:** a demo of the website plus an explanation of the design (14 marks). The demo should hit every rubric category.

Speakers are labelled **A–D**. Assign names before the day; with three people, merge C and D.

> **How to read this:** *Italics* = what you do on screen. Normal text = what you say. The **[Rubric]** tags show which marking category each part covers, so you can point at them if asked.

---

## Before you present (checklist)

- [ ] Laptop on **Chrome or Edge**, run `npm run dev`, open `http://localhost:5173/`, zoom to 110–125% so the room can read it.
- [ ] Allow the **microphone** once beforehand so the permission pop-up doesn't appear mid-demo.
- [ ] Laptop volume up, and **Ava speaks** ticked. Test one spoken reply.
- [ ] Refresh the page right before starting so the conversation is empty.
- [ ] Have the docs open in other tabs: `docs/persona.md`, `docs/conversation-flow.md` (shows the flowchart), `docs/wireframes.md`, `docs/usability-testing.md`.
- [ ] **Date check:** the demo says "Friday" because Friday 6:00 PM is the built-in "fully booked" slot.
  - Presenting **Mon Nov 30**: "Friday" = Dec 4. ✅
  - Presenting **Fri Dec 4 after 5:30 PM**: say **"next Friday"** instead, because 6:00 PM today will have passed.
- [ ] Quiet room? Voice works best when the speaker is close to the laptop mic.

---

## 1. Opening — the problem and who it's for · ~1:00 · Speaker A
**[Rubric: UX research & user understanding — 10]**

> Hi, we're Group 16, and this is **TableTalk**: a restaurant reservation website with a conversational avatar named **Ava**.
>
> Online booking forms are long, and they're easy to abandon halfway through, especially when the time you want turns out to be unavailable at the very end. We wanted booking a table to feel like telling a host what you want.
>
> *(Show `persona.md`.)* Our primary user is **Maya**, a 24-year-old grad student. She books dinners for study groups and weekend catch-ups, mostly on her laptop. She uses voice at home with headphones but prefers typing in the library. Her biggest frustrations are losing progress and not being able to fix one detail without starting over.
>
> So our goal was: Maya can book a table by **voice or typing**, **fix mistakes without restarting**, and **see exactly what she's agreeing to** before it's final. We designed for desktop, and the site says so in the header and footer.

---

## 2. Design process · ~1:00 · Speaker B
**[Rubric: Task & conversation flow — 15 · Avatar/interface design — 10]**

> *(Show the flowchart in `conversation-flow.md`.)* Before building anything, we mapped the conversation. Ava needs six things: **date, time, number of guests, seating, name, and one contact**. Each question has branches for an **invalid** answer, an **incomplete** answer, an **unavailable** time, and a **correction**, and everything ends in an explicit **confirmation**.
>
> One key decision: Ava **only asks for what's missing**. If you say "Friday at 6 for 4," she fills in three fields at once and skips ahead.
>
> *(Switch to the live site and point at each area.)* The layout follows our wireframes, in three columns:
> - **Left:** Ava herself, with her **status**: waiting, listening, processing, speaking, or completed. That's our answer to "How does the user know the avatar is listening?"
> - **Middle:** the conversation, quick-choice buttons, and the input box with the mic.
> - **Right:** a live **booking summary**. Every detail Ava has understood shows up here, with an Edit button. That's our answer to "How does the user know what the system understood?"

---

## 3. Live demo · ~4:00 · Speaker C drives, Speaker B narrates

The demo covers all six required test cases. Keep it moving. If something unexpected happens, narrate it: recovery is part of what we're showing.

### 3a. Greeting + voice, two details at once · ~0:45
**[Rubric: Voice interaction — 15 · Test case: normal completion begins]**

> *(Refresh.)* Ava greets you, explains what she can do, and lists exactly what she'll need. That covers **privacy awareness**: you know up front what's being collected.
>
> *(Tap the mic **once**.)* Voice is **hands-free**: one tap, and Ava listens again after every reply, so you never have to click the mic again. You can see the gold mic and the note under the input box.

🎤 **Say:** "Friday at 6 for 4 people."

> While I talk, it shows "Hearing…" with what it's picking up, so you can see what the system heard. Ava also **reads every reply aloud** and shows it as text.

### 3b. Unavailable time → recovery · ~0:30
**[Rubric: Error handling — 10 · Test case: invalid answer]**

> Ava understood all three details, but Friday at 6 is fully booked. Instead of a dead end, she **explains why and offers alternatives**, and the buttons under the chat match what she suggested. The date and the 4 guests are kept, so nothing is lost.

🎤 **Say:** "6:30."

### 3c. Unsupported answer → Ava explains the choices · ~0:20
**[Test case: invalid answer]**

🎤 **Say:** "Rooftop."

> We don't have rooftop seating, so Ava **lists the options we do have**, and the buttons make the valid choices obvious. That's **error prevention**.

🎤 **Say:** "Outdoor patio." · then the name: "Maya Chen."

### 3d. Voice recognition problem → type instead · ~0:40
**[Rubric: Voice interaction — recognition recovery + text alternative · Test case: voice recognition problem]**

> Phone numbers are where speech recognition usually goes wrong, so let's show what happens.

🎤 **Mumble or say something unclear**, e.g. "uh, the usual."

> If Ava can't understand, she says so and asks again. She doesn't guess. Now I'll show the **text alternative**: you can type at any time, even while hands-free is on.

⌨️ *Type a number that's one digit short:* `416-555-123` → Enter

> She checks the format: "That phone number has 9 digits — it should have 10." That's validation.

⌨️ *Type:* `416-555-0123` → Enter

> So the whole task can be done **without speaking at all**. Voice is an option, not a requirement. That's our accessibility point.

### 3e. Final confirmation + correction without restarting · ~0:50
**[Test cases: final confirmation · correction · Rubric: Usability / user control — 15]**

> Now that Ava has everything, she reads back a **full summary** and opens a confirmation window. Nothing is booked until the user says yes.
>
> Say Maya realizes another friend is coming. Instead of starting over:

🎤 **Say:** "Actually, make it 5 people."
*(If voice is off by this point, click **Edit details**, then the **Guests** button, then type 5.)*

> Ava updates **only the guest count**, and the summary on the right **flashes "Updated"** on that row so you can see exactly what changed. Everything else is kept. That's error recovery without restarting.

🎤 **Say:** "Yes."

> Confirmed, with a **confirmation code**. Ava's status switches to *Completed*, and hands-free turns itself off.

### 3f. User controls · ~0:30 (skip if short on time)
**[Rubric: Usability — user control]**

> *(Click **Restart**, type "Saturday", then click **Pause**, then **Resume**, then **Go back**.)* The user can **pause** and come back with their answers saved, **go back** a step, or **restart**. Every detail in the summary also has its own **Edit** button. We wanted the user to always feel in control.

---

## 4. Usability testing · ~1:15 · Speaker D
**[Rubric: Usability testing — 10]**

> ⚠️ **Fill this section in with your real sessions before presenting.** Graders specifically look for real evidence. Don't present the example findings in `usability-testing.md` as real.

> We tested with **[N] participants** matching our persona: *[e.g. 2 students and 1 working adult]*, on desktop Chrome. Each did six tasks: a normal booking, a missing-info answer, an invalid or unavailable answer, a correction, a voice task, and confirming.
>
> Results: *[e.g. "All 3 completed the booking. Average time was X minutes. Y of 3 used voice."]*
>
> Main problems we found, and what we changed:
> 1. *[Problem]* → *[Change]*
> 2. *[Problem]* → *[Change]*
> 3. *[Problem]* → *[Change]*

**Real improvements you can cite** if they came out of testing or team review (they're all in the repo history):
- Typing just a number like "4" for guests used to be **read as 4 PM** → now it's understood from context, and an ambiguous number makes Ava ask "4 guests or 4:00 PM?"
- Saying "actually make it 4 people" used to need two steps → now it applies in one.
- Users had to **press the mic before every answer** → added **hands-free** mode.
- Changes in the summary were easy to miss → rows now **flash "Updated."**
- Long or short phone numbers were **silently cut down to 10 digits** → now Ava rejects them and says how many digits there should be.
- Date buttons were fixed day names, so on a Saturday "Saturday" meant today → buttons are now worked out from the current date, and times that have already passed today are rejected.

---

## 5. Wrap-up · ~0:45 · Speaker A
**[Rubric: Final presentation & documentation — 5]**

> **Limitations:** voice works best in Chrome and Edge; restaurant availability is simulated, with no real booking backend or payments; and Ava understands common phrasings, not unlimited natural language.
>
> **What we learned:** a good conversational interface isn't about the smartest AI. What matters is **clear questions, visible memory, mistakes that are easy to recover from, and confirming before committing**. Making voice optional, not required, made the experience better for everyone.
>
> Everything is in our repo: the source code, the persona, the journey, the conversation flow, the wireframes, and the testing notes. Thanks! We're happy to take questions.

---

## Likely questions (from the project's "Important Design Questions")

| Question | Answer |
|---|---|
| What does Ava know at each point? | Everything in the booking summary panel; it's her memory, shown on screen. |
| What if the user doesn't answer? | Silence in hands-free mode: she keeps listening for two turns, then stops and says to tap the mic or type. An answer she can't use gets a short explanation of what she needs, the question again, and quick-choice buttons. |
| Two pieces of info at once? | All of them are captured ("Friday at 6 for 4" fills three fields), then she asks only for what's missing. |
| User changes their mind? | Say "change time" or "actually 7:30", or use the Edit button on any summary row. Other answers are kept. |
| How do they know she's listening? | The status label on Ava, the pulsing mic, the hands-free note, and the live "Hearing…" transcript. |
| Can you finish without speaking? | Yes. Typing and the buttons cover the whole task, and the site says so if the browser can't do voice. |
| What gets confirmed? | All six details, in a confirmation window that needs an explicit yes. |
| What would make it frustrating? | Losing progress, being misheard with no way to fix it, or forced voice. We designed against all three. |

---

## Backup plan if something breaks live

| Problem | What to do and say |
|---|---|
| Mic doesn't work / no permission | "This is exactly our voice-problem case." Show the warning and the **Type instead** option, and finish by typing. |
| Ava mishears | Narrate it as the recognition-recovery demo: say it again or type it. |
| No sound | Untick **Ava speaks**. Every reply is on screen anyway, which is our text-alternative point. |
| Friday 6 PM isn't blocked (wrong date) | Use any time: say "3 AM" to show the outside-hours message and suggested times instead. |
| Site won't load | Run `npm run dev` again. As a last resort, present from screenshots. |
