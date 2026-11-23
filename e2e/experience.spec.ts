import { expect, test, type Page } from '@playwright/test';
import { SECRETS } from '../src/content/secrets';

const ROOMS = ['', 'playground', 'garden', 'mood', 'secret', 'memory', 'after-hours', 'attic'];

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('oa-e2e')) {
      localStorage.clear();
      sessionStorage.setItem('oa-e2e', '1');
    }
  });
});

test('every room renders without errors or horizontal overflow', async ({ page }) => {
  const errors = collectErrors(page);
  for (const room of ROOMS) {
    await page.goto(`./#/${room}`);
    await expect(page.locator('main#scene')).toHaveAttribute('data-room', room || 'living');
    await expect(page.locator('main h1')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow, `overflow in ${room || 'living'}`).toBe(false);
  }
  expect(errors).toEqual([]);
});

test('first minute: poke things, type hello, find a secret', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('./');
  const lamp = page.getByRole('button', { name: /Lumen the floor lamp/ });
  await lamp.click();
  await expect(lamp).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: /pressed 0 times/ }).click();
  await expect(page.getByRole('button', { name: /pressed 1 times/ })).toBeVisible();
  await page.getByRole('button', { name: /Pim, a shy blob/ }).click();
  await page.locator('body').press('Escape');
  await page.keyboard.type('hello', { delay: 40 });
  await expect(page.getByText(/Secret found/)).toBeVisible();
  await expect(page.getByText('Hello, House')).toBeVisible();
  expect(errors).toEqual([]);
});

test('the keyhole secret: nudge the portrait, then the key appears in the Playground', async ({ page }) => {
  await page.goto('./');
  const portrait = page.getByRole('button', { name: /portrait of Great-Aunt Pim/ });
  for (let i = 0; i < 4; i++) await portrait.click();
  await expect(page.getByText('The Keyhole').first()).toBeVisible();
  await page.getByRole('navigation', { name: 'Rooms' }).locator('a[data-room="playground"]').click();
  await expect(page.getByRole('button', { name: /golden key/ })).toBeVisible();
});

test('keyboard only: skip link, operate a character, move between rooms', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard flow is desktop-only');
  await page.goto('./');
  await page.keyboard.press('Tab');
  await expect(page.getByText('Skip to the room')).toBeFocused();
  await page.keyboard.press('Enter');
  const pim = page.getByRole('button', { name: /Pim, a shy blob/ });
  await pim.focus();
  await page.keyboard.press('Enter');
  await page.getByRole('navigation', { name: 'Rooms' }).locator('a[data-room="playground"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('main#scene')).toHaveAttribute('data-room', 'playground');
  const ball = page.getByRole('button', { name: /bouncy coral ball/ });
  await ball.focus();
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter');
  await expect(ball).toBeFocused();
});

test('memory: discoveries survive a reload and Forget me erases them', async ({ page }) => {
  await page.goto('./');
  await page.keyboard.type('hello', { delay: 40 });
  await expect(page.getByText('Hello, House').first()).toBeVisible();
  await page.waitForTimeout(300);
  await page.goto('./#/memory');
  await page.reload();
  await expect(page.getByText(`/ ${SECRETS.length}`).first()).toBeVisible();
  const stored = await page.evaluate(() => localStorage.getItem('oddly-alive:memory'));
  expect(stored).toContain('hello');
  await page.getByRole('button', { name: 'Forget me' }).click();
  await page.getByRole('button', { name: 'Yes, forget me' }).click();
  await expect(page.getByText(/Forgotten/)).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('oddly-alive:memory'))).toBeNull();
});

test('playground: drop, shake and reset', async ({ page }) => {
  await page.goto('./#/playground');
  const status = page.getByRole('status').filter({ hasText: 'things on the floor' });
  await expect(status).toBeVisible();
  const before = Number((await status.textContent())?.match(/\d+/)?.[0]);
  await page.getByRole('button', { name: 'Drop a ball', exact: true }).click();
  await expect(status).toContainText(`${before + 1} things`);
  await page.getByRole('button', { name: 'Shake' }).click();
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(status).toContainText(`${before} things`);
});

