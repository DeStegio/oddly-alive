import { useWorldStore } from '../state/worldStore';

/** The current house weather (see engine/weather.ts). */
export const useWeather = () => useWorldStore((s) => s.weather);
