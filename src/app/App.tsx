import { lazy } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Shell } from './Shell';
import { WorldProvider } from './WorldProvider';

const LivingRoom = lazy(() => import('../rooms/LivingRoom/LivingRoom'));
const Playground = lazy(() => import('../rooms/Playground/Playground'));
const MoodRoom = lazy(() => import('../rooms/MoodRoom/MoodRoom'));
const SecretSpace = lazy(() => import('../rooms/SecretSpace/SecretSpace'));
const MemoryRoom = lazy(() => import('../rooms/MemoryRoom/MemoryRoom'));
const AfterHours = lazy(() => import('../rooms/AfterHours/AfterHours'));

export function AppRoutes() {
  return (
    <WorldProvider>
      <Shell>
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
