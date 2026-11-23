import { expect, test, type Page } from '@playwright/test';

/**
 * Phase 3 baseline: the things each room already has, so the next phase can't
 * quietly lose one. Names come from the accessible tree, not CSS classes.
 */
const visit = async (page: Page, room: string) => {
  await page.goto(`./#/${room}`);
  await expect(page.locator('main#scene')).toHaveAttribute('data-room', room === '' ? 'living' : room);
};

test.describe('Phase 3 baseline: what every room already has', () => {
  test('Living Room: the cast, the button, the portrait, the lamp', async ({ page }) => {
    await visit(page, '');
    await expect(page.getByRole('button', { name: /Dot, a small blue sphere/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Lumen the floor lamp/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Tick the wall clock/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /portrait of Great-Aunt Pim/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /pressed \d+ times/ })).toBeVisible();
  });

  test('Playground: toys and Bip next door', async ({ page }) => {
    await visit(page, 'playground');
    await expect(page.getByLabel('Playground tools')).toBeAttached();
    await expect(page.getByRole('button', { name: /^Bip, the/ })).toBeVisible();
  });

  test('Garden: a bed, the sun, the seed tin, the jobs on the fence (Phase 4)', async ({ page }) => {
    await visit(page, 'garden');
    await expect(page.getByRole('gridcell')).toHaveCount(28);
    await expect(page.getByRole('slider', { name: /The sun/ })).toBeVisible();
    await expect(page.getByRole('group', { name: 'The seed tin' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Garden jobs' })).toBeVisible();
  });

  test('Weather Workshop: the valley, the sill, the barometer gauge (Phase 4)', async ({ page }) => {
    await visit(page, 'mood');
    await expect(page.getByRole('group', { name: 'The valley in the glass box' })).toBeVisible();
    await expect(page.getByLabel('Things on the windowsill')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Barometer' })).toBeVisible();
  });

  test('After Hours: stars, porch light, radio', async ({ page }) => {
    await visit(page, 'after-hours');
    await expect(page.locator('button[aria-label^="Star "]').first()).toBeAttached();
    await expect(page.getByRole('button', { name: /Porch light/ })).toBeAttached();
    await expect(page.getByRole('button', { name: /Radio/ })).toBeAttached();
  });

  test('Secret Space: the chest and the slots', async ({ page }) => {
    await visit(page, 'secret');
    await expect(page.getByLabel(/chest/)).toBeAttached();
  });

  test('Memory Room: the visit count', async ({ page }) => {
    await visit(page, 'memory');
    await expect(page.getByLabel(/\d+ visits?/).first()).toBeAttached();
  });

  test('Attic: the dusty attic, Marguerite, the Memory Board, the gramophone, the shadow sheet (Phase 4)', async ({ page }) => {
    await visit(page, 'attic');
    await expect(page.getByRole('group', { name: /The attic, under the dust/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Marguerite the dress form/ })).toBeAttached();
    await expect(page.getByRole('tab', { name: /the board/ }).or(page.getByRole('heading', { name: /^Memory Board/ }))).toBeVisible();
    await expect(page.getByRole('img', { name: /gramophone/i })).toBeAttached();
    await expect(page.getByRole('button', { name: /shadow theatre/ })).toBeAttached();
  });
});
