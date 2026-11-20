/**
 * Mechanical half of VOICE.md: scans the visitor-facing copy in the source and
 * fails on formula sentences, banned words, over-long bubbles, em-dash habits
 * and duplicate lines. Taste is still a human job.
 */

const read = (glob: Record<string, unknown>) => Object.entries(glob as Record<string, string>);

const behaviorSrc = read(import.meta.glob('../../behaviors/*.ts', { query: '?raw', import: 'default', eager: true }));
const roomSrc = read(import.meta.glob('../../rooms/**/*.tsx', { query: '?raw', import: 'default', eager: true }));
const componentSrc = read(import.meta.glob('../../components/*.tsx', { query: '?raw', import: 'default', eager: true }));
const contentSrc = read(import.meta.glob('../*.ts', { query: '?raw', import: 'default', eager: true }));
const appSrc = read(import.meta.glob('../../app/rooms.ts', { query: '?raw', import: 'default', eager: true }));

const LITERAL = /'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`|"((?:[^"\\\n]|\\.)*)"/g;
const isProse = (s: string) => /[a-z]/i.test(s) && s.trim().split(/\s+/).length >= 2 && !/^[a-z-]+(:[a-z-]+)?$/i.test(s) && !/[{}]|^\.|\(\)|=>|^https?:/.test(s);

function literals(src: string): string[] {
  const out: string[] = [];
  for (const m of src.matchAll(LITERAL)) {
    const s = (m[1] ?? m[2] ?? m[3] ?? '').replace(/\$\{[^}]*\}/g, 'N');
    if (isProse(s)) out.push(s);
  }
  return out;
}

/** Everything inside say(...) calls (speech bubbles). */
function speech(src: string): string[] {
  const out: string[] = [];
  let i = src.indexOf('say(');
  while (i !== -1) {
    // the call may span lines; stop at the matching close paren
    let depth = 0;
    let j = i + 3;
    for (; j < src.length; j++) {
      if (src[j] === '(') depth++;
      else if (src[j] === ')' && --depth === 0) break;
    }
    out.push(...literals(src.slice(i, j)));
    i = src.indexOf('say(', j);
  }
  return out;
}

/** Text nodes in JSX (room intros, labels). */
function jsxText(src: string): string[] {
  const out: string[] = [];
  for (const m of src.matchAll(/>\s*([^<>{}]*[a-z][^<>{}]*)\s*</gi)) {
    const s = m[1]!.replace(/\s+/g, ' ').trim();
    if (s.split(' ').length >= 3) out.push(s);
  }
  return out;
}

const SPEECH = [...behaviorSrc, ...roomSrc].flatMap(([, s]) => speech(s));
// LINES pools are speech too
const linesFile = contentSrc.find(([p]) => p.endsWith('/lines.ts'))?.[1] ?? '';
SPEECH.push(...literals(linesFile.slice(linesFile.indexOf('export const LINES'))));

const PROSE = [
  ...SPEECH,
  ...contentSrc.flatMap(([, s]) => literals(s)),
  ...appSrc.flatMap(([, s]) => literals(s)),
  ...[...roomSrc, ...componentSrc].flatMap(([, s]) => jsxText(s)),
];

/** The owner's tagline: the one place the "it's not X, it's Y" shape is allowed. */
const TAGLINE = /it[’']s not broken\.?\s*it[’']s just being itself|^it[’']s just being itself\.?$/i;

const BANNED: Array<[string, RegExp]> = [
  ['“it’s not X. it’s Y.” formula', /\bit[’']?s not\b[^.?!]*[.?!]\s*it[’']?s\b/i],
  ['“X, but make it Y”', /\bbut make it\b/i],
  ['“who knew”', /\bwho knew\b/i],
  ['“plot twist”', /\bplot twist\b/i],
  ['assistant tone', /\b(feel free to|let[’']s (dive|explore|get started))\b/i],
  ['banned word', /\b(whimsical|delightful|magical|enchanting|quirky|vibes|journey|embark|delve|curate|unleash)\b/i],
  ['“just being itself” outside the tagline', /\bjust being itself\b/i],
  ['stacked punctuation', /!!|\?!|!\?/],
];

describe('copy follows VOICE.md', () => {
  it('finds the copy it is supposed to check', () => {
    expect(SPEECH.length).toBeGreaterThan(200);
    expect(PROSE.length).toBeGreaterThan(SPEECH.length);
  });

  it('has no formula sentences or banned words', () => {
    const hits = PROSE.filter((s) => !TAGLINE.test(s)).flatMap((s) => BANNED.filter(([, re]) => re.test(s)).map(([why]) => `${why}: ${s}`));
    expect(hits).toEqual([]);
  });

  it('keeps speech bubbles short', () => {
    expect(SPEECH.filter((s) => s.length > 70)).toEqual([]);
  });

  it('uses em dashes rarely in speech', () => {
    const dashed = SPEECH.filter((s) => s.includes('—'));
    expect(dashed.length / SPEECH.length).toBeLessThanOrEqual(0.05);
  });

  it('does not repeat the same line in two places', () => {
    const seen = new Map<string, number>();
    for (const s of SPEECH) seen.set(s.toLowerCase(), (seen.get(s.toLowerCase()) ?? 0) + 1);
    expect([...seen].filter(([, n]) => n > 1).map(([s]) => s)).toEqual([]);
  });
});
