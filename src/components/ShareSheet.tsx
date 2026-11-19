import { useEffect, useId, useRef, useState } from 'react';
import { renderPostcard } from '../app/postcard';
import { buildShareUrl, currentArrangement } from '../app/share';
import { useWorld } from '../app/worldInstance';
import { useSettings } from '../state/settings';
import { useWorldStore } from '../state/worldStore';
import styles from './ShareSheet.module.css';

/**
 * Share this scene: a copyable link (INT-110) and a postcard image (INT-107).
 * Links carry only room, scene seed, the night switch and — in the
 * Playground — the arrangement of shapes (INT-109). Never local memory.
 */
export function ShareSheet() {
  const world = useWorld();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState('');
  const room = useWorldStore((s) => s.room);
  const seed = useWorldStore((s) => s.seed);
  const mood = useWorldStore((s) => s.mood);
  const night = useSettings((s) => s.afterHours);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (!open) return;
    const arrangement = room === 'playground' ? currentArrangement() : null;
    setUrl(buildShareUrl({ room, seed, night, ...(arrangement ? { arrangement } : {}) }, window.location.href));
    setStatus('');
    panelRef.current?.querySelector<HTMLElement>('button, input')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      if (!panelRef.current?.contains(e.target as Node) && e.target !== triggerRef.current) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [open, room, seed, night]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setStatus('Link copied.');
    } catch {
      panelRef.current?.querySelector('input')?.select();
      setStatus('Select the link and copy it with your keyboard.');
    }
    world.emit('OBJECT_STATE_CHANGED', { target: 'share', key: 'link', value: room });
  };

  const download = async () => {
    setStatus('Drawing your postcard…');
    try {
      const blob = await renderPostcard({ room, mood, seed, night });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `oddly-alive-${room}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      setStatus('Postcard saved.');
      world.emit('OBJECT_STATE_CHANGED', { target: 'share', key: 'postcard', value: room });
    } catch {
      setStatus('This browser could not draw the postcard.');
    }
  };

  return (
    <div className={styles.wrap}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Share this scene"
        title="Share this scene"
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 13 V 19 H 19 V 13 M12 4 V 15 M7.5 8.5 L 12 4 L 16.5 8.5" />
        </svg>
      </button>
      {open ? (
        <div ref={panelRef} className={styles.panel} role="dialog" aria-labelledby={titleId}>
          <h2 id={titleId} className={styles.title}>
            Share this scene
          </h2>
          <label className={styles.label}>
            <span>Link</span>
            <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
          </label>
          <div className={styles.row}>
            <button type="button" className="paper-btn" onClick={copy}>
              Copy link
            </button>
            <button type="button" className="paper-btn" onClick={download}>
              Download postcard
            </button>
          </div>
          <p className={styles.note}>
            Links carry the room, the scene’s seed{room === 'playground' ? ', where the shapes are' : ''} and the night switch. Never your memory.
          </p>
          <p className={styles.status} role="status">
            {status}
          </p>
        </div>
      ) : null}
    </div>
  );
}
