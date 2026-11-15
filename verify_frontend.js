const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/natan/.gemini/antigravity/brain/e31efa93-e09a-49ac-a227-aa38829a9aa6';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14 dimensions
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:8081/search...');
  await page.goto('http://localhost:8081/search', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(4500); // Wait for SanctuaryLoader overlay to complete

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'search_screen_verified.png') });
  console.log('Saved search_screen_verified.png');

  console.log('Navigating to http://localhost:8081/saved...');
  await page.goto('http://localhost:8081/saved', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(4500);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'saved_screen_verified.png') });
  console.log('Saved saved_screen_verified.png');

  await browser.close();
  console.log('Playwright UI verification finished successfully!');
})();
