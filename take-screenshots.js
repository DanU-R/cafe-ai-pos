import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASE_URL = process.env.SCREENSHOT_BASE_URL || 'http://127.0.0.1:8000';
const EMAIL = process.env.SCREENSHOT_EMAIL || 'owner@cafe.test';
const PASSWORD = process.env.SCREENSHOT_PASSWORD || 'password';
const OUT_DIR = path.join(__dirname, 'docs', 'screenshots');

async function ensureScreenshotsDir() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function waitForApp(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle').catch(() => null);
  await page.locator('#app').waitFor({ state: 'visible', timeout: 30000 }).catch(() => null);
  await page.waitForTimeout(1200);
}

async function clickFirstVisible(page, selectors) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.isVisible().catch(() => false)) {
      await locator.click();
      return true;
    }
  }

  return false;
}

async function login(page) {
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 }).catch(() => null),
    page.locator('[data-test="login-button"], button[type="submit"]').first().click(),
  ]);
  await waitForApp(page);
}

async function prepareQrisPreview(page) {
  await page.goto(`${BASE_URL}/pos`, { waitUntil: 'domcontentloaded' });
  await waitForApp(page);

  await clickFirstVisible(page, [
    'button:has-text("Kopi")',
    'button:has-text("Coffee")',
    'button:has-text("Americano")',
    'button:has-text("Latte")',
    'section button:not([disabled])',
  ]);
  await page.waitForTimeout(800);

  if (await page.locator('[role="dialog"]').isVisible().catch(() => false)) {
    await clickFirstVisible(page, [
      'button:has-text("Tambah ke cart")',
      'button:has-text("Tambah")',
      'button:has-text("Add")',
    ]);
    await page.waitForTimeout(800);
  }

  const paymentMethod = page.locator('button[role="combobox"]').last();
  if (await paymentMethod.isVisible().catch(() => false)) {
    await paymentMethod.click();
    await page.getByRole('option', { name: /QRIS/i }).click().catch(async () => {
      await page.locator('[role="option"]:has-text("QRIS")').click();
    });
  }

  const amountInputs = page.locator('input[type="number"]');
  const count = await amountInputs.count();
  if (count > 0) {
    await amountInputs.nth(count - 1).fill('25000').catch(() => null);
  }

  await page.waitForTimeout(1200);
}

async function main() {
  await ensureScreenshotsDir();

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });

  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await page.screenshot({ path: path.join(OUT_DIR, '01-login.png'), fullPage: true });

    await login(page);

    await page.goto(`${BASE_URL}/pos`, { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await page.screenshot({ path: path.join(OUT_DIR, '02-pos-main.png'), fullPage: true });

    await prepareQrisPreview(page);
    await page.screenshot({ path: path.join(OUT_DIR, '03-qris-modal.png'), fullPage: true });

    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await page.screenshot({ path: path.join(OUT_DIR, '04-dashboard.png'), fullPage: true });
  } finally {
    await browser.close();
  }

  console.log(`Screenshots saved to ${OUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
