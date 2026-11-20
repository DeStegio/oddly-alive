import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { endNimbusVisit } from '../app/nimbusVisit';
import { roomFromPath } from '../app/rooms';
import { useWorld } from '../app/worldInstance';
import { Nimbus } from '../characters/Nimbus';
import { useActor } from '../characters/useActor';
import { useWorldStore } from '../state/worldStore';
import { WeatherLayer } from './WeatherLayer';
import styles from './NimbusVisitor.module.css';

/**
 * Nimbus on a visit (sent from the Mood Room): a small cloud near the top of
 * the room with its own local shower. Goes home by itself after a minute.
 */
export function NimbusVisitor() {
  const room = roomFromPath(useLocation().pathname);
  const visit = useWorldStore((s) => s.nimbusVisit);
  const here = visit !== null && visit.room === room;

  useEffect(() => {
    if (!visit) return;
    const t = window.setTimeout(endNimbusVisit, Math.max(0, visit.until - Date.now()));
    return () => window.clearTimeout(t);
  }, [visit]);

  return here ? <Visitor /> : null;
}

function Visitor() {
  const world = useWorld();
  const nimbus = useActor('nimbus');
  const room = roomFromPath(useLocation().pathname);
  useEffect(() => {
    world.emit('OBJECT_STATE_CHANGED', { target: 'nimbus', key: 'visit', value: room });
  }, [world, room]);
  return (
    <div className={styles.visitor}>
      <div className={styles.shower} aria-hidden="true">
        <WeatherLayer weather="rain" />
      </div>
      <div className={styles.cloud}>
        <Nimbus
          expression={nimbus.expression}
          thought={nimbus.thought}
          rootRef={nimbus.rootRef}
          gaze={nimbus.gaze}
          onActivate={() => world.emit('OBJECT_CLICKED', { target: 'nimbus', repeat: 1, via: 'pointer' })}
        />
      </div>
    </div>
  );
}
