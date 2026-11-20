import { useRef } from 'react';
import { findLetter } from '../../app/letters';
import { Link } from 'react-router-dom';
import { sendNimbus } from '../../app/nimbusVisit';
import { ROOMS, type RoomId } from '../../app/rooms';
import { pinWeather, unpinWeather } from '../../app/weatherSync';
import { useWorld } from '../../app/worldInstance';
import { Dot, type DotMotion } from '../../characters/Dot';
import { Nimbus } from '../../characters/Nimbus';
import { useActor } from '../../characters/useActor';
import { useSense } from '../../characters/useSense';
import { LivingTitle } from '../../components/LivingTitle';
import { WeatherLayer } from '../../components/WeatherLayer';
import { forecast } from '../../content/forecast';
import type { Mood } from '../../engine/types';
import type { Weather as HouseWeather } from '../../engine/weather';
import { useSettings } from '../../state/settings';
import { useObjects } from '../../state/world';
import { useWorldStore } from '../../state/worldStore';
import { Almanac } from './Almanac';
import { Barometer } from './Barometer';
import { MOOD_OBJECTS } from './MoodObjects';
import { Weather } from './Weather';
import styles from './MoodRoom.module.css';

/** The window's scenery for a pinned weather (unpinned, the mood's own scenery is richer). */
const SCENERY: Record<HouseWeather, Mood> = {
  clear: 'neutral',
  sunny: 'playful',
  windy: 'curious',
  rain: 'annoyed',
  storm: 'annoyed',
  fog: 'shy',
  snow: 'shy',
  rainbow: 'confused',
  night: 'sleepy',
};
/** Weathers that also get falling/drifting particles in the window. */
const PARTICLES = new Set<HouseWeather>(['rain', 'snow', 'windy', 'fog']);
const VISIT_ROOMS: RoomId[] = ['living', 'playground'];

export default function MoodRoom() {
  const world = useWorld();
  const mood = useWorldStore((s) => s.mood);
  const vars = useWorldStore((s) => s.vars);
  const weather = useWorldStore((s) => s.weather);
  const pinned = useWorldStore((s) => s.weatherPin !== null);
  const away = useWorldStore((s) => s.nimbusVisit !== null && s.nimbusVisit.room !== 'mood');
  const moodsSeen = useWorldStore((s) => s.moodsSeen.length);
  const moodState = useObjects((s) => s.mood);
  const motion = useSettings((s) => s.motion);
  const nimbus = useActor('nimbus');
  const dot = useActor('dot');
  const roomRef = useRef<HTMLElement>(null);
  const refused = useRef(false);
  const dotMotion = useRef<DotMotion>({ follow: motion === 'full', home: { x: 0.12, y: 0.82 } });
  dotMotion.current.follow = motion === 'full';
  useSense('nimbus', nimbus.rootRef, 170, { stare: true });

  const use = (id: string) => (e: React.MouseEvent) => {
    useObjects.getState().setSlice('mood', { lastUsed: id, ...(id === 'tea' ? { teaPoured: moodState.teaPoured + 1 } : {}) });
    world.emit('OBJECT_CLICKED', { target: `mood:${id}`, repeat: 1, via: e.detail === 0 ? 'keyboard' : 'pointer' });
    world.emit('OBJECT_STATE_CHANGED', { target: `mood:${id}`, key: 'use', value: true });
    world.effects.sound(`obj-${id}`);
    // the reflection hands something over when the rainbow is out
    if (id === 'mirror' && weather === 'rainbow') findLetter(world, 'mood');
  };

  const pin = (w: HouseWeather) => {
    world.emit('OBJECT_CLICKED', { target: 'barometer', repeat: 1, via: 'pointer' });
    // a grumpy house says no once; asking again works
    if (mood === 'annoyed' && !refused.current && !away) {
      refused.current = true;
      world.emit('OBJECT_STATE_CHANGED', { target: 'barometer', key: 'refused', value: w });
      return;
    }
    refused.current = false;
    pinWeather(w);
    world.emit('OBJECT_STATE_CHANGED', { target: 'barometer', key: 'pin', value: w });
  };

  const release = () => {
    unpinWeather();
    world.emit('OBJECT_STATE_CHANGED', { target: 'barometer', key: 'release', value: true });
  };

  const send = (room: RoomId) => {
    sendNimbus(room);
    world.emit('OBJECT_STATE_CHANGED', { target: 'nimbus', key: 'sent', value: room });
    world.effects.discover('indoor-weather');
  };

  const scenery = moodState.napping ? 'sleepy' : pinned ? SCENERY[weather] : mood;

  return (
    <section ref={roomRef} className={styles.room} data-mood={mood} aria-labelledby="mood-title">
      <div className={styles.copy}>
        <LivingTitle id="mood-title" lines={['Mood', 'Room']} label="Mood Room" size="room" />
        <p className={styles.blurb}>The weather in here is an opinion. It’s the same weather the whole house is having.</p>
        <p className={styles.forecast} aria-live="polite">
          {forecast(mood, vars)}
        </p>
        <p className={styles.note}>
          {moodsSeen >= 6
            ? `You’ve seen ${moodsSeen} kinds of mood today. That’s a lot of weather.`
            : 'The things on the sill change the mood, slowly. The barometer changes the weather, right now.'}
        </p>

        <Barometer onPin={pin} onRelease={release} />

        <div className={styles.send}>
          <p className={styles.sendLabel}>{away ? 'Nimbus is out on a visit. Back in a minute.' : 'Send Nimbus on a visit:'}</p>
          {VISIT_ROOMS.map((r) => (
            <button key={r} type="button" className="paper-btn" disabled={away} onClick={() => send(r)}>
              to the {ROOMS[r].label}
            </button>
          ))}
        </div>

        <p className={styles.back}>
          <Link to="/">← back to the Living Room</Link>, where Pim is feeling the same way.
        </p>
      </div>

      <div className={styles.windowWrap}>
        <div className={styles.window} data-weather={weather}>
          <Weather mood={scenery} starry={false} />
          {PARTICLES.has(weather) ? <WeatherLayer weather={weather} /> : null}
          <div className={styles.mullion} aria-hidden="true" />
          {away ? null : (
            <div className={styles.nimbus}>
              <Nimbus
                expression={moodState.napping ? 'asleep' : nimbus.expression}
                thought={nimbus.thought}
                rootRef={nimbus.rootRef}
                gaze={nimbus.gaze}
                blanket={moodState.napping || moodState.lastUsed === 'blanket'}
                onActivate={() => world.emit('OBJECT_CLICKED', { target: 'nimbus', repeat: 1, via: 'pointer' })}
              />
            </div>
          )}
        </div>
        <ul className={styles.sill} aria-label="Things on the windowsill">
          {MOOD_OBJECTS.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                className={styles.object}
                data-used={moodState.lastUsed === o.id}
                onClick={use(o.id)}
                aria-label={`${o.label} (${o.hint})`}
              >
                {o.icon}
                <span className={styles.objectHint} aria-hidden="true">
                  {o.hint}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <Almanac />

      <Dot
        expression={dot.expression}
        thought={dot.thought}
        rootRef={dot.rootRef}
        gaze={dot.gaze}
        boundsRef={roomRef}
        motion={dotMotion}
        onActivate={() => world.emit('OBJECT_CLICKED', { target: 'dot', repeat: 1, via: 'pointer' })}
      />
    </section>
  );
}
