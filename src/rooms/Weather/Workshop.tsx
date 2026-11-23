import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHintLadder } from '../../app/hints';
import { enterWorkshop, getValley, leaveWorkshop, publish, setValley } from '../../app/valley';
import { useWorld } from '../../app/worldInstance';
import { Layer, Stage } from '../../art/Stage';
import { POSTCARDS, type Postcard, type PostcardFrom } from '../../content/weather';
import { onFrame } from '../../engine/frameLoop';
import { useKeepsakes } from '../../state/keepsakes';
import { useSettings } from '../../state/settings';
import { Portrait } from '../Garden/Portrait';
import { Almanac } from '../MoodRoom/Almanac';
import { readBarometer, type Reading } from './sim/read';
import { startProgress, track, valleyFor, type PostcardSpec, type Progress } from './sim/run';
import { GROUND, H, PLACES, TOOL_IDS, W, actOn, cloneValley, groundTop, makeValley, stepValley, type ToolId, type Valley, type ValleyAction } from './sim/valley';
import { ValleyCanvas } from './ValleyCanvas';
import { noticeValley } from './notice';
import styles from './Workshop.module.css';

const SANDBOX = 'sandbox';
const STEP_MS = 100;
const TOOL_NAMES: Record<ToolId, string> = { teacup: 'Teacup (warm and wet)', ice: 'Ice cube (cold, melts)', fan: 'Paper fan (blows)', lamp: 'Sun lamp (heat and light)', mirror: 'Mirror (sends the lamp’s light)' };
const OUTLOOK: Record<Reading['outlook']['kind'], (s: number | null) => string> = {
  rain: (s) => `outlook: rain, in about ${s} seconds.`,
  snow: (s) => `outlook: snow, in about ${s} seconds.`,
  storm: (s) => `outlook: lightning, within ${s} seconds. stand back.`,
  fog: () => 'outlook: fog settling on the low ground.',
  clearing: () => 'outlook: clearing. it’s nearly done.',
  settled: () => 'outlook: settled. nothing much coming.',
  raining: () => 'rain now, and more where that came from.',
  snowing: () => 'snow now. settling, I’d say.',
};
const FROM: Record<PostcardFrom, Parameters<typeof Portrait>[0]['who']> = { nimbus: 'nimbus', ferdinand: 'ferdinand', pim: 'pim', fox: 'fox', tick: 'tick', lumen: 'lumen', garden: 'inch', dot: 'dot', bip: 'bip', aunt: 'aunt' };

const specOf = (p: Postcard): PostcardSpec => ({ climate: p.climate, humidity: p.humidity, vaneUp: p.vaneUp, breeze: p.breeze, tools: p.tools, nimbus: p.nimbus, phases: p.phases });

/** A postcard's valley, with a few idle seconds already run so the air is moving when you arrive. */
function freshValley(p: Postcard | null): Valley {
  let v = p ? valleyFor(specOf(p)) : makeValley();
  for (let i = 0; i < 320; i++) v = stepValley(v);
  return v;
}

/**
 * The Weather Workshop (the old Mood Room, Phase 4). The window is a little
 * valley in a glass box, and the weather is not chosen: it happens, from
 * what you put in the valley. Postcards ask for particular weather. The
 * barometer is a gauge that forecasts. What the valley does is the house
 * weather. All the rules are in `./sim` (pure, tested).
 */
