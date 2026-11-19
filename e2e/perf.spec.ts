import { expect, test, type Page } from '@playwright/test';

// tracing records a screencast every frame and would distort the measurement
test.use({ trace: 'off' });

/**
 * A rough, honest performance probe in headless Chromium on this machine.
 * It is NOT a device benchmark. Frame timing is compared against a blank page
 * driven by the exact same synthetic input, which cancels out the cost of the
 * test harness itself; long tasks and DOM growth are checked in absolute terms.
 */
async function probe(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __perf: { frames: number[]; long: number } };
    w.__perf = { frames: [], long: 0 };
    let last = performance.now();
    const loop = (t: number) => {
      w.__perf.frames.push(t - last);
      last = t;
      if (w.__perf.frames.length < 300) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) if (e.duration > 50) w.__perf.long++;
      }).observe({ type: 'longtask', buffered: false });
    } catch {
      /* not supported */
    }
  });
  for (let i = 0; i < 50; i++) await page.mouse.move(200 + (i % 20) * 50, 300 + Math.sin(i / 3) * 200, { steps: 4 });
  await page.waitForTimeout(600);
  return page.evaluate(() => {
    const p = (window as unknown as { __perf: { frames: number[]; long: number } }).__perf;
    const f = p.frames.slice(5).sort((a, b) => a - b);
    return { median: f[Math.floor(f.length / 2)] ?? 0, p95: f[Math.floor(f.length * 0.95)] ?? 0, long: p.long, nodes: document.getElementsByTagName('*').length };
  });
}

test('living room: frame pacing vs. a blank page under the same input; no long tasks', async ({ page, isMobile }) => {
  test.skip(isMobile, 'pointer sweep is desktop-only');
  await page.setContent('<html><body style="margin:0;height:100vh"></body></html>');
  const base = await probe(page);
  await page.goto('./');
  await page.waitForTimeout(1500);
  const app = await probe(page);
  console.log(
    `[perf] blank median ${base.median.toFixed(1)} ms | app median ${app.median.toFixed(1)} ms, p95 ${app.p95.toFixed(1)} ms, long tasks ${app.long}, DOM nodes ${app.nodes}`,
  );
  expect(app.median).toBeLessThanOrEqual(Math.max(base.median * 1.3, 20));
  expect(app.long).toBeLessThan(5);
  expect(app.nodes).toBeLessThan(2500);
});

test('visiting every room repeatedly does not grow the DOM', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop-only');
  await page.goto('./');
  const rooms = ['playground', 'mood', 'secret', 'memory', 'after-hours', ''];
  const counts: number[] = [];
  for (let round = 0; round < 3; round++) {
    for (const r of rooms) {
      await page.evaluate((h) => (location.hash = '#/' + h), r);
      await page.waitForTimeout(350);
    }
    counts.push(await page.evaluate(() => document.getElementsByTagName('*').length));
  }
  console.log(`[perf] DOM nodes after each round: ${counts.join(', ')}`);
  expect(Math.abs(counts[2]! - counts[1]!)).toBeLessThan(40);
});
