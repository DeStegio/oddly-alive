import { test } from '@playwright/test';

/**
 * Phase 4 art acceptance: every room at 0 s and 5 s after entry, day and night,
 * desktop and Pixel 7. Not a check (it never fails); run on purpose with
 *   SHOTS=after npx playwright test shots
 * and look at the pictures in docs/phase4/<SHOTS>/.
 */
const OUT = process.env.SHOTS;
const ROOMS = ['', 'playground', 'garden', 'mood', 'secret', 'memory', 'after-hours', 'attic'];

test.describe('screenshots', () => {
  test.skip(!OUT, 'set SHOTS=<folder> to capture');
  test.setTimeout(120_000);
  for (const theme of ['day', 'night'] as const) {
    test(`all rooms, ${theme}`, async ({ page }, info) => {
      await page.addInitScript((night) => {
        localStorage.clear();
        if (night) {
          const now = Date.now();
          localStorage.setItem('oddly-alive:memory', JSON.stringify({ version: 3, visits: 2, firstVisit: now, lastVisit: now, discoveries: {}, counts: {}, roomVisits: {}, eventTotals: {}, lastRoom: null, trust: 0.3, settings: { sound: false, motion: 'full', motionExplicit: false, afterHours: true }, world: {} }));
        }
      }, theme === 'night');
      for (const room of ROOMS) {
        await page.goto(`./#/${room}`);
        await page.waitForTimeout(150);
        const name = `${room || 'living'}-${info.project.name}-${theme}`;
        await page.screenshot({ path: `docs/phase4/${OUT}/${name}-0s.png` });
        if (theme === 'day') {
          await page.waitForTimeout(5000);
          await page.screenshot({ path: `docs/phase4/${OUT}/${name}-5s.png` });
        }
      }
    });
  }
});
