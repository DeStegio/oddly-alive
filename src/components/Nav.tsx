import { NavLink } from 'react-router-dom';
import { useEffect, useState, type ReactNode } from 'react';
import { ROOM_LIST, type RoomId } from '../app/rooms';
import styles from './Nav.module.css';

interface NavProps {
  /** Rooms whose label should stay mysterious. */
  hiddenLabels?: ReadonlySet<RoomId>;
  onNavigate?: (room: RoomId) => void;
  controls?: ReactNode;
}

/**
 * Persistent navigation. It never moves, hides or animates away — motion and
 * secrets must never prevent leaving a scene.
 */
export function Nav({ hiddenLabels, onNavigate, controls }: NavProps) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <header className={styles.bar} data-scrolled={scrolled}>
      <NavLink to="/" className={styles.mark} aria-label="Oddly Alive — Living Room">
        <svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true">
          <path
            d="M6 27c0-9 6-18 14-18s14 7 14 15-6 10-14 10S6 33 6 27z"
            fill="var(--lavender)"
            stroke="var(--ink)"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <circle cx="16" cy="22" r="3.6" fill="#fff" stroke="var(--ink)" strokeWidth="2" />
          <circle cx="25" cy="22" r="3.6" fill="#fff" stroke="var(--ink)" strokeWidth="2" />
          <circle cx="16.8" cy="22.6" r="1.6" fill="#24232b" />
          <circle cx="25.8" cy="22.6" r="1.6" fill="#24232b" />
        </svg>
        <span className={styles.markText}>Oddly Alive</span>
      </NavLink>

      <nav aria-label="Rooms" className={styles.rooms}>
        <ul>
          {ROOM_LIST.map((room) => {
            const mysterious = hiddenLabels?.has(room.id) ?? false;
            return (
              <li key={room.id}>
                <NavLink
                  to={room.path}
                  end={room.path === '/'}
                  className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
                  onClick={() => onNavigate?.(room.id)}
                  aria-label={mysterious ? `${room.label} (unexplored)` : room.label}
                  data-room={room.id}
                >
                  <span className={styles.long}>{mysterious ? '???' : room.label}</span>
                  <span className={styles.short}>{mysterious ? '???' : room.short}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {controls ? <div className={styles.controls}>{controls}</div> : null}
    </header>
  );
}
