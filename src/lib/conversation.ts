import {
  formatDisplayDate,
  formatDisplayTime,
  generateConfirmationCode,
  hasSeatingLeftToday,
  isTimeAvailable,
  isValidReservationDate,
  suggestTimes,
  todayLocal,
} from './availability';
import {
  FIELD_ORDER,
  nextMissingField,
  parseUserUtterance,
  seatingLabel,
} from './parser';
import type {
  BookingDraft,
  BookingField,
  ChatMessage,
  ConversationPhase,
  EngineResult,
  QuickChoice,
} from './types';

let msgCounter = 0;
function msg(role: ChatMessage['role'], text: string, source?: ChatMessage['source']): ChatMessage {
  msgCounter += 1;
  return {
    id: `m-${Date.now()}-${msgCounter}`,
    role,
    text,
    source,
    timestamp: Date.now(),
  };
}

const EDIT_CHOICES: QuickChoice[] = [
  { label: 'Date', value: 'change date' },
  { label: 'Time', value: 'change time' },
  { label: 'Guests', value: 'change guests' },
  { label: 'Seating', value: 'change seating' },
  { label: 'Name', value: 'change name' },
  { label: 'Contact', value: 'change contact' },
];

export function greetingMessage(): string {
  return "Hi, I'm Ava — your TableTalk host. I can reserve a table for you by voice or typing. I'll need a date, time, party size, seating preference, your name, and one contact (phone or email). What date works for you?";
}

export function fieldPrompt(field: BookingField): string {
  switch (field) {
    case 'date': {
      const example = todayLocal();
      example.setDate(example.getDate() + 14);
      const exampleText = example.toLocaleDateString('en-CA', { month: 'long', day: 'numeric' });
      return `What date would you like? You can say “tomorrow”, a weekday, or a date like ${exampleText}. We book up to 60 days ahead.`;
    }
    case 'time':
      return 'What time should I book? We seat on the half hour from 11:00 AM–1:30 PM and 5:00–9:30 PM.';
    case 'guests':
      return 'How many guests will be joining? We can seat parties of 1 to 12.';
    case 'seating':
      return 'Where would you like to sit — indoor, outdoor patio, bar, or window?';
    case 'name':
      return 'Whose name should I put on the reservation?';
    case 'contact':
      return 'How can the restaurant reach you — a phone number or an email address?';
  }
}

export function quickChoicesFor(field: BookingField | null, draft: BookingDraft): QuickChoice[] {
  if (!field) {
    return [
      { label: 'Confirm booking', value: 'yes' },
      { label: 'Edit details', value: 'change' },
    ];
  }
  switch (field) {
    case 'date':
      return dateChoices();
    case 'time': {
      const suggestions = draft.date
        ? suggestTimes(draft.date, draft.seating).map((t) => ({
            label: formatDisplayTime(t),
            value: t,
          }))
        : [
            { label: '6:00 PM', value: '18:00' },
            { label: '6:30 PM', value: '18:30' },
            { label: '7:00 PM', value: '19:00' },
            { label: '7:30 PM', value: '19:30' },
          ];
      return suggestions.slice(0, 4);
    }
    case 'guests':
      return [
        { label: '2 guests', value: '2' },
        { label: '3 guests', value: '3' },
        { label: '4 guests', value: '4' },
        { label: '6 guests', value: '6' },
      ];
    case 'seating':
      return [
        { label: 'Indoor', value: 'indoor' },
        { label: 'Outdoor', value: 'outdoor' },
        { label: 'Bar', value: 'bar' },
        { label: 'Window', value: 'window' },
      ];
    case 'name':
      return [];
    case 'contact':
      return [
        { label: 'Use email', value: 'I will type my email' },
        { label: 'Use phone', value: 'I will type my phone number' },
      ];
    default:
      return [];
  }
}

