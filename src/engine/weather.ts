import type { Mood } from './types';

/**
 * The house's weather. Usually it follows the mood (the Mood Room window has
 * always shown this); the Mood Room barometer can pin it for a few minutes.
 * Every room feels it in its own small way. Pure and deterministic.
 */
export const WEATHERS = ['clear', 'sunny', 'windy', 'rain', 'storm', 'fog', 'snow', 'rainbow', 'night'] as const;
export type Weather = (typeof WEATHERS)[number];

/** What each mood looks like outside. Rain and snow only come from the barometer. */
export const WEATHER_FOR_MOOD: Record<Mood, Weather> = {
  neutral: 'clear',
  curious: 'windy',
  playful: 'sunny',
  shy: 'fog',
  annoyed: 'storm',
  excited: 'sunny',
  sleepy: 'night',
  mischievous: 'night',
  confused: 'rainbow',
  affectionate: 'clear',
};

/** How long a pinned weather lasts. */
export const PIN_MS = 3 * 60_000;

export interface WeatherPin {
  weather: Weather;
  until: number;
}

export function isWeather(v: unknown): v is Weather {
  return typeof v === 'string' && (WEATHERS as readonly string[]).includes(v);
}

/** The weather right now: a live pin wins, otherwise the mood decides. */
export function resolveWeather(mood: Mood, pin: WeatherPin | null, now: number): Weather {
  return pin && pin.until > now ? pin.weather : WEATHER_FOR_MOOD[mood];
}

export function makePin(weather: Weather, now: number, ms = PIN_MS): WeatherPin {
  return { weather, until: now + ms };
}

/** Plain names for UI and screen readers. */
export const WEATHER_NAMES: Record<Weather, string> = {
  clear: 'clear',
  sunny: 'sunny',
  windy: 'windy',
  rain: 'rain',
  storm: 'storm',
  fog: 'fog',
  snow: 'snow',
  rainbow: 'rainbow',
  night: 'clear night',
};
