import { lazy, useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Controls } from '../components/Controls';
import { Shell } from './Shell';
import { WorldProvider } from './WorldProvider';

const load = {
  living: () => import('../rooms/LivingRoom/LivingRoom'),
  playground: () => import('../rooms/Playground/Playground'),
  mood: () => import('../rooms/MoodRoom/MoodRoom'),
  secret: () => import('../rooms/SecretSpace/SecretSpace'),
  memory: () => import('../rooms/MemoryRoom/MemoryRoom'),
  after: () => import('../rooms/AfterHours/AfterHours'),
};
const LivingRoom = lazy(load.living);
const Playground = lazy(load.playground);
const MoodRoom = lazy(load.mood);
const SecretSpace = lazy(load.secret);
const MemoryRoom = lazy(load.memory);
const AfterHours = lazy(load.after);

/** Once the first room is up and the page is idle, quietly fetch the others (physics last). */
function usePrefetchRooms() {
  useEffect(() => {
    const idle = (fn: () => void, ms: number) => {
      const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
      return window.setTimeout(() => (w.requestIdleCallback ? w.requestIdleCallback(fn) : fn()), ms);
    };
    const a = idle(() => {
      void load.living();
      void load.mood();
      void load.secret();
      void load.memory();
      void load.after();
    }, 2500);
    const b = idle(() => void load.playground(), 6000);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, []);
}

export function AppRoutes() {
  usePrefetchRooms();
  return (
    <WorldProvider>
      <Shell controls={<Controls />}>
      <Routes>
        <Route path="/" element={<LivingRoom />} />
        <Route path="/playground" element={<Playground />} />
        <Route path="/mood" element={<MoodRoom />} />
        <Route path="/secret" element={<SecretSpace />} />
        <Route path="/memory" element={<MemoryRoom />} />
        <Route path="/after-hours" element={<AfterHours />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Shell>
    </WorldProvider>
  );
}

export function App() {
  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppRoutes />
    </HashRouter>
  );
}