/** Next few bookable days, worked out from today's date so they never repeat or skip. */
function dateChoices(): QuickChoice[] {
  const today = todayLocal();
  const choices: QuickChoice[] = [];
  if (hasSeatingLeftToday()) choices.push({ label: 'Today', value: 'today' });
  choices.push({ label: 'Tomorrow', value: 'tomorrow' });
  for (let offset = 2; choices.length < 4; offset++) {
    const d = new Date(today);
    d.setDate(today.getDate() + offset);
    const weekday = d.toLocaleDateString('en-CA', { weekday: 'long' });
    const short = d.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
    // The weekday name resolves to this exact date because it is 2–5 days away.
    choices.push({ label: short, value: weekday });
  }
  return choices;
}

export function summarizeDraft(draft: BookingDraft): string {
  const parts: string[] = [];
  if (draft.date) parts.push(formatDisplayDate(draft.date));
  if (draft.time) parts.push(`at ${formatDisplayTime(draft.time)}`);
  if (draft.guests) parts.push(`for ${draft.guests} ${draft.guests === 1 ? 'guest' : 'guests'}`);
  if (draft.seating) parts.push(`(${seatingLabel(draft.seating)})`);
  if (draft.name) parts.push(`under ${draft.name}`);
  if (draft.contact) parts.push(`· contact ${draft.contact}`);
  return parts.join(' ');
}

export function confirmationPrompt(draft: BookingDraft): string {
  return `Please confirm: ${summarizeDraft(draft)}. Shall I finalize this reservation?`;
}

function acknowledgePatch(patch: Partial<BookingDraft>): string {
  const bits: string[] = [];
  if (patch.date) bits.push(`date ${formatDisplayDate(patch.date)}`);
  if (patch.time) bits.push(`time ${formatDisplayTime(patch.time)}`);
  if (patch.guests) bits.push(`${patch.guests} guests`);
  if (patch.seating) bits.push(seatingLabel(patch.seating));
  if (patch.name) bits.push(`name ${patch.name}`);
  if (patch.contact) bits.push(`contact ${patch.contact}`);
  if (bits.length === 0) return '';
  if (bits.length === 1) return `Got it — ${bits[0]}.`;
  return `Got it — ${bits.slice(0, -1).join(', ')} and ${bits[bits.length - 1]}.`;
}

function validateAndMerge(
  draft: BookingDraft,
  patch: Partial<BookingDraft>,
): { draft: BookingDraft; error?: string; suggestions?: string[] } {
  const next: BookingDraft = { ...draft, ...patch };

  if (patch.date) {
    const v = isValidReservationDate(patch.date);
    if (!v.ok) {
      return { draft, error: v.reason };
    }
  }

  if (patch.guests !== undefined) {
    if (patch.guests < 1 || patch.guests > 12 || !Number.isInteger(patch.guests)) {
      return { draft, error: 'We can seat parties of 1 to 12 guests. How many should I book for?' };
    }
  }

  const dateToCheck = next.date;
  const timeToCheck = patch.time ?? (patch.date || patch.seating ? next.time : undefined);
  if (timeToCheck && dateToCheck) {
    const avail = isTimeAvailable(dateToCheck, timeToCheck, next.seating);
    if (!avail.ok) {
      return { draft: { ...draft, ...patch, time: draft.time }, error: avail.reason, suggestions: avail.suggestions };
    }
  } else if (patch.time && !dateToCheck) {
    // Accept time tentatively; date validation happens later when date arrives
    next.time = patch.time;
  }

  // Re-check time if seating changed and we already have date+time
  if (patch.seating && next.date && next.time) {
    const avail = isTimeAvailable(next.date, next.time, next.seating);
    if (!avail.ok) {
      return {
        draft: { ...next, seating: draft.seating },
        error: avail.reason,
        suggestions: avail.suggestions,
      };
    }
  }

  return { draft: next };
}

