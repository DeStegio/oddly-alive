import { expect, test, type Page } from '@playwright/test';
import { COMMISSIONS } from '../src/content/garden';
import { POSTCARDS } from '../src/content/postcards';

/**
 * Phase 4, law L8 ("the first second"), measured. For each of the three
 * rebuilt rooms, a scripted player who acts as soon as the page lets them:
 *  - affordance: the obvious thing to touch is on screen (in the viewport)
 *  - action: their first meaningful action has landed
 *  - surprise: the system does something on its own that follows from it
 *  - solved: the first goal is solved by the intended path
 * Times are from navigation, in ms, printed as [L8] lines. They measure what
 * the room allows, not how long a person takes to think (see the plan).
 */
const clear = async (page: Page) =>
  page.addInitScript(() => {
    if (sessionStorage.getItem('l8')) return;
    sessionStorage.setItem('l8', '1');
    localStorage.clear();
  });

function clock() {
  const t0 = Date.now();
  const marks: Record<string, number> = {};
  return { mark: (k: string) => (marks[k] = Date.now() - t0), marks };
}

test('L8: the Garden', async ({ page, isMobile }) => {
  await clear(page);
  const c = clock();
  await page.goto('./#/garden');
  const packet = page.getByRole('button', { name: /^Sunflower seeds/ });
  await expect(packet).toBeInViewport();
  await expect(page.getByRole('grid')).toBeInViewport();
  c.mark('affordance');
  if (isMobile) await packet.tap();
  else await packet.click();
  await page.getByRole('gridcell', { name: /^4, 2:/ }).click();
  c.mark('action');
  const sun = page.getByRole('slider', { name: /The sun/ });
  await sun.press('Enter');
  await expect(page.getByRole('gridcell', { name: /^4, 2: sunflower, a sprout/ })).toBeVisible();
  c.mark('surprise');
  await sun.press('Enter');
  await sun.press('ArrowLeft');
  await sun.press('Enter');
  await expect(page.getByText(COMMISSIONS[0]!.thanks)).toBeVisible();
  c.mark('solved');
  console.log(`[L8] garden ${isMobile ? 'mobile' : 'desktop'} ${JSON.stringify(c.marks)}`);
  expect(c.marks.affordance!).toBeLessThan(5000);
  expect(c.marks.surprise!).toBeLessThan(15000);
  expect(c.marks.solved!).toBeLessThan(60000);
});

test('L8: the Weather Workshop', async ({ page, isMobile }) => {
  await clear(page);
  const c = clock();
  await page.goto('./#/mood');
  const cup = page.getByRole('button', { name: /^Teacup/ });
  await expect(cup).toBeInViewport();
  await expect(page.getByRole('group', { name: 'The valley in the glass box' })).toBeInViewport();
  c.mark('affordance');
  await cup.press('Enter');
  const box = page.getByRole('group', { name: 'The valley in the glass box' });
  for (let i = 0; i < 5; i++) await box.press('ArrowDown');
  await box.press('Enter');
  await expect(page.getByRole('button', { name: /^Teacup in the valley/ })).toBeVisible();
  c.mark('action');
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.weather), { timeout: 15_000 }).toBe('rain');
  c.mark('surprise');
  await expect(page.getByText(POSTCARDS[0]!.thanks)).toBeVisible({ timeout: 30_000 });
  c.mark('solved');
  console.log(`[L8] workshop ${isMobile ? 'mobile' : 'desktop'} ${JSON.stringify(c.marks)}`);
  expect(c.marks.affordance!).toBeLessThan(5000);
  expect(c.marks.surprise!).toBeLessThan(15000);
  expect(c.marks.solved!).toBeLessThan(60000);
});

test('L8: the Attic', async ({ page, isMobile }) => {
  await clear(page);
  const c = clock();
  await page.goto('./#/attic');
  const scene = page.getByRole('group', { name: /The attic, under the dust/ });
  await expect(scene).toBeInViewport();
  await expect(page.getByText(/Who was I wearing/)).toBeVisible();
  c.mark('affordance');
  // rub the dust off the photograph that fell (a real rub, across it, once it has landed)
  await page.waitForTimeout(1300);
  const box = (await scene.boundingBox())!;
  const ph = await page.evaluate(() => {
    const el = document.querySelector('[data-fall]') ?? document.querySelector('[aria-label="Something under the dust"]');
    const r = el?.getBoundingClientRect();
    return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width } : null;
  });
  const at = ph ?? { x: box.x + box.width * 0.3, y: box.y + box.height * 0.88, w: 40 };
  await page.mouse.move(at.x - at.w, at.y);
  await page.mouse.down();
  for (let i = 0; i < 6; i++) {
    await page.mouse.move(at.x + at.w, at.y - 6, { steps: 6 });
    await page.mouse.move(at.x - at.w, at.y + 6, { steps: 6 });
  }
  await page.mouse.up();
  await expect(page.getByRole('button', { name: /fell off a rafter/ })).toBeVisible({ timeout: 8000 });
  c.mark('action');
  // the next thing the house does: a name and a face (with the evidence that reveals them)
  for (let i = 0; i < 16 && !(await page.getByText('Odile Marchetti').first().isVisible().catch(() => false)); i++) await page.getByRole('button', { name: 'Dust the next thing' }).click();
  c.mark('surprise');
  if (isMobile) await page.getByRole('tab', { name: /the board/ }).click();
  for (const [name, who, later] of [
    ['Hat block', 'Odile Marchetti', 1],
    ['Tin of feathers', 'Odile Marchetti', 2],
    ['Wrist pin cushion', 'Odile Marchetti', 1],
  ] as const) {
    const card = page.getByRole('listitem').filter({ has: page.getByText(name, { exact: true }) });
    await card.getByRole('radio', { name: who }).click();
    for (let k = 0; k < later; k++) await card.getByRole('button', { name: 'Later' }).click();
  }
  await expect(page.getByText(/Remembered\./).first()).toBeVisible({ timeout: 5000 });
  c.mark('solved');
  console.log(`[L8] attic ${isMobile ? 'mobile' : 'desktop'} ${JSON.stringify(c.marks)}`);
  expect(c.marks.affordance!).toBeLessThan(5000);
  expect(c.marks.solved!).toBeLessThan(60000);
});
