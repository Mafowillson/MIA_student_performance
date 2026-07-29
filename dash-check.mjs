import { chromium } from 'playwright';

const BASE = 'http://localhost:5195';
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', (err) => console.log('[pageerror]', err.message));

await page.goto(`${BASE}/`);
await page.waitForTimeout(1000);
const homeText = await page.textContent('body');
console.log('Home page em-dash count:', (homeText.match(/—/g) || []).length);
await page.screenshot({ path: 'dc-01-home.png', fullPage: true });

await page.goto(`${BASE}/about`);
await page.waitForTimeout(1000);
const aboutText = await page.textContent('body');
console.log('About page em-dash count:', (aboutText.match(/—/g) || []).length);

await page.goto(`${BASE}/contact`);
await page.waitForTimeout(1000);
const contactText = await page.textContent('body');
console.log('Contact page em-dash count:', (contactText.match(/—/g) || []).length);

await page.goto(`${BASE}/login`);
await page.waitForTimeout(800);
await page.fill('input[autocomplete="username"]', 'EmanuelDaah@gmail.com');
await page.fill('input[autocomplete="current-password"]', '652202721');
await page.click('button[type="submit"]');
await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(2500);
const dashText = await page.textContent('body');
console.log('National dashboard em-dash count:', (dashText.match(/—/g) || []).length);
await page.screenshot({ path: 'dc-02-national.png', fullPage: true });

await browser.close();
console.log('done');