test('playground: a really hard throw leaves the tray; Bip volleys back what comes over', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('./#/playground');
  const status = page.getByRole('status').filter({ hasText: 'things on the floor' });
  await expect(status).toBeVisible();
  await page.waitForTimeout(1500);
  const count = async () => Number((await status.textContent())?.match(/\d+/)?.[0]);
  const fling = async (label: string, dx: number, dy: number) => {
    const shape = page.locator(`button[aria-label^="${label}"]`);
    // on phones the floor can sit under the bottom nav: bring it to the middle first
    await shape.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(150);
    const b = (await shape.boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    // big steps: the measured speed must stay well over the throw threshold even on a busy machine
    for (let i = 1; i <= 4; i++) await page.mouse.move(b.x + b.width / 2 + i * dx * 2.5, b.y + b.height / 2 + i * dy * 2.5);
    await page.mouse.up();
  };
  const start = await count();
  // to the right: over to Bip, who volleys it back
  await fling('a light lavender pebble', 120, -50);
  await expect.poll(count, { timeout: 6000 }).toBe(start - 1);
  await expect.poll(count, { timeout: 20_000 }).toBe(start);
  // (on a busy machine Bip may miss and serve it back instead; the volley itself is unit-tested in flight.test.ts)
  // to the left: gone for good
  await fling('a bouncy coral ball', -120, -60);
  await expect.poll(count, { timeout: 6000 }).toBe(start - 1);
  await page.waitForTimeout(2500);
  expect(await count()).toBe(start - 1);
  // straight down, hard: through the floor and gone as well
  await fling('a heavy blue block', 10, 120);
  await expect.poll(count, { timeout: 6000 }).toBe(start - 2);
});

test('after hours: manual switch changes the whole house; stars connect', async ({ page }) => {
  await page.goto('./#/after-hours');
  await page.getByRole('button', { name: 'After Hours off' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');
  for (const n of [1, 2, 3, 4, 5]) {
    await page.locator(`button[aria-label^="Star ${n}"]`).first().click();
  }
  await expect(page.getByText(/You drew “/)).toBeVisible();
  await page.getByRole('button', { name: 'After Hours on' }).click();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'night');
});

test('reduced motion is respected and can be toggled', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
  await page.getByRole('button', { name: 'Reduced motion on' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'full');
});

test('a shared link reproduces the scene seed without carrying memory', async ({ page }) => {
  await page.goto('./#/?seed=abc12');
  const sky1 = await page.locator('button[aria-label^="A portrait"] rect').nth(2).getAttribute('fill');
  await page.goto('./#/?seed=abc12');
  await page.reload();
  const sky2 = await page.locator('button[aria-label^="A portrait"] rect').nth(2).getAttribute('fill');
  expect(sky1).toBe(sky2);
  await page.getByRole('button', { name: 'Share this scene' }).click();
  const link = await page.getByRole('dialog').locator('input').inputValue();
  expect(link).toContain('seed=abc12');
  expect(link).not.toMatch(/visit|discover|nick/);
});

test('navigation always works, even mid-reaction', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: /Dot, a small blue sphere/ }).click();
  await page.keyboard.type('dance', { delay: 30 });
  const nav = page.getByRole('navigation', { name: 'Rooms' });
  await nav.locator('a[data-room="memory"]').click();
  await expect(page.locator('main#scene')).toHaveAttribute('data-room', 'memory');
});



test('characters act on their own: Dot walks over and presses the button', async ({ page }) => {
  await page.goto('./');
  await page.mouse.move(5, 300);
  await expect.poll(() => page.evaluate(() => typeof (window as unknown as { __oddly?: object }).__oddly), { timeout: 15_000 }).toBe('object');
  await page.waitForTimeout(4500); // the visitor has to be quiet for a moment
  type Hook = { force: (id: string) => boolean; agentLog: () => Array<{ goal: string; event: string; outcome?: string }> };
  await page.evaluate(() => (window as unknown as { __oddly: Hook }).__oddly.force('dot.press-button'));
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __oddly: Hook }).__oddly.agentLog().find((l) => l.goal === 'dot.press-button' && l.event === 'end')?.outcome), { timeout: 12_000 })
    .toBe('pressed');
});

