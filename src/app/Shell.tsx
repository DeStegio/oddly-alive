import { Suspense, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Nav } from '../components/Nav';
import { ErrorBoundary } from './ErrorBoundary';
import { ROOMS, roomFromPath } from './rooms';
import styles from './Shell.module.css';

export function SceneFallback() {
  return (
    <div className={styles.fallback} role="status">
      <span className={styles.fallbackDot} aria-hidden="true" />
      <span>Tidying up before you come in…</span>
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const room = roomFromPath(location.pathname);
  return (
    <>
      <a className="skip-link" href="#scene">
        Skip to the room
      </a>
      <Nav />
      <main id="scene" className={styles.main} data-room={room} tabIndex={-1}>
        <ErrorBoundary resetKey={room} label={ROOMS[room].label}>
          <Suspense fallback={<SceneFallback />}>{children}</Suspense>
        </ErrorBoundary>
      </main>
    </>
  );
}
