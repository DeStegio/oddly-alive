import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHintLadder } from '../../app/hints';
import { findLetter } from '../../app/letters';
import { useWorld } from '../../app/worldInstance';
import { Layer, Stage } from '../../art/Stage';
import { ContactShadow } from '../../art/ContactShadow';
import { ThoughtBubble } from '../../characters/ThoughtBubble';
import { ASKER_NAMES, BIP_FENCE, COMMISSIONS, FREE_PLAY_SEEDS, GARDEN_LINES, HERBARIUM, SEED_NAMES, commissionById, type Commission } from '../../content/garden';
import { useKeepsakes } from '../../state/keepsakes';
import { useSettings } from '../../state/settings';
import { useObjects } from '../../state/world';
import { PacketArt, PlantArt } from './PlantArt';
import { Portrait } from './Portrait';
import { askSomething } from './sim/ask';
import { cellAt, inBloom, makeState, shadeMap, type LevelLayout } from './sim/core';
import { advance, apply, rewind, rewindTo, startTimeline, type Timeline } from './sim/history';
import { judge } from './sim/replay';
import { HYBRID_NAMES, isHybrid, speciesName, traits } from './sim/species';
import type { Action, RuleId, SimEvent, Species, SunPos } from './sim/types';
import styles from './Garden.module.css';

const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)]!;
/** The sky arc: three stops on it, and night behind the fence. */
const STOPS: Record<Exclude<SunPos, 'night'>, number> = { evening: 152, noon: 90, morning: 28 };
const ARC = { cx: 500, cy: 300, r: 240 };
const stopPoint = (sun: SunPos) => {
  if (sun === 'night') return { x: 500, y: 340 };
  const a = (STOPS[sun] * Math.PI) / 180;
  return { x: ARC.cx + ARC.r * Math.cos(a), y: ARC.cy - ARC.r * Math.sin(a) };
};
const SUN_ORDER: SunPos[] = ['evening', 'noon', 'morning', 'night'];
const SUN_WORDS: Record<SunPos, string> = { morning: 'morning sun (east, low)', noon: 'noon sun (high)', evening: 'evening sun (west, low)', night: 'night (sun behind the fence)' };
const STAGE_WORDS = ['a seed', 'a sprout', 'grown', 'in bloom'];
const FREE = 'free';
const displayName = (k: string) => HYBRID_NAMES[k] ?? SEED_NAMES[k] ?? speciesName(k as Species);

interface Job {
  id: string;
  c: Commission | null;
}

/** The beds in progress this visit, per job (leave and come back: they're as you left them). */
const sessionBeds = new Map<string, Timeline>();
/** Forget the beds in progress (Reset World, tests). */
export function resetGardenSession() {
  sessionBeds.clear();
}

function freeLayout(hybrids: string[]): LevelLayout {
  const seeds: Record<string, number> = { ...FREE_PLAY_SEEDS };
  for (const h of hybrids) seeds[h] = 3;
  return { map: ['S......', 'S......', '.......', '.......'], water: 2, seeds, barrel: 3 };
}

/** A fresh bed. Rain the valley sent to the barrel goes into this bed (a bonus, never needed) and is used up. */
function startBed(layout: LevelLayout): Timeline {
  const k = useKeepsakes.getState();
  const bonus = k.garden2.barrel;
  if (bonus > 0) k.addBarrel(-bonus);
  return startTimeline(makeState({ ...layout, barrel: layout.barrel + bonus }));
}

/**
 * The garden as a puzzle box: a bed of plants with opinions. You are still
 * the sun: drag it along the sky to choose the light, let go and a day
 * passes; the day track under the sky takes you back. Jobs from the house
 * are pinned to the fence; the Herbarium writes down only what you have
 * made happen. All the rules live in `./sim` (pure, tested).
 */