test.describe('the button that fights back', () => {
  const shieldUp = async (page: Page) => {
    await page.goto('./');
    const btn = page.getByRole('button', { name: /pressed \d+ times/ });
    await btn.scrollIntoViewIfNeeded();
    const glass = page.getByRole('slider', { name: /Protective glass/ });
    // a wary button sometimes ducks: keep at it until the glass is up
    for (let i = 0; i < 8 && !(await glass.count()); i++) {
      await btn.click({ force: true });
      if (/behind glass/.test((await btn.getAttribute('aria-label')) ?? '')) break;
    }
    await expect(glass).toBeVisible({ timeout: 4000 });
    return { btn, glass };
  };

  test('impatience brings up the glass; the glass takes the presses', async ({ page }) => {
    const { btn } = await shieldUp(page);
    const b = (await btn.boundingBox())!;
    const hit = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.getAttribute('role'), [b.x + b.width / 2, b.y + b.height / 2]);
    expect(hit).toBe('slider');
    const before = (await btn.getAttribute('aria-label'))!.match(/pressed (\d+) times/)![1];
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    await expect(btn).toHaveAccessibleName(new RegExp(`pressed ${before} times`));
  });

  test('keyboard: loosen both bolts, the glass falls, and a press while it hides gets through', async ({ page }) => {
    const { btn } = await shieldUp(page);
    for (const side of ['left', 'right']) {
      const bolt = page.getByRole('button', { name: new RegExp(`Bolt on the ${side}`) });
      await bolt.focus();
      for (let i = 0; i < 3 && (await bolt.count()); i++) await page.keyboard.press('Enter');
    }
    await expect(page.getByRole('slider', { name: /Protective glass/ })).toHaveCount(0);
    const before = Number((await btn.getAttribute('aria-label'))!.match(/pressed (\d+) times/)![1]);
    await btn.focus();
    await page.keyboard.press('Enter');
    await expect(btn).toHaveAccessibleName(new RegExp(`pressed ${before + 1} times`));
  });

  test('ask Dot: Dot pries the glass off', async ({ page }) => {
    await shieldUp(page);
    const dot = page.getByRole('button', { name: /Dot, a small blue sphere/ });
    await dot.focus();
    await page.keyboard.press('Enter');
    type Hook = { agentLog: () => Array<{ goal: string; event: string }> };
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { __oddly: Hook }).__oddly.agentLog().some((l) => l.goal === 'dot.pry-glass')), { timeout: 8000 })
      .toBe(true);
    await expect(page.getByRole('button', { name: /okay fine|i said no/ })).toBeVisible();
  });
});

test.describe('Living Room incidents', () => {
  type Hook = { force: (id: string) => boolean; agentLog: () => Array<{ goal: string; event: string; outcome?: string }> };
  const force = (page: Page, id: string) => page.evaluate((g) => (window as unknown as { __oddly: Hook }).__oddly.force(g), id);
  const outcome = (page: Page, id: string) =>
    page.evaluate((g) => (window as unknown as { __oddly: Hook }).__oddly.agentLog().filter((l) => l.goal === g && l.event === 'end').at(-1)?.outcome ?? null, id);
  const ready = async (page: Page) => {
    await page.goto('./');
    await page.mouse.move(5, 300);
    await expect.poll(() => page.evaluate(() => typeof (window as unknown as { __oddly?: object }).__oddly), { timeout: 15_000 }).toBe('object');
  };

  test('the sofa: Dot takes the cushion, and you can put it back', async ({ page }) => {
    await ready(page);
    expect(await force(page, 'incident.sofa')).toBe(true);
    const cushion = page.getByRole('button', { name: /The sofa cushion/ });
    await expect(cushion).toHaveAccessibleName(/Dot has it/, { timeout: 12_000 });
    await cushion.focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => outcome(page, 'incident.sofa'), { timeout: 6000 }).toBe('visitor returned it');
    await expect(cushion).toHaveAccessibleName(/where it belongs/);
  });

  test('the teacup: Dot hides it behind the plant, and the plant gives it away', async ({ page }) => {
    await ready(page);
    expect(await force(page, 'incident.teacup')).toBe(true);
    const cup = page.getByRole('button', { name: /teacup/ });
    await expect(cup).toHaveAccessibleName(/behind the plant/, { timeout: 15_000 });
    const plant = page.getByRole('button', { name: /Ferdinand/ });
    await plant.focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => outcome(page, 'incident.teacup'), { timeout: 6000 }).toBe('found behind the plant');
  });

  test('the spotlight: move it to someone else from the keyboard', async ({ page }) => {
    await ready(page);
    expect(await force(page, 'incident.spotlight')).toBe(true);
    const pool = page.getByRole('button', { name: /Lumen’s spotlight/ });
    await expect(pool).toBeVisible({ timeout: 4000 });
    const before = await pool.getAttribute('aria-label');
    await pool.focus();
    await page.keyboard.press('Enter');
    await expect(pool).not.toHaveAccessibleName(before!);
    await expect.poll(() => outcome(page, 'incident.spotlight'), { timeout: 20_000 }).toMatch(/^redirected to /);
  });
});

