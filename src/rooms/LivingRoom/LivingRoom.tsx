import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { allLettersFound, findLetter } from '../../app/letters';
import { useKeepsakes } from '../../state/keepsakes';
import { sceneVariant } from '../../app/share';
import { getAgents, useWorld } from '../../app/worldInstance';
import { Clock } from '../../characters/Clock';
import { Dot, type DotMotion } from '../../characters/Dot';
import { DustBunny } from '../../characters/DustBunny';
import { Lamp } from '../../characters/Lamp';
import { Pim } from '../../characters/Pim';
import { Plant } from '../../characters/Plant';
import { useActor } from '../../characters/useActor';
import { useCharacter } from '../../characters/useCharacter';
import { useCircleDetector, useSense } from '../../characters/useSense';
import { LivingTitle } from '../../components/LivingTitle';
import { ScrollThread } from '../../components/ScrollThread';
import { LINES } from '../../content/lines';
import { useSettings } from '../../state/settings';
import { useObjects } from '../../state/world';
import { useWorldStore } from '../../state/worldStore';
import { Link } from 'react-router-dom';
import { ROOMS } from '../../app/rooms';
import { Basement } from './Basement';
import { HouseWindow } from './HouseWindow';
import { PullCord } from './PullCord';
import { DoNotPress, Door, Picture, Rug, Sofa } from './Scenery';
import { LIVING_GOALS, type LivingStage, type StageThing } from './agentGoals';
import styles from './LivingRoom.module.css';

interface Mark {
  id: number;
  x: number;
  y: number;
  kind: 'poof' | 'sticker';
  variant: number;
}

const MAX_STICKERS = 6;
const MAX_POOFS = 4;

