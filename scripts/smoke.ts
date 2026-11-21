import {
  createInitialEngine,
  processUserInput,
} from '../src/lib/conversation';
import { hasSeatingLeftToday, toIsoDate, todayLocal } from '../src/lib/availability';
import { parseUserUtterance } from '../src/lib/parser';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
}

// 1. Normal completion with multi-field utterance
// Tuesday avoids the simulated weekend sell-outs, so this passes on any day.
let s = createInitialEngine();
s = processUserInput(s, 'tuesday at 7 for 2 outdoor', 'typed');
assert(s.draft.date && s.draft.time === '19:00' && s.draft.guests === 2 && s.draft.seating === 'outdoor', 'multi-field parse');
s = processUserInput(s, 'Alex Rivera', 'typed');
s = processUserInput(s, 'alex@example.com', 'typed');
assert(s.phase === 'review' && s.showConfirmModal, 'should reach review');
s = processUserInput(s, 'yes', 'typed');
assert(s.phase === 'completed' && s.confirmationCode, 'completed with code');
console.log('OK 1 normal completion', s.confirmationCode);

// 2. Missing information
s = createInitialEngine();
s = processUserInput(s, 'Saturday', 'typed');
assert(s.draft.date && s.currentField === 'time', 'asks for time after date-only');
console.log('OK 2 missing info follow-up');

// 3. Invalid answer (past date)
s = createInitialEngine();
const past = new Date(todayLocal());
past.setDate(past.getDate() - 2);
s = processUserInput(s, toIsoDate(past), 'typed');
assert(/past|valid|date/i.test(s.avaReply), 'invalid date message');
assert(!s.draft.date, 'past date not stored');
console.log('OK 3 invalid date');

// 4. Correction without full restart
s = createInitialEngine();
s = processUserInput(s, 'tomorrow at 7 for 2 indoor', 'typed');
s = processUserInput(s, 'Alex Rivera', 'typed');
s = processUserInput(s, '416-555-0199', 'typed');
assert(s.phase === 'review', 'pre-correction review');
s = processUserInput(s, 'change seating', 'typed');
assert(s.currentField === 'seating' && s.phase === 'collecting', 'correction path');
s = processUserInput(s, 'window', 'typed');
assert(s.draft.seating === 'window' && s.draft.name === 'Alex Rivera', 'keeps other fields');
console.log('OK 4 correction');

// 5. Voice problem path is UI-level; engine unrecognized recovery
s = createInitialEngine();
s = processUserInput(s, 'blargle fizzbuzz', 'voice');
assert(/didn.?t quite catch|didn.?t catch|type/i.test(s.avaReply), 'unrecognized recovery');
console.log('OK 5 unrecognized / voice-mishear style recovery');

// 6. Final confirmation
s = createInitialEngine();
s = processUserInput(s, 'tomorrow at 18:30 for 3 bar', 'typed');
s = processUserInput(s, 'Sam Lee', 'typed');
s = processUserInput(s, 'sam@school.ca', 'typed');
assert(s.showConfirmModal && /confirm/i.test(s.avaReply), 'confirmation summary');
console.log('OK 6 final confirmation');

// Friday 18:00 unavailable recovery
s = createInitialEngine();
const d = todayLocal();
const daysUntilFriday = (5 - d.getDay() + 7) % 7 || 7;
const friday = new Date(d);
friday.setDate(d.getDate() + daysUntilFriday);
s = processUserInput(s, toIsoDate(friday), 'typed');
s = processUserInput(s, '18:00', 'typed');
assert(/fully booked|not available|busy/i.test(s.avaReply), 'friday 6pm blocked');
assert(!s.draft.time || s.currentField === 'time', 'time not accepted as final without recovery');
console.log('OK friday 6pm unavailable recovery');

// Bare guest numbers (typed or quick-choice chips) are guest counts, not times
for (const [reply, expected] of [['2', 2], ['4', 4], ['6', 6], ['four', 4]] as const) {
  s = createInitialEngine();
  s = processUserInput(s, 'tuesday', 'typed');
  s = processUserInput(s, '18:30', 'chip');
  s = processUserInput(s, reply, 'chip');
  assert(s.draft.guests === expected && s.draft.time === '18:30' && s.currentField === 'seating', `guests "${reply}"`);
}
s = createInitialEngine();
s = processUserInput(s, 'tuesday', 'typed');
s = processUserInput(s, '18:30', 'chip');
s = processUserInput(s, '20', 'typed');
assert(!s.draft.guests && s.draft.time === '18:30' && /1 to 12/.test(s.avaReply), 'too many guests rejected');
console.log('OK guest numbers');

// Correction that carries the new value is applied straight away
s = createInitialEngine();
s = processUserInput(s, 'tomorrow at 7 for 2 indoor', 'typed');
s = processUserInput(s, 'Alex Rivera', 'typed');
s = processUserInput(s, 'alex@example.com', 'typed');
s = processUserInput(s, 'actually make it 4 people', 'typed');
assert(s.draft.guests === 4 && s.phase === 'review' && s.showConfirmModal, 'inline correction applied');
s = processUserInput(s, 'change time to 8:30 pm', 'typed');
assert(s.draft.time === '20:30' && s.phase === 'review', 'inline time correction applied');
console.log('OK inline correction');

// Spoken-style times (as speech-to-text returns them)
const spoken: [string, string][] = [
  ['seven pm tomorrow for two', '19:00'],
  ['tuesday at 6:30 p.m.', '18:30'],
  ['tuesday at seven thirty', '19:30'],
  ['tuesday half past six', '18:30'],
  ['tuesday at six', '18:00'],
];
for (const [utterance, expected] of spoken) {
  s = processUserInput(createInitialEngine(), utterance, 'voice');
  assert(s.draft.time === expected, `spoken time "${utterance}" -> ${s.draft.time}`);
}
const soon = todayLocal();
soon.setDate(soon.getDate() + 20);
const monthDay = `${soon.toLocaleDateString('en-US', { month: 'long' })} ${soon.getDate()}`;
s = processUserInput(createInitialEngine(), monthDay, 'typed');
assert(s.draft.date && !s.draft.time, 'date number not read as time');
console.log('OK spoken times');

