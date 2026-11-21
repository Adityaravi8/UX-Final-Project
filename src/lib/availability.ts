/** Simulated restaurant availability — no real booking API. */

const BLOCKED_SLOTS: Record<string, string[]> = {
  // Friday evenings often fully booked for outdoor
  // Format: YYYY-MM-DD -> blocked times (HH:MM)
};

/** Times that are always unavailable (kitchen prep / closed). */
const ALWAYS_UNAVAILABLE = new Set(['10:00', '10:30', '23:00', '23:30']);

/** Popular dinner slots that sell out on weekends. */
const WEEKEND_PEAK = new Set(['19:00', '19:30', '20:00']);

export const AVAILABLE_TIMES = [
  '11:00',
  '11:30',
  '12:00',
  '12:30',
  '13:00',
  '13:30',
  '17:00',
  '17:30',
  '18:00',
  '18:30',
  '19:00',
  '19:30',
  '20:00',
  '20:30',
  '21:00',
  '21:30',
] as const;

export function formatDisplayDate(iso: string): string {
  const d = parseLocalDate(iso);
  if (!d) return iso;
  return d.toLocaleDateString('en-CA', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDisplayTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = ((h + 11) % 12) + 1;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export function parseLocalDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

export function todayLocal(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function isPastDate(iso: string): boolean {
  const d = parseLocalDate(iso);
  if (!d) return true;
  return d < todayLocal();
}

export function isValidReservationDate(iso: string): { ok: true } | { ok: false; reason: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return { ok: false, reason: 'Please use a clear date like “tomorrow”, “Friday”, or YYYY-MM-DD.' };
  }
  const d = parseLocalDate(iso);
  if (!d) {
    return { ok: false, reason: 'That date does not look valid. Try again with a real calendar date.' };
  }
  if (isPastDate(iso)) {
    return { ok: false, reason: 'That date is in the past. Please choose today or a future date.' };
  }
  if (iso === toIsoDate(todayLocal()) && !hasSeatingLeftToday()) {
    return {
      ok: false,
      reason: 'We’re done seating for today — our last seating is 9:30 PM. Would tomorrow or another day work?',
    };
  }
  const max = todayLocal();
  max.setDate(max.getDate() + 60);
  if (d > max) {
    return { ok: false, reason: 'We only take reservations up to 60 days ahead. Pick a nearer date.' };
  }
  return { ok: true };
}

/** True when the slot is today and its start time has already passed. */
export function isPastSlot(dateIso: string, time: string): boolean {
  if (dateIso !== toIsoDate(todayLocal())) return false;
  const now = new Date();
  const nowHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return time <= nowHHMM;
}

/** True when today still has at least one seating left. */
export function hasSeatingLeftToday(): boolean {
  const today = toIsoDate(todayLocal());
  return AVAILABLE_TIMES.some((t) => !isPastSlot(today, t));
}

function slotOpen(dateIso: string, time: string, seating?: string): boolean {
  if (!AVAILABLE_TIMES.includes(time as (typeof AVAILABLE_TIMES)[number])) return false;
  if (isPastSlot(dateIso, time)) return false;
  if (ALWAYS_UNAVAILABLE.has(time)) return false;

  const blocked = BLOCKED_SLOTS[dateIso] ?? [];
  if (blocked.includes(time)) return false;

  const d = parseLocalDate(dateIso);
  const dow = d?.getDay() ?? -1;
  const isWeekend = dow === 5 || dow === 6 || dow === 0;

  if (isWeekend && WEEKEND_PEAK.has(time)) {
    const hash = [...dateIso].reduce((a, c) => a + c.charCodeAt(0), 0);
    if (seating === 'outdoor' && hash % 2 === 0 && (time === '19:00' || time === '19:30')) {
      return false;
    }
    if (!seating && hash % 3 === 0 && time === '20:00') {
      return false;
    }
  }

  // Fixed demo unavailable slot so testers can reliably trigger recovery
  if (time === '18:00' && d && d.getDay() === 5) return false;

  return true;
}

export function isTimeAvailable(
  dateIso: string,
  time: string,
  seating?: string,
): { ok: true } | { ok: false; reason: string; suggestions: string[] } {
  if (!AVAILABLE_TIMES.includes(time as (typeof AVAILABLE_TIMES)[number])) {
    return {
      ok: false,
      reason: `We seat on the half hour from 11:00 AM–1:30 PM and 5:00–9:30 PM. “${formatDisplayTime(time)}” is outside our hours.`,
      suggestions: suggestTimes(dateIso, seating),
    };
  }

  if (isPastSlot(dateIso, time)) {
    const next = suggestTimes(dateIso, seating);
    return {
      ok: false,
      reason: next.length
        ? `${formatDisplayTime(time)} today has already passed. Please pick a later time.`
        : `${formatDisplayTime(time)} today has already passed, and there are no seatings left today. Try another day.`,
      suggestions: next,
    };
  }

  if (ALWAYS_UNAVAILABLE.has(time)) {
    return {
      ok: false,
      reason: `${formatDisplayTime(time)} is not available. Our dining room opens at 11:00 AM and the last seating is 9:30 PM.`,
      suggestions: suggestTimes(dateIso, seating),
    };
  }

  const blocked = BLOCKED_SLOTS[dateIso] ?? [];
  if (blocked.includes(time)) {
    return {
      ok: false,
      reason: `${formatDisplayTime(time)} on ${formatDisplayDate(dateIso)} is already fully booked.`,
      suggestions: suggestTimes(dateIso, seating),
    };
  }

  const d = parseLocalDate(dateIso);
  const dow = d?.getDay() ?? -1;
  const isWeekend = dow === 5 || dow === 6 || dow === 0;

  if (isWeekend && WEEKEND_PEAK.has(time)) {
    const hash = [...dateIso].reduce((a, c) => a + c.charCodeAt(0), 0);
    if (seating === 'outdoor' && hash % 2 === 0 && (time === '19:00' || time === '19:30')) {
      return {
        ok: false,
        reason: `Outdoor seating at ${formatDisplayTime(time)} on ${formatDisplayDate(dateIso)} is fully booked. Indoor and window may still be open.`,
        suggestions: suggestTimes(dateIso, 'indoor'),
      };
    }
    if (!seating && hash % 3 === 0 && time === '20:00') {
      return {
        ok: false,
        reason: `${formatDisplayTime(time)} on ${formatDisplayDate(dateIso)} is fully booked right now.`,
        suggestions: suggestTimes(dateIso, seating),
      };
    }
  }

  if (time === '18:00' && d && d.getDay() === 5) {
    return {
      ok: false,
      reason: `Friday at ${formatDisplayTime(time)} is our busiest service and is fully booked. Try 6:30 PM or 7:00 PM.`,
      suggestions: ['18:30', '19:00', '17:30'].filter((t) => slotOpen(dateIso, t, seating)),
    };
  }

  return { ok: true };
}

export function suggestTimes(dateIso: string, seating?: string): string[] {
  return AVAILABLE_TIMES.filter((t) => slotOpen(dateIso, t, seating)).slice(0, 4);
}

export function generateConfirmationCode(): string {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `TT-${n}`;
}
