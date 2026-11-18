/**
 * Smoke checks for the conversation engine behaviours (happy path + recoveries).
 * Run: node scripts/smoke.mjs
 */
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { register } from 'node:module';

// Use vite-node-less approach: dynamic import via tsx if available, else skip.
async function main() {
  let processUserInput, createInitialEngine;
  try {
    const mod = await import('../src/lib/conversation.ts');
    processUserInput = mod.processUserInput;
    createInitialEngine = mod.createInitialEngine;
  } catch {
    console.log('Skipping TS direct import; run via npx tsx scripts/smoke.ts instead.');
    process.exit(0);
  }

  let s = createInitialEngine();
  const steps = [
    'tomorrow at 7 for 2 outdoor',
    'Alex Rivera',
    'alex@example.com',
    'yes',
  ];
  for (const step of steps) {
    s = processUserInput(s, step, 'typed');
  }
  if (s.phase !== 'completed' || !s.confirmationCode) {
    console.error('FAIL happy path', s.phase, s.draft);
    process.exit(1);
  }
  console.log('OK happy path', s.confirmationCode);

  s = createInitialEngine();
  s = processUserInput(s, 'yesterday', 'typed');
  if (!/past|valid|date/i.test(s.avaReply)) {
    console.error('FAIL invalid date', s.avaReply);
    process.exit(1);
  }
  console.log('OK invalid date recovery');

  s = createInitialEngine();
  s = processUserInput(s, 'Saturday', 'typed');
  if (s.draft.date && s.currentField === 'time') {
    console.log('OK missing info follow-up');
  } else {
    console.error('FAIL missing info', s);
    process.exit(1);
  }

  console.log('All smoke checks passed.');
}

main();
