import styles from './art.module.css';

/**
 * A soft ground shadow under a thing that stands in the scene, in addition to
 * the hard offset print shadow: it sits the object IN the space. `width` is a
 * % of the parent's width; `lift` (0..1) shrinks and fades it as the thing rises.
 */
export function ContactShadow({ width = 80, lift = 0, className }: { width?: number; lift?: number; className?: string }) {
  return <span aria-hidden="true" className={`${styles.contact} ${className ?? ''}`} style={{ '--cw': `${width}%`, '--lift': lift } as React.CSSProperties} />;
}
