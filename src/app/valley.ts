import type { Mood } from '../engine/types';
import type { World } from '../engine/world';
import { loadValley, saveValley, valleyWeather } from '../rooms/Weather/sim/read';
import { actOn, makeValley, stepValley, type ValleyAction, type Valley } from '../rooms/Weather/sim/valley';
import { useKeepsakes } from '../state/keepsakes';
import { getWorldState, setWorldState } from '../state/worldStore';

/**
 * The one valley the whole house shares (Phase 4). The Weather Workshop
 * steps it at 10 Hz while you're in the room; everywhere else it keeps
 * running slowly on its own (idle mode). If the sill is empty when you
 * leave, the house's mood puts its own things in the valley (the old
 * "let the mood decide"). Whatever the valley does is the house weather.
 * Rain over the field fills the Garden's barrel a little (a bonus).
 */
let current: Valley = makeValley();
let inRoom = false;
let moodDriven = false;
let lastMood: Mood | null = null;
let fieldSeen = 0;

/** What the mood does to an empty valley (mirrors the old mood → weather map, but caused). */
export const MOOD_TOOLS: Partial<Record<Mood, ValleyAction[]>> = {
  annoyed: [
    { type: 'place', tool: 'teacup', x: 14.5, y: 9 },
    { type: 'place', tool: 'lamp', x: 18.5, y: 7 },
    { type: 'place', tool: 'ice', x: 14.5, y: 2.5 },
  ],
  playful: [{ type: 'place', tool: 'lamp', x: 9, y: 0.5 }],
  excited: [{ type: 'place', tool: 'lamp', x: 9, y: 0.5 }],
  curious: [{ type: 'place', tool: 'fan', x: 3, y: 6, dir: 1 }],
  shy: [
    { type: 'place', tool: 'ice', x: 8.5, y: 9.6 },
    { type: 'place', tool: 'teacup', x: 8.5, y: 10.4 },
  ],
  confused: [
    { type: 'place', tool: 'teacup', x: 11.5, y: 10.4 },
    { type: 'place', tool: 'lamp', x: 12, y: 5 },
  ],
};

export const getValley = () => current;

/** The Workshop hands back each new valley it steps. */
export function setValley(v: Valley) {
  current = v;
}

export function enterWorkshop(): Valley {
  inRoom = true;
  // the mood's things come off the sill when you come in; yours stay
  if (moodDriven) current = { ...current, tools: [] };
  moodDriven = false;
  lastMood = null;
  return current;
}

export function leaveWorkshop() {
  inRoom = false;
  save();
}

function save() {
  useKeepsakes.getState().saveSandbox(saveValley(current));
}

/** Publish what the valley is doing as the house weather, and fill the garden's barrel. */
export function publish(v: Valley = current) {
  const w = valleyWeather(v);
  if (getWorldState().valleyWeather !== w) setWorldState({ valleyWeather: w });
  const whole = Math.floor(v.fieldRain / 1.5);
  if (whole > fieldSeen) {
    useKeepsakes.getState().addBarrel(whole - fieldSeen);
    fieldSeen = whole;
  }
}

/** Mood-driven idle: an empty sill lets the mood put things in the valley. */
function moodTick() {
  const mood = getWorldState().mood;
  const hasOwnTools = current.tools.length > 0 && !moodDriven;
  if (hasOwnTools) return;
  if (mood === lastMood) return;
  lastMood = mood;
  let v: Valley = { ...current, tools: [] };
  for (const a of MOOD_TOOLS[mood] ?? []) v = actOn(v, a);
  moodDriven = v.tools.length > 0;
  current = v;
}

/** Run the valley in the background; returns a cleanup. */
export function startValley(world: World, opts: { tickMs?: number } = {}): () => void {
  const saved = useKeepsakes.getState().workshop.sandbox;
  current = (saved && loadValley(saved)) || makeValley();
  fieldSeen = Math.floor(current.fieldRain / 1.5);
  moodDriven = false;
  lastMood = null;
  let n = 0;
  const timer = window.setInterval(() => {
    if (inRoom || document.hidden) return;
    moodTick();
    for (let i = 0; i < 10; i++) current = stepValley(current);
    publish();
    if (++n % 15 === 0) save();
  }, opts.tickMs ?? 1000);
  const off = world.bus.on('WORLD_RESET', () => {
    current = makeValley();
    moodDriven = false;
    lastMood = null;
    publish();
  });
  return () => {
    window.clearInterval(timer);
    off();
    save();
  };
}
