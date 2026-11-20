import type { World } from '../engine/world';
import { makePin, resolveWeather, type Weather } from '../engine/weather';
import { useKeepsakes } from '../state/keepsakes';
import { getWorldState, setWorldState, useWorldStore } from '../state/worldStore';

/**
 * Keeps the house weather in step with the mood and the barometer pin:
 * updates the store, `html[data-weather]`, the almanac, and tells the world
 * (`WEATHER_CHANGED`) so behaviors in any room can respond.
 */
export function startWeather(world: World): () => void {
  let applying = false;
  const apply = () => {
    if (applying) return;
    applying = true;
    try {
      update();
    } finally {
      applying = false;
    }
  };
  const update = () => {
    const s = getWorldState();
    const now = Date.now();
    const pin = s.weatherPin && s.weatherPin.until > now ? s.weatherPin : null;
    const next = resolveWeather(s.mood, pin, now);
    if (s.weatherPin && !pin) setWorldState({ weatherPin: null });
    document.documentElement.dataset.weather = next;
    useKeepsakes.getState().seeWeather(next);
    if (next === s.weather) return;
    setWorldState({ weather: next });
    world.emit('WEATHER_CHANGED', { from: s.weather, to: next, pinned: pin !== null });
  };

  apply();
  const unsub = useWorldStore.subscribe((s, prev) => {
    if (s.mood !== prev.mood || s.weatherPin !== prev.weatherPin) apply();
  });
  // pins run out on their own
  const timer = window.setInterval(() => {
    if (getWorldState().weatherPin) apply();
  }, 1000);
  return () => {
    unsub();
    window.clearInterval(timer);
    delete document.documentElement.dataset.weather;
  };
}

/** Pin the house weather (Mood Room barometer). */
export function pinWeather(weather: Weather, now = Date.now()) {
  setWorldState({ weatherPin: makePin(weather, now) });
}

/** Let the mood decide again. */
export function unpinWeather() {
  setWorldState({ weatherPin: null });
}