export function createInitialEngine(): EngineResult {
  const reply = greetingMessage();
  return {
    messages: [msg('ava', reply)],
    draft: {},
    phase: 'collecting',
    currentField: 'date',
    quickChoices: quickChoicesFor('date', {}),
    avaReply: reply,
    showConfirmModal: false,
  };
}

export function processUserInput(
  state: EngineResult,
  text: string,
  source: ChatMessage['source'] = 'typed',
): EngineResult {
  const userMsg = msg('user', text, source);
  const baseMessages = [...state.messages, userMsg];

  const parsed = parseUserUtterance(text, state.currentField, state.draft);

  if (parsed.wantsRestart) {
    const fresh = createInitialEngine();
    return {
      ...fresh,
      messages: [...baseMessages, ...fresh.messages],
    };
  }

  if (parsed.wantsPause) {
    const reply = 'No problem — take your time. Tap Resume or say “continue” when you’re ready.';
    return {
      ...state,
      messages: [...baseMessages, msg('ava', reply)],
      phase: state.phase === 'completed' ? 'completed' : state.phase,
      avaReply: reply,
      quickChoices: [{ label: 'Resume', value: 'continue' }],
    };
  }

  if (parsed.wantsResume) {
    const field = state.currentField ?? nextMissingField(state.draft);
    const reply = field
      ? `Welcome back. ${fieldPrompt(field)}`
      : confirmationPrompt(state.draft);
    return {
      ...state,
      messages: [...baseMessages, msg('ava', reply)],
      phase: field ? 'collecting' : 'review',
      currentField: field,
      avaReply: reply,
      quickChoices: quickChoicesFor(field, state.draft),
      showConfirmModal: !field,
    };
  }

  if (parsed.wantsBack) {
    const filled = FIELD_ORDER.filter((f) => {
      if (f === 'contact') return Boolean(state.draft.contact);
      return state.draft[f] !== undefined && state.draft[f] !== '';
    });
    const target = filled.length > 0 ? filled[filled.length - 1] : 'date';
    const reply = `Sure — let’s revisit your ${target}. ${fieldPrompt(target)}`;
    return {
      ...state,
      messages: [...baseMessages, msg('ava', reply)],
      phase: 'collecting',
      currentField: target,
      avaReply: reply,
      quickChoices: quickChoicesFor(target, state.draft),
      showConfirmModal: false,
    };
  }

  // Handle chip helpers for contact
  if (/i will type my (email|phone)/i.test(text)) {
    const reply = /email/i.test(text)
      ? 'Great — type your email address when you’re ready.'
      : 'Great — type your phone number when you’re ready.';
    return {
      ...state,
      messages: [...baseMessages, msg('ava', reply)],
      currentField: 'contact',
      phase: 'collecting',
      avaReply: reply,
      quickChoices: [],
    };
  }

  // A lone number while reviewing could mean guests or a time — ask instead of guessing.
  const loneNumber = text.trim().match(/^(\d{1,2})$/);
  if (loneNumber && state.currentField === null && nextMissingField(state.draft) === null) {
    const num = Number(loneNumber[1]);
    const choices: QuickChoice[] = [];
    if (num >= 1 && num <= 12) choices.push({ label: `${num} guests`, value: `${num} people` });
    const hour = num >= 1 && num <= 9 ? num + 12 : num;
    if (hour >= 11 && hour <= 21) {
      const hhmm = `${String(hour).padStart(2, '0')}:00`;
      choices.push({ label: formatDisplayTime(hhmm), value: hhmm });
    }
    const reply =
      choices.length > 0
        ? `Did you mean ${choices.map((c) => c.label).join(' or ')}? Tap one below, or say “${num} people” or “${num} PM”.`
        : `I’m not sure what “${num}” should change. Pick a detail below, or say something like “4 people” or “7:30 PM”.`;
    return {
      ...state,
      messages: [...baseMessages, msg('ava', reply)],
      phase: 'review',
      currentField: null,
      avaReply: reply,
      quickChoices: choices.length > 0 ? choices : EDIT_CHOICES,
      showConfirmModal: false,
    };
  }

  // Correction path
  const reviewing = state.phase === 'review' || state.showConfirmModal || nextMissingField(state.draft) === null;
  if (parsed.wantsCorrection && !parsed.correctionField && Object.keys(parsed.draftPatch).length === 0 && reviewing) {
    const reply =
      'Sure — what would you like to change? Pick a detail below, or just tell me the new value (for example “4 people” or “7:30 PM”).';
    return {
      ...state,
      messages: [...baseMessages, msg('ava', reply)],
      phase: 'review',
      currentField: null,
      avaReply: reply,
      quickChoices: EDIT_CHOICES,
      showConfirmModal: false,
    };
  }

  if (parsed.wantsCorrection && Object.keys(parsed.draftPatch).length === 0) {
    const field = parsed.correctionField ?? state.currentField ?? 'date';
    const reply = `Of course. ${fieldPrompt(field)}`;
    return {
      ...state,
      messages: [...baseMessages, msg('ava', reply)],
      phase: 'collecting',
      currentField: field,
      avaReply: reply,
      quickChoices: quickChoicesFor(field, state.draft),
      showConfirmModal: false,
    };
  }

  // Review / confirm phase
  if (state.phase === 'review' || state.phase === 'confirming' || state.showConfirmModal) {
    // A reply that carries new details ("actually make it 4 people") is applied below
    // as an update, instead of being treated as a plain yes/no.
    const hasNewDetails = Object.keys(parsed.draftPatch).length > 0;
    if (parsed.wantsConfirm && !hasNewDetails) {
      const code = generateConfirmationCode();
      const reply = `You’re all set. Your table is reserved — confirmation ${code}. We collected only your booking details and contact for this reservation; nothing is stored on a server in this prototype. Enjoy your meal!`;
      return {
        ...state,
        messages: [...baseMessages, msg('ava', reply)],
        phase: 'completed',
        currentField: null,
        avaReply: reply,
        quickChoices: [
          { label: 'Book another', value: 'restart' },
        ],
        showConfirmModal: false,
        confirmationCode: code,
      };
    }
    if ((parsed.wantsDeny || parsed.wantsCorrection) && !hasNewDetails) {
      const reply =
        'No problem — what would you like to change? Pick a detail below, or just tell me the new value (for example “4 people” or “7:30 PM”).';
      return {
        ...state,
        messages: [...baseMessages, msg('ava', reply)],
        phase: 'review',
        currentField: null,
        avaReply: reply,
        quickChoices: EDIT_CHOICES,
        showConfirmModal: false,
      };
    }
  }

  if (parsed.incomplete) {
    const field = state.currentField ?? nextMissingField(state.draft) ?? 'date';
    const reply = `I still need a bit more. ${fieldPrompt(field)}`;
    return {
      ...state,
      messages: [...baseMessages, msg('ava', reply)],
      phase: 'collecting',
      currentField: field,
      avaReply: reply,
      quickChoices: quickChoicesFor(field, state.draft),
    };
  }

  if (parsed.invalidReason && Object.keys(parsed.draftPatch).length === 0) {
    const field = state.currentField ?? nextMissingField(state.draft);
    const reply = parsed.invalidReason;
    return {
      ...state,
      messages: [...baseMessages, msg('ava', reply)],
      phase: 'collecting',
      currentField: field,
      avaReply: reply,
      quickChoices: quickChoicesFor(field, state.draft),
    };
  }

  if (parsed.unrecognized) {
    const field = state.currentField ?? nextMissingField(state.draft);
    const reply = field
      ? `I didn’t quite catch that. ${fieldPrompt(field)} You can also use the quick choices below, or type your answer.`
      : `I didn’t catch that. ${confirmationPrompt(state.draft)}`;
    return {
      ...state,
      messages: [...baseMessages, msg('ava', reply)],
      phase: field ? 'collecting' : 'review',
      currentField: field,
      avaReply: reply,
      quickChoices: quickChoicesFor(field, state.draft),
      showConfirmModal: !field,
    };
  }

  // Apply patch with validation
  const { draft: merged, error, suggestions } = validateAndMerge(state.draft, parsed.draftPatch);
  if (error) {
    const field: BookingField =
      parsed.draftPatch.time || suggestions
        ? 'time'
        : parsed.draftPatch.date
          ? 'date'
          : parsed.draftPatch.guests !== undefined
            ? 'guests'
            : parsed.draftPatch.seating
              ? 'seating'
              : (state.currentField ?? 'date');
    let reply = error;
    if (suggestions && suggestions.length > 0) {
      reply += ` Available options include ${suggestions.map(formatDisplayTime).join(', ')}.`;
    }
    return {
      ...state,
      draft: merged,
      messages: [...baseMessages, msg('ava', reply)],
      phase: 'collecting',
      currentField: field,
      avaReply: reply,
      // Offer the same alternative times Ava just suggested, not the day's first slots.
      quickChoices:
        field === 'time' && suggestions && suggestions.length > 0
          ? suggestions.slice(0, 4).map((t) => ({ label: formatDisplayTime(t), value: t }))
          : quickChoicesFor(field, merged),
      showConfirmModal: false,
    };
  }

  // If correcting with new values while in review
  const ack = acknowledgePatch(parsed.draftPatch);
  const missing = nextMissingField(merged);

  if (!missing) {
    const reply = `${ack} ${confirmationPrompt(merged)}`.trim();
    return {
      ...state,
      draft: merged,
      messages: [...baseMessages, msg('ava', reply)],
      phase: 'review',
      currentField: null,
      avaReply: reply,
      quickChoices: quickChoicesFor(null, merged),
      showConfirmModal: true,
    };
  }

  // Ask only for missing fields
  const reply = `${ack} ${fieldPrompt(missing)}`.trim();
  return {
    ...state,
    draft: merged,
    messages: [...baseMessages, msg('ava', reply)],
    phase: 'collecting' as ConversationPhase,
    currentField: missing,
    avaReply: reply,
    quickChoices: quickChoicesFor(missing, merged),
    showConfirmModal: false,
  };
}

