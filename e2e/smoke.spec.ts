import { expect, test } from '@playwright/test';

test('app loads and every room is reachable from navigation', async ({ page }) => {
  await page.goto('./');
  const nav = page.getByRole('navigation', { name: 'Rooms' });
  await expect(nav).toBeVisible();
  for (const room of ['playground', 'mood', 'secret', 'memory', 'after-hours', 'living']) {
    await nav.locator(`a[data-room="${room}"]`).click();
    await expect(page.locator('main#scene')).toHaveAttribute('data-room', room);
  }
});
