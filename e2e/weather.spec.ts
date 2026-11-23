import { expect, test, type Page } from '@playwright/test';
import { POSTCARDS } from '../src/content/postcards';

/**
 * Phase 4 Weather Workshop, played for real: drag a tool off the sill into
 * the valley (mouse on desktop, touch pointers on Pixel 7), let the weather
 * happen, and check the postcard is answered and the house weather follows.
 */
async function fresh(page: Page, solved: string[] = []) {
  await page.addInitScript((ids) => {
    if (sessionStorage.getItem('wx-seeded')) return;
    sessionStorage.setItem('wx-seeded', '1');
    localStorage.clear();
    const now = Date.now();
    localStorage.setItem('oddly-alive:memory', JSON.stringify({ version: 3, visits: 1, firstVisit: now, lastVisit: now, discoveries: {}, counts: {}, roomVisits: {}, eventTotals: {}, lastRoom: 'mood', trust: 0.3, settings: { sound: false, motion: 'full', motionExplicit: false, afterHours: false }, world: { workshop: { solved: ids, sandbox: '' } } }));
  }, solved);
}

/** Drag a sill tool to (fx, fy) of the glass box (fractions). */
async function dragTool(page: Page, isMobile: boolean, name: RegExp, fx: number, fy: number) {
  const from = (await page.getByRole('button', { name }).first().boundingBox())!;
  const box = (await page.getByRole('group', { name: 'The valley in the glass box' }).boundingBox())!;
  const a = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
  const b = { x: box.x + box.width * fx, y: box.y + box.height * fy };
  if (!isMobile) {
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 8 });
    await page.mouse.up();
    return;
  }
  const tool = page.getByRole('button', { name }).first();
  await tool.dispatchEvent('pointerdown', { pointerId: 3, pointerType: 'touch', isPrimary: true, button: 0, buttons: 1, clientX: a.x, clientY: a.y, bubbles: true });
  await page.evaluate(
    ([x, y]) => {
      for (const t of ['pointermove', 'pointerup']) window.dispatchEvent(new PointerEvent(t, { pointerId: 3, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true }));
    },
    [b.x, b.y],
  );
}

test('workshop: postcard 1 — a teacup low in the valley makes Nimbus a cloud', async ({ page, isMobile }) => {
  await fresh(page);
  await page.goto('./#/mood');
  await expect(page.getByText(POSTCARDS[0]!.text)).toBeVisible();
  // nothing here picks the weather
  await expect(page.getByRole('button', { name: /^rain$/i })).toHaveCount(0);
  await dragTool(page, isMobile, /^Teacup/, 11.5 / 24, 10.4 / 12);
  await expect(page.getByRole('button', { name: /^Teacup in the valley/ })).toBeVisible();
  await expect(page.getByText(POSTCARDS[0]!.thanks)).toBeVisible({ timeout: 20_000 });
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('oddly-alive:memory') || '{}').world?.workshop?.solved ?? []), { timeout: 8000 }).toContain('a-cloud');
});

test('workshop: the valley is the house weather (rain in the sandbox → rain on every window)', async ({ page, isMobile }) => {
  await fresh(page);
  await page.goto('./#/mood');
  await page.getByRole('button', { name: /The sandbox valley/ }).click();
  await dragTool(page, isMobile, /^Teacup/, 11.5 / 24, 10.4 / 12);
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.weather), { timeout: 20_000 }).toBe('rain');
  // the barometer says so, in words
  await expect(page.getByRole('region', { name: 'Barometer' })).toContainText(/rain/i, { timeout: 10_000 });
});
