import type { Commission } from '../../../content/garden';
import { bloomsOf, countOf, hybridSeeds, plants } from './core';
import { idleRuns, replay } from './replay';
import type { SunPos } from './types';

/**
 * "Ask me something" (free play, after the twelve jobs): a small job made
 * from a template with seeded parameters. Every job made here is checked
 * the same way as the hand-made ones before it is offered: its generated
 * solution must solve it and idling must not.
 */
const EMPTY = ['.......', '.......', '.......', '.......'];

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Template = (r: () => number) => Commission;
const int = (r: () => number, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));

const TEMPLATES: Template[] = [
  (r) => {
    const face = (['east', 'west'] as const)[int(r, 0, 1)]!;
    const sun: SunPos = face === 'east' ? 'morning' : 'evening';
    const x = int(r, 1, 5);
    const y = int(r, 0, 3);
    return base(`ask-face-${face}-${x}${y}`, 'lumen', `a sunflower facing ${face}. it’s for a scene.`, `A sunflower in bloom facing ${face}.`, {
      layout: { map: EMPTY, water: 3, seeds: { sunflower: 1 }, barrel: 0 },
      days: 4,
      goal: (s) => plants(s).some(({ p }) => p.kind === 'sunflower' && p.stage === 3 && p.facing === face),
      solution: [`plant sunflower ${x} ${y}`, 'day noon', 'day noon', `day ${sun}`],
    });
  },
  (r) => {
    const x = int(r, 0, 5);
    const y = int(r, 0, 2);
    return base(`ask-radish-${x}${y}`, 'dot', 'radishes. three. ripe. NOW. please.', 'Three ripe radishes at once.', {
      layout: { map: EMPTY, water: 3, seeds: { radish: 3, mint: 1 }, barrel: 1 },
      days: 4,
      goal: (s) => countOf(s, 'radish', 3) >= 3,
      solution: [`plant radish ${x} ${y}`, `plant radish ${x + 1} ${y}`, `plant radish ${x} ${y + 1}`, `plant mint ${x + 1} ${y + 1}`, 'day noon', 'day noon', 'day noon'],
    });
  },
  (r) => {
    const row = int(r, 0, 2);
    return base(`ask-moon-${row}`, 'tick', 'a moonflower, open, before the week is out.', 'A moonflower, open.', {
      layout: { map: EMPTY.map((l, i) => (i === row ? 'S' + l.slice(1) : l)), water: 2, seeds: { moonflower: 1 }, barrel: 0 },
      days: 5,
      goal: (s) => bloomsOf(s, 'moonflower') >= 1,
      solution: [`plant moonflower 1 ${row}`, 'day evening', 'day evening', 'day night'],
    });
  },
  (r) => {
    const x = int(r, 1, 4);
    const y = int(r, 0, 3);
    return base(`ask-cross-${x}${y}`, 'bip', 'new seed request. any kind. surprise me. beep.', 'A new kind of seed in the tin.', {
      layout: { map: EMPTY, water: 3, seeds: { sunflower: 1, snapdragon: 1 }, barrel: 0 },
      days: 5,
      goal: (s) => hybridSeeds(s).length > 0,
      solution: [`plant sunflower ${x} ${y}`, `plant snapdragon ${x + 1} ${y}`, 'day noon', 'day noon', 'day morning'],
    });
  },
];

function base(id: string, asker: Commission['asker'], ask: string, card: string, rest: Pick<Commission, 'layout' | 'days' | 'goal' | 'solution'>): Commission {
  return { id, asker, ask, card, thanks: 'that’ll do nicely.', fail: 'not quite. have another go.', hints: ['', ''], glance: 'tin', check: 'any', naiveAttempt: [], teaches: [], ...rest };
}

/** A verified small job for this seed (tries templates until one checks out). */
export function askSomething(seed: number): Commission | null {
  const r = rng(seed);
  for (let i = 0; i < 8; i++) {
    const c = TEMPLATES[int(r, 0, TEMPLATES.length - 1)]!(r);
    const spec = { layout: c.layout, days: c.days, check: c.check, goal: c.goal };
    if (replay(spec, c.solution).solved && idleRuns(spec).every((x) => !x.solved)) return c;
  }
  return null;
}