// Contact: "Use phone" chip, wrong-length phone numbers, formatting
s = createInitialEngine();
for (const l of ['tuesday at 6:30 pm for 4 bar', 'Aditya Ravi']) s = processUserInput(s, l, 'typed');
s = processUserInput(s, 'I will type my phone number', 'chip');
assert(/type your phone number/i.test(s.avaReply), 'phone chip acknowledged');
s = processUserInput(s, '67346746746746743', 'typed');
assert(!s.draft.contact && /17 digits/.test(s.avaReply), 'too-long phone rejected');
s = processUserInput(s, '12345', 'typed');
assert(!s.draft.contact, 'too-short phone rejected');
s = processUserInput(s, '(416) 555 0199', 'typed');
assert(s.draft.contact === '416-555-0199' && s.phase === 'review', 'valid phone accepted');
console.log('OK contact validation');

// Generic "change" asks which detail, then accepts a value directly ("4 ppl")
s = processUserInput(s, 'change', 'chip');
assert(s.currentField === null && !s.showConfirmModal && s.quickChoices.length === 6, 'change asks which detail');
s = processUserInput(s, 'actually make it 2 ppl', 'typed');
assert(s.draft.guests === 2 && s.draft.time === '18:30' && s.showConfirmModal, '"ppl" updates guests');
s = processUserInput(s, 'change name', 'chip');
s = processUserInput(s, 'Maya Chen', 'typed');
assert(s.draft.name === 'Maya Chen' && s.showConfirmModal, 'name change returns to review');
console.log('OK change flow');

// Every "what would you like to change?" chip opens the right field, and the new value sticks
const edits: [string, string, (d: typeof s.draft) => boolean][] = [
  ['change date', 'wednesday', (d) => new Date(`${d.date}T00:00`).getDay() === 3],
  ['change time', '12:30', (d) => d.time === '12:30'],
  ['change guests', '4', (d) => d.guests === 4],
  ['change seating', 'window', (d) => d.seating === 'window'],
  ['change name', 'Aditya Ravi', (d) => d.name === 'Aditya Ravi'],
  ['change contact', 'aditya@example.com', (d) => d.contact === 'aditya@example.com'],
];
for (const [chip, value, check] of edits) {
  s = createInitialEngine();
  for (const l of ['tuesday', '11:30', '3', 'bar', 'Adtiya', '416-555-0199']) s = processUserInput(s, l, 'typed');
  s = processUserInput(s, 'change', 'chip');
  s = processUserInput(s, chip, 'chip');
  assert(s.quickChoices !== undefined && s.currentField === chip.split(' ')[1], `${chip} opens its field`);
  s = processUserInput(s, value, 'typed');
  assert(check(s.draft) && s.showConfirmModal, `${chip} -> ${value} applied`);
}
console.log('OK all edit chips');

// A lone number at review is ambiguous: Ava asks guests-or-time instead of guessing
s = createInitialEngine();
for (const l of ['tuesday', '11:30', '3', 'bar', 'Adtiya', '416-555-0199', 'change', '4']) s = processUserInput(s, l, 'typed');
assert(/did you mean 4 guests or 4:00 PM/i.test(s.avaReply) && s.draft.guests === 3 && s.draft.time === '11:30', 'lone number clarified');
s = processUserInput(s, s.quickChoices[0].value, 'chip');
assert(s.draft.guests === 4 && s.draft.time === '11:30' && s.showConfirmModal, 'clarified as guests');
console.log('OK ambiguous number');

// Date chips are worked out from today: no duplicates, each resolves to a distinct upcoming date
{
  const chips = createInitialEngine().quickChoices;
  const dates = chips.map((c) => parseUserUtterance(c.value, 'date', {}).draftPatch.date);
  assert(chips.length === 4 && new Set(dates).size === 4, `date chips distinct: ${chips.map((c) => c.label).join(', ')}`);
  const today = toIsoDate(todayLocal());
  const sorted = [...dates].sort();
  assert(dates.every((d, i) => d === sorted[i] && d! >= today), 'date chips in order, none in the past');
  assert(chips[0].label === (hasSeatingLeftToday() ? 'Today' : 'Tomorrow'), 'first chip is today (or tomorrow after closing)');
  console.log('OK date chips:', chips.map((c) => c.label).join(' / '));
}

// A time that has already passed today is rejected (only checkable after 11:00 AM)
{
  const now = new Date();
  if (now.getHours() >= 11 && hasSeatingLeftToday()) {
    s = createInitialEngine();
    s = processUserInput(s, 'today', 'chip');
    s = processUserInput(s, '11:00', 'chip');
    assert(!s.draft.time && /already passed/.test(s.avaReply), 'past time today rejected');
    const nowHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    assert(s.quickChoices.every((c) => c.value > nowHHMM), 'suggested times are all later today');
    // Switching an existing booking to today re-checks the time
    s = createInitialEngine();
    for (const l of ['tuesday', '11:00', '2', 'window', 'Rayan', '416-555-0199', 'change date', 'today']) s = processUserInput(s, l, 'typed');
    assert(s.currentField === 'time' && /already passed/.test(s.avaReply), 'date change to today re-checks time');
    console.log('OK past times today');
  } else {
    console.log('SKIP past times today (run after 11:00 AM to check)');
  }
}

console.log('\nAll smoke checks passed.');