test.describe('Infinite Rooms', () => {
  test('into the little painting, two rooms deep, back out, and home (focus comes back)', async ({ page }) => {
    await page.goto('./');
    const frame = page.getByRole('button', { name: /very small painting/ });
    await frame.scrollIntoViewIfNeeded();
    await frame.click();
    const dlg = page.getByRole('dialog', { name: 'Infinite Rooms' });
    await expect(dlg).toBeVisible();
    await expect(dlg).toHaveAttribute('data-depth', '1');
    await page.getByRole('button', { name: /Zoom in/ }).click();
    await expect(dlg).toHaveAttribute('data-depth', '2', { timeout: 4000 });
    await page.keyboard.press('+');
    await expect(dlg).toHaveAttribute('data-depth', '3', { timeout: 4000 });
    // the rooms are the same every time for the same seed: a different kind each step
    const kinds = await dlg.getAttribute('data-archetype');
    expect(kinds).toBeTruthy();
    await page.keyboard.press('-');
    await expect(dlg).toHaveAttribute('data-depth', '2', { timeout: 4000 });
    await page.getByRole('button', { name: 'Home' }).click();
    await expect(dlg).toHaveCount(0, { timeout: 3000 });
    await expect(frame).toBeFocused();
  });

  test('a hundred rooms in and out without the page growing', async ({ page }) => {
    test.skip(test.info().project.name !== 'desktop');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('./');
    await page.getByRole('button', { name: /very small painting/ }).click();
    const dlg = page.getByRole('dialog', { name: 'Infinite Rooms' });
    await expect(dlg).toBeVisible();
    const count = () => page.evaluate(() => document.querySelectorAll('*').length);
    const before = await count();
    for (let i = 0; i < 100; i++) await page.keyboard.press('+');
    await expect(dlg).toHaveAttribute('data-depth', '101');
    for (let i = 0; i < 100; i++) await page.keyboard.press('-');
    await expect(dlg).toHaveAttribute('data-depth', '1');
    expect(Math.abs((await count()) - before)).toBeLessThan(before * 0.15);
    await page.keyboard.press('Escape');
    await expect(dlg).toHaveCount(0, { timeout: 3000 });
  });
});

test.describe('Back-Fence Volley', () => {
  test('serve straight away; a point gets scored; the ball can be swapped between points', async ({ page }) => {
    await page.goto('./#/playground');
    const court = page.getByRole('group', { name: /Back-Fence Volley/ });
    await court.scrollIntoViewIfNeeded();
    await court.focus();
    await page.keyboard.press('Space');
    await expect(page.locator('#volley-line')).toHaveText('served.');
    // nobody swings: the point goes somewhere within a few seconds
    await expect(page.locator('#volley-line')).not.toHaveText('served.', { timeout: 8000 });
    const balloon = page.getByRole('group', { name: 'What to play with' }).getByRole('button', { name: 'Balloon', exact: true });
    await expect(balloon).toBeEnabled({ timeout: 4000 });
    await balloon.click();
    await expect(balloon).toHaveAttribute('aria-pressed', 'true');
  });

  test('swinging under the ball keeps a rally going', async ({ page }) => {
    test.skip(test.info().project.name !== 'desktop');
    test.setTimeout(100_000);
    await page.goto('./#/playground');
    const court = page.getByRole('group', { name: /Back-Fence Volley/ });
    await court.scrollIntoViewIfNeeded();
    const box = (await court.boundingBox())!;
    await court.click({ position: { x: 150, y: 200 } });
    let best = 0;
    // a scripted (imperfect) player against a random Bip: give it time, stop as soon as it works
    for (let i = 0; i < 900 && best < 2; i++) {
      const s = await page.evaluate(() => {
        const b = document.querySelector('section[aria-labelledby="volley-title"] [data-material]') as HTMLElement;
        const d = document.querySelector('section[aria-labelledby="volley-title"] [data-swing]') as HTMLElement;
        const rb = b.getBoundingClientRect();
        const rd = d.getBoundingClientRect();
        const rally = document.querySelector('section[aria-labelledby="volley-title"] p[aria-live]')?.textContent?.match(/rally (\d+)/)?.[1];
        return { bx: rb.left + rb.width / 2, by: rb.top + rb.height / 2, dx: rd.left + rd.width / 2, dy: rd.top, rally: Number(rally ?? 0) };
      });
      best = Math.max(best, s.rally);
      if (s.bx < box.x + box.width / 2) {
        await page.mouse.move(s.bx - 10, box.y + box.height * 0.6);
        if (Math.hypot(s.bx - s.dx, s.by - s.dy) < box.width * 0.09) {
          await page.mouse.down();
          await page.mouse.up();
        }
      }
      await page.waitForTimeout(25);
    }
    expect(best).toBeGreaterThanOrEqual(2);
  });
});

