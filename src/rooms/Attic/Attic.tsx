import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useHintLadder } from '../../app/hints';
import { findLetter } from '../../app/letters';
import { useWorld } from '../../app/worldInstance';
import { Layer, Stage } from '../../art/Stage';
import { ACT_LINES, CLUES, DUST_LINES, HATS, HAT_FOR_GROUP, LOCK_LABEL, LOCK_LINES, MARGUERITE_CLUE, MARGUERITE_IDLE, MARGUERITE_OPEN, MARGUERITE_WRONG, SCENE_FOR, SCENE_HINTS, THINGS, TWIST, VIGNETTES, clueById, thingById, type HatId } from '../../content/attic';
import { onFrame } from '../../engine/frameLoop';
import { useKeepsakes } from '../../state/keepsakes';
import { useSettings } from '../../state/settings';
import { Diary } from './Diary';
import { DustGrid } from './dust';
import { EvidenceArt } from './EvidenceArt';
import { Gramophone } from './Gramophone';
import { HatSvg, MargueriteSvg } from './Marguerite';
import { MemoryBoard } from './MemoryBoard';
import { check, find, fromSave, pin, solvedAll, toSave, tryTrunk, type Board, type Pin } from './mystery/board';
import { ShadowTheatre } from './shadows/ShadowTheatre';
import { ACT_X, FIXTURES, SPOTS, WORLD } from './spots';
import { Trunk } from './Trunk';
import styles from './AtticRoom.module.css';

const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)]!;
/** A spot counts as uncovered below this much dust. */
const CLEAN = 0.3;
/** How long a pin has to stay put before the board looks at it. */
export const SETTLE_MS = 900;
const isHat = (v: string): v is HatId => (HATS as readonly string[]).includes(v);
/** Evidence that lives in the attic under the dust (scenes come from the theatre, the badge from the trunk). */
const DUSTY = [...THINGS.map((t) => t.id).filter((id) => id !== 'cap-badge'), ...CLUES.filter((c) => c.source !== 'scene' && c.source !== 'trunk' && c.source !== 'garden' && c.id !== 'photo-bench-back').map((c) => c.id)];
const actOf = (id: string): 1 | 2 | 3 => thingById(id)?.act ?? clueById(id)?.act ?? 1;

/**
 * The attic, Phase 4: "What Marguerite Forgot". Rub the dust off and the
 * evidence comes up: photographs, pages of the house's old diary, record
 * sleeves, labels, and the things themselves. Pin the things to the Memory
 * Board and string each to a person and a decade; three right together and
 * Marguerite remembers. Five memories wait in the shadow theatre; the trunk
 * wants a year. The mystery's rules are in `./mystery` (pure, tested).
 */
