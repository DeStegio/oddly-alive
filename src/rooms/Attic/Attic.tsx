import { useEffect, useState } from 'react';
import { findLetter } from '../../app/letters';
import { useWorld } from '../../app/worldInstance';
import { ThoughtBubble } from '../../characters/ThoughtBubble';
import { LivingTitle } from '../../components/LivingTitle';
import { WeatherLayer } from '../../components/WeatherLayer';
import { BOXES, GRAMOPHONE, HATS, HAT_NAMES, MARGUERITE_ALL, MARGUERITE_HATS, MARGUERITE_IDLE, type HatId } from '../../content/attic';
import { useKeepsakes } from '../../state/keepsakes';
import { useObjects } from '../../state/world';
import { Diary } from './Diary';
import { MargueriteSvg } from './Marguerite';
import { Trunk } from './Trunk';
import styles from './Attic.module.css';

const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)]!;
const ids = (csv: string) => csv.split(',').filter(Boolean);
const isHat = (v: string): v is HatId => (HATS as readonly string[]).includes(v);

/**
 * The attic, up the ladder from the Living Room: Great-Aunt Pim's trunk, the
 * house diary, Marguerite the dress form and her hats, boxes nobody has
 * sorted, and a gramophone.
 */
export default function Attic() {
  const world = useWorld();
  const attic = useObjects((s) => s.attic);
  const hats = useKeepsakes((s) => s.attic.hats);
  const [line, setLine] = useState<string | null>(null);
  const [found, setFound] = useState<{ title: string; story: string } | null>(null);
  const [playing, setPlaying] = useState(false);
  const opened = ids(attic.opened);
  const wearing = isHat(attic.wearing) ? attic.wearing : null;

  // coming up the ladder (or the address) counts as finding the attic
  useEffect(() => {
    useKeepsakes.getState().unlockAttic();
    world.effects.discover('attic');
  }, [world]);

  const say = (text: string, ms = 2800) => {
    setLine(text);
    window.setTimeout(() => setLine((cur) => (cur === text ? null : cur)), ms);
  };

  const openBox = (id: string) => {
    const box = BOXES.find((b) => b.id === id);
    if (!box || opened.includes(id)) return;
    useObjects.getState().setSlice('attic', { opened: [...opened, id].join(',') });
    if (box.hat) useKeepsakes.getState().addHat(box.hat);
    const last = opened.length + 1 === BOXES.length;
    setFound(last ? { title: box.title, story: `${box.story} And under everything, an envelope.` } : { title: box.title, story: box.story });
    if (last) findLetter(world, 'attic');
    world.emit('OBJECT_STATE_CHANGED', { target: `attic:${id}`, key: 'open', value: true });
    world.effects.sound('pop');
  };

  const wear = (hat: HatId) => {
    const worn = ids(attic.worn);
    const nextWorn = worn.includes(hat) ? worn : [...worn, hat];
    useObjects.getState().setSlice('attic', { wearing: wearing === hat ? '' : hat, worn: nextWorn.join(',') });
    if (wearing === hat) {
      say('back on the shelf, then.');
      return;
    }
    if (nextWorn.length === HATS.length) {
      say(MARGUERITE_ALL);
      world.effects.discover('dress-rehearsal');
    } else say(MARGUERITE_HATS[hat]);
    world.emit('OBJECT_STATE_CHANGED', { target: 'marguerite', key: 'hat', value: hat });
  };

  const playRecord = () => {
    if (playing) return;
    setPlaying(true);
    world.effects.sound('waltz');
    world.effects.discover('needle-drop');
    say(pick(GRAMOPHONE), 3200);
    world.emit('OBJECT_STATE_CHANGED', { target: 'gramophone', key: 'play', value: true });
    window.setTimeout(() => setPlaying(false), 8000);
  };

  const readDiary = (entries: number) => {
    world.emit('OBJECT_CLICKED', { target: 'diary', repeat: 1, via: 'pointer' });
    if (entries >= 5) world.effects.discover('dear-diary');
  };

  return (
    <section className={styles.room} aria-labelledby="attic-title">
      <div className={styles.roof} aria-hidden="true" />
      <div className={styles.roundWindow} aria-hidden="true">
        <WeatherLayer />
      </div>
      <div className={styles.light} aria-hidden="true" />

      <header className={styles.head}>
        <LivingTitle id="attic-title" lines={['At', 'tic']} label="Attic" size="room" />
        <p className={styles.blurb}>Mind your head. Nobody has sorted the boxes, and the dress form has opinions.</p>
      </header>

      <div className={styles.layout}>
        <section className={styles.margueriteCol} aria-labelledby="marguerite-title">
          <h2 id="marguerite-title" className={styles.thingTitle}>
            Marguerite
          </h2>
          <div className={styles.marguerite}>
            <ThoughtBubble text={line} side="right" />
            <button type="button" className={`prop-btn ${styles.mHit}`} aria-label={wearing ? `Marguerite the dress form, wearing ${HAT_NAMES[wearing]}` : 'Marguerite the dress form'} onClick={() => say(pick(MARGUERITE_IDLE))}>
              <MargueriteSvg hat={wearing} />
            </button>
          </div>
          <div className={styles.hats} role="group" aria-label="Hats to try on her">
            {hats.length === 0 ? <p className={styles.small}>No hats yet. Try the boxes.</p> : null}
            {HATS.filter((h) => hats.includes(h)).map((h) => (
              <button key={h} type="button" className={styles.hatBtn} aria-pressed={wearing === h} onClick={() => wear(h)}>
                {HAT_NAMES[h]}
              </button>
            ))}
          </div>
        </section>

        <section className={styles.boxesCol} aria-labelledby="boxes-title">
          <h2 id="boxes-title" className={styles.thingTitle}>
            Boxes
          </h2>
          <ul className={styles.boxes}>
            {BOXES.map((b) => (
              <li key={b.id}>
                <button type="button" className={styles.box} data-open={opened.includes(b.id)} disabled={opened.includes(b.id)} onClick={() => openBox(b.id)}>
                  <span>{opened.includes(b.id) ? `${b.title} (taken out)` : b.label}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className={styles.found} aria-live="polite">
            {found ? (
              <>
                <strong>{found.title}.</strong> {found.story}
              </>
            ) : (
              'Six boxes. Nobody’s been up here in years.'
            )}
          </p>
        </section>

        <div className={styles.sideCol}>
          <Trunk />
          <Diary onOpen={readDiary} />
          <section className={styles.gramophone} aria-labelledby="gram-title">
            <h2 id="gram-title" className={styles.thingTitle}>
              Gramophone
            </h2>
            <button type="button" className={`prop-btn ${styles.gramBtn}`} data-playing={playing} aria-label={playing ? 'The gramophone (playing)' : 'Put the needle down on the gramophone'} onClick={playRecord}>
              <svg viewBox="0 0 120 90" aria-hidden="true">
                <rect x="10" y="56" width="70" height="28" rx="4" fill="#8a5a3c" stroke="var(--char-ink)" strokeWidth="2.5" />
                <ellipse className={styles.record} cx="45" cy="56" rx="30" ry="6" fill="#24232b" stroke="var(--char-ink)" strokeWidth="2" />
                <path d="M62 54 L 76 30" stroke="var(--char-ink)" strokeWidth="3" strokeLinecap="round" />
                <path d="M74 32 C 80 10 104 2 114 6 C 112 20 100 40 78 36 Z" fill="var(--yellow)" stroke="var(--char-ink)" strokeWidth="2.5" strokeLinejoin="round" />
              </svg>
            </button>
            <p className={styles.small}>Sound plays only if it’s switched on (top right).</p>
          </section>
        </div>
      </div>
    </section>
  );
}
