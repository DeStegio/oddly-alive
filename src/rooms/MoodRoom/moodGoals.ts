import { pickLine } from '../../behaviors/helpers';
import { MOOD_FX } from '../../content/moodFx';
import type { GoalDef } from '../../engine/agents/types';

const MOOD = ['mood'] as const;
const COLD = new Set(['rain', 'storm', 'fog', 'snow', 'clear', 'night']);

/**
 * Nimbus doesn't just show the weather; now and then he does something
 * with it: breathes on the window so you can draw in the mist, or blows a
 * gust that takes the papers off the sill.
 */
export const MOOD_GOALS: GoalDef[] = [
  {
    id: 'nimbus.breathe',
    actor: 'nimbus',
    rooms: MOOD,
    kind: 'ambient',
    durationMs: 3000,
    cooldownMs: 70_000,
    answers: ['attention', 'play'],
    when: (p) => COLD.has(p.weather) && p.idleMs > 6000,
    start(c) {
      c.actors.send('nimbus', { type: 'expression', value: 'curious', durationMs: 1500 });
      c.actors.send('nimbus', { type: 'anim', name: 'squish', durationMs: 700 });
      c.after(700, () => {
        c.emit('OBJECT_STATE_CHANGED', { target: 'mood:breath', key: 'use', value: true });
        if (c.rng() < 0.6) c.actors.send('nimbus', { type: 'say', text: pickLine('nimbus', MOOD_FX.nimbusBreath, c.rng), durationMs: 2200 });
        c.satisfy('nimbus', 'attention', -0.5);
        c.outcome = 'breathed';
      });
    },
  },
  {
    id: 'nimbus.gust',
    actor: 'nimbus',
    rooms: MOOD,
    kind: 'ambient',
    durationMs: 3000,
    cooldownMs: 60_000,
    answers: ['play'],
    when: (p) => p.weather === 'windy' && p.idleMs > 5000,
    start(c) {
      c.actors.send('nimbus', { type: 'expression', value: 'excited', durationMs: 1500 });
      c.actors.send('nimbus', { type: 'anim', name: 'wiggle', durationMs: 900 });
      c.after(500, () => {
        c.emit('OBJECT_STATE_CHANGED', { target: 'mood:gust', key: 'use', value: true });
        if (c.rng() < 0.5) c.actors.send('nimbus', { type: 'say', text: pickLine('nimbus', MOOD_FX.nimbusGust, c.rng), durationMs: 2000 });
        c.satisfy('nimbus', 'play', -0.5);
        c.outcome = 'gust';
      });
    },
  },
];
