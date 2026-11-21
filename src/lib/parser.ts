import { toIsoDate, todayLocal } from './availability';
import type { BookingDraft, BookingField, ParseResult, SeatingPreference } from './types';

const DAY_NAMES = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

const WORD_NUMBERS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[.,!?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseDateFromText(text: string): string | undefined {
  const n = normalize(text);
  const today = todayLocal();

  if (/\btoday\b/.test(n) || /\btonight\b/.test(n)) {
    return toIsoDate(today);
  }
  if (/\btomorrow\b/.test(n)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return toIsoDate(d);
  }

  const iso = n.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) {
    return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
  }

  const slash = n.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](20\d{2}))?\b/);
  if (slash) {
    const month = Number(slash[1]);
    const day = Number(slash[2]);
    let year = slash[3] ? Number(slash[3]) : today.getFullYear();
    if (!slash[3]) {
      const candidate = new Date(year, month - 1, day);
      if (candidate < today) year += 1;
    }
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  const monthDay = n.match(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,?\s*(20\d{2}))?\b/,
  );
  if (monthDay) {
    const months: Record<string, number> = {
      january: 0,
      february: 1,
      march: 2,
      april: 3,
      may: 4,
      june: 5,
      july: 6,
      august: 7,
      september: 8,
      october: 9,
      november: 10,
      december: 11,
    };
    const month = months[monthDay[1]];
    const day = Number(monthDay[2]);
    let year = monthDay[3] ? Number(monthDay[3]) : today.getFullYear();
    let d = new Date(year, month, day);
    if (!monthDay[3] && d < today) {
      year += 1;
      d = new Date(year, month, day);
    }
    return toIsoDate(d);
  }

  for (let i = 0; i < DAY_NAMES.length; i++) {
    const name = DAY_NAMES[i];
    if (new RegExp(`\\b(next\\s+)?${name}\\b`).test(n)) {
      const wantNext = /\bnext\s+/.test(n);
      const d = new Date(today);
      const diff = (i - d.getDay() + 7) % 7;
      let add = diff === 0 ? (wantNext ? 7 : 0) : diff;
      if (wantNext && diff !== 0) add += 7;
      if (!wantNext && diff === 0) {
        // "Friday" on Friday → today
      }
      d.setDate(d.getDate() + add);
      return toIsoDate(d);
    }
  }

  return undefined;
}

const NUM_WORD = '(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)';

/** Speech-to-text often returns "seven thirty p.m." or "half past seven" — turn those into digits. */
function normalizeTimeWords(n: string): string {
  return n
    .replace(/\b([ap]) m\b/g, '$1m')
    .replace(new RegExp(`\\bhalf past ${NUM_WORD}\\b`, 'g'), (_, w: string) => `${WORD_NUMBERS[w]}:30`)
    .replace(new RegExp(`\\b${NUM_WORD} thirty\\b`, 'g'), (_, w: string) => `${WORD_NUMBERS[w]}:30`)
    .replace(new RegExp(`\\b${NUM_WORD} o'?clock\\b`, 'g'), (_, w: string) => `${WORD_NUMBERS[w]} oclock`)
    .replace(new RegExp(`\\b${NUM_WORD}(?= ?[ap]m\\b)`, 'g'), (w: string) => String(WORD_NUMBERS[w]))
    .replace(new RegExp(`\\bat ${NUM_WORD}\\b`, 'g'), (_, w: string) => `at ${WORD_NUMBERS[w]}`);
}

/** Remove date expressions so their numbers are not mistaken for hours. */
function stripDates(n: string): string {
  return n
    .replace(/\b20\d{2}-\d{1,2}-\d{1,2}\b/g, ' ')
    .replace(/\b\d{1,2}[/-]\d{1,2}(?:[/-]20\d{2})?\b/g, ' ')
    .replace(
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,?\s*20\d{2})?\b/g,
      ' ',
    );
}

