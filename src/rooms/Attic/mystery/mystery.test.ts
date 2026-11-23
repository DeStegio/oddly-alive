import { describe, expect, it } from 'vitest';
import { CLUES, RESIDENTS, SCENE_FOR, THINGS, TRUNK_CLUES, VIGNETTES, clueById } from '../../../content/attic';
import { check, emptyBoard, find, fromSave, pin, play, revealed, solvedAll, toSave, tryTrunk, type Board } from './board';
import { PLAYTHROUGH } from './playthrough';

const findAll = (b: Board, ids: string[]) => ids.reduce(find, b);

describe('fairness of the mystery', () => {
  it('fifteen things, five people, three acts (2/5, 4/10, 5/15)', () => {
    expect(THINGS).toHaveLength(15);
    expect(RESIDENTS).toHaveLength(5);
    expect(THINGS.filter((t) => t.act === 1)).toHaveLength(5);
    expect(THINGS.filter((t) => t.act <= 2)).toHaveLength(10);
    expect(new Set(THINGS.filter((t) => t.act === 1).map((t) => t.owner)).size).toBe(2);
    expect(new Set(THINGS.filter((t) => t.act <= 2).map((t) => t.owner)).size).toBe(4);
    for (const t of THINGS) expect(RESIDENTS.find((r) => r.id === t.owner)!.act).toBeLessThanOrEqual(t.act);
  });

  it('every answer (owner and decade) has at least one clue, and every clue it names exists', () => {
    for (const t of THINGS) {
      expect(t.ownerClues.length, `${t.id} owner`).toBeGreaterThan(0);
      expect(t.decadeClues.length, `${t.id} decade`).toBeGreaterThan(0);
      for (const id of [...t.ownerClues, ...t.decadeClues]) expect(clueById(id), id).toBeDefined();
      // the clues are findable no later than the thing itself
      for (const id of [...t.ownerClues, ...t.decadeClues]) expect(clueById(id)!.act).toBeLessThanOrEqual(Math.max(t.act, 2));
    }
    for (const r of RESIDENTS) expect(clueById(r.revealedBy), r.id).toBeDefined();
    for (const id of [...Object.values(SCENE_FOR), ...TRUNK_CLUES]) expect(clueById(id)).toBeDefined();
  });

  it('no single clue states an answer outright (an owner’s name next to their thing’s name)', () => {
    const flagged: string[] = [];
    for (const c of CLUES)
      for (const t of THINGS) {
        const owner = RESIDENTS.find((r) => r.id === t.owner)!;
        const names = owner.name.toLowerCase().split(' ');
        const text = c.text.toLowerCase();
        if (names.some((n) => new RegExp(`\\b${n}\\b`).test(text)) && text.includes(t.name.toLowerCase())) flagged.push(`${c.id} → ${t.id}`);
      }
    expect(flagged).toEqual([]);
  });

  it('the trunk’s year needs two clues together (neither has all four digits)', () => {
    const [a, b] = TRUNK_CLUES.map((id) => clueById(id)!.text);
    expect(a).not.toContain('1971');
    expect(b).not.toContain('1971');
  });

  it('there is a memory for every group that can lock', () => {
    expect(VIGNETTES.length).toBeGreaterThanOrEqual(5);
  });
});