export function applyDraftEdit(
  state: EngineResult,
  field: BookingField,
  value: string,
): EngineResult {
  const parsed = parseUserUtterance(value, field, state.draft);
  // Force field-focused patch
  let patch = parsed.draftPatch;
  if (field === 'name' && !patch.name && value.trim()) {
    patch = { name: value.trim().replace(/\b\w/g, (c) => c.toUpperCase()) };
  }
  const { draft: merged, error, suggestions } = validateAndMerge(state.draft, patch);
  if (error) {
    let reply = error;
    if (suggestions?.length) {
      reply += ` Try ${suggestions.map(formatDisplayTime).join(', ')}.`;
    }
    return {
      ...state,
      messages: [...state.messages, msg('ava', reply)],
      avaReply: reply,
      currentField: field,
      phase: 'collecting',
      quickChoices: quickChoicesFor(field, state.draft),
      showConfirmModal: false,
    };
  }

  const missing = nextMissingField(merged);
  if (!missing) {
    const reply = `Updated. ${confirmationPrompt(merged)}`;
    return {
      ...state,
      draft: merged,
      messages: [...state.messages, msg('ava', reply)],
      phase: 'review',
      currentField: null,
      avaReply: reply,
      quickChoices: quickChoicesFor(null, merged),
      showConfirmModal: true,
    };
  }
  const reply = `Updated. ${fieldPrompt(missing)}`;
  return {
    ...state,
    draft: merged,
    messages: [...state.messages, msg('ava', reply)],
    phase: 'collecting',
    currentField: missing,
    avaReply: reply,
    quickChoices: quickChoicesFor(missing, merged),
    showConfirmModal: false,
  };
}
