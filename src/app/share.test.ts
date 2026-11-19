import { buildPostcardSvg, postcardText } from './postcard';
import { SHARE_KEYS, buildShareUrl, codeToSeed, parseShareHash, sceneVariant, seedToCode } from './share';

const BASE = 'https://example.test/oddly-alive/';

describe('shareable scenes', () => {
  it('round-trips room, seed, night and arrangement', () => {
    const url = buildShareUrl({ room: 'playground', seed: 123456789, night: true, arrangement: 'bC4tMCwx' }, BASE + '#/whatever');
    expect(url.startsWith(BASE + '#/playground?')).toBe(true);
    const parsed = parseShareHash(url.slice(url.indexOf('#')));
    expect(parsed).toEqual({ room: 'playground', seed: 123456789, night: true, arrangement: 'bC4tMCwx' });
  });

  it('only ever emits the allowed keys (no memory leaks into links)', () => {
    const url = buildShareUrl({ room: 'living', seed: 42 }, BASE);
    const keys = Array.from(new URLSearchParams(url.split('?')[1]).keys());
    for (const k of keys) expect(SHARE_KEYS as readonly string[]).toContain(k);
    expect(url).not.toMatch(/visit|discover|nick|count|trust/i);
  });

  it('drops arrangements outside the Playground and rejects bad input', () => {
    expect(buildShareUrl({ room: 'mood', seed: 1, arrangement: 'abc' }, BASE)).not.toContain('a=');
    expect(parseShareHash('#/?seed=!!!')).toEqual({ room: 'living' });
    expect(parseShareHash('#/nowhere?seed=zz')).toEqual({ seed: codeToSeed('zz') });
    expect(codeToSeed('toolongvalue')).toBeNull();
    expect(parseShareHash('#/playground?a=<script>').arrangement).toBeUndefined();
  });

  it('seed codes are compact and reversible', () => {
    for (const s of [0, 1, 99, 0xffffffff, 2_000_000_000]) expect(codeToSeed(seedToCode(s))).toBe(s >>> 0);
  });

  it('the same seed reproduces the same scene variations (INT-108)', () => {
    expect(sceneVariant(777)).toEqual(sceneVariant(777));
    const variants = new Set(Array.from({ length: 40 }, (_, i) => JSON.stringify(sceneVariant(i * 7919))));
    expect(variants.size).toBeGreaterThan(3);
  });
});

describe('postcards', () => {
  const scene = { room: 'living' as const, mood: 'curious' as const, seed: 99, night: false };

  it('are deterministic for the same scene', () => {
    expect(buildPostcardSvg(scene)).toBe(buildPostcardSvg(scene));
  });

  it('render every room as well-formed SVG', () => {
    for (const room of ['living', 'playground', 'mood', 'secret', 'memory', 'after-hours'] as const) {
      const svg = buildPostcardSvg({ ...scene, room });
      const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
      expect(doc.querySelector('parsererror')).toBeNull();
    }
  });

  it('say only room, mood and scene code — nothing personal', () => {
    const t = postcardText(scene);
    expect(t.title).toBe('Living Room');
    expect(t.line).toBe('The house was feeling curious.');
    expect(t.code).toContain(seedToCode(99));
    expect(JSON.stringify(t) + buildPostcardSvg(scene)).not.toMatch(/visit|nickname|discover/i);
  });
});
