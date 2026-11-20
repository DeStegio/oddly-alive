import { Suspense, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { ClickRipple } from '../components/ClickRipple';
import { DiscoveryToast } from '../components/DiscoveryToast';
import { NimbusVisitor } from '../components/NimbusVisitor';
import { Nav } from '../components/Nav';
import { RareLayer } from '../components/RareLayer';
import { useWorldStore } from '../state/worldStore';
import { ErrorBoundary } from './ErrorBoundary';
import { ROOMS, roomFromPath, type RoomId } from './rooms';
import styles from './Shell.module.css';

export function SceneFallback() {
  return (
    <div className={styles.fallback} role="status">
      <span className={styles.fallbackDot} aria-hidden="true" />
      <span>Tidying up before you come in…</span>
    </div>
  );
}

/**
 * Plays the mood-flavoured entrance once per room visit. The mood is frozen at
 * mount: if it followed live mood changes, the CSS animation name would swap
 * mid-visit and the browser would replay the whole entrance (the room blinking
 * out and back in after a burst of clicks).
 */
function RoomEntrance({ mood, children }: { mood: string; children: ReactNode }) {
  const [entranceMood] = useState(mood);
  return (
    <div className={styles.enter} data-mood={entranceMood}>
      {children}
    </div>
  );
}

export function Shell({ children, controls }: { children: ReactNode; controls?: ReactNode }) {
  const location = useLocation();
  const room = roomFromPath(location.pathname);
  const mood = useWorldStore((s) => s.mood);
  // the Secret Space keeps a mysterious label until you've been there or found the keyhole
  const secretKnown = useWorldStore((s) => Boolean(s.roomVisits.secret) || 'keyhole' in s.discoveries);
  const hidden = useMemo<ReadonlySet<RoomId>>(() => (secretKnown ? new Set() : new Set(['secret'])), [secretKnown]);
  return (
    <>
      <a className="skip-link" href="#scene">
        Skip to the room
      </a>
      <Nav hiddenLabels={hidden} controls={controls} dark={room === 'secret' || room === 'after-hours'} />
      <main id="scene" className={styles.main} data-room={room} tabIndex={-1}>
        <ErrorBoundary resetKey={room} label={ROOMS[room].label}>
          <Suspense fallback={<SceneFallback />}>
            {/* the way a room arrives depends on the house's mood (INT-040) */}
            <RoomEntrance key={room} mood={mood}>
              {children}
            </RoomEntrance>
          </Suspense>
        </ErrorBoundary>
      </main>
      <RareLayer />
      <NimbusVisitor />
      <DiscoveryToast />
      <ClickRipple />
    </>
  );
}
