import {
  createInitialEngine,
  processUserInput,
} from '../src/lib/conversation';
import { toIsoDate, todayLocal } from '../src/lib/availability';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
}

// 1. Normal completion with multi-field utterance
let s = createInitialEngine();
s = processUserInput(s, 'tomorrow at 7 for 2 outdoor', 'typed');
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

console.log('\nAll smoke checks passed.');
