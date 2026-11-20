import { expect, test } from '@playwright/test';

test('app loads and every room is reachable from navigation', async ({ page }) => {
  await page.goto('./');
  const nav = page.getByRole('navigation', { name: 'Rooms' });
  await expect(nav).toBeVisible();
  for (const room of ['playground', 'garden', 'mood', 'secret', 'memory', 'after-hours', 'living']) {
    await nav.locator(`a[data-room="${room}"]`).click();
    await expect(page.locator('main#scene')).toHaveAttribute('data-room', room);
  }
});

test('the attic is unlisted until found, but its address always works', async ({ page }) => {
  await page.goto('./');
  const nav = page.getByRole('navigation', { name: 'Rooms' });
  await expect(nav.locator('a[data-room="attic"]')).toHaveCount(0);
  await page.goto('./#/attic');
  await expect(page.locator('main#scene')).toHaveAttribute('data-room', 'attic');
  await expect(nav.locator('a[data-room="attic"]')).toHaveCount(1);
});
