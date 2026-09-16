require('dotenv/config');
const assert = require('node:assert/strict');
const { prisma } = require('../dist/lib/prisma');
const { signJwt } = require('../dist/utils/jwt');

async function main() {
  if (!['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname)) throw new Error('Local DB only');
  const { chromium } = require(process.env.PLAYWRIGHT_CORE_PATH);
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', archivedAt: null } });
  assert.ok(admin);
  const browser = await chromium.launch({ headless: true, executablePath: process.env.TEST_BROWSER_PATH });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(token => localStorage.setItem('token', token), signJwt({ userId: admin.id, role: 'ADMIN', email: admin.email }, '10m'));
    await page.goto('http://localhost:5173/admin/reviewer-reminders');
    await page.getByText('Найдено:', { exact: false }).waitFor();
    assert.ok(await page.locator('tbody tr').count());
    await page.getByRole('tab', { name: 'История напоминаний' }).click();
    await page.getByText('Записей нет.', { exact: true }).waitFor();
    await page.getByLabel('Показывать также тестовые письма').check();
    await page.getByRole('button', { name: 'Состав письма' }).first().waitFor();
    await page.getByRole('button', { name: 'Состав письма' }).first().click();
    await page.getByText('Получатель:', { exact: false }).waitFor();
    const downloaded = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Выгрузить XLSX' }).click();
    const download = await downloaded;
    assert.equal(await download.failure(), null);
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    assert.deepEqual(errors, []);
    console.log('PASS browser: live local API, pending/history, test filter, details, XLSX, mobile page width; no JS errors.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
