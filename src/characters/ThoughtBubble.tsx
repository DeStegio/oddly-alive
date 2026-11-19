import styles from './ThoughtBubble.module.css';

interface Props {
  text: string | null;
  /** Which side the tail points from. */
  side?: 'left' | 'right' | 'center';
  className?: string;
}

/** A paper speech bubble. Text is mirrored to a polite live region. */
export function ThoughtBubble({ text, side = 'center', className }: Props) {
  return (
    <div className={`${styles.anchor} ${className ?? ''}`} aria-live="polite" aria-atomic="true">
      {text ? (
        <p key={text} className={`${styles.bubble} ${styles[side]}`}>
          {text}
        </p>
      ) : null}
    </div>
  );
}
