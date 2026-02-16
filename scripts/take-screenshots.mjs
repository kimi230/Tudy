import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/homebrew/lib/node_modules/playwright');
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.resolve(__dirname, '../screenshots');
const BASE_URL = 'http://localhost:5173';
const VIDEO_ID = 'Tuw8hxrFBH8';

// StepIndicator의 title 속성 값 (stepLabels 배열과 동일)
const STEP_TITLES = [
  '처음 듣기', '노트테이킹', '재듣기+마킹', '자막 비교', '문장별 분석',
  '복습 듣기', '오답노트', '쉐도잉', '녹음 비교', '요약/토론',
];

const STEP_NAMES = [
  'Listen', 'Notes', 'Mark', 'Compare', 'Analyze',
  'Review', 'ErrorNote', 'Shadow', 'Record', 'Summary',
];

const PAGES = [
  { name: '00_home', url: '/' },
  { name: '01_library', url: '/library' },
  { name: '02_vocabulary', url: '/vocabulary' },
  { name: '03_error-notes', url: '/error-notes' },
  { name: '04_request', url: '/request' },
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // 1) Static pages
  for (const pg of PAGES) {
    await page.goto(`${BASE_URL}${pg.url}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, `${pg.name}.png`),
      fullPage: true,
    });
    console.log(`Captured: ${pg.name}`);
  }

  // 2) Study page - navigate to it (creates session at step 1)
  await page.goto(`${BASE_URL}/study/${VIDEO_ID}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Take step 1
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'step01_Listen.png'),
    fullPage: true,
  });
  console.log('Captured: step01_Listen');

  // 3) Steps 2-10: click by title attribute
  for (let i = 1; i < 10; i++) {
    const stepNum = i + 1;
    const title = STEP_TITLES[i];
    const name = STEP_NAMES[i];

    const btn = page.locator(`button[title="${title}"]`);
    await btn.click({ timeout: 5000 });
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, `step${String(stepNum).padStart(2, '0')}_${name}.png`),
      fullPage: true,
    });
    console.log(`Captured: step${String(stepNum).padStart(2, '0')}_${name}`);
  }

  // 4) Step4 extras: popup + transcript expanded
  // Go back to step 4
  await page.locator('button[title="자막 비교"]').click({ timeout: 5000 });
  await page.waitForTimeout(1000);

  // Click first [seg N] button for popup
  const segButtons = page.locator('button').filter({ hasText: /^\[seg \d+\]$/ });
  const segCount = await segButtons.count();
  if (segCount > 0) {
    await segButtons.first().click();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'step04_Compare_popup.png'),
      fullPage: false,
    });
    console.log('Captured: step04_Compare_popup');

    // Close popup via backdrop (click top-left corner of the overlay)
    await page.locator('.fixed.inset-0').click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(300);
  }

  // Expand transcript section
  const expandBtn = page.locator('button').filter({ hasText: /펼치기/ });
  if (await expandBtn.isVisible()) {
    await expandBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'step04_Compare_transcript.png'),
      fullPage: true,
    });
    console.log('Captured: step04_Compare_transcript');
  }

  await browser.close();
  console.log(`\nAll screenshots saved to: ${SCREENSHOTS_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
