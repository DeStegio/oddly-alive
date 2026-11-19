import { useEffect, useRef } from 'react';
import { Clock } from '../../characters/Clock';
import { Dot, type DotMotion } from '../../characters/Dot';
import { Lamp } from '../../characters/Lamp';
import { Pim } from '../../characters/Pim';
import { Plant } from '../../characters/Plant';
import { useActor } from '../../characters/useActor';
import { useProximity } from '../../characters/useProximity';
import { LivingTitle } from '../../components/LivingTitle';
import { installPointerTracking } from '../../engine/pointer';
import { useSettings } from '../../state/settings';
import { useObjects } from '../../state/world';
import { DoNotPress, Door, Picture, Rug, Sofa } from './Scenery';
import styles from './LivingRoom.module.css';

const BUTTON_LABELS = ['do not press', 'please do not', 'i said no', 'why', 'okay fine'];

export default function LivingRoom() {
  const living = useObjects((s) => s.living);
  const setLiving = useObjects((s) => s.setLiving);
  const motion = useSettings((s) => s.motion);

  const roomRef = useRef<HTMLElement>(null);
  const pim = useActor('pim');
  const dot = useActor('dot');
  const lamp = useActor('lumen');
  const tick = useActor('tick');
  const plant = useActor('ferdinand');
  const button = useActor('button');

  const dotMotion = useRef<DotMotion>({ follow: true, home: { x: 0.56, y: 0.56 } });

  useEffect(() => installPointerTracking(), []);
  useEffect(() => {
    dotMotion.current.follow = motion === 'full';
  }, [motion]);

  useProximity(pim.rootRef, {
    radius: 200,
    onEnter: (speed) => {
      if (speed > 1.6) pim.express('surprised', 900);
      else if (speed < 0.45) pim.express('shy', 1500);
    },
    onStare: () => {
      pim.gaze.current.avert = true;
      pim.express('shy', 2200);
      setTimeout(() => (pim.gaze.current.avert = false), 2200);
    },
  });

  const label =
    BUTTON_LABELS[Math.min(living.buttonPresses, BUTTON_LABELS.length - 1)] ?? 'do not press';

  return (
    <section
      ref={roomRef}
      className={styles.room}
      data-light={living.lampOn ? 'on' : 'off'}
      aria-labelledby="living-title"
    >
      <div className={styles.intro}>
        <LivingTitle id="living-title" lines={['Oddly', 'Alive']} label="Oddly Alive" />
        <p className={styles.tagline}>
          It's not broken. <em>It's just being itself.</em>
        </p>
      </div>

      <div className={styles.stage}>
        <div className={styles.wall} aria-hidden="true" />
        <div className={styles.floor} aria-hidden="true" />
        <div className={styles.dim} aria-hidden="true" />

        <div className={`${styles.prop} ${styles.picture}`}>
          <Picture
            tilt={living.pictureTilt}
            revealed={living.keyholeRevealed}
            onActivate={() =>
              setLiving((s) => ({
                pictureNudges: s.pictureNudges + 1,
                pictureTilt: s.pictureTilt > 0 ? -6 : 7,
              }))
            }
          />
        </div>
        <div className={`${styles.prop} ${styles.clock}`}>
          <Clock
            expression={tick.expression}
            thought={tick.thought}
            rootRef={tick.rootRef}
            gaze={tick.gaze}
            spins={living.clockSpins}
            onActivate={() => {
              setLiving((s) => ({ clockSpins: s.clockSpins + 1 }));
              tick.express('surprised', 1400);
              tick.play('dizzy');
            }}
          />
        </div>
        <div className={`${styles.prop} ${styles.door}`}>
          <Door to="/playground" label="Door to the Playground" sign="Play →" />
        </div>

        <div className={`${styles.prop} ${styles.rug}`}>
          <Rug />
        </div>
        <div className={`${styles.prop} ${styles.lamp}`}>
          <Lamp
            on={living.lampOn}
            expression={lamp.expression}
            thought={lamp.thought}
            rootRef={lamp.rootRef}
            onToggle={() => {
              setLiving((s) => ({ lampOn: !s.lampOn }));
              lamp.play('wiggle');
            }}
          />
        </div>
        <div className={`${styles.prop} ${styles.sofa}`}>
          <Sofa />
        </div>
        <div className={`${styles.prop} ${styles.pim}`}>
          <Pim
            expression={living.lampOn ? pim.expression : 'surprised'}
            thought={pim.thought}
            rootRef={pim.rootRef}
            gaze={pim.gaze}
            onActivate={() => {
              pim.express('happy', 1200);
              pim.play('squish');
            }}
          />
        </div>
        <div className={`${styles.prop} ${styles.button}`}>
          <DoNotPress
            label={label}
            pressed={living.buttonPresses}
            cooperative={living.buttonPresses >= BUTTON_LABELS.length - 1}
            rootRef={button.rootRef}
            thought={button.thought}
            onPress={() => {
              setLiving((s) => ({ buttonPresses: s.buttonPresses + 1 }));
              button.play('shake');
            }}
          />
        </div>
        <div className={`${styles.prop} ${styles.plant}`}>
          <Plant
            leaves={7}
            drooping={false}
            bloom={living.plantBloom}
            thought={plant.thought}
            rootRef={plant.rootRef}
            onActivate={() => plant.play('wiggle')}
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
        onActivate={() => dot.play('jump')}
      />
    </section>
  );
}
