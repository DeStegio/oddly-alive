import { CLUES, DECADES, RESIDENTS, THINGS, TRUNK_CODE, type Decade, type ResidentId, type Thing } from '../../../content/attic';

/**
 * The Memory Board (Phase 4), as pure logic. Things found in the attic are
 * pinned; each gets a string to a resident and a decade on a dial. The
 * board only ever checks assignments in GROUPS: when three are right
 * together they lock in (the last group of an act may be smaller, if it
 * finishes the act). A wrong assignment is never named, so guessing one at
 * a time gets you nowhere.
 */
export type Act = 1 | 2 | 3;
export interface Pin {
  owner?: ResidentId;
  decade?: Decade;
}
export interface Board {
  /** Clue and thing ids uncovered so far. */
  found: string[];
  pins: Record<string, Pin>;
  /** Thing ids locked in, in the order they locked. */
  locked: string[];
  act: Act;
  trunkOpen: boolean;
}

export const emptyBoard = (): Board => ({ found: [], pins: {}, locked: [], act: 1, trunkOpen: false });

/** Things on the board right now: found, and from an act that's open. */
export const onBoard = (b: Board): Thing[] => THINGS.filter((t) => t.act <= b.act && b.found.includes(t.id));
export const inPlay = (b: Board): Thing[] => THINGS.filter((t) => t.act <= b.act);
export const residentsInPlay = (b: Board) => RESIDENTS.filter((r) => r.act <= b.act);
/** Residents whose name and face have turned up. */
export const revealed = (b: Board): ResidentId[] => RESIDENTS.filter((r) => b.found.includes(r.revealedBy)).map((r) => r.id);
export const isFull = (p: Pin | undefined): p is Required<Pin> => !!p && p.owner !== undefined && p.decade !== undefined;
const isRight = (t: Thing, p: Pin | undefined) => isFull(p) && p.owner === t.owner && p.decade === t.decade;

export function find(b: Board, id: string): Board {
  if (b.found.includes(id)) return b;
  if (!CLUES.some((c) => c.id === id) && !THINGS.some((t) => t.id === id)) return b;
  return { ...b, found: [...b.found, id] };
}

/** Set (or clear) a pin's owner or decade. Locked things don't move. */
export function pin(b: Board, thing: string, patch: Pin): Board {
  if (b.locked.includes(thing) || !onBoard(b).some((t) => t.id === thing)) return b;
  return { ...b, pins: { ...b.pins, [thing]: { ...b.pins[thing], ...patch } } };
}

export interface Check {
  board: Board;
  /** Groups that just locked in (each a list of thing ids). */
  groups: string[][];
  /** Enough pins are filled in to make a group and nothing locked: something is wrong. We never say what. */
  somethingWrong: boolean;
  /** The act that just opened, if any. */
  opened: Act | null;
}

/**
 * Look at the board. Correct, unlocked, fully pinned things lock in threes;
 * a smaller last group locks only if it completes everything still open.
 */
export function check(b: Board): Check {
  let board = b;
  const groups: string[][] = [];
  let opened: Act | null = null;
  for (;;) {
    const open = inPlay(board).filter((t) => !board.locked.includes(t.id));
    const right = onBoard(board).filter((t) => !board.locked.includes(t.id) && isRight(t, board.pins[t.id]));
    let group: string[] = [];
    if (right.length >= 3) group = right.slice(0, 3).map((t) => t.id);
    else if (right.length > 0 && right.length === open.length) group = right.map((t) => t.id);
    if (!group.length) break;
    groups.push(group);
    board = { ...board, locked: [...board.locked, ...group] };
    // an act is done when everything in it is locked
    if (board.act < 3 && THINGS.filter((t) => t.act === board.act).every((t) => board.locked.includes(t.id))) {
      board = { ...board, act: (board.act + 1) as Act };
      opened = board.act;
    }
  }
  const unlocked = onBoard(board).filter((t) => !board.locked.includes(t.id));
  const filled = unlocked.filter((t) => isFull(board.pins[t.id]));
  const openLeft = inPlay(board).filter((t) => !board.locked.includes(t.id)).length;
  const somethingWrong = !groups.length && filled.length > 0 && filled.length >= Math.min(3, openLeft);
  return { board, groups, somethingWrong, opened };
}

export function tryTrunk(b: Board, dials: readonly number[]): Board {
  const year = dials.join('');
  return year === TRUNK_CODE.join('') ? { ...b, trunkOpen: true } : b;
}

export const solvedAll = (b: Board) => THINGS.every((t) => b.locked.includes(t.id));

// ---------------------------------------------------------------- saving (memory v3 `board`)

export function toSave(b: Board): { found: string[]; pins: Record<string, string>; locked: string[]; act: number; scenes: string[] } {
  const pins: Record<string, string> = {};
  for (const [k, p] of Object.entries(b.pins)) if (p.owner || p.decade) pins[k] = `${p.owner ?? ''}:${p.decade ?? ''}`;
  return { found: b.found, pins, locked: b.locked, act: b.act, scenes: b.trunkOpen ? ['trunk'] : [] };
}

export function fromSave(s: { found: string[]; pins: Record<string, string>; locked: string[]; act: number; scenes: string[] }): Board {
  const ids = new Set<string>([...CLUES.map((c) => c.id), ...THINGS.map((t) => t.id)]);
  const pins: Record<string, Pin> = {};
  for (const [k, v] of Object.entries(s.pins)) {
    if (!THINGS.some((t) => t.id === k)) continue;
    const [owner, decade] = v.split(':');
    const p: Pin = {};
    if (RESIDENTS.some((r) => r.id === owner)) p.owner = owner as ResidentId;
    if ((DECADES as readonly number[]).includes(Number(decade))) p.decade = Number(decade) as Decade;
    pins[k] = p;
  }
  const act = s.act === 2 || s.act === 3 ? s.act : 1;
  const locked = s.locked.filter((id) => THINGS.some((t) => t.id === id && t.act <= act && pins[id] && pins[id]!.owner === t.owner && pins[id]!.decade === t.decade));
  return { found: s.found.filter((id) => ids.has(id)), pins, locked, act, trunkOpen: s.scenes.includes('trunk') };
}

// ---------------------------------------------------------------- a whole game, headless

export type Move = string;
/**
 * 'find <id>' · 'pin <thing> <owner> <decade>' · 'trunk 1971'. Returns the
 * board after every move, checking after each pin like the UI does.
 */
export function play(moves: Move[], start = emptyBoard()): { board: Board; locks: string[][]; wrongs: number } {
  let b = start;
  const locks: string[][] = [];
  let wrongs = 0;
  for (const m of moves) {
    const [verb, a, c, d] = m.split(' ');
    if (verb === 'find' && a) b = find(b, a);
    else if (verb === 'trunk' && a) b = tryTrunk(b, a.split('').map(Number));
    else if (verb === 'pin' && a && c && d) {
      b = pin(b, a, { owner: c as ResidentId, decade: Number(d) as Decade });
      const r = check(b);
      b = r.board;
      locks.push(...r.groups);
      if (r.somethingWrong) wrongs++;
    }
  }
  return { board: b, locks, wrongs };
}
