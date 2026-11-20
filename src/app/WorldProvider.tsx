import { useEffect, useLayoutEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { MOOD_ATMOSPHERE } from '../engine/characterMood';
import { installSensors } from '../engine/sensors';
import { useSettings } from '../state/settings';
import { useWorldStore } from '../state/worldStore';
import { roomFromPath } from './rooms';
import { startAudio } from './audioSync';
import { parseShareHash } from './share';
import { startMemory } from './memorySync';
import { startWeather } from './weatherSync';
import { getWorld } from './worldInstance';

/** Applies mood + settings to the document as attributes and CSS variables. */
function useDocumentAtmosphere() {
  const mood = useWorldStore((s) => s.mood);
  const motion = useSettings((s) => s.motion);
  const afterHours = useSettings((s) => s.afterHours);
  useLayoutEffect(() => {
    const root = document.documentElement;
    const a = MOOD_ATMOSPHERE[mood];
    root.dataset.mood = mood;
    root.style.setProperty('--mood-tint', a.tint);
    root.style.setProperty('--soft', String(a.soft));
    root.style.setProperty('--wonk', String(a.wonk));
    root.style.setProperty('--title-weight', String(a.weight));
  }, [mood]);
  useLayoutEffect(() => {
    document.documentElement.dataset.motion = motion;
  }, [motion]);
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (afterHours) root.dataset.theme = 'night';
    else delete root.dataset.theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', afterHours ? '#1D1B26' : '#F6F1E8');
  }, [afterHours]);
}

export function WorldProvider({ children }: { children: ReactNode }) {
  const world = getWorld();
  const location = useLocation();

  useEffect(() => {
    const stopMemory = startMemory(world);
    const stopAudio = startAudio(world);
    // a shared link can ask for the night version of the scene
    if (parseShareHash(window.location.hash).night) useSettings.getState().setAfterHours(true);
    world.start();
    const stopWeather = startWeather(world);
    const removeSensors = installSensors(world);
    return () => {
      removeSensors();
      stopWeather();
      stopAudio();
      stopMemory();
      world.stop();
    };
  }, [world]);

  useEffect(() => {
    world.enterRoom(roomFromPath(location.pathname));
  }, [world, location.pathname]);

  useDocumentAtmosphere();

  return <>{children}</>;
}
