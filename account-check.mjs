import { chromium } from 'playwright';

const BASE = 'http://localhost:5185';
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', (err) => console.log('[pageerror]', err.message));

async function shot(name) {
  await page.screenshot({ path: `acc-${name}.png`, fullPage: true });
}

async function loginByPartialText(text) {
  await page.goto(`${BASE}/login`);
  await page.waitForTimeout(500);
  await page.click('button.demo-toggle');
  await page.waitForTimeout(300);
  await page.locator('.demo-item').filter({ hasText: text }).first().click();
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

async function loginWithCredentials(email, password) {
  await page.goto(`${BASE}/login`);
  await page.waitForTimeout(500);
  await page.fill('input[autocomplete="username"]', email);
  await page.fill('input[autocomplete="current-password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

// ---------------------------------------------------------------------------
// 1. Regional Supervisor creates a new HOD with a real email/password.
// ---------------------------------------------------------------------------
await loginByPartialText('North West'); // Regional Supervisor NW
console.log('Regional Supervisor dashboard URL:', page.url());

await page.goto(`${BASE}/supervisor/admins`);
await page.waitForTimeout(2000);
await shot('01-manage-admins');

const newEmail = `test.hod.${Date.now()}@mia-prepa.org`;
const newPassword = 'testpass123';

// Role is a tab-button group on the page ITSELF (Regional Coordinator / HOD
// / Center Coordinator), not inside the modal — click "HOD" there first so
// "Add new" opens a form scoped to that role.
await page.click('.chip:has-text("HOD")');
await page.waitForTimeout(500);
await page.click('button:has-text("Add new")');
await page.waitForTimeout(500);
await shot('02-add-form');

// Name / Email / Password are all plain type="text" inputs in this form
// (a deliberate prototype choice — passwords aren't masked).
const textInputs = page.locator('input[type="text"]');
await textInputs.nth(0).fill('Test HOD Account'); // Name
await textInputs.nth(1).fill(newEmail); // Email
await textInputs.nth(2).fill(newPassword); // Password
await page.locator('select').first().selectOption({ index: 1 }); // Subject (required)
await page.waitForTimeout(300);
await shot('03-form-filled');

await page.click('button[type="submit"]');
await page.waitForTimeout(2500);
await shot('04-after-save');
const bodyText1 = await page.textContent('body');
console.log('Save error shown:', /error|invalid|taken|wrong/i.test(bodyText1) && !bodyText1.includes('Manage Admins'));

// ---------------------------------------------------------------------------
// 2. Log out, then try logging in AS the new HOD with those exact credentials.
// ---------------------------------------------------------------------------
await page.click('.role-pill button'); // Log out
await page.waitForTimeout(1000);

await loginWithCredentials(newEmail, newPassword);
console.log('New HOD login URL:', page.url());
await shot('05-new-hod-logged-in');

const loggedInAsHod = page.url().includes('/hod');
console.log('New HOD account can really log in:', loggedInAsHod);

await browser.close();
console.log('done');