export default function LivingRoom() {
  // after all of her letters, Great-Aunt Pim smiles for good
  const allLetters = useKeepsakes((k) => allLettersFound(k.letters));
  const world = useWorld();
  const living = useObjects((s) => s.living);
  const setLiving = useObjects((s) => s.setLiving);
  const motion = useSettings((s) => s.motion);
  const discoveries = useWorldStore((s) => Object.keys(s.discoveries).length);
  const returning = useWorldStore((s) => s.returning);
  const lastRoom = useWorldStore((s) => s.lastVisitRoom);
  const seed = useWorldStore((s) => s.seed);
  const variant = useMemo(() => sceneVariant(seed), [seed]);

  const roomRef = useRef<HTMLElement>(null);
  const pim = useActor('pim');
  const dot = useActor('dot');
  const lamp = useActor('lumen');
  const tick = useActor('tick');
  const plant = useActor('ferdinand');
  const button = useActor('button');
  const picture = useCharacter('picture', 'neutral');

  const [marks, setMarks] = useState<Mark[]>([]);
  const markSeq = useRef(0);
  const markTimers = useRef(new Set<ReturnType<typeof setTimeout>>());

  const click = useCallback(
    (target: string) => (e?: React.MouseEvent) =>
      world.emit('OBJECT_CLICKED', {
        target,
        repeat: (useWorldStore.getState().counts[target] ?? 0) + 1,
        via: e && e.detail === 0 ? 'keyboard' : 'pointer',
      }),
    [world],
  );

  const dotMotion = useRef<DotMotion>({
    follow: true,
    home: { x: 0.56, y: 0.56 },
    onCatch: () => world.emit('OBJECT_STATE_CHANGED', { target: 'dot', key: 'caught', value: true }),
    onFrenzy: () => world.emit('POINTER_FRENZY', { target: 'dot' }),
    onMimic: () => world.emit('OBJECT_STATE_CHANGED', { target: 'dot', key: 'mimic', value: true }),
  });
  useEffect(() => {
    dotMotion.current.follow = motion === 'full';
  }, [motion]);

  // the room is a stage for the characters' own plans (Phase 3 agents)
  useEffect(() => {
    const director = getAgents();
    director.addGoals(...LIVING_GOALS);
    const els: Partial<Record<StageThing, React.RefObject<HTMLElement>>> = {
      button: button.rootRef,
      picture: picture.rootRef,
      pim: pim.rootRef,
      lamp: lamp.rootRef,
      tick: tick.rootRef,
      plant: plant.rootRef,
    };
    const motionRef = dotMotion;
    const stage: LivingStage = {
      rect: (n) => els[n]?.current?.getBoundingClientRect() ?? null,
      dotTo: (n, onArrive) => {
        motionRef.current.errand = {
          target: () => {
            const r = stage.rect(n);
            return r ? { x: r.left + r.width / 2, y: r.top + r.height * 0.3 } : null;
          },
          onArrive,
        };
      },
      dotFree: () => {
        motionRef.current.errand = null;
      },
    };
    const off = director.setStage('living', stage);
    return () => {
      off();
      motionRef.current.errand = null;
    };
    // the refs are stable for the life of the room
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useSense('pim', pim.rootRef, 190, { stare: true });
  useSense('ferdinand', plant.rootRef, 120);
  useCircleDetector('pim', pim.rootRef);

  useEffect(() => {
    const timers = markTimers.current;
    return () => {
      for (const t of timers) clearTimeout(t);
      timers.clear();
    };
  }, []);

  const addMark = (kind: Mark['kind'], x: number, y: number, ttl: number) => {
    const id = ++markSeq.current;
    setMarks((all) => {
      const stickers = all.filter((m) => m.kind === 'sticker');
      const poofs = all.filter((m) => m.kind === 'poof');
      const next = { id, x, y, kind, variant: id % 4 };
      return kind === 'sticker'
        ? [...stickers.slice(-(MAX_STICKERS - 1)), next, ...poofs]
        : [...stickers, ...poofs.slice(-(MAX_POOFS - 1)), next];
    });
    const t = setTimeout(() => {
      markTimers.current.delete(t);
      setMarks((all) => all.filter((m) => m.id !== id));
    }, ttl);
    markTimers.current.add(t);
  };

  /** Empty wall/floor: a tiny ink poof (INT-024); double-click: a sticker (INT-028). */
  const onStageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.target as HTMLElement;
    if (!el.dataset.surface) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    if (e.detail === 2) {
      addMark('sticker', x, y, 30_000);
      setLiving((s) => ({ stickers: s.stickers + 1 }));
      world.emit('OBJECT_STATE_CHANGED', { target: 'wall', key: 'sticker', value: true });
    } else {
      addMark('poof', x, y, 700);
      world.emit('OBJECT_CLICKED', { target: 'wall', repeat: 1, via: 'pointer' });
    }
  };

  const buttonLabel =
    LINES.buttonLabels[Math.min(living.buttonPresses, LINES.buttonLabels.length - 1)] ?? 'do not press';

  return (
    <>
      <ScrollThread />
      <section
        ref={roomRef}
        className={styles.room}
        data-light={living.lampOn ? 'on' : 'off'}
        data-rearranged={living.rearranged}
        aria-labelledby="living-title"
      >
        <PullCord />
        <div className={styles.intro}>
          <LivingTitle
            id="living-title"
            lines={['Oddly', 'Alive']}
            label="Oddly Alive"
            actorId="title"
            onShove={() => world.emit('OBJECT_STATE_CHANGED', { target: 'title', key: 'shoved', value: true })}
          />
          <p className={styles.tagline}>
            {returning ? 'Oh, it’s you again. ' : 'It’s not broken. '}
            <em>It’s just being itself.</em>
          </p>
          {lastRoom && lastRoom !== 'living' ? (
            <p className={styles.lastRoom}>
              Last time you were in the <Link to={ROOMS[lastRoom].path}>{ROOMS[lastRoom].label} →</Link>
            </p>
          ) : null}
        </div>

        <div className={styles.dim} aria-hidden="true" />
        <div className={styles.stage} onClick={onStageClick}>
          <div className={styles.wall} data-surface="wall" aria-hidden="true" />
          <div className={styles.floor} data-surface="floor" aria-hidden="true" />

          {marks.map((m) => (
            <span
              key={m.id}
              className={m.kind === 'poof' ? styles.poof : styles.sticker}
              data-variant={m.variant}
              style={{ left: `${m.x}%`, top: `${m.y}%` }}
              aria-hidden="true"
            />
          ))}

          <div className={`${styles.prop} ${styles.picture}`}>
            <Picture
              tilt={living.pictureTilt}
              revealed={living.keyholeRevealed}
              face={allLetters ? 1 : living.pictureNudges}
              sky={variant.pictureSky}
              rootRef={picture.rootRef}
              thought={picture.thought}
              onActivate={() => {
                setLiving((s) => ({ pictureNudges: s.pictureNudges + 1, pictureTilt: s.pictureTilt > 0 ? -7 : 8 }));
                world.emit('OBJECT_CLICKED', { target: 'picture', repeat: living.pictureNudges + 1, via: 'pointer' });
                // once the keyhole has given up its key, there's something else behind the frame
                if (living.keyholeRevealed && useObjects.getState().secret.keyFound) findLetter(world, 'living');
              }}
            />
          </div>
          <div className={`${styles.prop} ${styles.clock}`}>
            <Clock
              expression={tick.expression}
              thought={tick.thought}
              rootRef={tick.rootRef}
              gaze={tick.gaze}
              spins={living.clockSpins}
              onActivate={click('tick')}
            />
          </div>
          <div className={`${styles.prop} ${styles.window}`}>
            <HouseWindow />
          </div>
          <div className={`${styles.prop} ${styles.door}`}>
            <Door to="/playground" label="Door to the Playground" sign="Play →" />
          </div>

          <div className={`${styles.prop} ${styles.rug}`}>
            <Rug ring={variant.rugRing} />
          </div>
          <div className={`${styles.prop} ${styles.lamp}`}>
            <Lamp
              on={living.lampOn}
              expression={lamp.expression}
              thought={lamp.thought}
              rootRef={lamp.rootRef}
              onToggle={() => {
                const on = !useObjects.getState().living.lampOn;
                setLiving({ lampOn: on });
                world.emit('OBJECT_CLICKED', { target: 'lumen', repeat: 1, via: 'pointer' });
                world.emit('OBJECT_STATE_CHANGED', { target: 'lumen', key: 'on', value: on });
                world.effects.sound(on ? 'switchOn' : 'switchOff');
              }}
            />
          </div>
          <div className={`${styles.prop} ${styles.bunny}`}>
            <DustBunny />
          </div>
          <div className={`${styles.prop} ${styles.sofa}`}>
            <Sofa />
          </div>
          <div className={`${styles.prop} ${styles.pim}`}>
            <Pim
              expression={pim.expression}
              thought={pim.thought}
              rootRef={pim.rootRef}
              gaze={pim.gaze}
              accessory={living.pimForm}
              onActivate={click('pim')}
            />
          </div>
          <div className={`${styles.prop} ${styles.button}`}>
            <DoNotPress
              label={buttonLabel}
              pressed={living.buttonPresses}
              cooperative={living.buttonPresses >= LINES.buttonLabels.length - 2}
              rootRef={button.rootRef}
              thought={button.thought}
              onPress={() => {
                setLiving((s) => ({ buttonPresses: s.buttonPresses + 1 }));
                world.emit('OBJECT_CLICKED', { target: 'button', repeat: living.buttonPresses + 1, via: 'pointer' });
                world.effects.sound('press');
              }}
            />
          </div>
          <div className={`${styles.prop} ${styles.plant}`}>
            <Plant
              leaves={7 + discoveries}
              seed={variant.plantSeed}
              drooping={false}
              bloom={living.plantBloom || discoveries >= 6}
              thought={plant.thought}
              rootRef={plant.rootRef}
              onActivate={click('ferdinand')}
            />
          </div>
        </div>

        <Dot
          expression={dot.expression}
          thought={dot.thought}
          rootRef={dot.rootRef}
          gaze={dot.gaze}
          boundsRef={roomRef}
          motion={dotMotion}
          onActivate={click('dot')}
        />

        {living.rearranged ? (
          <button type="button" className={`paper-btn ${styles.tidy}`} onClick={() => setLiving({ rearranged: false })}>
            Tidy up
          </button>
        ) : null}
      </section>
      <Basement />
    </>
  );
}