export default function Garden() {
  const world = useWorld();
  const reduced = useSettings((s) => s.motion) === 'reduced';
  const solved = useKeepsakes((s) => s.garden2.solved);
  const herbarium = useKeepsakes((s) => s.garden2.herbarium);
  const firstOpen = COMMISSIONS.find((c) => !solved.includes(c.id));
  const [job, setJob] = useState<Job>(() => ({ id: firstOpen?.id ?? FREE, c: firstOpen ?? null }));
  const layout = useMemo(() => job.c?.layout ?? freeLayout(herbarium.filter(isHybrid)), [job, herbarium]);
  const [t, setT] = useState<Timeline>(() => sessionBeds.get(job.id) ?? startBed(layout));
  const [sun, setSun] = useState<SunPos>('noon');
  const [dragging, setDragging] = useState(false);
  const [seed, setSeed] = useState<Species | null>(null);
  const [pour, setPour] = useState(false);
  const [line, setLine] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [verdict, setVerdict] = useState<'open' | 'solved' | 'failed'>('open');
  const [book, setBook] = useState(false);
  const [newPage, setNewPage] = useState(false);
  const [focus, setFocus] = useState<[number, number]>([0, 0]);
  const [bipLine, setBipLine] = useState<string | null>(null);
  const skyRef = useRef<SVGSVGElement>(null);
  const dragMoved = useRef(false);
  const cellEls = useRef(new Map<string, HTMLButtonElement>());
  const s = t.now;
  const c = job.c;
  const { rung, progress } = useHintLadder(job.id, !!c && verdict === 'open');

  const say = useCallback((text: string, ms = 3600) => {
    setLine(text);
    window.setTimeout(() => setLine((cur) => (cur === text ? null : cur)), ms);
  }, []);

  // Reset World tidies the beds
  useEffect(() => world.bus.on('WORLD_RESET', () => resetGardenSession()), [world]);

  // keep the bed for this visit
  useEffect(() => {
    sessionBeds.set(job.id, t);
  }, [job.id, t]);

  // a job arrives: the asker says what they want (the first second already has someone talking)
  useEffect(() => {
    if (c) setLine(c.ask);
    else setLine(useKeepsakes.getState().garden2.solved.length >= COMMISSIONS.length ? GARDEN_LINES.freePlay : GARDEN_LINES.sandbox);
    setVerdict('open');
  }, [c]);

  // the hint ladder: a glance at 30 s, then a vague line, then a specific one
  useEffect(() => {
    if (!c || rung < 2) return;
    const h = c.hints[rung === 2 ? 0 : 1];
    if (h) say(h, 6000);
  }, [rung, c, say]);

  const switchJob = (id: string) => {
    const cm = id === FREE ? null : (commissionById(id) ?? null);
    const lay = cm?.layout ?? freeLayout(herbarium.filter(isHybrid));
    setJob({ id, c: cm });
    setT(sessionBeds.get(id) ?? startBed(lay));
    setSeed(null);
    setPour(false);
    setSun('noon');
    world.emit('OBJECT_CLICKED', { target: 'garden:job', repeat: 1, via: 'pointer' });
  };

  const askMe = () => {
    const made = askSomething(Date.now() & 0xffff);
    if (!made) return;
    setJob({ id: made.id, c: made });
    setT(startBed(made.layout));
    setSeed(null);
    setSun('noon');
  };

  // ------------------------------------------------------------- what the bed did

  /** New Herbarium pages, discoveries and voices for the things that happened on a day. */
  const learn = useCallback(
    (events: SimEvent[]) => {
      const k = useKeepsakes.getState();
      let fresh = false;
      for (const e of events) {
        if (HERBARIUM[e.rule] && k.learnRule(e.rule)) fresh = true;
        if (e.rule === 'bee-cross' && e.kind && k.learnRule(e.kind)) fresh = true;
      }
      if (fresh) {
        setNewPage(true);
        setStatus(GARDEN_LINES.sketchbook);
      }
      const has = (r: RuleId) => events.some((e) => e.rule === r);
      if (has('moon-night')) world.effects.discover('night-shift');
      if (has('bee-cross')) {
        world.effects.discover('cross-pollinated');
        world.emit('OBJECT_STATE_CHANGED', { target: 'garden:cross', key: 'seed', value: events.find((e) => e.rule === 'bee-cross')!.kind ?? '' });
        say(GARDEN_LINES.cross);
      }
      if (has('crumb')) {
        say(GARDEN_LINES.crumb);
        world.emit('OBJECT_STATE_CHANGED', { target: 'garden:thief', key: 'outcome', value: 'gone' });
      }
    },
    [say, world],
  );

  const finish = useCallback(
    (cm: Commission) => {
      setVerdict('solved');
      say(cm.thanks, 6000);
      world.effects.sound('chime');
      world.effects.discover('green-thumb');
      const k = useKeepsakes.getState();
      if (COMMISSIONS.some((x) => x.id === cm.id) && k.solveGarden(cm.id)) {
        k.note(`garden:job:${cm.id}`, `Did a garden job for ${ASKER_NAMES[cm.asker]}.`, { once: true });
      }
      if (cm.id === 'night-flower') findLetter(world, 'garden');
      if (cm.id === 'same-night') world.effects.discover('night-light');
      if (cm.id === 'picture') world.effects.discover('pims-hand');
      if (COMMISSIONS.every((x) => useKeepsakes.getState().garden2.solved.includes(x.id))) world.effects.discover('full-bed');
      world.emit('OBJECT_STATE_CHANGED', { target: 'garden:job', key: 'solved', value: cm.id });
    },
    [say, world],
  );

  // ------------------------------------------------------------- days

  const letDayGo = useCallback(
    (light: SunPos) => {
      if (c && (s.day >= c.days || verdict === 'solved')) {
        say(verdict === 'solved' ? c.thanks : GARDEN_LINES.limit);
        return;
      }
      const planted = s.cells.some((cl) => cl.plant && cl.plant.stage === 0);
      const next = advance(t, light);
      setT(next);
      progress();
      learn(next.now.events);
      world.emit('OBJECT_STATE_CHANGED', { target: 'garden:sun', key: 'day', value: light });
      world.effects.sound('pop');
      if (light === 'night') world.effects.discover('sundown');
      if (s.crumb && s.day === 0 && planted && !next.now.events.some((e) => e.rule === 'crumb')) world.effects.discover('seed-saver');
      if (!c) return;
      const v = judge({ layout: c.layout, days: c.days, check: c.check, goal: c.goal }, next.now);
      if (v === 'solved') finish(c);
      else if (v === 'failed') {
        setVerdict('failed');
        say(c.fail, 6000);
        world.emit('OBJECT_STATE_CHANGED', { target: 'garden:job', key: 'failed', value: c.id });
      }
    },
    [c, finish, learn, progress, s, say, t, verdict, world],
  );

  const back = useCallback(
    (to?: number) => {
      if (!t.days.length) return;
      setT(to === undefined ? rewind(t) : rewindTo(t, to));
      setVerdict('open');
      setStatus(GARDEN_LINES.rewound);
      progress();
      world.effects.discover('came-back');
      world.emit('OBJECT_STATE_CHANGED', { target: 'garden:sun', key: 'rewind', value: true });
    },
    [progress, t, world],
  );

  const resetBed = () => {
    setT(startBed(layout));
    setVerdict('open');
    progress();
  };

  // ------------------------------------------------------------- hands in the soil

  const doAct = (a: Action) => {
    const r = apply(t, a);
    if (!r.ok) {
      const why: Record<string, string> = { occupied: GARDEN_LINES.occupied, 'no-seed': GARDEN_LINES.noSeed, 'not-soil': GARDEN_LINES.rock, watered: GARDEN_LINES.watered, 'barrel-empty': GARDEN_LINES.barrelEmpty, 'not-ripe': GARDEN_LINES.notRipe };
      setStatus(why[r.why ?? ''] ?? '');
      return false;
    }
    setT(r.t);
    progress();
    return true;
  };

  const tapCell = (x: number, y: number) => {
    const cell = cellAt(s, x, y)!;
    setFocus([x, y]);
    if (pour) {
      if (doAct({ type: 'water', x })) {
        world.effects.discover('make-it-rain');
        world.emit('OBJECT_STATE_CHANGED', { target: 'garden:barrel', key: 'pour', value: x });
        learn([{ rule: 'barrel', x, y: 0 }]);
      }
      setPour(false);
      return;
    }
    const p = cell.plant;
    if (!p) {
      if (cell.terrain !== 'soil') return setStatus(GARDEN_LINES.rock);
      if (!seed) return setStatus('pick a seed from the tin first.');
      if (doAct({ type: 'plant', x, y, kind: seed })) {
        world.emit('OBJECT_STATE_CHANGED', { target: `garden:${seed}`, key: 'plant', value: `${x},${y}` });
        setStatus(`${speciesName(seed)} planted.`);
        if ((s.tin[seed] ?? 0) <= 1) setSeed(null);
      }
      return;
    }
    if (s.fresh.includes(p.id)) {
      doAct({ type: 'dig', x, y });
      setStatus(GARDEN_LINES.dug);
      return;
    }
    if (p.stage === 3 && inBloom(s, p)) {
      if (doAct({ type: 'pick', x, y })) harvest(p.kind);
      return;
    }
    setStatus(describe(x, y));
  };

  /** A picked thing goes indoors: flowers to the vase, radishes to the Playground. */
  const harvest = (kind: Species) => {
    world.effects.sound('pop');
    setStatus(GARDEN_LINES.picked);
    if (kind === 'radish') {
      const o = useObjects.getState();
      o.setSlice('playground', { radishes: Math.min(6, o.playground.radishes + 1) });
      world.emit('OBJECT_STATE_CHANGED', { target: 'garden:radish', key: 'harvest', value: 'playground' });
      return;
    }
    useKeepsakes.getState().addToVase(kind);
    useObjects.getState().setLiving({ vaseNew: true });
    if (isHybrid(kind)) {
      world.emit('OBJECT_STATE_CHANGED', { target: 'garden:hybrid', key: 'harvest', value: kind });
      world.effects.discover('hybrid-bloom');
    } else world.emit('OBJECT_STATE_CHANGED', { target: `garden:${kind}`, key: 'harvest', value: 'house' });
  };

  const describe = (x: number, y: number) => {
    const cell = cellAt(s, x, y)!;
    const wet = ['dry', 'damp', 'wet', 'soaked'][cell.water] ?? 'wet';
    if (cell.terrain === 'rock') return `Rock${cell.plant ? ', with a creeper over it' : ''}.`;
    if (cell.terrain === 'shed') return 'The shed.';
    const plant = cell.plant ? `${speciesName(cell.plant.kind)}, ${STAGE_WORDS[cell.plant.stage]}${cell.plant.facing ? `, facing ${cell.plant.facing}` : ''}` : 'empty soil';
    const shaded = s.shade.length && s.shade[y * s.w + x] ? ', in shade yesterday' : '';
    return `${plant}; soil ${wet}${cell.mark ? ', marked' : ''}${shaded}.`;
  };

  // ------------------------------------------------------------- the sun, by hand

  const sunFromPointer = (e: React.PointerEvent): SunPos => {
    const svg = skyRef.current!;
    const r = svg.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 1000;
    const y = ((e.clientY - r.top) / r.height) * 340;
    if (y > 292) return 'night';
    const ang = (Math.atan2(ARC.cy - y, x - ARC.cx) * 180) / Math.PI;
    return (Object.entries(STOPS) as Array<[SunPos, number]>).reduce((best, [k, a]) => (Math.abs(a - ang) < Math.abs(STOPS[best as Exclude<SunPos, 'night'>] - ang) ? k : best), 'noon' as SunPos);
  };

  const onSunDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    try {
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    } catch {
      /* synthetic pointers have nothing to capture */
    }
    setDragging(true);
    dragMoved.current = false;
  };
  const onSunMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const next = sunFromPointer(e);
    if (next !== sun) {
      dragMoved.current = true;
      setSun(next);
    }
  };
  const onSunUp = (e: React.PointerEvent) => {
    if (!dragging) return;
    setDragging(false);
    const at = dragMoved.current ? sunFromPointer(e) : sun;
    setSun(at);
    letDayGo(at);
  };

  const onSunKey = (e: React.KeyboardEvent) => {
    const i = SUN_ORDER.indexOf(sun);
    let next: SunPos | null = null;
    if (e.key === 'ArrowLeft') next = SUN_ORDER[Math.max(0, i - 1)]!;
    else if (e.key === 'ArrowRight') next = SUN_ORDER[Math.min(2, i + 1)]!;
    else if (e.key === 'ArrowDown') next = 'night';
    else if (e.key === 'ArrowUp') next = 'noon';
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      letDayGo(sun);
      return;
    } else return;
    e.preventDefault();
    e.stopPropagation();
    setSun(next);
  };

  // the room's own keys: ← yesterday, → another day with the same light
  const onStageKey = (e: React.KeyboardEvent) => {
    const el = e.target as HTMLElement;
    if (el.closest('[data-own-keys]') || el.tagName === 'INPUT') return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      back();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      letDayGo(sun);
    }
  };

  // the bed is a grid: arrows move between cells
  const onGridKey = (e: React.KeyboardEvent) => {
    const [x, y] = focus;
    const d: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const v = d[e.key];
    if (!v) return;
    e.preventDefault();
    e.stopPropagation();
    const nx = Math.max(0, Math.min(s.w - 1, x + v[0]));
    const ny = Math.max(0, Math.min(s.h - 1, y + v[1]));
    setFocus([nx, ny]);
    cellEls.current.get(`${nx},${ny}`)?.focus();
  };

  // ------------------------------------------------------------- drawing

  const preview = useMemo(() => shadeMap(s, sun), [s, sun]);
  const sp = stopPoint(sun);
  const nightNow = s.night;
  const glanceAt = c && rung >= 1 ? c.glance : null;
  const tinKinds = Object.entries(s.tin).filter(([, n]) => n > 0) as Array<[Species, number]>;
  const known = (k: string) => (HERBARIUM as Record<string, unknown>)[k] !== undefined;
  const pages = herbarium.filter((h) => known(h) || isHybrid(h));
  const dayMarks = c ? c.days : Math.max(6, t.days.length + 1);
  const grade = nightNow ? 'rgb(30 40 110 / 0.28)' : sun === 'evening' ? 'rgb(255 150 60 / 0.12)' : sun === 'morning' ? 'rgb(255 220 150 / 0.08)' : 'transparent';

  return (
    <Stage
      label="Garden"
      id="garden-title"
      className={styles.room}
      note={c ? `job ${COMMISSIONS.findIndex((x) => x.id === c.id) + 1 || '·'} of ${COMMISSIONS.length}` : 'free play'}
      light={{ x: sun === 'morning' ? 0.8 : sun === 'evening' ? -0.8 : 0, y: -0.8 }}
      data={{ sun, night: String(nightNow), verdict }}
      style={{ '--grade': grade } as React.CSSProperties}
    >
      <div className={styles.keyCatcher} onKeyDown={onStageKey}>
        {/* far: sky and next door */}
        <Layer depth="far" className={styles.far}>
          <span className={styles.hills} aria-hidden="true" />
          <span className={styles.roofNextDoor} aria-hidden="true" />
        </Layer>

        {/* the sky, with the sun on its arc */}
        <div className={styles.sky}>
          <svg ref={skyRef} viewBox="0 0 1000 340" className={styles.arc} preserveAspectRatio="xMidYMax meet" aria-hidden="true">
            <path d={`M ${ARC.cx - ARC.r} ${ARC.cy} A ${ARC.r} ${ARC.r} 0 0 1 ${ARC.cx + ARC.r} ${ARC.cy}`} className={styles.arcPath} />
            {(['evening', 'noon', 'morning'] as const).map((k) => {
              const p = stopPoint(k);
              return <circle key={k} cx={p.x} cy={p.y} r="9" className={styles.stop} data-on={sun === k} />;
            })}
            <text x={ARC.cx - ARC.r - 10} y={ARC.cy + 26} className={styles.compass} textAnchor="middle">
              W · house
            </text>
            <text x={ARC.cx + ARC.r + 10} y={ARC.cy + 26} className={styles.compass} textAnchor="middle">
              E
            </text>
          </svg>
          <button
            type="button"
            role="slider"
            data-own-keys
            className={styles.sun}
            data-night={sun === 'night'}
            data-drag={dragging}
            data-glance={glanceAt === 'sun'}
            style={{ left: `${(sp.x / 1000) * 100}%`, top: `${(sp.y / 340) * 100}%` }}
            aria-label="The sun. Drag along the sky and let go for a day; arrow keys move it, Enter lets a day go."
            aria-valuemin={0}
            aria-valuemax={3}
            aria-valuenow={SUN_ORDER.indexOf(sun)}
            aria-valuetext={SUN_WORDS[sun]}
            onPointerDown={onSunDown}
            onPointerMove={onSunMove}
            onPointerUp={onSunUp}
            onPointerCancel={() => setDragging(false)}
            onKeyDown={onSunKey}
          >
            <span className={styles.sunDisc} />
          </button>
        </div>

        {/* the day track: where you are in time; tap a day to go back to it */}
        <div className={styles.days} role="group" aria-label="Days" data-own-keys>
          {Array.from({ length: dayMarks }, (_, d) => {
            const past = d < t.days.length;
            const now = d === t.days.length;
            return (
              <button
                key={d}
                type="button"
                className={styles.day}
                data-state={past ? 'past' : now ? 'now' : 'future'}
                data-sun={past ? t.suns[d] : undefined}
                disabled={!past}
                aria-label={past ? `Go back to the start of day ${d + 1} (${t.suns[d]})` : now ? `Day ${d + 1}, today` : `Day ${d + 1}`}
                onClick={() => back(d)}
              />
            );
          })}
          <button type="button" className={styles.yesterday} disabled={!t.days.length} onClick={() => back()} aria-label="Take the sun back one day" data-wiggle={verdict === 'failed'}>
            ↶
          </button>
        </div>

        {/* mid: the fence, the house wall, Bip */}
        <Layer depth="mid" className={styles.mid}>
          <span className={styles.fence} aria-hidden="true" />
          <span className={styles.houseWall} aria-hidden="true">
            <span className={styles.door} />
          </span>
          <div className={styles.bip}>
            <ThoughtBubble text={bipLine} side="left" />
            <button type="button" className={`prop-btn ${styles.bipHit}`} aria-label="Bip, leaning on the fence" onClick={() => {
              const l = pick(BIP_FENCE);
              setBipLine(l);
              window.setTimeout(() => setBipLine((cur) => (cur === l ? null : cur)), 2600);
            }}>
              <svg viewBox="0 0 80 50" aria-hidden="true">
                <rect x="8" y="8" width="64" height="40" rx="12" fill="var(--blue)" stroke="var(--char-ink)" strokeWidth="2.5" />
                <rect x="16" y="15" width="48" height="26" rx="8" fill="#24232b" />
                <rect x="25" y="21" width="6" height="9" rx="3" fill="#a6f0c6" />
                <rect x="49" y="21" width="6" height="9" rx="3" fill="#a6f0c6" />
                <path d="M34 34 q 6 4 12 0" fill="none" stroke="#a6f0c6" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </Layer>

        {/* play: the asker, the bed, the tin and the barrel */}
        <div className={styles.play}>
          <div className={styles.asker} data-verdict={verdict}>
            <Portrait who={c?.asker ?? 'inch'} mood={verdict} />
            <p className={styles.say} aria-live="polite" data-empty={!line || undefined}>
              {line}
            </p>
            {c ? (
              <p className={styles.card}>
                <span className="visually-hidden">The job: </span>
                {c.card}
                {c.check === 'end' ? ` (checked after day ${c.days})` : ` (${c.days} days)`}
              </p>
            ) : null}
          </div>

          <div className={styles.bedWrap}>
            <div className={styles.bed} role="grid" aria-label={`The bed, ${s.w} by ${s.h}. Day ${s.day}.`} data-own-keys onKeyDown={onGridKey} style={{ '--cols': s.w } as React.CSSProperties}>
              {Array.from({ length: s.h }, (_, y) => (
                <div key={y} role="row" className={styles.row}>
                  {Array.from({ length: s.w }, (_, x) => {
                    const cell = s.cells[y * s.w + x]!;
                    const p = cell.plant;
                    const shadedNext = preview[y * s.w + x];
                    const ev = s.events.filter((e) => Math.round(e.x) === x && Math.round(e.y) === y && e.rule !== 'dry-sun' && e.rule !== 'damp-shade');
                    const glance = Array.isArray(glanceAt) && glanceAt[0] === x && glanceAt[1] === y;
                    const isFocus = focus[0] === x && focus[1] === y;
                    return (
                      <button
                        key={x}
                        role="gridcell"
                        type="button"
                        tabIndex={isFocus ? 0 : -1}
                        ref={(el) => {
                          if (el) cellEls.current.set(`${x},${y}`, el);
                          else cellEls.current.delete(`${x},${y}`);
                        }}
                        className={styles.cell}
                        data-terrain={cell.terrain}
                        data-water={cell.water}
                        data-mark={cell.mark || undefined}
                        data-shade-next={shadedNext && !nightNow ? true : undefined}
                        data-pour={pour || undefined}
                        data-glance={glance || undefined}
                        data-fresh={p && s.fresh.includes(p.id) ? true : undefined}
                        aria-label={`${x + 1}, ${y + 1}: ${describe(x, y)}`}
                        onClick={() => tapCell(x, y)}
                      >
                        <span className={styles.soil} aria-hidden="true">
                          {cell.water > 0 && cell.terrain === 'soil' ? <span className={styles.drops} data-n={cell.water} /> : null}
                        </span>
                        {p ? (
                          <span className={styles.plant} data-stage={p.stage} data-kind={p.kind} data-tall={p.stage >= 2 && traits(p.kind).tall} aria-hidden="true" key={`${p.id}`}>
                            <svg viewBox="0 0 60 100">
                              <PlantArt kind={p.kind} stage={p.stage} facing={p.facing} night={nightNow} onRock={cell.terrain === 'rock'} vine={traits(p.kind).climbs && p.id !== p.root} />
                            </svg>
                            {p.stage >= 2 ? <ContactShadow width={70} /> : null}
                          </span>
                        ) : null}
                        {ev.map((e, i) => (
                          <span key={`${s.day}-${i}`} className={styles.event} data-rule={e.rule} aria-hidden="true" />
                        ))}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            {s.events.some((e) => e.rule === 'crumb') && !reduced ? <span key={`crumb-${s.day}`} className={styles.crumb} aria-hidden="true" /> : null}
            {s.events.some((e) => e.rule === 'bee-cross') ? <span key={`bee-${s.day}`} className={styles.beeCross} aria-hidden="true" /> : null}
            <span className={styles.bee} aria-hidden="true" />
            <span className={`${styles.bee} ${styles.bee2}`} aria-hidden="true" />
          </div>

          <div className={styles.tools}>
            <div className={styles.tin} role="group" aria-label="The seed tin" data-glance={glanceAt === 'tin' || undefined}>
              {tinKinds.length ? (
                tinKinds.map(([k, n]) => (
                  <button key={k} type="button" className={styles.packet} aria-pressed={seed === k} onClick={() => {
                    setSeed(seed === k ? null : k);
                    setPour(false);
                  }} aria-label={`${displayName(k)} seeds, ${n} left`}>
                    <PacketArt kind={k} />
                    <span className={styles.packetName}>{displayName(k)}</span>
                    <span className={styles.count}>{n}</span>
                  </button>
                ))
              ) : (
                <span className={styles.empty}>the tin’s empty</span>
              )}
            </div>
            <button type="button" className={styles.barrel} aria-pressed={pour} data-glance={glanceAt === 'barrel' || undefined} disabled={s.barrel <= 0} onClick={() => {
              setPour(!pour);
              setSeed(null);
            }} aria-label={`The rain barrel, ${s.barrel} tips left${pour ? '. Now tap a column to pour.' : ''}`}>
              <svg viewBox="0 0 50 60" aria-hidden="true">
                <path d="M8 10 C 6 30 6 44 10 56 L 40 56 C 44 44 44 30 42 10 Z" fill="var(--earth-l1)" stroke="var(--char-ink)" strokeWidth="2.4" />
                <path d="M7 22 H 43 M7 44 H 43" stroke="var(--char-ink)" strokeWidth="2" />
                <ellipse cx="25" cy="10" rx="17" ry="4.5" fill={s.barrel > 0 ? 'var(--blue-l1)' : 'var(--earth-d1)'} stroke="var(--char-ink)" strokeWidth="2.2" />
              </svg>
              <span className={styles.count}>{s.barrel}</span>
            </button>
            <button type="button" className={styles.bookBtn} data-new={newPage || undefined} onClick={() => {
              setBook(!book);
              setNewPage(false);
            }} aria-expanded={book} aria-label={`The Herbarium, ${pages.length} pages`}>
              <svg viewBox="0 0 50 44" aria-hidden="true">
                <path d="M4 6 Q 14 2 25 8 Q 36 2 46 6 V 40 Q 36 36 25 42 Q 14 36 4 40 Z" fill="var(--mint-l2)" stroke="var(--char-ink)" strokeWidth="2.2" strokeLinejoin="round" />
                <path d="M25 8 V 42" stroke="var(--char-ink)" strokeWidth="2" />
                <path d="M12 18 q 4 -6 7 2 M33 16 q 3 6 7 0" stroke="var(--mint-d2)" strokeWidth="2" fill="none" />
              </svg>
              <span className={styles.count}>{pages.length}</span>
            </button>
          </div>
        </div>

        {/* the jobs, pinned along the fence */}
        <nav className={styles.jobs} aria-label="Garden jobs">
          {COMMISSIONS.map((cm, i) => {
            const done = solved.includes(cm.id);
            const open = done || i === 0 || solved.includes(COMMISSIONS[i - 1]!.id);
            return (
              <button key={cm.id} type="button" className={styles.job} data-done={done} aria-current={job.id === cm.id} disabled={!open} onClick={() => switchJob(cm.id)} aria-label={`Job ${i + 1}${open ? `, from ${ASKER_NAMES[cm.asker]}` : ' (not yet)'}${done ? ', done' : ''}`}>
                {i + 1}
              </button>
            );
          })}
          <button type="button" className={`${styles.job} ${styles.free}`} aria-current={job.id === FREE} onClick={() => switchJob(FREE)} aria-label="Free play: the whole tin, no job">
            ∞
          </button>
          {solved.length >= COMMISSIONS.length ? (
            <button type="button" className={`${styles.job} ${styles.free}`} onClick={askMe} aria-label="Ask me something: a small new job">
              ?
            </button>
          ) : null}
        </nav>

        {verdict === 'solved' && c ? (
          <button type="button" className={`paper-btn ${styles.next}`} onClick={() => {
            const next = COMMISSIONS.find((x) => !useKeepsakes.getState().garden2.solved.includes(x.id));
            switchJob(next?.id ?? FREE);
          }}>
            next job →
          </button>
        ) : null}
        <button type="button" className={styles.reset} onClick={resetBed}>
          start this bed again
        </button>

        {book ? (
          <aside className={styles.book} aria-label="The Herbarium">
            <h2>Herbarium</h2>
            {pages.length ? (
              <ul>
                {pages.map((id) => {
                  const pg = (HERBARIUM as Record<string, { title: string; note: string }>)[id];
                  return (
                    <li key={id}>
                      <strong>{pg ? pg.title : `New: ${HYBRID_NAMES[id] ?? speciesName(id as Species)}`}</strong>
                      <span>{pg ? pg.note : 'Made by the bees. Plant it and see what it does.'}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p>Empty. Pages fill in when something happens in the bed.</p>
            )}
            <button type="button" className="paper-btn" onClick={() => setBook(false)}>
              close
            </button>
          </aside>
        ) : null}

        <p className={styles.status} role="status" aria-live="polite">
          {status}
        </p>
      </div>
    </Stage>
  );
}
