import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const ROOMS = ['', 'playground', 'mood', 'secret', 'memory', 'after-hours'];

for (const room of ROOMS) {
  test(`no serious accessibility violations: ${room || 'living'}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`./#/${room}`);
    await page.waitForTimeout(900);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    if (serious.length) console.log(JSON.stringify(serious.map((v) => ({ id: v.id, nodes: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) })), null, 2));
    expect(serious).toEqual([]);
  });
}
