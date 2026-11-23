import { expect, test, type Page } from '@playwright/test';
import { COMMISSIONS } from '../src/content/garden';

/**
 * Phase 4 Garden, played for real: each commission's stored solution is
 * performed through the UI the way a player would (tap a packet, tap a cell,
 * drag the sun along the sky and let go). Desktop uses the mouse; Pixel 7
 * uses touch pointers.
 */
const STOP: Record<string, [number, number]> = { evening: [288, 187], noon: [500, 60], morning: [712, 187], night: [500, 325] };
const SPECIES: Record<string, RegExp> = { sunflower: /^Sunflower seeds/, moonflower: /^Moonflower seeds/, radish: /^Radish seeds/, mint: /^Mint seeds/, snapdragon: /^Snapdragon seeds/, creeper: /^Creeper seeds/ };

async function seed(page: Page, solved: string[]) {
  await page.addInitScript((ids) => {
    if (sessionStorage.getItem('garden-seeded')) return;
    sessionStorage.setItem('garden-seeded', '1');
    localStorage.clear();
    const now = Date.now();
    localStorage.setItem(
      'oddly-alive:memory',
      JSON.stringify({ version: 3, visits: 1, firstVisit: now, lastVisit: now, discoveries: {}, counts: {}, roomVisits: {}, eventTotals: {}, lastRoom: 'garden', trust: 0.3, settings: { sound: false, motion: 'full', motionExplicit: false, afterHours: false }, world: { garden2: { solved: ids, herbarium: [], barrel: 0 } } }),
    );
  }, solved);
}

async function tap(page: Page, isMobile: boolean, loc: ReturnType<Page['getByRole']>) {
  if (isMobile) await loc.tap();
  else await loc.click();
}

/** Drag the sun to a stop on the arc and let go (one day). */
async function sunTo(page: Page, isMobile: boolean, stop: string) {
  const sun = page.getByRole('slider', { name: /The sun/ });
  const sky = page.locator('svg[viewBox="0 0 1000 340"]');
  const box = (await sky.boundingBox())!;
  const s = (await sun.boundingBox())!;
  const [sx, sy] = STOP[stop]!;
  const tx = box.x + (sx / 1000) * box.width;
  const ty = box.y + (sy / 340) * box.height;
  const from = { x: s.x + s.width / 2, y: s.y + s.height / 2 };
  if (!isMobile) {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move((from.x + tx) / 2, (from.y + ty) / 2, { steps: 4 });
    await page.mouse.move(tx, ty, { steps: 4 });
    await page.mouse.up();
    return;
  }
  const ev = (type: string, x: number, y: number) => sun.dispatchEvent(type, { pointerId: 7, pointerType: 'touch', isPrimary: true, button: 0, buttons: type === 'pointerup' ? 0 : 1, clientX: x, clientY: y, bubbles: true });
  await ev('pointerdown', from.x, from.y);
  await ev('pointermove', (from.x + tx) / 2, (from.y + ty) / 2);
  await ev('pointermove', tx, ty);
  await ev('pointerup', tx, ty);
}

async function play(page: Page, isMobile: boolean, moves: string[]) {
  for (const m of moves) {
    const [verb, a, b, c] = m.split(' ');
    if (verb === 'plant') {
      const packet = page.getByRole('button', { name: SPECIES[a!] ?? new RegExp(a!.replace(/:/g, '.')) });
      if ((await packet.getAttribute('aria-pressed')) !== 'true') await tap(page, isMobile, packet);
      await tap(page, isMobile, page.getByRole('gridcell', { name: new RegExp(`^${Number(b) + 1}, ${Number(c) + 1}:`) }));
    } else if (verb === 'water') {
      await tap(page, isMobile, page.getByRole('button', { name: /The rain barrel/ }));
      await tap(page, isMobile, page.getByRole('gridcell', { name: new RegExp(`^${Number(a) + 1}, 1:`) }));
    } else if (verb === 'day') {
      const past = page.getByRole('button', { name: /Go back to the start of day/ });
      const before = await past.count();
      await sunTo(page, isMobile, a!);
      await expect(past).toHaveCount(before + 1);
    }
  }
}

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (e) => {
    throw e;
  });
});

for (const id of ['facing', 'night-flower', 'same-night', 'picture']) {
  test(`garden: job "${id}" played through the UI`, async ({ page, isMobile }) => {
    const i = COMMISSIONS.findIndex((c) => c.id === id);
    const c = COMMISSIONS[i]!;
    await seed(
      page,
      COMMISSIONS.slice(0, i).map((x) => x.id),
    );
    await page.goto('./#/garden');
    await expect(page.locator('main#scene')).toHaveAttribute('data-room', 'garden');
    await expect(page.getByText(c.ask)).toBeVisible();
    await play(page, isMobile, c.solution);
    await expect(page.getByText(c.thanks)).toBeVisible();
    await expect(page.getByRole('button', { name: /next job/ })).toBeVisible();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('oddly-alive:memory') || '{}').world?.garden2?.solved ?? []), { timeout: 8000 }).toContain(id);
  });
}

test('garden: a wrong answer, then the sun goes back', async ({ page, isMobile }) => {
  await seed(page, []);
  await page.goto('./#/garden');
  await play(page, isMobile, ['plant sunflower 3 1', 'day noon', 'day noon', 'day noon', 'day noon']);
  await expect(page.getByText(COMMISSIONS[0]!.fail)).toBeVisible();
  await tap(page, isMobile, page.getByRole('button', { name: /Take the sun back one day/ }));
  await play(page, isMobile, ['day evening']);
  await expect(page.getByText(COMMISSIONS[0]!.thanks)).toBeVisible();
});