test('the shadow theatre: two hands make a bird (a memory); a hand turned upright, a rabbit (keyboard)', async ({ page }) => {
  await page.goto('./#/attic');
  await page.getByRole('button', { name: /shadow theatre/ }).click();
  const stage = page.locator('section[aria-labelledby="shadow-title"] [data-alive]');
  await stage.scrollIntoViewIfNeeded();
  const L = page.getByRole('button', { name: /^Left hand/ });
  const R = page.getByRole('button', { name: /^Right hand/ });
  // bring the right hand over to the left one, from the keyboard (works the same on a phone)
  await R.focus();
  for (let i = 0; i < 12 && !(await stage.getAttribute('data-alive')); i++) await page.keyboard.press('ArrowLeft');
  await expect(stage).toHaveAttribute('data-alive', 'bird', { timeout: 3000 });
  await expect(page.getByRole('dialog', { name: 'A memory in the shadow theatre' })).toBeVisible();
  await expect(stage).toHaveAttribute('data-alive', '', { timeout: 5000 });
  await L.focus();
  for (let i = 0; i < 6; i++) await page.keyboard.press('q');
  await expect(stage).toHaveAttribute('data-alive', 'rabbit', { timeout: 4000 });
});

test.describe('reactive atmospheres', () => {
  test('After Hours: a constellation plays as a tune, and lights up as it plays', async ({ page }) => {
    await page.goto('./#/after-hours');
    for (const i of [1, 2, 3, 4, 5, 6]) await page.locator(`button[aria-label^="Star ${i}"]`).first().click();
    await expect(page.locator('section[data-singing="true"]')).toHaveCount(1, { timeout: 4000 });
    await expect(page.locator('button[data-sounding="true"]')).toHaveCount(1, { timeout: 4000 });
    await expect(page.getByRole('button', { name: 'Play it again' })).toBeVisible();
  });
});

test('the house remembers: an incident goes in the diary, and the button’s feelings survive a reload', async ({ page }) => {
  await page.goto('./');
  await page.mouse.move(5, 300);
  await expect.poll(() => page.evaluate(() => typeof (window as unknown as { __oddly?: object }).__oddly), { timeout: 15_000 }).toBe('object');
  type Hook = { force: (id: string) => boolean };
  await page.evaluate(() => (window as unknown as { __oddly: Hook }).__oddly.force('incident.sofa'));
  const cushion = page.getByRole('button', { name: /The sofa cushion/ });
  await expect(cushion).toHaveAccessibleName(/Dot has it/, { timeout: 12_000 });
  await cushion.focus();
  await page.keyboard.press('Enter');
  const memory = () => page.evaluate(() => JSON.parse(localStorage.getItem('oddly-alive:memory') || '{}').world ?? {});
  await expect.poll(async () => (await memory()).story?.['incident-sofa'] ?? null, { timeout: 15_000 }).not.toBeNull();
  expect(((await memory()).diary ?? []).map((e: { detail: string }) => e.detail).join(' ')).toMatch(/You put it back/);
  // upset the button, then reload: it remembers
  const btn = page.getByRole('button', { name: /pressed \d+ times/ });
  for (let i = 0; i < 6 && !/behind glass/.test((await btn.getAttribute('aria-label')) ?? ''); i++) await btn.click({ force: true });
  await expect.poll(async () => (await memory()).button?.trust ?? 1, { timeout: 15_000 }).toBeLessThan(0.35);
  await page.reload();
  await expect.poll(async () => (await memory()).button?.trust ?? 1).toBeLessThan(0.35);
});
