import { DIARY } from '../content/continuity';
import type { WorldEvent } from '../engine/events';
import type { WorldPlugin } from '../engine/world';
import { useKeepsakes } from '../state/keepsakes';

const BUTTON_MOMENTS = new Set(['shielded', 'fell', 'opened', 'caught', 'pried']);

/**
 * The house remembering, across rooms and visits: real happenings (from the
 * event bus, never per-frame detail) become a line in the House Diary and a
 * key in the story, which characters can bring up later.
 */
export const continuity: WorldPlugin = {
  onEvent(ev: WorldEvent) {
    if (ev.type !== 'OBJECT_STATE_CHANGED') return;
    const { target, key, value } = ev.payload as { target: string; key: string; value: unknown };
    const k = useKeepsakes.getState();
    if (target.startsWith('agent:incident.') && key === 'end') {
      const name = target.slice('agent:incident.'.length);
      const outcome = String(value);
      if (!outcome || outcome === 'done') return;
      k.remember(`incident-${name}`);
      const line = DIARY.incident[name]?.(outcome);
      if (line) k.note(`incident:${name}`, line);
    } else if (target === 'button' && BUTTON_MOMENTS.has(key)) {
      k.remember(`button-${key}`);
      k.note(`button:${key}`, DIARY.button[key]!, { once: true });
    } else if (target === 'infinite' && key === 'exit' && typeof value === 'number' && value >= 3) {
      k.remember('infinite-deep');
      k.note('infinite', DIARY.infinite(value));
    } else if (target === 'volley' && key === 'point') {
      const rally = Number(String(value).split(':')[1] ?? 0);
      if (rally >= 6) {
        k.remember('volley-rally');
        k.note('volley', DIARY.rally(rally));
      }
    } else if (target === 'garden:hybrid' && key === 'harvest') {
      k.remember('garden-hybrid');
      k.note('garden:hybrid', DIARY.hybrid, { once: true });
    } else if (target === 'shadow' && key === 'creature') {
      k.remember(`shadow-${String(value)}`);
      k.note(`shadow:${String(value)}`, DIARY.shadow(String(value)), { once: true });
    } else if (target === 'garden:thief' && key === 'outcome' && typeof value === 'string') {
      k.note(`garden:thief:${value}`, DIARY.thief(value), { once: true });
    } else if (target === 'sky' && key === 'tune') {
      k.remember('sky-tune');
      k.note('sky:tune', DIARY.tune, { once: true });
    }
  },
};