export default function Workshop() {
  const world = useWorld();
  const reduced = useSettings((s) => s.motion) === 'reduced';
  const solved = useKeepsakes((s) => s.workshop.solved);
  const firstOpen = POSTCARDS.find((p) => !solved.includes(p.id));
  const [cardId, setCardId] = useState<string>(firstOpen?.id ?? SANDBOX);
  const card = useMemo(() => POSTCARDS.find((p) => p.id === cardId) ?? null, [cardId]);
  const valleyRef = useRef<Valley | null>(null) as React.MutableRefObject<Valley>;
  if (!valleyRef.current) valleyRef.current = card ? freshValley(card) : enterWorkshop();
  const progressRef = useRef<Progress>(startProgress());
  const snapshots = useRef<Valley[]>([]);
  const [, setTick] = useState(0);
  const [progress, setProgress] = useState<Progress>(startProgress());
  const [reading, setReading] = useState<Reading | null>(null);
  const [line, setLine] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ tool: ToolId; x: number; y: number } | null>(null);
  const [carry, setCarry] = useState<{ tool: ToolId; cx: number; cy: number } | null>(null);
  const [status, setStatus] = useState('');
  const [almanac, setAlmanac] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const nimbusDown = useRef<{ x: number; t: number; moved: boolean; timer: number } | null>(null);
  const { rung, progress: madeProgress } = useHintLadder(cardId, !!card && !progress.done);
  const v = valleyRef.current;
  const tools = card ? card.tools : (TOOL_IDS as ToolId[]);
  const nimbusAllowed = card ? card.nimbus : true;

  const say = useCallback((text: string, ms = 4200) => {
    setLine(text);
    window.setTimeout(() => setLine((cur) => (cur === text ? null : cur)), ms);
  }, []);

  // coming in: the sandbox valley is the house's own; leaving hands it back to idle mode
  useEffect(() => {
    enterWorkshop();
    return () => leaveWorkshop();
  }, []);

  // a postcard arrives (the first second: someone already asking, the air already moving)
  useEffect(() => {
    setLine(card ? card.text : 'the valley’s yours. everything on the sill.');
    progressRef.current = startProgress();
    setProgress(startProgress());
    snapshots.current = [];
  }, [card]);

  // the hint ladder: a vague line at 60 s, a specific one at 120 s
  useEffect(() => {
    if (!card || rung < 2) return;
    say(card.hints[rung === 2 ? 0 : 1], 7000);
  }, [rung, card, say]);

  const notice = useCallback((prev: Valley, next: Valley) => noticeValley(world, prev, next), [world]);

  // the valley runs at 10 Hz on the shared frame loop; React hears about it a few times a second
  useEffect(() => {
    let acc = 0;
    let k = 0;
    return onFrame((dt) => {
      acc += Math.min(dt, 250);
      let changed = false;
      while (acc >= STEP_MS) {
        acc -= STEP_MS;
        const prev = valleyRef.current;
        const next = stepValley(prev);
        valleyRef.current = next;
        k++;
        changed = true;
        if (k % 10 === 0) {
          snapshots.current = [...snapshots.current, cloneValley(next)].slice(-30);
          notice(prev, next);
        }
        if (card && !progressRef.current.done) {
          const before = progressRef.current;
          const p = track(specOf(card), before, next);
          progressRef.current = p;
          if (p.done && !before.done) {
            setProgress(p);
            const fresh = useKeepsakes.getState().solvePostcard(card.id);
            say(card.thanks, 7000);
            world.effects.sound('chime');
            world.emit('OBJECT_STATE_CHANGED', { target: 'postcard', key: 'solved', value: card.id });
            if (fresh) useKeepsakes.getState().note(`postcard:${card.id}`, `Answered a postcard in the Weather Workshop.`, { once: true });
            if (card.id === 'whole-day') useKeepsakes.getState().remember('whole-day');
          } else if (p.phase !== before.phase || (p.held === 0) !== (before.held === 0)) setProgress(p);
        }
      }
      if (!changed) return;
      if (!card) setValley(valleyRef.current);
      if (k % 3 === 0) setTick((n) => n + 1);
      if (k % 10 === 0) publish(valleyRef.current);
      if (k % 20 === 0) setReading(readBarometer(valleyRef.current, 10));
    });
  }, [card, notice, say, world]);

  // ------------------------------------------------------------- doing things to the valley

  const doAct = useCallback(
    (a: ValleyAction) => {
      valleyRef.current = actOn(valleyRef.current, a);
      madeProgress();
      setTick((n) => n + 1);
      if (a.type === 'place' || a.type === 'remove') {
        // the old windowsill ids keep the house's mood responding as before
        const legacy: Record<ToolId, string> = { teacup: 'tea', ice: 'blanket', fan: 'feather', lamp: 'horn', mirror: 'mirror' };
        world.emit('OBJECT_STATE_CHANGED', { target: `mood:${legacy[a.tool]}`, key: 'use', value: a.type === 'place' });
      }
    },
    [madeProgress, world],
  );

  const toCell = (clientX: number, clientY: number) => {
    const r = boxRef.current!.getBoundingClientRect();
    return { x: ((clientX - r.left) / r.width) * W, y: ((clientY - r.top) / r.height) * H, inside: clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom };
  };

  // dragging a tool from the sill (or from where it is in the valley)
  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
      const c = toCell(e.clientX, e.clientY);
      // live: the valley feels the tool while you hold it there
      if (c.inside) valleyRef.current = actOn(valleyRef.current, { type: 'place', tool: drag.tool, x: c.x, y: c.y, dir: valleyRef.current.tools.find((t) => t.id === drag.tool)?.dir ?? (c.x > W / 2 ? -1 : 1) });
    };
    const up = (e: PointerEvent) => {
      const c = toCell(e.clientX, e.clientY);
      if (c.inside) {
        doAct({ type: 'place', tool: drag.tool, x: c.x, y: c.y, dir: valleyRef.current.tools.find((t) => t.id === drag.tool)?.dir ?? (c.x > W / 2 ? -1 : 1) });
        setStatus(`${TOOL_NAMES[drag.tool].split(' (')[0]} in the valley.`);
      } else {
        doAct({ type: 'remove', tool: drag.tool });
        setStatus(`${TOOL_NAMES[drag.tool].split(' (')[0]} back on the sill.`);
      }
      setDrag(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [drag, doAct]);

  const startDrag = (tool: ToolId) => (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setDrag({ tool, x: e.clientX, y: e.clientY });
  };

  // the keyboard: pick a tool up, walk it round the valley with the arrows, Enter to put it down
  const onCarryKey = (e: React.KeyboardEvent) => {
    if (!carry) return;
    const d: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (d[e.key]) {
      e.preventDefault();
      const [dx, dy] = d[e.key]!;
      setCarry({ ...carry, cx: Math.max(0, Math.min(W - 1, carry.cx + dx)), cy: Math.max(0, Math.min(H - 1, carry.cy + dy)) });
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      doAct({ type: 'place', tool: carry.tool, x: carry.cx + 0.5, y: carry.cy + 0.5, dir: carry.cx > W / 2 ? -1 : 1 });
      setStatus(`${TOOL_NAMES[carry.tool].split(' (')[0]} placed at column ${carry.cx + 1}, row ${carry.cy + 1}.`);
      setCarry(null);
    } else if (e.key === 'Escape') setCarry(null);
  };

  const onSillKey = (tool: ToolId) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const t = valleyRef.current.tools.find((x) => x.id === tool);
      setCarry({ tool, cx: t ? Math.floor(t.x) : 11, cy: t ? Math.floor(t.y) : 5 });
      setStatus(`Carrying the ${tool}. Arrow keys move it over the valley, Enter puts it down.`);
      boxRef.current?.focus();
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      doAct({ type: 'remove', tool });
      setStatus(`The ${tool} is back on the sill.`);
    }
  };

  // Nimbus: drag him along, hold to wring him out
  const nimbusPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    const timer = window.setTimeout(() => {
      doAct({ type: 'nimbus', x: valleyRef.current.nimbus.x, squeezing: true });
      world.effects.discover('indoor-weather');
    }, 260);
    nimbusDown.current = { x: e.clientX, t: performance.now(), moved: false, timer };
  };
  const nimbusPointerMove = (e: React.PointerEvent) => {
    const nd = nimbusDown.current;
    if (!nd) return;
    if (Math.abs(e.clientX - nd.x) > 6) nd.moved = true;
    const c = toCell(e.clientX, e.clientY);
    valleyRef.current = actOn(valleyRef.current, { type: 'nimbus', x: Math.floor(c.x), squeezing: valleyRef.current.nimbus.squeezing });
  };
  const nimbusPointerUp = () => {
    const nd = nimbusDown.current;
    if (!nd) return;
    window.clearTimeout(nd.timer);
    nimbusDown.current = null;
    doAct({ type: 'nimbus', x: valleyRef.current.nimbus.x, squeezing: false });
    if (valleyRef.current.nimbus.size <= 0.08) {
      world.effects.discover('nap');
      say('wrung out. having a lie-down till the pond’s had a think.');
    }
  };
  const nimbusKey = (e: React.KeyboardEvent) => {
    const n = valleyRef.current.nimbus;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      doAct({ type: 'nimbus', x: n.x + (e.key === 'ArrowLeft' ? -1 : 1), squeezing: n.squeezing });
    } else if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
      e.preventDefault();
      doAct({ type: 'nimbus', x: n.x, squeezing: true });
      world.effects.discover('indoor-weather');
    }
  };
  const nimbusKeyUp = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') doAct({ type: 'nimbus', x: valleyRef.current.nimbus.x, squeezing: false });
  };

  const rewind = () => {
    const snaps = snapshots.current;
    if (snaps.length < 2) return;
    const back = snaps[Math.max(0, snaps.length - 6)]!;
    valleyRef.current = cloneValley(back);
    snapshots.current = snaps.slice(0, Math.max(1, snaps.length - 5));
    progressRef.current = startProgress();
    setProgress(startProgress());
    setStatus('five seconds ago, again.');
    world.emit('OBJECT_STATE_CHANGED', { target: 'valley', key: 'rewind', value: true });
  };
  const clearValley = () => {
    valleyRef.current = card ? freshValley(card) : makeValley();
    progressRef.current = startProgress();
    setProgress(startProgress());
    snapshots.current = [];
    setStatus('a clean valley.');
  };

  const switchCard = (id: string) => {
    if (cardId === SANDBOX) setValley(valleyRef.current);
    setCardId(id);
    const p = POSTCARDS.find((x) => x.id === id) ?? null;
    valleyRef.current = p ? freshValley(p) : getValley();
  };

  // ------------------------------------------------------------- drawing

  const glance = card && rung >= 1 ? card.tools[0] : null;
  const phase = card ? card.phases[Math.min(progress.phase, card.phases.length - 1)] : null;
  const holdPct = phase ? Math.min(100, (progressRef.current.held / (phase.hold * 10)) * 100) : 0;
  const pct = (x: number, total: number) => `${(x / total) * 100}%`;

  return (
    <Stage label="Weather Workshop" id="mood-title" className={styles.room} note={card ? `postcard ${POSTCARDS.indexOf(card) + 1} of ${POSTCARDS.length}` : 'the sandbox'} data={{ solved: String(progress.done) }}>
      <Layer depth="far" className={styles.far}>
        <span className={styles.wallpaper} aria-hidden="true" />
      </Layer>

      <div className={styles.layout}>
        {/* the postcard and who sent it */}
        <section className={styles.post} aria-label="Postcards">
          <div className={styles.from}>
            <Portrait who={card ? FROM[card.from] : 'nimbus'} mood={progress.done ? 'solved' : 'open'} />
            <p className={styles.say} aria-live="polite" data-empty={!line || undefined}>
              {line}
            </p>
          </div>
          {card && phase ? (
            <div className={styles.card} data-done={progress.done}>
              <span className="visually-hidden">Wanted: </span>
              {progress.done ? 'Done.' : `${card.phases.length > 1 ? `${progress.phase + 1} of ${card.phases.length}: ` : ''}${phase.label}`}
              <span className={styles.hold} aria-hidden="true">
                <span style={{ width: `${progress.done ? 100 : holdPct}%` }} />
              </span>
            </div>
          ) : null}
        </section>

        {/* the valley in its glass box */}
        <div className={styles.boxWrap}>
          <button
            type="button"
            className={styles.nimbus}
            data-squeezing={v.nimbus.squeezing}
            disabled={!nimbusAllowed}
            style={{ left: pct(v.nimbus.x + 0.5, W), '--size': (0.55 + v.nimbus.size * 0.6).toFixed(2) } as React.CSSProperties}
            aria-label={`Nimbus, over column ${Math.round(v.nimbus.x) + 1}. Drag him along; hold him (or hold Space) to wring him out. He is ${Math.round(v.nimbus.size * 100)}% full.`}
            onPointerDown={nimbusAllowed ? nimbusPointerDown : undefined}
            onPointerMove={nimbusPointerMove}
            onPointerUp={nimbusPointerUp}
            onPointerCancel={nimbusPointerUp}
            onKeyDown={nimbusKey}
            onKeyUp={nimbusKeyUp}
          >
            <Portrait who="nimbus" mood={v.nimbus.size < 0.15 ? 'failed' : 'open'} />
          </button>

          <div ref={boxRef} className={styles.box} tabIndex={carry ? 0 : -1} onKeyDown={onCarryKey} aria-label="The valley in the glass box" role="group">
            <ValleyCanvas valleyRef={valleyRef} reduced={reduced} />
            <Scenery v={v} />
            {v.tools.map((t) => (
              <button
                key={t.id}
                type="button"
                className={styles.placed}
                data-tool={t.id}
                data-dir={t.dir}
                style={{ left: pct(t.x, W), top: pct(t.y, H) }}
                aria-label={`${TOOL_NAMES[t.id].split(' (')[0]} in the valley${t.id === 'fan' ? `, blowing ${t.dir < 0 ? 'west' : 'east'}` : ''}. Drag to move it, drag it out to take it back${t.id === 'fan' ? ', tap to turn it round' : ''}.`}
                onPointerDown={startDrag(t.id)}
                onClick={(e) => {
                  if (t.id === 'fan' && e.detail <= 1) doAct({ type: 'place', tool: 'fan', x: t.x, y: t.y, dir: t.dir < 0 ? 1 : -1 });
                }}
                onKeyDown={onSillKey(t.id)}
              >
                <ToolArt id={t.id} />
              </button>
            ))}
            <button
              type="button"
              className={styles.vane}
              data-up={v.vaneUp}
              style={{ left: pct(PLACES.vane + 0.5, W), top: pct(groundTop(PLACES.vane), H) }}
              aria-pressed={v.vaneUp}
              aria-label={v.vaneUp ? 'The weathervane, up. Press to lower it.' : 'The weathervane, lowered. Press to raise it.'}
              onClick={() => doAct({ type: 'vane', up: !v.vaneUp })}
            >
              <svg viewBox="0 0 30 40" aria-hidden="true">
                <path d="M15 40 V 12" stroke="var(--char-ink)" strokeWidth="2.5" />
                <path d="M5 12 L 25 12 L 21 7 M25 12 L 21 17" stroke="var(--char-ink)" strokeWidth="2.2" fill="none" />
                <path d="M6 9 L 11 12 L 6 15 Z" fill="var(--coral)" stroke="var(--char-ink)" strokeWidth="1.5" />
              </svg>
            </button>
            {carry ? <span className={styles.cursor} style={{ left: pct(carry.cx, W), top: pct(carry.cy, H), width: pct(1, W), height: pct(1, H) }} aria-hidden="true" /> : null}
          </div>

          {/* the sill */}
          <div className={styles.sill} role="group" aria-label="Things on the windowsill">
            {TOOL_IDS.map((id) => {
              const allowed = tools.includes(id);
              const inValley = v.tools.some((t) => t.id === id);
              return (
                <button
                  key={id}
                  type="button"
                  className={styles.tool}
                  data-in={inValley}
                  data-glance={glance === id || undefined}
                  disabled={!allowed}
                  aria-label={`${TOOL_NAMES[id]}${inValley ? ', in the valley' : ''}. Drag it into the valley, or press Enter to carry it with the arrow keys.`}
                  onPointerDown={allowed ? startDrag(id) : undefined}
                  onKeyDown={allowed ? onSillKey(id) : undefined}
                >
                  <ToolArt id={id} />
                </button>
              );
            })}
            <button type="button" className={styles.small} onClick={rewind} aria-label="Take the valley back five seconds">
              ↶ 5 s
            </button>
            <button type="button" className={styles.small} onClick={clearValley}>
              clear
            </button>
          </div>
        </div>

        {/* the barometer: a gauge now, not a switch */}
        <section className={styles.baro} aria-label="Barometer">
          <svg viewBox="0 0 120 70" aria-hidden="true">
            <path d="M10 64 A 50 50 0 0 1 110 64" fill="var(--cut-paper)" stroke="var(--char-ink)" strokeWidth="3" />
            <path d="M18 64 A 42 42 0 0 1 40 28" stroke="var(--blue-l1)" strokeWidth="6" fill="none" />
            <path d="M80 28 A 42 42 0 0 1 102 64" stroke="var(--yellow)" strokeWidth="6" fill="none" />
            <g style={{ transform: `rotate(${reading ? Math.max(-80, Math.min(80, (reading.pressure - 1013) * 6)) : 0}deg)`, transformOrigin: '60px 64px', transition: 'transform 900ms var(--ease-spring)' }}>
              <line x1="60" y1="64" x2="60" y2="22" stroke="var(--coral)" strokeWidth="3.5" strokeLinecap="round" />
            </g>
            <circle cx="60" cy="64" r="5" fill="var(--char-ink)" />
          </svg>
          <dl>
            <div>
              <dt>Pressure</dt>
              <dd>{reading ? `${reading.pressure} hPa` : '…'}</dd>
            </div>
            <div>
              <dt>Humidity</dt>
              <dd>{reading ? `${reading.humidity}%` : '…'}</dd>
            </div>
          </dl>
          <p className={styles.outlook} aria-live="polite">
            {reading ? OUTLOOK[reading.outlook.kind](reading.outlook.inSeconds) : 'reading…'}
          </p>
          <button type="button" className={styles.small} onClick={() => setAlmanac(!almanac)} aria-expanded={almanac}>
            almanac
          </button>
        </section>
      </div>

      <nav className={styles.cards} aria-label="Postcards">
        {POSTCARDS.map((p, i) => {
          const done = solved.includes(p.id);
          const open = done || i === 0 || solved.includes(POSTCARDS[i - 1]!.id);
          return (
            <button key={p.id} type="button" className={styles.peg} data-done={done} aria-current={cardId === p.id} disabled={!open} onClick={() => switchCard(p.id)} aria-label={`Postcard ${i + 1}${open ? '' : ' (not yet)'}${done ? ', answered' : ''}`}>
              {i + 1}
            </button>
          );
        })}
        <button type="button" className={`${styles.peg} ${styles.free}`} aria-current={cardId === SANDBOX} onClick={() => switchCard(SANDBOX)} aria-label="The sandbox valley: everything on the sill, no postcard">
          ∞
        </button>
      </nav>

      {progress.done && card ? (
        <button type="button" className={`paper-btn ${styles.next}`} onClick={() => switchCard(POSTCARDS.find((p) => !useKeepsakes.getState().workshop.solved.includes(p.id))?.id ?? SANDBOX)}>
          next postcard →
        </button>
      ) : null}

      {almanac ? (
        <div className={styles.almanac}>
          <Almanac />
        </div>
      ) : null}

      {drag ? (
        <span className={styles.ghost} style={{ left: drag.x, top: drag.y }} aria-hidden="true">
          <ToolArt id={drag.tool} />
        </span>
      ) : null}
      <p className={styles.status} role="status" aria-live="polite">
        {status}
      </p>
    </Stage>
  );
}

