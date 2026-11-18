import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const outDir = '/cursor/stores/self/media';
const artDir = '/opt/cursor/artifacts';
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(artDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });

// Disable TTS to avoid hanging on speech
const tts = page.locator('label.toggle input[type="checkbox"]');
if (await tts.isChecked()) await tts.uncheck();

await page.screenshot({ path: path.join(outDir, '02-tabletalk-ready.png'), fullPage: true });

await page.fill('#user-input', 'tomorrow at 7 for 2 outdoor');
await page.click('button.btn--primary');
await page.waitForTimeout(600);

await page.fill('#user-input', 'Maya Chen');
await page.click('button.btn--primary');
await page.waitForTimeout(600);

await page.fill('#user-input', 'maya@example.com');
await page.click('button.btn--primary');
await page.waitForTimeout(800);

await page.screenshot({ path: path.join(outDir, '03-tabletalk-confirm-modal.png'), fullPage: true });

const modal = page.locator('.modal');
await modal.waitFor({ state: 'visible', timeout: 5000 });
await page.click('.modal .btn--primary');
await page.waitForTimeout(800);

await page.screenshot({ path: path.join(outDir, '04-tabletalk-completed.png'), fullPage: true });

const success = await page.locator('.success').innerText();
console.log('SUCCESS_TEXT:', success.replace(/\s+/g, ' ').trim());

// Copy key shots to artifacts
for (const name of [
  '02-tabletalk-ready.png',
  '03-tabletalk-confirm-modal.png',
  '04-tabletalk-completed.png',
]) {
  fs.copyFileSync(path.join(outDir, name), path.join(artDir, name));
}

await browser.close();
console.log('Demo screenshots written.');