describe('the Memory Board', () => {
  const act1 = ['hat-block', 'feather-tin', 'pin-cushion', 'radio-valve', 'headphones'];

  it('three correct assignments confirm together and lock in', () => {
    let b = findAll(emptyBoard(), act1);
    b = pin(b, 'hat-block', { owner: 'odile', decade: 1920 });
    b = pin(b, 'feather-tin', { owner: 'odile', decade: 1930 });
    expect(check(b).groups).toEqual([]);
    b = pin(b, 'radio-valve', { owner: 'walter', decade: 1940 });
    const r = check(b);
    expect(r.groups).toEqual([['hat-block', 'feather-tin', 'radio-valve']]);
    expect(r.board.locked).toHaveLength(3);
  });

  it('any three with one wrong do not confirm, and nothing says which one', () => {
    let b = findAll(emptyBoard(), act1);
    b = pin(b, 'hat-block', { owner: 'odile', decade: 1920 });
    b = pin(b, 'feather-tin', { owner: 'odile', decade: 1920 }); // wrong decade
    b = pin(b, 'radio-valve', { owner: 'walter', decade: 1940 });
    const r = check(b);
    expect(r.groups).toEqual([]);
    expect(r.board.locked).toEqual([]);
    expect(r.somethingWrong).toBe(true);
    // the result carries no per-thing verdict at all
    expect(Object.keys(r).sort()).toEqual(['board', 'groups', 'opened', 'somethingWrong']);
    expect(r.board.pins).toEqual(b.pins);
  });

  it('a smaller last group locks only when it finishes the act, and the next act opens', () => {
    let b = findAll(emptyBoard(), act1);
    for (const [t, o, d] of [
      ['hat-block', 'odile', 1920],
      ['feather-tin', 'odile', 1930],
      ['pin-cushion', 'odile', 1920],
    ] as const)
      b = pin(b, t, { owner: o, decade: d });
    b = check(b).board;
    b = pin(b, 'radio-valve', { owner: 'walter', decade: 1940 });
    expect(check(b).groups).toEqual([]); // one right, one not yet pinned: no group of one
    b = pin(b, 'headphones', { owner: 'walter', decade: 1950 });
    const r = check(b);
    expect(r.groups).toEqual([['radio-valve', 'headphones']]);
    expect(r.opened).toBe(2);
  });

  it('things can only be pinned once found and once their act is open; locked pins don’t move', () => {
    let b = pin(emptyBoard(), 'hat-block', { owner: 'odile' });
    expect(b.pins['hat-block']).toBeUndefined();
    b = find(b, 'smoker');
    expect(pin(b, 'smoker', { owner: 'arthur' }).pins.smoker).toBeUndefined(); // act 2, not open yet
  });

  it('a name and a face appear only with the clue that reveals them', () => {
    let b = emptyBoard();
    expect(revealed(b)).toEqual([]);
    b = find(b, 'shop-sign');
    expect(revealed(b)).toEqual(['odile']);
  });

  it('the trunk opens with the deduced year, not with a near miss', () => {
    expect(tryTrunk(emptyBoard(), [1, 9, 7, 0]).trunkOpen).toBe(false);
    expect(tryTrunk(emptyBoard(), [1, 9, 7, 1]).trunkOpen).toBe(true);
  });

  it('brute force is pointless: random full guesses almost never lock a group', () => {
    let seed = 3;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    let locks = 0;
    for (let i = 0; i < 400; i++) {
      let b = findAll(emptyBoard(), act1);
      for (const t of act1) b = pin(b, t, { owner: (['odile', 'walter'] as const)[Math.floor(rnd() * 2)]!, decade: ([1920, 1930, 1940, 1950, 1960, 1970, 1980] as const)[Math.floor(rnd() * 7)]! });
      if (check(b).groups.length) locks++;
    }
    expect(locks / 400).toBeLessThan(0.05);
  });

  it('saves and restores (only consistent locks survive a tampered save)', () => {
    const { board } = play(PLAYTHROUGH.slice(0, 20));
    const back = fromSave(toSave(board));
    expect(back.locked).toEqual(board.locked);
    expect(back.act).toBe(board.act);
    const tampered = fromSave({ ...toSave(board), locked: [...board.locked, 'cap-badge'], pins: { ...toSave(board).pins, 'cap-badge': 'bea:1920' } });
    expect(tampered.locked).not.toContain('cap-badge');
  });
});

describe('a whole playthrough', () => {
  it('the stored playthrough solves the whole mystery, with no wrong turns', () => {
    const r = play(PLAYTHROUGH);
    expect(solvedAll(r.board)).toBe(true);
    expect(r.board.act).toBe(3);
    expect(r.board.trunkOpen).toBe(true);
    expect(r.wrongs).toBe(0);
    expect(r.locks.length).toBeGreaterThanOrEqual(5);
    expect(revealed(r.board)).toHaveLength(5);
  });

  it('it uncovers a supporting clue for every answer before pinning it', () => {
    const seen = new Set<string>();
    for (const m of PLAYTHROUGH) {
      const [verb, a] = m.split(' ');
      if (verb === 'find') seen.add(a!);
      if (verb === 'pin') {
        const t = THINGS.find((x) => x.id === a)!;
        expect(t.ownerClues.some((c) => seen.has(c)), `${a} owner`).toBe(true);
        expect(t.decadeClues.some((c) => seen.has(c)), `${a} decade`).toBe(true);
      }
    }
  });
});
