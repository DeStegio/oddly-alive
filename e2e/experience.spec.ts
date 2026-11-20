import { expect, test, type Page } from '@playwright/test';
import { SECRETS } from '../src/content/secrets';

const ROOMS = ['', 'playground', 'garden', 'mood', 'secret', 'memory', 'after-hours', 'attic'];

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('oa-e2e')) {
      localStorage.clear();
      sessionStorage.setItem('oa-e2e', '1');
    }
  });
});

test('every room renders without errors or horizontal overflow', async ({ page }) => {
  const errors = collectErrors(page);
  for (const room of ROOMS) {
    await page.goto(`./#/${room}`);
    await expect(page.locator('main#scene')).toHaveAttribute('data-room', room || 'living');
    await expect(page.locator('main h1')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow, `overflow in ${room || 'living'}`).toBe(false);
  }
  expect(errors).toEqual([]);
});

test('first minute: poke things, type hello, find a secret', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('./');
  const lamp = page.getByRole('button', { name: /Lumen the floor lamp/ });
  await lamp.click();
  await expect(lamp).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: /pressed 0 times/ }).click();
  await expect(page.getByRole('button', { name: /pressed 1 times/ })).toBeVisible();
  await page.getByRole('button', { name: /Pim, a shy blob/ }).click();
  await page.locator('body').press('Escape');
  await page.keyboard.type('hello', { delay: 40 });
  await expect(page.getByText(/Secret found/)).toBeVisible();
  await expect(page.getByText('Hello, House')).toBeVisible();
  expect(errors).toEqual([]);
});

test('the keyhole secret: nudge the portrait, then the key appears in the Playground', async ({ page }) => {
  await page.goto('./');
  const portrait = page.getByRole('button', { name: /portrait of Great-Aunt Pim/ });
  for (let i = 0; i < 4; i++) await portrait.click();
  await expect(page.getByText('The Keyhole').first()).toBeVisible();
  await page.getByRole('navigation', { name: 'Rooms' }).locator('a[data-room="playground"]').click();
  await expect(page.getByRole('button', { name: /golden key/ })).toBeVisible();
});

test('keyboard only: skip link, operate a character, move between rooms', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard flow is desktop-only');
  await page.goto('./');
  await page.keyboard.press('Tab');
  await expect(page.getByText('Skip to the room')).toBeFocused();
  await page.keyboard.press('Enter');
  const pim = page.getByRole('button', { name: /Pim, a shy blob/ });
  await pim.focus();
  await page.keyboard.press('Enter');
  await page.getByRole('navigation', { name: 'Rooms' }).locator('a[data-room="playground"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('main#scene')).toHaveAttribute('data-room', 'playground');
  const ball = page.getByRole('button', { name: /bouncy coral ball/ });
  await ball.focus();
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter');
  await expect(ball).toBeFocused();
});

test('memory: discoveries survive a reload and Forget me erases them', async ({ page }) => {
  await page.goto('./');
  await page.keyboard.type('hello', { delay: 40 });
  await expect(page.getByText('Hello, House').first()).toBeVisible();
  await page.waitForTimeout(300);
  await page.goto('./#/memory');
  await page.reload();
  await expect(page.getByText(`/ ${SECRETS.length}`).first()).toBeVisible();
  const stored = await page.evaluate(() => localStorage.getItem('oddly-alive:memory'));
  expect(stored).toContain('hello');
  await page.getByRole('button', { name: 'Forget me' }).click();
  await page.getByRole('button', { name: 'Yes, forget me' }).click();
  await expect(page.getByText(/Forgotten/)).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('oddly-alive:memory'))).toBeNull();
});

test('playground: drop, shake and reset', async ({ page }) => {
  await page.goto('./#/playground');
  const status = page.getByRole('status').filter({ hasText: 'things on the floor' });
  await expect(status).toBeVisible();
  const before = Number((await status.textContent())?.match(/\d+/)?.[0]);
  await page.getByRole('button', { name: 'Drop a ball', exact: true }).click();
  await expect(status).toContainText(`${before + 1} things`);
  await page.getByRole('button', { name: 'Shake' }).click();
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(status).toContainText(`${before} things`);
});

test('playground: a really hard throw leaves the tray; Bip volleys back what comes over', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('./#/playground');
  const status = page.getByRole('status').filter({ hasText: 'things on the floor' });
  await expect(status).toBeVisible();
  await page.waitForTimeout(1500);
  const count = async () => Number((await status.textContent())?.match(/\d+/)?.[0]);
  const fling = async (label: string, dx: number, dy: number) => {
    const shape = page.locator(`button[aria-label^="${label}"]`);
    // on phones the floor can sit under the bottom nav: bring it to the middle first
    await shape.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(150);
    const b = (await shape.boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    // big steps: the measured speed must stay well over the throw threshold even on a busy machine
    for (let i = 1; i <= 4; i++) await page.mouse.move(b.x + b.width / 2 + i * dx * 2.5, b.y + b.height / 2 + i * dy * 2.5);
    await page.mouse.up();
  };
  const start = await count();
  // to the right: over to Bip, who volleys it back
  await fling('a light lavender pebble', 120, -50);
  await expect.poll(count, { timeout: 6000 }).toBe(start - 1);
  await expect.poll(count, { timeout: 20_000 }).toBe(start);
  await expect(page.locator('section[aria-labelledby="pg-nextdoor-title"] p[aria-live]')).toContainText(/best\s*1/);
  // to the left: gone for good
  await fling('a bouncy coral ball', -120, -60);
  await expect.poll(count, { timeout: 6000 }).toBe(start - 1);
  await page.waitForTimeout(2500);
  expect(await count()).toBe(start - 1);
  // straight down, hard: through the floor and gone as well
  await fling('a heavy blue block', 10, 120);
  await expect.poll(count, { timeout: 6000 }).toBe(start - 2);
});

test('after hours: manual switch changes the whole house; stars connect', async ({ page }) => {
  await page.goto('./#/after-hours');
  await page.getByRole('button', { name: 'After Hours off' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');
  for (const n of [1, 2, 3, 4, 5]) {
    await page.locator(`button[aria-label^="Star ${n}"]`).first().click();
  }
  await expect(page.getByText(/You drew “/)).toBeVisible();
  await page.getByRole('button', { name: 'After Hours on' }).click();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'night');
});

test('reduced motion is respected and can be toggled', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
  await page.getByRole('button', { name: 'Reduced motion on' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'full');
});

test('a shared link reproduces the scene seed without carrying memory', async ({ page }) => {
  await page.goto('./#/?seed=abc12');
  const sky1 = await page.locator('button[aria-label^="A portrait"] rect').nth(2).getAttribute('fill');
  await page.goto('./#/?seed=abc12');
  await page.reload();
  const sky2 = await page.locator('button[aria-label^="A portrait"] rect').nth(2).getAttribute('fill');
  expect(sky1).toBe(sky2);
  await page.getByRole('button', { name: 'Share this scene' }).click();
  const link = await page.getByRole('dialog').locator('input').inputValue();
  expect(link).toContain('seed=abc12');
  expect(link).not.toMatch(/visit|discover|nick/);
});

test('navigation always works, even mid-reaction', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: /Dot, a small blue sphere/ }).click();
  await page.keyboard.type('dance', { delay: 30 });
  const nav = page.getByRole('navigation', { name: 'Rooms' });
  await nav.locator('a[data-room="memory"]').click();
  await expect(page.locator('main#scene')).toHaveAttribute('data-room', 'memory');
});
