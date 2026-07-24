import { chromium } from 'playwright';

const BASE = 'http://localhost:5250';
const OUT = 'C:/Users/mafow/AppData/Local/Temp/claude/c--projects-MIA-platform/6ad6391d-c422-4327-a681-091dd4ff4a79/scratchpad/site';
import fs from 'fs';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const errors = [];
const ctx = await browser.newContext({ viewport: { width: 1280, height: 950 } });
const page = await ctx.newPage();
page.on('pageerror', (err) => errors.push('PAGEERROR: ' + err.message));
page.on('console', (msg) => { if (msg.type() === 'error') errors.push('CONSOLE: ' + msg.text()); });

// Home
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/01-home.png`, fullPage: true });

// About
await page.click('a:has-text("About")');
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/02-about.png`, fullPage: true });

// Programs
await page.click('a:has-text("Programs")');
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/03-programs.png`, fullPage: true });

// Contact
await page.click('a:has-text("Contact")');
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/04-contact.png`, fullPage: true });

// Submit contact form
await page.fill('input[type="text"] >> nth=0', 'Test Person');
await page.fill('input[type="text"] >> nth=1', 'test@example.com');
await page.fill('textarea', 'This is a test message.');
await page.click('button:has-text("Send Message")');
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/05-contact-submitted.png`, fullPage: true });

// French toggle on home
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.click('button:has-text("FR")');
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/06-home-french.png`, fullPage: true });
await page.click('button:has-text("EN")');

// Platform Login button -> /login
await page.click('button:has-text("Platform Login")');
await page.waitForSelector('text=Sign in');
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/07-login-page.png`, fullPage: true });

// Log in as a role, confirm dashboard, then logout goes to /login not /
await page.click('button:has-text("Show demo accounts")');
await page.waitForTimeout(300);
await page.click('.demo-item:has-text("Emmanuel Fonkeng")');
await page.waitForSelector('text=Regional Overview', { timeout: 10000 });
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/08-dashboard-after-login.png`, fullPage: true });

// Click the MIA logo while inside the platform -> should go to public home
await page.click('.app-brand');
await page.waitForTimeout(500);
const urlAfterLogoClick = page.url();
await page.screenshot({ path: `${OUT}/09-after-logo-click.png`, fullPage: true });

// Go back into the dashboard and test logout target
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
await page.click('button:has-text("Show demo accounts")');
await page.waitForTimeout(300);
await page.click('.demo-item:has-text("Emmanuel Fonkeng")');
await page.waitForSelector('text=Regional Overview', { timeout: 10000 });
await page.click('button:has-text("Log out")');
await page.waitForTimeout(500);
const urlAfterLogout = page.url();
await page.screenshot({ path: `${OUT}/10-after-logout.png`, fullPage: true });

console.log('urlAfterLogoClick:', urlAfterLogoClick);
console.log('urlAfterLogout:', urlAfterLogout);
console.log('ERRORS:', JSON.stringify(errors, null, 2));
await browser.close();
