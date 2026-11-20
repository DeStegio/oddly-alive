import { useEffect, useRef, useState } from 'react';
import { useWorld } from '../../app/worldInstance';
import { Pim } from '../../characters/Pim';
import { ThoughtBubble } from '../../characters/ThoughtBubble';
import { useActor } from '../../characters/useActor';
import { useCharacter } from '../../characters/useCharacter';
import { LivingTitle } from '../../components/LivingTitle';
import { StarTrail } from '../../components/StarTrail';
import { onFrame } from '../../engine/frameLoop';
import { pointer } from '../../engine/pointer';
import { useSettings } from '../../state/settings';
import { useObjects } from '../../state/world';
import { CONSTELLATION_SIZE, MAX_LINKS, STARS, constellationName, largestGroup, linkKey, type Link } from './sky';
import { WeatherLayer } from '../../components/WeatherLayer';
import { useWeather } from '../../components/useWeather';
import type { Weather } from '../../engine/weather';
import styles from './AfterHours.module.css';

const NIGHT_WEATHER = new Set<Weather>(['rain', 'snow', 'storm', 'fog', 'windy']);

export default function AfterHours() {
  const weather = useWeather();
  const world = useWorld();
  const after = useObjects((s) => s.after);
  const setSlice = useObjects((s) => s.setSlice);
  const afterHours = useSettings((s) => s.afterHours);
  const setAfterHours = useSettings((s) => s.setAfterHours);
  const pim = useActor('pim');
  const moth = useCharacter('moth', 'neutral');
  const skyRef = useRef<HTMLDivElement>(null);
  const bandRef = useRef<SVGLineElement>(null);
  const [links, setLinks] = useState<Link[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [named, setNamed] = useState<string | null>(null);
  const [shooting, setShooting] = useState(0);

  // rubber band from the selected star to the pointer
  useEffect(() => {
    if (selected === null) return;
    return onFrame(() => {
      const sky = skyRef.current;
      const band = bandRef.current;
      if (!sky || !band || !pointer.active) return;
      const r = sky.getBoundingClientRect();
      band.setAttribute('x2', String(((pointer.x - r.left) / r.width) * 100));
      band.setAttribute('y2', String(((pointer.y - r.top) / r.height) * 100));
    });
  }, [selected]);

  // rare event: a shooting star
  useEffect(
    () =>
      world.bus.on('RARE_EVENT', (ev) => {
        if (ev.payload.event === 'shooting-star') setShooting((n) => n + 1);
      }),
    [world],
  );

  // refs mirror state so rapid taps never see stale values
  const selRef = useRef<number | null>(null);
  const linksRef = useRef<Link[]>([]);
  const namedRef = useRef<string | null>(null);
  const lastTap = useRef({ i: -1, t: 0 });
  const tapStar = (i: number) => {
    // one physical tap can arrive as more than one event; ignore the echo
    const now = performance.now();
    if (lastTap.current.i === i && now - lastTap.current.t < 350) return;
    lastTap.current = { i, t: now };
    const sel = selRef.current;
    if (sel === i) return; // re-tapping the selected star keeps it selected
    if (sel === null) {
      selRef.current = i;
      setSelected(i);
      return;
    }
    selRef.current = i;
    setSelected(i);
    const key = linkKey(sel, i);
    if (linksRef.current.some(([a, b]) => linkKey(a, b) === key)) return;
    const next = [...linksRef.current, [sel, i] as const].slice(-MAX_LINKS);
    linksRef.current = next;
    setLinks(next);
    world.emit('OBJECT_STATE_CHANGED', { target: 'sky', key: 'link', value: next.length });
    world.effects.sound('star');
    if (largestGroup(next) >= CONSTELLATION_SIZE && !namedRef.current) {
      const name = constellationName(next);
      namedRef.current = name;
      setNamed(name);
      setSlice('after', { constellations: after.constellations + 1 });
      world.emit('OBJECT_STATE_CHANGED', { target: 'sky', key: 'constellation', value: name });
    }
  };

  const clearSky = () => {
    linksRef.current = [];
    selRef.current = null;
    namedRef.current = null;
    setLinks([]);
    setSelected(null);
    setNamed(null);
  };

  return (
    <section className={styles.room} data-light={after.lightOn} data-radio={after.radioOn} aria-labelledby="ah-title">
      <StarTrail />
      <div ref={skyRef} className={styles.sky}>
        {/* the house weather, where it makes sense at night */}
        {NIGHT_WEATHER.has(weather) ? <WeatherLayer variant="ambient" /> : null}
        <svg className={styles.lines} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {links.map(([a, b]) => (
            <line key={linkKey(a, b)} x1={STARS[a]!.x} y1={STARS[a]!.y} x2={STARS[b]!.x} y2={STARS[b]!.y} className={styles.link} />
          ))}
          {selected !== null ? <line ref={bandRef} x1={STARS[selected]!.x} y1={STARS[selected]!.y} x2={STARS[selected]!.x} y2={STARS[selected]!.y} className={styles.band} /> : null}
        </svg>
        {STARS.map((s, i) => (
          <button
            key={i}
            type="button"
            className={styles.star}
            data-selected={selected === i}
            style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.r * 4 + 18, height: s.r * 4 + 18 }}
            aria-label={`Star ${i + 1}${selected === i ? ' (selected — pick another star to connect)' : ''}`}
            onPointerDown={() => tapStar(i)}
            onClick={(e) => e.detail === 0 && tapStar(i)}
          >
            <span style={{ width: s.r * 2, height: s.r * 2 }} />
          </button>
        ))}
        {shooting ? <span key={shooting} className={styles.shooting} aria-hidden="true" /> : null}
        <div className={styles.moon} aria-hidden="true">
          <svg viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="90" fill="var(--yellow)" stroke="var(--char-ink)" strokeWidth="3" />
            <circle cx="70" cy="70" r="14" fill="#e4c45a" />
            <circle cx="130" cy="120" r="20" fill="#e4c45a" />
            <circle cx="80" cy="140" r="9" fill="#e4c45a" />
            <path d="M80 96 q 8 6 16 0 M110 96 q 8 6 16 0" fill="none" stroke="var(--char-ink)" strokeWidth="3" strokeLinecap="round" />
            <path d="M92 118 q 10 6 20 0" fill="none" stroke="var(--char-ink)" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      <header className={styles.head}>
        <LivingTitle id="ah-title" lines={['After', 'Hours']} label="After Hours" size="room" />
        <p className={styles.blurb}>The house after everyone pretends to sleep. Connect the stars. Mind the moon; it’s closer than it looks.</p>
        <p className={styles.constellation} aria-live="polite">
          {named ? `You drew “${named}.”` : links.length ? `${links.length} line${links.length > 1 ? 's' : ''} so far. Five stars make a constellation.` : 'Tap a star, then another, to draw a line.'}
        </p>
        <div className={styles.headActions}>
          {links.length ? (
            <button type="button" className="paper-btn" onClick={clearSky}>
              Clear the sky
            </button>
          ) : null}
          <button type="button" className="paper-btn" aria-pressed={afterHours} onClick={() => {
            setAfterHours(!afterHours);
            world.emit('OBJECT_STATE_CHANGED', { target: 'settings', key: 'afterHours', value: !afterHours });
          }}>
            {afterHours ? 'Bring the morning back' : 'Take the night downstairs'}
          </button>
        </div>
      </header>

      {/* the rooftop */}
      <div className={styles.roof}>
        <div className={styles.neon} aria-hidden="true">
          open <em>late</em>
        </div>

        <div className={styles.lampWrap}>
          <div ref={moth.rootRef} className={styles.moth} data-here={after.lightOn}>
            <ThoughtBubble text={moth.thought} />
            <svg viewBox="0 0 60 40" aria-hidden="true">
              <path d="M30 10 V 32 M30 14 C 18 0 4 10 12 20 C 4 30 20 36 30 24 C 40 36 56 30 48 20 C 56 10 42 0 30 14" fill="#efe9dc" stroke="var(--char-ink)" strokeWidth="2" />
              <circle cx="27" cy="12" r="1.6" fill="var(--char-ink)" />
              <circle cx="33" cy="12" r="1.6" fill="var(--char-ink)" />
            </svg>
          </div>
          <button
            type="button"
            className={styles.porchLight}
            aria-pressed={after.lightOn}
            aria-label={after.lightOn ? 'Porch light (on)' : 'Porch light (off)'}
            onClick={(e) => {
              const on = !after.lightOn;
              setSlice('after', { lightOn: on });
              world.emit('OBJECT_CLICKED', { target: 'porchlight', repeat: 1, via: e.detail === 0 ? 'keyboard' : 'pointer' });
              world.emit('OBJECT_STATE_CHANGED', { target: 'porchlight', key: 'on', value: on });
            }}
          >
            <svg viewBox="0 0 60 120" aria-hidden="true">
              <line x1="30" y1="0" x2="30" y2="40" stroke="var(--char-ink)" strokeWidth="3" />
              <path d="M14 40 H 46 L 40 70 H 20 Z" fill="var(--paper)" stroke="var(--char-ink)" strokeWidth="2.5" />
              <circle cx="30" cy="58" r="9" className={styles.bulb} stroke="var(--char-ink)" strokeWidth="2" />
            </svg>
          </button>
        </div>

        <div className={styles.chair}>
          <div className={styles.pim}>
            <Pim
              expression={pim.expression === 'neutral' || pim.expression === 'shy' ? 'sleepy' : pim.expression}
              thought={pim.thought}
              rootRef={pim.rootRef}
              gaze={pim.gaze}
              nightcap
              label="Pim in a nightcap, pretending to sleep"
              onActivate={() => world.emit('OBJECT_CLICKED', { target: 'pim', repeat: 1, via: 'pointer' })}
            />
          </div>
          <svg viewBox="0 0 220 110" className={styles.chairSvg} aria-hidden="true">
            <path d="M20 40 L 200 40 L 180 80 L 40 80 Z" fill="var(--coral)" stroke="var(--char-ink)" strokeWidth="3" />
            <path d="M20 40 L 0 10 M40 80 L 30 108 M180 80 L 190 108 M200 40 L 214 70" stroke="var(--char-ink)" strokeWidth="4" strokeLinecap="round" />
            <path d="M40 50 H 190 M44 60 H 186 M48 70 H 182" stroke="#fff" strokeOpacity="0.5" strokeWidth="3" />
          </svg>
        </div>

        <button
          type="button"
          className={styles.radio}
          aria-pressed={after.radioOn}
          aria-label={after.radioOn ? 'Radio (playing a lullaby)' : 'Radio (off)'}
          onClick={(e) => {
            const on = !after.radioOn;
            setSlice('after', { radioOn: on });
            world.emit('OBJECT_CLICKED', { target: 'radio', repeat: 1, via: e.detail === 0 ? 'keyboard' : 'pointer' });
            world.emit('OBJECT_STATE_CHANGED', { target: 'radio', key: 'on', value: on });
          }}
        >
          <span className={styles.notes} aria-hidden="true">
            <i>♪</i>
            <i>♫</i>
            <i>♪</i>
          </span>
          <svg viewBox="0 0 120 90" aria-hidden="true">
            <path d="M30 20 L 90 4" stroke="var(--char-ink)" strokeWidth="3" strokeLinecap="round" />
            <rect x="6" y="20" width="108" height="64" rx="12" fill="var(--blue)" stroke="var(--char-ink)" strokeWidth="3" />
            <circle cx="40" cy="52" r="20" fill="var(--paper)" stroke="var(--char-ink)" strokeWidth="2.5" />
            <circle cx="40" cy="52" r="6" fill="var(--char-ink)" />
            <rect x="72" y="36" width="30" height="10" rx="3" fill="var(--yellow)" stroke="var(--char-ink)" strokeWidth="2" />
            <circle cx="80" cy="64" r="5" fill="var(--coral)" stroke="var(--char-ink)" strokeWidth="2" />
            <circle cx="96" cy="64" r="5" fill="var(--mint)" stroke="var(--char-ink)" strokeWidth="2" />
          </svg>
        </button>
      </div>
    </section>
  );
}
