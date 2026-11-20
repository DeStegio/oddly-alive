import { NavLink, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ROOM_LIST, type RoomId } from '../app/rooms';
import styles from './Nav.module.css';

interface NavProps {
  /** Rooms whose label should stay mysterious. */
  hiddenLabels?: ReadonlySet<RoomId>;
  /** Rooms not shown at all yet (still reachable by URL). */
  hiddenRooms?: ReadonlySet<RoomId>;
  onNavigate?: (room: RoomId) => void;
  controls?: ReactNode;
  /** The current room is dark by design (Secret Space, After Hours). */
  dark?: boolean;
}

/**
 * Persistent navigation. It never moves, hides or animates away — motion and
 * secrets must never prevent leaving a scene.
 */
export function Nav({ hiddenLabels, hiddenRooms, onNavigate, controls, dark }: NavProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const location = useLocation();
  // on the phone dock (which scrolls sideways), keep the current room in view.
  // Scrolls the dock itself: scrollIntoView would also move the Tab starting point.
  useEffect(() => {
    const dock = listRef.current?.parentElement;
    const active = listRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!dock || !active || dock.scrollWidth <= dock.clientWidth) return;
    const left = active.offsetLeft - dock.clientWidth / 2 + active.offsetWidth / 2;
    dock.scrollTo?.({ left: Math.max(0, left) });
  }, [location.pathname]);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <header className={styles.bar} data-scrolled={scrolled} data-dark={dark ?? false}>
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
        <ul ref={listRef}>
          {ROOM_LIST.filter((room) => !hiddenRooms?.has(room.id)).map((room) => {
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