export default function Attic() {
  const world = useWorld();
  const reduced = useSettings((s) => s.motion) === 'reduced';
  const saved = useKeepsakes((s) => s.board);
  const [board, setBoard] = useState<Board>(() => fromSave(saved));
  const boardRef = useRef(board);
  boardRef.current = board;
  const hats = useKeepsakes((s) => s.attic.hats).filter(isHat);
  const gardenHybrid = useKeepsakes((s) => s.garden2.herbarium.some((h) => h.startsWith('hybrid:')) || s.garden.vase.some((v) => v.startsWith('hybrid:')));
  const [line, setLine] = useState<string | null>(null);
  const [reading, setReading] = useState<string | null>(null);
  const [panel, setPanel] = useState<'attic' | 'board'>('attic');
  const [theatre, setTheatre] = useState(false);
  const [houseDiary, setHouseDiary] = useState(false);
  const [dials, setDials] = useState([1, 9, 0, 0]);
  const [fresh, setFresh] = useState<string[]>([]);
  const [twist, setTwist] = useState(false);
  const [wearing, setWearing] = useState<HatId | null>(() => (hats.length ? hats[hats.length - 1]! : null));
  const [uncovered, setUncovered] = useState<Set<string>>(() => new Set(board.found));
  const stageRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dust = useRef<DustGrid | null>(null);
  const dustDirty = useRef(true);
  const scale = useRef(1);
  const offset = useRef(0);
  const hand = useRef({ x: -999, y: -999, down: false });
  const lastFilled = useRef(0);
  const intro = board.found.length === 0;
  const { rung, progress } = useHintLadder(`attic-${board.act}-${board.locked.length}`, !solvedAll(board));

  const say = useCallback((text: string, ms = 4200) => {
    setLine(text);
    window.setTimeout(() => setLine((cur) => (cur === text ? null : cur)), ms);
  }, []);

  // up the ladder: the attic is found; the first time, a photograph falls off a rafter
  useEffect(() => {
    useKeepsakes.getState().unlockAttic();
    world.effects.discover('attic');
    const t = window.setTimeout(() => say(boardRef.current.found.length ? pick(MARGUERITE_IDLE) : MARGUERITE_OPEN, 6000), intro ? 1100 : 400);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // the board is kept between visits
  useEffect(() => {
    useKeepsakes.getState().setBoard(toSave(board));
  }, [board]);

  // stuck? Marguerite glances, then nudges towards a memory in the theatre
  useEffect(() => {
    if (rung < 2) return;
    const missing = Object.values(SCENE_FOR).find((id) => !board.found.includes(id) && clueById(id)!.act <= board.act);
    if (missing && rung === 3) say(SCENE_HINTS[missing]!, 7000);
    else if (rung === 2) say('the board helps. three at a time, it comes back.', 6000);
  }, [rung, board, say]);

  // ------------------------------------------------------------- the board

  const apply = useCallback(
    (next: Board, why: 'pin' | 'find') => {
      const r = check(next);
      setBoard(r.board);
      progress();
      if (r.groups.length) {
        const before = boardRef.current.locked.length;
        r.groups.forEach((g, k) => {
          const n = Math.floor((before + r.groups.slice(0, k).flat().length) / 3);
          const hat = HAT_FOR_GROUP[Math.min(HAT_FOR_GROUP.length - 1, n)]!;
          useKeepsakes.getState().addHat(hat);
          setWearing(hat);
          say(VIGNETTES[Math.min(VIGNETTES.length - 1, n)]!, 9000);
          world.emit('OBJECT_STATE_CHANGED', { target: 'attic:board', key: 'locked', value: g.join(',') });
        });
        setFresh(r.groups.flat());
        window.setTimeout(() => setFresh([]), 1600);
        world.effects.sound('chime');
        world.effects.discover('memory-lane');
        if (useKeepsakes.getState().attic.hats.length >= HATS.length) world.effects.discover('dress-rehearsal');
        useKeepsakes.getState().note('attic:remembered', 'Marguerite remembered someone who used to live here.', { once: true });
        if (r.opened) window.setTimeout(() => say(ACT_LINES[r.opened as 2 | 3]), 9500);
        if (solvedAll(r.board)) {
          setTwist(true);
          world.effects.discover('dust-bunnies');
          useKeepsakes.getState().remember('attic-twist');
          useKeepsakes.getState().note('attic:twist', 'Marguerite remembered everyone. Great-Aunt Pim was Bea, the girl who drew on the walls.', { once: true });
        }
      } else if (why === 'pin' && r.somethingWrong) {
        const filled = Object.values(r.board.pins).filter((p) => p.owner && p.decade).length;
        if (filled !== lastFilled.current) say(pick(MARGUERITE_WRONG));
        lastFilled.current = filled;
      }
    },
    [progress, say, world],
  );

  // the board looks once a pin has settled, not while you flick through the dial
  const settle = useRef<number | undefined>(undefined);
  const onPin = (thing: string, patch: Pin) => {
    const next = pin(boardRef.current, thing, patch);
    boardRef.current = next;
    setBoard(next);
    progress();
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => apply(boardRef.current, 'pin'), SETTLE_MS);
  };
  useEffect(() => () => window.clearTimeout(settle.current), []);

  /** Something comes out from under the dust (or out of the theatre, or the trunk). */
  const uncover = useCallback(
    (id: string) => {
      setUncovered((u) => (u.has(id) ? u : new Set(u).add(id)));
      if (id === 'letter') {
        say(DUST_LINES.letter);
        findLetter(world, 'attic');
        return;
      }
      if (id === 'diary' || boardRef.current.found.includes(id)) return;
      const next = find(boardRef.current, id);
      if (next === boardRef.current) return;
      apply(next, 'find');
      world.emit('OBJECT_STATE_CHANGED', { target: `attic:${id}`, key: 'found', value: true });
      if (thingById(id)) say(`${thingById(id)!.name.toLowerCase()}. that’s going on the board.`, 3000);
      else say(pick(MARGUERITE_CLUE), 3000);
    },
    [apply, say, world],
  );

  // ------------------------------------------------------------- the dust

  const visible = useCallback((id: string) => actOf(id) <= boardRef.current.act || id === 'letter' || id === 'diary', []);

  const buildDust = useCallback(() => {
    const g = new DustGrid(Math.ceil(WORLD.w / WORLD.cell), Math.ceil(WORLD.h / WORLD.cell), WORLD.cell);
    for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) g.lv[r * g.cols + c] = 0.78 + (((c * 7 + r * 13) % 10) / 10) * 0.2;
    // the photograph that fell is only lightly dusty
    const ph = SPOTS['photo-shop']!;
    for (let r = Math.floor(ph.y / WORLD.cell); r < Math.ceil((ph.y + ph.h) / WORLD.cell); r++) for (let c = Math.floor(ph.x / WORLD.cell); c < Math.ceil((ph.x + ph.w) / WORLD.cell); c++) g.lv[r * g.cols + c] = 0.42;
    for (const id of uncovered) if (SPOTS[id]) g.clear(SPOTS[id]!);
    dust.current = g;
    dustDirty.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    buildDust();
    // show the part of the attic that's open (and a dark strip of what isn't), as big as fits
    const fit = () => {
      const st = stageRef.current;
      if (!st || !st.clientWidth) return;
      const act = boardRef.current.act;
      const vis = Math.min(WORLD.w, ACT_X[act][1] + (act < 3 ? 70 : 0));
      const roomH = Math.max(260, window.innerHeight - (window.innerWidth < 860 ? 300 : 230));
      scale.current = Math.max(0.25, Math.min(st.clientWidth / vis, roomH / WORLD.h));
      offset.current = Math.max(0, (st.clientWidth - vis * scale.current) / 2);
      st.style.height = `${WORLD.h * scale.current}px`;
      if (worldRef.current) worldRef.current.style.transform = `translateX(${offset.current}px) scale(${scale.current})`;
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [buildDust, panel, board.act]);

  useEffect(() => {
    let checkIn = 0;
    return onFrame((dt) => {
      const g = dust.current;
      if (!g) return;
      if (dustDirty.current && canvasRef.current) {
        dustDirty.current = false;
        const ctx = canvasRef.current.getContext?.('2d');
        if (ctx) {
          const img = ctx.createImageData(g.cols, g.rows);
          for (let i = 0; i < g.lv.length; i++) {
            const v = g.lv[i]!;
            const n = ((i * 2654435761) >>> 24) / 255;
            img.data[i * 4] = 150 + n * 30;
            img.data[i * 4 + 1] = 138 + n * 26;
            img.data[i * 4 + 2] = 122 + n * 20;
            img.data[i * 4 + 3] = Math.round(Math.min(1, v) * 222);
          }
          ctx.putImageData(img, 0, 0);
        }
      }
      checkIn -= dt;
      if (checkIn > 0) return;
      checkIn = 220;
      for (const id of [...DUSTY, 'letter', 'diary']) {
        const r = SPOTS[id];
        if (!r || !visible(id)) continue;
        if (g.coverage(r) < CLEAN) uncover(id);
      }
      if (g.total() < 0.04) world.effects.discover('spring-clean');
    });
  }, [uncover, visible, world]);

  const toWorld = (e: { clientX: number; clientY: number }) => {
    const r = stageRef.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left - offset.current) / scale.current, y: (e.clientY - r.top) / scale.current };
  };
  const onDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || (e.target as Element).closest('button, [role=spinbutton]')) return;
    try {
      stageRef.current?.setPointerCapture?.(e.pointerId);
    } catch {
      /* nothing to capture */
    }
    Object.assign(hand.current, toWorld(e), { down: true });
  };
  const onMove = (e: React.PointerEvent) => {
    const h = hand.current;
    const q = toWorld(e);
    if (!h.down) return;
    const dist = Math.hypot(q.x - h.x, q.y - h.y);
    h.x = q.x;
    h.y = q.y;
    const g = dust.current;
    // the closed-off parts of the attic don't rub clean yet
    const act = q.x < ACT_X[1][1] ? 1 : q.x < ACT_X[2][1] ? 2 : 3;
    if (!g || dist <= 0 || act > boardRef.current.act) return;
    if (g.scrub(q.x, q.y, Math.min(0.6, dist / 40), 34) > 0.01) dustDirty.current = true;
  };
  const onUp = () => {
    hand.current.down = false;
  };

  /** Keyboard: dust the next thing completely. */
  const dustNext = () => {
    const g = dust.current;
    const id = [...DUSTY, 'letter'].find((x) => visible(x) && SPOTS[x] && !uncovered.has(x));
    if (!g || !id) return;
    g.clear(SPOTS[id]!);
    dustDirty.current = true;
    uncover(id);
  };

  // ------------------------------------------------------------- the theatre and the trunk

  const onCreature = useCallback(
    (c: keyof typeof SCENE_FOR) => {
      const id = SCENE_FOR[c];
      const clue = clueById(id)!;
      if (clue.act > boardRef.current.act) {
        say('that one… not yet. it’s further back, somewhere.');
        return;
      }
      setReading(id);
      uncover(id);
    },
    [say, uncover],
  );

  const turnDial = (i: number, dir: 1 | -1) => {
    if (board.trunkOpen) return;
    const next = dials.map((v, k) => (k === i ? (v + dir + 10) % 10 : v));
    setDials(next);
    world.effects.sound('press');
    const opened = tryTrunk(boardRef.current, next);
    if (opened.trunkOpen) {
      world.effects.sound('chime');
      world.effects.discover('combination');
      world.emit('OBJECT_STATE_CHANGED', { target: 'attic:trunk', key: 'open', value: true });
      say(LOCK_LINES.open);
      apply(find(find(opened, 'cap-badge'), 'badge-box'), 'find');
    }
  };

  const readItem = (id: string) => {
    setReading(id);
    // turning the bench photograph over (once the middle of the attic is open)
    if (id === 'photo-bench' && boardRef.current.act >= 2) uncover('photo-bench-back');
  };

  // ------------------------------------------------------------- drawing

  const box = (r: { x: number; y: number; w: number; h: number }): React.CSSProperties => ({ left: r.x, top: r.y, width: r.w, height: r.h });
  const items = useMemo(() => [...DUSTY, ...(gardenHybrid ? ['pressed-flower'] : [])], [gardenHybrid]);
  const readingClue = reading ? clueById(reading) : null;
  const readingThing = reading ? thingById(reading) : null;

  const scene = (
    <div
      ref={stageRef}
      className={styles.scene}
      data-act={board.act}
      data-intro={intro || undefined}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      aria-label="The attic, under the dust. Press and rub to uncover things."
      role="group"
    >
      <div ref={worldRef} className={styles.world} style={{ width: WORLD.w, height: WORLD.h }}>
        <div className={styles.beams} aria-hidden="true" />
        <div className={styles.floor} aria-hidden="true" style={{ top: WORLD.floor }} />
        <div className={styles.skylight} data-open={board.act >= 2} aria-hidden="true" />
        {/* the shadow theatre's sheet, always there */}
        <button type="button" className={styles.sheetSpot} style={box(FIXTURES.sheet)} onClick={() => setTheatre(true)} aria-label="The old sheet and the lamp: the shadow theatre">
          <span />
        </button>
        <div className={styles.marguerite} style={box(FIXTURES.marguerite)}>
          <button type="button" className="prop-btn" onClick={() => say(pick(MARGUERITE_IDLE))} aria-label={`Marguerite the dress form${wearing ? `, wearing ${wearing}` : ''}`}>
            <MargueriteSvg hat={wearing} />
          </button>
        </div>
        <div className={styles.gramSpot} style={box(FIXTURES.gramophone)}>
          <Gramophone onTempo={() => {}} dusty={false} />
        </div>
        {items.map((id) => {
          const r = SPOTS[id];
          if (!r || !visible(id)) return null;
          const up = uncovered.has(id);
          const c = clueById(id);
          const t = thingById(id);
          return (
            <button
              key={id}
              type="button"
              className={styles.item}
              data-up={up}
              data-kind={t ? 'thing' : c?.source}
              data-fall={id === 'photo-shop' && intro && !reduced ? true : undefined}
              style={box(r)}
              disabled={!up}
              onClick={() => readItem(id)}
              aria-label={up ? `${t ? t.name : c!.title}. Read it.` : 'Something under the dust'}
            >
              <EvidenceArt id={id} />
            </button>
          );
        })}
        {/* the trunk, at the far end */}
        {board.act >= 3 ? (
          <div className={styles.trunk} style={box(SPOTS.trunk!)} data-open={board.trunkOpen}>
            <svg viewBox="0 0 130 92" aria-hidden="true">
              <rect x="3" y="30" width="124" height="58" rx="5" fill="#6b3f2a" stroke="var(--char-ink)" strokeWidth="2.5" />
              <path d="M3 32 C 3 4 127 4 127 32 Z" fill="#7a4a30" stroke="var(--char-ink)" strokeWidth="2.5" className={styles.lid} />
            </svg>
            <div className={styles.lock} role="group" aria-label={LOCK_LABEL}>
              {dials.map((d, i) => (
                <span
                  key={i}
                  role="spinbutton"
                  tabIndex={0}
                  aria-label={`Dial ${i + 1}`}
                  aria-valuemin={0}
                  aria-valuemax={9}
                  aria-valuenow={d}
                  className={styles.dial}
                  onClick={() => turnDial(i, 1)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowUp') turnDial(i, 1);
                    else if (e.key === 'ArrowDown') turnDial(i, -1);
                    else return;
                    e.preventDefault();
                  }}
                >
                  {d}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        <button type="button" className={styles.houseDiary} style={box(SPOTS.diary!)} onClick={() => setHouseDiary(true)} disabled={!uncovered.has('diary')} aria-label={uncovered.has('diary') ? 'The house’s own diary (the new one)' : 'Something under the dust'}>
          <span />
        </button>
        {uncovered.has('letter') ? <div className={styles.envelope} style={box(SPOTS.letter!)} aria-hidden="true" /> : null}
        <canvas ref={canvasRef} className={styles.dust} width={Math.ceil(WORLD.w / WORLD.cell)} height={Math.ceil(WORLD.h / WORLD.cell)} style={{ width: WORLD.w, height: WORLD.h }} aria-hidden="true" />
        {/* the parts of the attic not open yet */}
        {([2, 3] as const).map((a) =>
          board.act < a ? (
            <div key={a} className={styles.closed} style={{ left: ACT_X[a][0], width: ACT_X[a][1] - ACT_X[a][0] }} aria-hidden="true">
              <span>{a === 2 ? 'too dark back there' : 'behind the trunk'}</span>
            </div>
          ) : null,
        )}
        <span className={styles.beam} aria-hidden="true" />
      </div>
    </div>
  );

  return (
    <Stage label="Attic" id="attic-title" className={styles.room} note={`act ${board.act} · ${board.locked.length} of ${THINGS.length} remembered`} data={{ act: String(board.act) }}>
      <Layer depth="far" className={styles.roof}>
        <span aria-hidden="true" />
      </Layer>
      <div className={styles.layout} data-panel={panel}>
        <div className={styles.tabs} role="tablist" aria-label="Attic or board">
          <button type="button" role="tab" aria-selected={panel === 'attic'} onClick={() => setPanel('attic')}>
            the attic
          </button>
          <button type="button" role="tab" aria-selected={panel === 'board'} onClick={() => setPanel('board')}>
            the board ({board.found.filter((id) => thingById(id)).length})
          </button>
        </div>
        <div className={styles.left}>
          <p className={styles.say} aria-live="polite" data-empty={!line || undefined}>
            {line}
          </p>
          {scene}
          <div className={styles.keys}>
            <button type="button" className={styles.small} onClick={dustNext}>
              Dust the next thing
            </button>
            {board.found.includes('photo-shop') && !board.locked.length ? <span className={styles.tip}>Things you find go on the board. Give each a person and a decade.</span> : null}
          </div>
        </div>
        <div className={styles.right}>
          <MemoryBoard board={board} onPin={onPin} onRead={readItem} fresh={fresh} />
        </div>
      </div>

      {readingClue || readingThing ? (
        <div className={styles.reader} role="dialog" aria-label={readingThing ? readingThing.name : readingClue!.title}>
          <div className={styles.readerArt}>
            <EvidenceArt id={reading!} />
          </div>
          <h2>{readingThing ? readingThing.name : readingClue!.title}</h2>
          <p>{readingThing ? readingThing.looks : readingClue!.text}</p>
          {readingThing ? <p className={styles.small2}>It’s on the board.</p> : null}
          <button type="button" className="paper-btn" onClick={() => setReading(null)}>
            put it down
          </button>
        </div>
      ) : null}

      {theatre ? (
        <div className={styles.overlay} role="dialog" aria-label="The shadow theatre">
          <ShadowTheatre world={world} onMarguerite={(l) => say(l)} onCreature={onCreature} />
          <button type="button" className="paper-btn" onClick={() => setTheatre(false)}>
            back to the attic
          </button>
        </div>
      ) : null}

      {houseDiary ? (
        <div className={styles.overlay} role="dialog" aria-label="The house’s diary">
          <Diary onOpen={(n) => n >= 5 && world.effects.discover('dear-diary')} />
          {board.trunkOpen ? <Trunk /> : null}
          <button type="button" className="paper-btn" onClick={() => setHouseDiary(false)}>
            close
          </button>
        </div>
      ) : null}

      {twist ? (
        <div className={styles.overlay} role="dialog" aria-label="What Marguerite remembered">
          <div className={styles.twist}>
            <HatSvg hat="topper" />
            {TWIST.map((l) => (
              <p key={l}>{l}</p>
            ))}
            {board.trunkOpen ? <Trunk /> : null}
            <button type="button" className="paper-btn" onClick={() => setTwist(false)}>
              thank you, Marguerite
            </button>
          </div>
        </div>
      ) : null}
    </Stage>
  );
}