/** The ground of the valley: village, Ferdinand’s house, washing, field, pond, well, hill. */
function Scenery({ v }: { v: Valley }) {
  const cw = 100 / W;
  const ch = 100 / H;
  const top = (x: number) => groundTop(x) * ch;
  // the ground as a line through the middle of each column: slopes, not steps
  const ground = `M0 100 L 0 ${top(0)} ${GROUND.map((_, x) => `L ${(x + 0.5) * cw} ${top(x)}`).join(' ')} L 100 ${top(W - 1)} L 100 100 Z`;
  const frozen = PLACES.pond.some((x) => v.temp[(groundTop(x) - 1) * W + x]! < 0);
  return (
    <svg className={styles.scenery} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <path d={ground} fill="var(--mint-d1)" stroke="var(--char-ink)" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
      {/* wet ground darkens, snow lies white */}
      {GROUND.map((_, x) => (
        <g key={x}>
          {v.wet[x]! > 0.05 ? <rect x={x * cw} y={top(x)} width={cw} height={Math.min(4, v.wet[x]! * 3)} fill="var(--mint-d2)" /> : null}
          {v.snow[x]! > 0.02 ? <rect x={x * cw} y={top(x) - Math.min(2.5, v.snow[x]! * 2)} width={cw} height={Math.min(2.5, v.snow[x]! * 2) + 0.4} fill="#fbfbff" stroke="var(--char-ink)" strokeWidth="0.3" vectorEffect="non-scaling-stroke" /> : null}
        </g>
      ))}
      {/* the pond */}
      <rect x={PLACES.pond[0] * cw} y={top(PLACES.pond[0])} width={PLACES.pond.length * cw} height={ch * 0.55} fill={frozen ? '#dfeefe' : 'var(--blue-l1)'} stroke="var(--char-ink)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
      {/* the village and Ferdinand's house */}
      {[0, 1, 2].map((x) => (
        <path key={x} d={`M${x * cw + 0.6} ${top(x)} v -${ch * 0.6} l ${cw * 0.35} -${ch * 0.35} l ${cw * 0.35} ${ch * 0.35} v ${ch * 0.6} Z`} fill="var(--cut-paper)" stroke="var(--char-ink)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
      ))}
      <path d={`M${3 * cw + 0.3} ${top(3)} v -${ch * 0.75} l ${cw * 0.45} -${ch * 0.45} l ${cw * 0.45} ${ch * 0.45} v ${ch * 0.75} Z`} fill="var(--yellow)" stroke="var(--char-ink)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
      {/* the washing line */}
      <path d={`M${5 * cw} ${top(5)} v -${ch * 0.8} M${7 * cw} ${top(6)} v -${ch * 0.8} M${5 * cw} ${top(5) - ch * 0.75} q ${cw} ${ch * 0.2} ${2 * cw} 0`} stroke="var(--char-ink)" strokeWidth="0.5" fill="none" vectorEffect="non-scaling-stroke" />
      {[5.4, 6, 6.5].map((x, i) => (
        <rect key={i} x={x * cw} y={top(5) - ch * 0.68} width={cw * 0.35} height={ch * 0.32} fill={['var(--coral)', 'var(--blue-l1)', 'var(--lavender)'][i]} stroke="var(--char-ink)" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
      ))}
      {/* the field the garden can see */}
      {PLACES.field.map((x) => (
        <path key={x} d={`M${x * cw + 0.5} ${top(x)} l ${cw * 0.2} -${ch * 0.25} M${x * cw + cw * 0.5} ${top(x)} l ${cw * 0.2} -${ch * 0.25}`} stroke="var(--yellow-d2)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
      ))}
      {/* the well */}
      <rect x={PLACES.well[0] * cw + cw * 0.2} y={top(PLACES.well[0]) - ch * 0.4} width={cw * 0.6} height={ch * 0.4} fill="#a7a3b3" stroke="var(--char-ink)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function ToolArt({ id }: { id: ToolId }) {
  const ink = { stroke: 'var(--char-ink)', strokeWidth: 2.4, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  switch (id) {
    case 'teacup':
      return (
        <svg viewBox="0 0 40 40" aria-hidden="true">
          <path d="M8 18 H 28 C 28 30 22 34 18 34 C 14 34 8 30 8 18 Z" fill="var(--mint)" {...ink} />
          <path d="M28 21 C 34 21 34 28 27 28" fill="none" {...ink} />
          <path d="M14 13 q -2 -4 1 -7 M20 13 q -2 -4 1 -7" fill="none" {...ink} strokeWidth={1.8} />
        </svg>
      );
    case 'ice':
      return (
        <svg viewBox="0 0 40 40" aria-hidden="true">
          <path d="M9 14 L 20 8 L 31 14 L 31 27 L 20 33 L 9 27 Z" fill="#dff1ff" {...ink} />
          <path d="M9 14 L 20 20 L 31 14 M20 20 V 33" fill="none" {...ink} strokeWidth={1.6} />
        </svg>
      );
    case 'fan':
      return (
        <svg viewBox="0 0 40 40" aria-hidden="true">
          <path d="M20 34 L 6 12 Q 20 2 34 12 Z" fill="var(--coral-l1)" {...ink} />
          <path d="M20 34 L 13 8 M20 34 L 20 6 M20 34 L 27 8" fill="none" {...ink} strokeWidth={1.4} />
        </svg>
      );
    case 'lamp':
      return (
        <svg viewBox="0 0 40 40" aria-hidden="true">
          <circle cx="20" cy="18" r="9" fill="var(--yellow)" {...ink} />
          <path d="M20 3 v 4 M20 29 v 4 M5 18 h 4 M31 18 h 4 M9 8 l 3 3 M28 27 l 3 3 M31 8 l -3 3 M12 27 l -3 3" {...ink} />
        </svg>
      );
    case 'mirror':
      return (
        <svg viewBox="0 0 40 40" aria-hidden="true">
          <ellipse cx="20" cy="17" rx="10" ry="12" fill="var(--blue-l2)" {...ink} />
          <path d="M14 12 q 4 -4 8 -2" fill="none" stroke="#fff" strokeWidth="2" />
          <path d="M20 29 V 36" {...ink} />
        </svg>
      );
  }
}
