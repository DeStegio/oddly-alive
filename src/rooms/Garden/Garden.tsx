import { useCallback, useEffect, useRef, useState } from 'react';
import { useWorld } from '../../app/worldInstance';
import { Inch } from '../../characters/Inch';
import { ThoughtBubble } from '../../characters/ThoughtBubble';
import { LivingTitle } from '../../components/LivingTitle';
import { WeatherLayer } from '../../components/WeatherLayer';
import { useWeather } from '../../components/useWeather';
import { BIP_FENCE, GARDEN_LINES, INCH_GARDEN, PACKETS, TIN_LABEL } from '../../content/garden';
import type { StoredPlot } from '../../engine/memory';
import { useKeepsakes } from '../../state/keepsakes';
import { useSettings } from '../../state/settings';
import { useObjects } from '../../state/world';
import { PLANTS, PLANT_KINDS, advance, isPlantKind, plant, stage, water, type GrowContext, type PlantKind, type Stage } from './growth';
import { PlantView } from './PlantView';
import styles from './Garden.module.css';

type Tool = PlantKind | 'water';
const pick = <T,>(lines: readonly T[]) => lines[Math.floor(Math.random() * lines.length)]!;
const TICK_MS = 1000;
/** Away at least this long and grown this much: "came back for it". */
const CAME_BACK_MS = 30 * 60_000;

const STAGE_NAMES = ['just planted', 'a sprout', 'in leaf', 'in bud', 'in bloom'];

/**
 * The back garden: six plots in three raised beds. Plants grow in real time
 * (and, more slowly, while you're away), helped or stopped by the house
 * weather. Flowers go to the Living Room vase, radishes to the Playground.
 */
