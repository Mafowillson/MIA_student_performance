import { chromium } from 'playwright';

const BASE = 'http://localhost:5193';
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', (err) => console.log('[pageerror]', err.message));

await page.goto(`${BASE}/login`);
await page.waitForTimeout(500);
await page.fill('input[autocomplete="username"]', 'EmanuelDaah@gmail.com');
await page.fill('input[autocomplete="current-password"]', '652202721');
await page.click('button[type="submit"]');
await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(2500);
console.log('URL after login:', page.url());
const bodyText = await page.textContent('body');
console.log('Shows "Emmanuel Daah":', bodyText.includes('Emmanuel Daah'));
await page.screenshot({ path: 'ns-01-dashboard.png', fullPage: true });

// Confirm demo-accounts list no longer offers a National Supervisor row.
await page.goto(`${BASE}/login`);
await page.waitForTimeout(500);
await page.click('button.demo-toggle');
await page.waitForTimeout(300);
const bodyText2 = await page.textContent('body');
console.log('Demo list no longer shows National Supervisor group:', !bodyText2.includes('NATIONAL SUPERVISOR'));
await page.screenshot({ path: 'ns-02-demo-list.png', fullPage: true });

await browser.close();
console.log('done');
