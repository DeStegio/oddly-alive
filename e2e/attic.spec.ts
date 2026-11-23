import { expect, test, type Page } from '@playwright/test';
import { RESIDENTS, THINGS, TWIST } from '../src/content/attic';
import { PLAYTHROUGH } from '../src/rooms/Attic/mystery/playthrough';

/**
 * Phase 4 attic, played through the UI: uncover evidence, pin things on the
 * Memory Board with a person and a decade, open the trunk with the year.
 * Desktop plays the whole stored playthrough; Pixel 7 plays act 1 by touch.
 */
const DECADE_INDEX: Record<string, number> = { '1920': 1, '1930': 2, '1940': 3, '1950': 4, '1960': 5, '1970': 6, '1980': 7 };

async function fresh(page: Page) {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('attic-seeded')) return;
    sessionStorage.setItem('attic-seeded', '1');
    localStorage.clear();
  });
}

async function press(page: Page, isMobile: boolean, loc: ReturnType<Page['getByRole']>) {
  if (isMobile) await loc.tap();
  else await loc.click();
}

/** Dust until nothing more can be found in the open part of the attic. */
async function dustEverything(page: Page, isMobile: boolean, times: number) {
  if (isMobile) await press(page, isMobile, page.getByRole('tab', { name: 'the attic' }));
  for (let i = 0; i < times; i++) await press(page, isMobile, page.getByRole('button', { name: 'Dust the next thing' }));
}

async function pinOnBoard(page: Page, isMobile: boolean, thing: string, owner: string, decade: string) {
  if (isMobile) await press(page, isMobile, page.getByRole('tab', { name: /the board/ }));
  const t = THINGS.find((x) => x.id === thing)!;
  const r = RESIDENTS.find((x) => x.id === owner)!;
  const card = page.getByRole('listitem').filter({ has: page.getByText(t.name, { exact: true }) });
  await press(page, isMobile, card.getByRole('radio', { name: r.name }));
  for (let i = 0; i < DECADE_INDEX[decade]!; i++) await press(page, isMobile, card.getByRole('button', { name: 'Later' }));
}

test('attic: the first second (a photo falls; Marguerite asks)', async ({ page }) => {
  await fresh(page);
  await page.goto('./#/attic');
  await expect(page.getByText(/Who was I wearing/)).toBeVisible({ timeout: 4000 });
  await expect(page.getByRole('group', { name: /The attic, under the dust/ })).toBeInViewport();
});

test('attic: act 1 solved through the board', async ({ page, isMobile }) => {
  await fresh(page);
  await page.goto('./#/attic');
  await dustEverything(page, isMobile, 16);
  for (const m of PLAYTHROUGH.filter((x) => x.startsWith('pin')).slice(0, 5)) {
    const [, thing, owner, decade] = m.split(' ');
    await pinOnBoard(page, isMobile, thing!, owner!, decade!);
    await page.waitForTimeout(1000);
  }
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('oddly-alive:memory') || '{}').world?.board?.act ?? 0), { timeout: 8000 }).toBe(2);
});

test('attic: the whole mystery, start to finish (desktop)', async ({ page, isMobile }) => {
  test.skip(isMobile, 'the full playthrough runs on desktop; phones play act 1 above');
  test.setTimeout(120_000);
  await fresh(page);
  await page.goto('./#/attic');
  const pins = PLAYTHROUGH.filter((x) => x.startsWith('pin'));
  // act by act: dust what's open, pin it, let the board settle
  for (const [from, to] of [
    [0, 5],
    [5, 10],
    [10, 15],
  ] as const) {
    await dustEverything(page, false, 22);
    if (from === 10) {
      // the trunk: the year the night nurse moved in
      const dials = page.getByRole('spinbutton');
      for (const [i, target] of [
        [2, 7],
        [3, 1],
      ] as const) {
        const now = Number(await dials.nth(i).getAttribute('aria-valuenow'));
        for (let k = 0; k < (target - now + 10) % 10; k++) await dials.nth(i).click();
      }
      await expect(page.getByText(/lavender and pencil shavings/)).toBeVisible();
    }
    for (const m of pins.slice(from, to)) {
      const [, thing, owner, decade] = m.split(' ');
      await pinOnBoard(page, false, thing!, owner!, decade!);
      await page.waitForTimeout(950);
    }
  }
  await expect(page.getByText(TWIST[0]!)).toBeVisible({ timeout: 8000 });
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('oddly-alive:memory') || '{}').world?.board?.locked?.length ?? 0), { timeout: 8000 }).toBe(15);
});