function hhmm(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function parseTimeFromText(text: string, currentField: BookingField | null): string | undefined {
  const n = normalizeTimeWords(stripDates(normalize(text)));

  const ampm = n.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  if (ampm) {
    let h = Number(ampm[1]);
    const m = ampm[2] ? Number(ampm[2]) : 0;
    if (ampm[3] === 'pm' && h < 12) h += 12;
    if (ampm[3] === 'am' && h === 12) h = 0;
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return hhmm(h, m);
  }

  const clock = n.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (clock) {
    let h = Number(clock[1]);
    // No am/pm: single-digit hours mean evening for a dinner booking ("6:30" → 6:30 PM)
    if (h >= 1 && h <= 9) h += 12;
    return hhmm(h, Number(clock[2]));
  }

  // A bare number is a guest count when Ava asked for guests, or when it reads like one
  // ("for 4", "4 people"). Only "at 7" / "7 o'clock" count as a time there.
  const explicitHour =
    n.match(/\bat\s+(\d{1,2})\b(?!\s*(?:people|ppl|pax|persons?|guests?|diners|of us))/) ||
    n.match(/\b(\d{1,2})\s*oclock\b/);
  const looseHour =
    currentField === 'guests' || currentField === 'contact' || currentField === 'name'
      ? null
      : n.match(/(?<!\b(?:for|of|party of|table for)\s)\b(\d{1,2})\b(?!\s*(?:people|ppl|pax|persons?|guests?|diners|of us))/);
  const bareHour = explicitHour ?? looseHour;
  if (bareHour) {
    let h = Number(bareHour[1]);
    if (h >= 1 && h <= 11) h += 12; // assume evening
    if (h >= 11 && h <= 22) return hhmm(h, 0);
  }

  if (/\bnoon\b/.test(n) || /\bmidday\b/.test(n)) return '12:00';
  if (/\bmidnight\b/.test(n)) return '00:00';

  return undefined;
}

function parseGuests(text: string): number | undefined {
  const n = normalize(text);
  const toNum = (raw: string) => WORD_NUMBERS[raw] ?? Number(raw);

  const party = n.match(new RegExp(`\\b(?:party of|table for|for)\\s+(\\d{1,2}|${NUM_WORD.slice(1, -1)})\\b(?!:)`));
  if (party) {
    const num = toNum(party[1]);
    if (num >= 1 && num <= 12) return num;
  }

  // Numbers only count as guests with a guest word ("4 people"); a lone number is
  // handled by the guests-field check in parseUserUtterance.
  const people = n.match(
    new RegExp(`\\b(\\d{1,2}|${NUM_WORD.slice(1, -1)})\\s*(?:people|ppl|pax|persons?|guests?|diners|of us)\\b`),
  );
  if (people) {
    const num = toNum(people[1]);
    if (num >= 1 && num <= 12) return num;
  }

  return undefined;
}

function parseSeating(text: string): SeatingPreference | undefined {
  const n = normalize(text);
  if (/\b(outdoor|patio|outside|terrace)\b/.test(n)) return 'outdoor';
  if (/\b(bar|counter)\b/.test(n)) return 'bar';
  if (/\b(window|windowside|by the window)\b/.test(n)) return 'window';
  if (/\b(indoor|inside|dining room|main room)\b/.test(n)) return 'indoor';
  return undefined;
}

function parseName(text: string, currentField: BookingField | null): string | undefined {
  const n = text.trim();
  const labeled = n.match(/^(?:my name is|i am|i'm|this is)\s+(.+)$/i);
  if (labeled) return cleanName(labeled[1]);
  if (currentField === 'name') {
    // Reject obvious non-names
    if (
      /@|\d{3}/.test(n) ||
      /\b(tomorrow|today|tonight|outdoor|indoor|patio|people|guests|bar|window)\b/i.test(n) ||
      /\b(\d{1,2}\s*(a\.?m\.?|p\.?m\.?))\b/i.test(n)
    ) {
      return undefined;
    }
    if (n.split(/\s+/).length <= 4 && n.length >= 2) return cleanName(n);
  }
  return undefined;
}

function cleanName(s: string): string {
  return s
    .replace(/[^\p{L}\s'-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function parseContact(text: string): { contact: string; contactType: 'phone' | 'email' } | undefined {
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (email) {
    return { contact: email[0], contactType: 'email' };
  }
  // A run of digits with the usual separators. It must be exactly 10 digits
  // (or 11 with a leading 1), so longer or shorter numbers are not silently cut.
  const run = text.match(/\+?\d[\d\s().-]{5,}\d/);
  if (run) {
    let digits = run[0].replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
    if (digits.length === 10) {
      return {
        contact: `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`,
        contactType: 'phone',
      };
    }
  }
  return undefined;
}

function detectCorrection(text: string): { field?: BookingField; wantsCorrection: boolean } {
  const n = normalize(text);
  if (
    /\b(change|edit|update|correct|fix|actually|instead|go back|previous)\b/.test(n) ||
    /\b(wrong|mistake)\b/.test(n)
  ) {
    const fields: { key: BookingField; re: RegExp }[] = [
      { key: 'date', re: /\b(dates?|days?)\b/ },
      { key: 'time', re: /\b(times?|hours?)\b/ },
      { key: 'guests', re: /\b(guests?|people|ppl|party|party size|size|headcount)\b/ },
      { key: 'seating', re: /\b(seats?|seating|outdoor|indoor|patio|bar|window)\b/ },
      { key: 'name', re: /\b(names?)\b/ },
      { key: 'contact', re: /\b(contacts?|phone|number|email|e-mail)\b/ },
    ];
    for (const f of fields) {
      if (f.re.test(n)) return { field: f.key, wantsCorrection: true };
    }
    return { wantsCorrection: true };
  }
  return { wantsCorrection: false };
}

export function parseUserUtterance(
  text: string,
  currentField: BookingField | null,
  _draft: BookingDraft,
): ParseResult {
  const n = normalize(text);
  const result: ParseResult = {
    draftPatch: {},
    unrecognized: false,
    incomplete: false,
  };

  if (!n) {
    result.incomplete = true;
    return result;
  }

  if (/\b(restart|start over|reset)\b/.test(n)) {
    result.wantsRestart = true;
    return result;
  }
  if (/\b(pause|hold on|wait)\b/.test(n)) {
    result.wantsPause = true;
    return result;
  }
  if (/\b(resume|continue|i'm ready|im ready)\b/.test(n)) {
    result.wantsResume = true;
    return result;
  }
  if (/\b(go back|previous|back)\b/.test(n) && !/\b(callback|backup)\b/.test(n)) {
    result.wantsBack = true;
    return result;
  }

  if (/^(yes|yeah|yep|yup|correct|confirm|sounds good|that'?s right|book it|please book|ok|okay|sure)\b/.test(n)) {
    result.wantsConfirm = true;
  }
  if (/^(no|nope|not yet|cancel|don'?t|wrong)\b/.test(n)) {
    result.wantsDeny = true;
  }

  const correction = detectCorrection(text);
  if (correction.wantsCorrection) {
    result.wantsCorrection = true;
    result.correctionField = correction.field;
  }

  const date = parseDateFromText(text);
  const time = parseTimeFromText(text, currentField);
  const guests = parseGuests(text);
  const seating = parseSeating(text);
  const contact = parseContact(text);
  const name = parseName(text, currentField);

  if (date) result.draftPatch.date = date;
  if (time) result.draftPatch.time = time;
  if (guests !== undefined) result.draftPatch.guests = guests;
  if (seating) result.draftPatch.seating = seating;
  if (contact) {
    result.draftPatch.contact = contact.contact;
    result.draftPatch.contactType = contact.contactType;
  }
  if (name) result.draftPatch.name = name;

  // Field-focused validation when user only answers current question briefly
  if (currentField === 'guests' && guests === undefined) {
    const onlyNum = n.match(/^(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)$/);
    if (onlyNum) {
      const num = WORD_NUMBERS[onlyNum[1]] ?? Number(onlyNum[1]);
      if (num >= 1 && num <= 12) result.draftPatch.guests = num;
      else {
        result.invalidReason = 'We can seat parties of 1 to 12 guests.';
      }
    } else if (Object.keys(result.draftPatch).length === 0 && !result.wantsConfirm && !result.wantsDeny) {
      result.incomplete = true;
    }
  }

  if (currentField === 'seating' && !seating && Object.keys(result.draftPatch).length === 0) {
    if (!result.wantsConfirm && !result.wantsDeny && !result.wantsCorrection) {
      result.invalidReason =
        'Please choose indoor, outdoor, bar, or window seating.';
    }
  }

  if (currentField === 'contact' && !contact && Object.keys(result.draftPatch).length === 0) {
    if (!result.wantsCorrection) {
      const digitCount = text.replace(/\D/g, '').length;
      result.invalidReason =
        digitCount >= 5
          ? `That phone number has ${digitCount} digits — it should have 10, like 416-555-0199. You can also share an email instead.`
          : /@/.test(text)
            ? 'That email address looks incomplete. Please use a format like name@example.com.'
            : 'Please share a phone number or email so we can reach you about the reservation.';
    }
  }

  if (currentField === 'name' && !name && Object.keys(result.draftPatch).length === 0) {
    if (!result.wantsCorrection) {
      result.incomplete = true;
    }
  }

  if (
    Object.keys(result.draftPatch).length === 0 &&
    !result.wantsConfirm &&
    !result.wantsDeny &&
    !result.wantsCorrection &&
    !result.wantsBack &&
    !result.wantsPause &&
    !result.wantsResume &&
    !result.wantsRestart &&
    !result.invalidReason &&
    !result.incomplete
  ) {
    result.unrecognized = true;
  }

  return result;
}

export const FIELD_ORDER: BookingField[] = [
  'date',
  'time',
  'guests',
  'seating',
  'name',
  'contact',
];

export function nextMissingField(draft: BookingDraft): BookingField | null {
  for (const f of FIELD_ORDER) {
    if (f === 'contact') {
      if (!draft.contact) return 'contact';
    } else if (draft[f] === undefined || draft[f] === '') {
      return f;
    }
  }
  return null;
}

export function seatingLabel(s: SeatingPreference): string {
  const map: Record<SeatingPreference, string> = {
    indoor: 'Indoor',
    outdoor: 'Outdoor patio',
    bar: 'Bar seating',
    window: 'Window table',
  };
  return map[s];
}
