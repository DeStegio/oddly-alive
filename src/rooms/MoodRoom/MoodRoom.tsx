import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useWorld } from '../../app/worldInstance';
import { Dot, type DotMotion } from '../../characters/Dot';
import { Nimbus } from '../../characters/Nimbus';
import { useActor } from '../../characters/useActor';
import { useSense } from '../../characters/useSense';
import { LivingTitle } from '../../components/LivingTitle';
import { forecast } from '../../content/forecast';
import { useSettings } from '../../state/settings';
import { useObjects } from '../../state/world';
import { useWorldStore } from '../../state/worldStore';
import { MOOD_OBJECTS } from './MoodObjects';
import { Weather } from './Weather';
import styles from './MoodRoom.module.css';

export default function MoodRoom() {
  const world = useWorld();
  const mood = useWorldStore((s) => s.mood);
  const vars = useWorldStore((s) => s.vars);
  const moodsSeen = useWorldStore((s) => s.moodsSeen.length);
  const moodState = useObjects((s) => s.mood);
  const motion = useSettings((s) => s.motion);
  const nimbus = useActor('nimbus');
  const dot = useActor('dot');
  const roomRef = useRef<HTMLElement>(null);
  const dotMotion = useRef<DotMotion>({ follow: motion === 'full', home: { x: 0.12, y: 0.82 } });
  dotMotion.current.follow = motion === 'full';
  useSense('nimbus', nimbus.rootRef, 170, { stare: true });

  const use = (id: string) => (e: React.MouseEvent) => {
    useObjects.getState().setSlice('mood', { lastUsed: id, ...(id === 'tea' ? { teaPoured: moodState.teaPoured + 1 } : {}) });
    world.emit('OBJECT_CLICKED', { target: `mood:${id}`, repeat: 1, via: e.detail === 0 ? 'keyboard' : 'pointer' });
    world.emit('OBJECT_STATE_CHANGED', { target: `mood:${id}`, key: 'use', value: true });
    world.effects.sound(`obj-${id}`);
  };

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
            ? `You’ve seen ${moodsSeen} kinds of weather today. That’s a lot of weather.`
            : 'The things on the sill change the weather. Slowly, the way weather does.'}
        </p>
        <p className={styles.back}>
          <Link to="/">← back to the Living Room</Link>, where Pim is feeling the same way.
        </p>
      </div>

      <div className={styles.windowWrap}>
        <div className={styles.window}>
          <Weather mood={mood} starry={moodState.napping} />
          <div className={styles.mullion} aria-hidden="true" />
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