export default function Garden() {
  const world = useWorld();
  const weather = useWeather();
  const afterHours = useSettings((s) => s.afterHours);
  const stored = useKeepsakes((s) => s.garden.plots);
  const [plots, setPlots] = useState<Array<StoredPlot | null>>(() => stored);
  const [tool, setTool] = useState<Tool | null>(null);
  const [inchLine, setInchLine] = useState<string | null>(null);
  const [bipLine, setBipLine] = useState<string | null>(null);
  const inchRef = useRef<HTMLDivElement>(null);
  const plotsRef = useRef(plots);
  plotsRef.current = plots;
  const ctxRef = useRef<GrowContext>({ weather, night: afterHours, present: true });
  ctxRef.current = { weather, night: afterHours, present: true };

  const say = useCallback((set: React.Dispatch<React.SetStateAction<string | null>>, text: string, ms = 2600) => {
    set(text);
    window.setTimeout(() => set((cur) => (cur === text ? null : cur)), ms);
  }, []);

  /** Write one plot through to the keepsakes (and so to memory). */
  const persist = useCallback((i: number, p: StoredPlot | null) => useKeepsakes.getState().setPlot(i, p), []);

  const bloomed = useCallback(
    (kind: PlantKind, all: Array<StoredPlot | null>) => {
      world.emit('OBJECT_STATE_CHANGED', { target: `garden:${kind}`, key: 'bloom', value: true });
      world.effects.discover('green-thumb');
      useKeepsakes.getState().note('garden:first-bloom', `The first ${PACKETS[kind].name.toLowerCase()} came out in the garden.`, { once: true });
      if (kind === 'moonflower') world.effects.discover('night-shift');
      if (all.every((p) => p && p.growth >= 1)) world.effects.discover('full-bed');
    },
    [world],
  );

  // catch up on time spent away, once, on the way in
  useEffect(() => {
    const now = Date.now();
    const away: GrowContext = { weather: 'clear', night: false, present: false };
    let cameBack = false;
    const caught = useKeepsakes.getState().garden.plots.map((p, i) => {
      if (!p) return null;
      const next = advance(p, now, away);
      if (now - p.updatedAt >= CAME_BACK_MS && next.growth - p.growth >= 0.2) cameBack = true;
      if (next !== p) persist(i, next);
      return next;
    });
    setPlots(caught);
    if (cameBack) world.effects.discover('came-back');
  }, [persist, world]);

  // grow while you watch
  useEffect(() => {
    const t = window.setInterval(() => {
      const now = Date.now();
      const prev = plotsRef.current;
      let changed = false;
      const next = prev.map((p, i) => {
        if (!p) return null;
        const q = advance(p, now, ctxRef.current);
        if (q.growth !== p.growth || q.wateredAt !== p.wateredAt) changed = true;
        if (stage(q.growth) !== stage(p.growth)) {
          persist(i, q);
          if (q.growth >= 1 && isPlantKind(q.kind)) window.setTimeout(() => bloomed(q.kind as PlantKind, plotsRef.current), 0);
        }
        return q;
      });
      if (changed) setPlots(next);
    }, TICK_MS);
    return () => {
      window.clearInterval(t);
      // keep exact growth when leaving
      plotsRef.current.forEach((p, i) => persist(i, p));
    };
  }, [persist, bloomed]);

  const onPlot = (i: number) => {
    const p = plots[i] ?? null;
    const now = Date.now();
    let next: StoredPlot | null = p;
    if (!p) {
      if (!tool || tool === 'water') {
        say(setInchLine, tool === 'water' ? 'nothing in that one yet. try a seed.' : 'pick a seed packet first.');
        return;
      }
      next = plant(tool, now);
      say(setInchLine, pick(GARDEN_LINES.plant));
      world.emit('OBJECT_STATE_CHANGED', { target: `garden:${tool}`, key: 'plant', value: i });
    } else if (p.growth >= 1 && isPlantKind(p.kind)) {
      next = null;
      harvest(p.kind);
    } else {
      next = water(p, now);
      say(setInchLine, p.kind === 'moonflower' && weather !== 'night' && !afterHours ? pick(GARDEN_LINES.moonWaiting) : pick(GARDEN_LINES.water));
      world.emit('OBJECT_STATE_CHANGED', { target: 'garden:can', key: 'water', value: i });
    }
    const all = plots.slice();
    all[i] = next;
    setPlots(all);
    persist(i, next);
    world.emit('OBJECT_CLICKED', { target: 'garden:plot', repeat: 1, via: 'pointer' });
  };

  const harvest = (kind: PlantKind) => {
    if (PLANTS[kind].harvest === 'playground') {
      const s = useObjects.getState();
      s.setSlice('playground', { radishes: Math.min(6, s.playground.radishes + 1) });
      say(setInchLine, pick(GARDEN_LINES.harvestRadish));
    } else {
      useKeepsakes.getState().addToVase(kind);
      say(setInchLine, pick(GARDEN_LINES.harvestVase));
    }
    world.emit('OBJECT_STATE_CHANGED', { target: `garden:${kind}`, key: 'harvest', value: true });
  };

  const night = afterHours || weather === 'night';

  return (
    <section className={styles.room} data-night={night} aria-labelledby="garden-title">
      <header className={styles.head}>
        <LivingTitle id="garden-title" lines={['Gar', 'den']} label="Garden" size="room" />
        <p className={styles.blurb}>
          Out the back, past the fence Bip leans on. Things grow here while you’re looking, and a bit while you’re not.
        </p>
      </header>

      <div className={styles.tools} role="group" aria-label="Garden tools">
        <p className={styles.tin}>{TIN_LABEL}</p>
        {PLANT_KINDS.map((k) => (
          <button key={k} type="button" className={styles.packet} data-kind={k} aria-pressed={tool === k} onClick={() => setTool(tool === k ? null : k)}>
            <span className={styles.packetName}>{PACKETS[k].name}</span>
            <span className={styles.packetNote}>{PACKETS[k].note}</span>
          </button>
        ))}
        <button type="button" className={`${styles.packet} ${styles.can}`} aria-pressed={tool === 'water'} onClick={() => setTool(tool === 'water' ? null : 'water')}>
          <span className={styles.packetName}>Watering can</span>
          <span className={styles.packetNote}>Or tap a plant with nothing in hand.</span>
        </button>
      </div>

      <div className={styles.scene} data-weather={weather}>
        <div className={styles.sky}>
          <WeatherLayer />
        </div>
        <div className={styles.fence} aria-hidden="true" />
        <div className={styles.bip}>
          <ThoughtBubble text={bipLine} side="left" />
          <button type="button" className={`prop-btn ${styles.bipHit}`} aria-label="Bip, leaning on the fence" onClick={() => say(setBipLine, pick(BIP_FENCE))}>
            <svg viewBox="0 0 80 50" aria-hidden="true">
              <rect x="8" y="8" width="64" height="40" rx="12" fill="var(--blue)" stroke="var(--char-ink)" strokeWidth="2.5" />
              <rect x="16" y="15" width="48" height="26" rx="8" fill="#24232b" />
              <rect x="25" y="21" width="6" height="9" rx="3" fill="#a6f0c6" />
              <rect x="49" y="21" width="6" height="9" rx="3" fill="#a6f0c6" />
              <path d="M34 34 q 6 4 12 0" fill="none" stroke="#a6f0c6" strokeWidth="2" strokeLinecap="round" />
              <path d="M40 8 V 1" stroke="var(--char-ink)" strokeWidth="2.5" />
              <circle cx="40" cy="1" r="3.5" fill="var(--coral)" stroke="var(--char-ink)" strokeWidth="2" />
            </svg>
          </button>
        </div>

        <ol className={styles.beds} aria-label="Garden plots">
          {plots.map((p, i) => {
            const kind = p && isPlantKind(p.kind) ? p.kind : null;
            const st: Stage = p ? stage(p.growth) : 0;
            const label = !p || !kind ? `Plot ${i + 1}: empty` : `Plot ${i + 1}: ${PACKETS[kind].name.toLowerCase()}, ${STAGE_NAMES[st]}${st === 4 ? ' (pick it)' : ''}`;
            return (
              <li key={i} className={styles.plotWrap} data-bed={Math.floor(i / 2)}>
                <button type="button" className={styles.plot} data-stage={kind ? st : 'empty'} data-kind={kind ?? undefined} aria-label={label} onClick={() => onPlot(i)}>
                  {kind ? <PlantView kind={kind} stage={st} /> : null}
                  <span className={styles.soil} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ol>

        <div className={styles.inch}>
          <Inch thought={inchLine} rootRef={inchRef} label="Inch, who lives along the beds" onActivate={() => say(setInchLine, pick(INCH_GARDEN))} />
        </div>
      </div>
    </section>
  );
}
