import { useWorld } from '../app/worldInstance';
import { Inch } from '../characters/Inch';
import { useCharacter } from '../characters/useCharacter';
import styles from './RareLayer.module.css';

/**
 * Global overlay for rare events that can happen in any room: Inch's walk
 * across the floor and the clearly-labelled fake error. Nothing here ever
 * blocks navigation or input (pointer-events only on the visitor itself).
 */
export function RareLayer() {
  const world = useWorld();
  const visitor = useCharacter('visitor', 'neutral');
  const glitch = useCharacter('glitch', 'neutral');
  return (
    <>
      <div ref={visitor.rootRef} className={styles.visitorLane} aria-hidden={visitor.thought ? undefined : 'true'}>
        <div className={styles.visitor}>
          <Inch
            thought={visitor.thought}
            rootRef={{ current: null }}
            label="Inch, a small visitor crossing the floor"
            onActivate={() => world.emit('OBJECT_CLICKED', { target: 'visitor', repeat: 1, via: 'pointer' })}
          />
        </div>
      </div>
      <div ref={glitch.rootRef} className={styles.glitch} role="status">
        {glitch.thought ? (
          <p className={styles.banner}>
            <span className={styles.tag}>not a real error</span>
            {glitch.thought}
          </p>
        ) : null}
      </div>
    </>
  );
}
