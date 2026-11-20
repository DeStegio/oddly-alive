import { LINES } from '../content/lines';
import { defineBehavior } from '../engine/behaviorEngine';
import { Priority } from '../engine/scheduler';
import type { ActorId } from '../engine/types';
import { act, anim, face, say, send, tempo } from './helpers';

/**
 * Contextual character reactions: how the cast responds to mood shifts,
 * being ignored, and the visitor coming back from another tab.
 */
export const characterBehaviors = [
  defineBehavior({
    id: 'mood.annoyed',
    implements: ['INT-021', 'INT-074'],
    on: ['MOOD_CHANGED'],
    priority: Priority.CHARACTER,
    cooldownMs: 12_000,
    when: (c) => c.event.payload.to === 'annoyed',
    react: (c) =>
      act('pim', 2800, () => {
        face(c, 'pim', 'annoyed', 2600);
        say(c, 'pim', LINES.pimAnnoyed);
        anim(c, 'tick', 'shake');
      }),
  }),
  defineBehavior({
    id: 'mood.recover',
    implements: ['INT-078'],
    on: ['MOOD_CHANGED'],
    priority: Priority.CHARACTER,
    cooldownMs: 15_000,
    when: (c) => c.event.payload.from === 'annoyed',
    react: (c) =>
      act('pim', 2600, (ctl) => {
        face(c, 'pim', 'suspicious', 1200);
        ctl.after(tempo(c, 900), () => {
          face(c, 'pim', 'happy', 1200);
          say(c, 'pim', LINES.pimRecover);
        });
      }),
  }),
  defineBehavior({
    id: 'mood.excited',
    implements: ['INT-074'],
    on: ['MOOD_CHANGED'],
    priority: Priority.CHARACTER,
    cooldownMs: 15_000,
    when: (c) => c.event.payload.to === 'excited',
    react: (c) =>
      act('dot', 1800, () => {
        anim(c, 'dot', 'bounce');
        face(c, 'pim', 'excited', 1600);
        say(c, 'pim', LINES.pimExcited, 2000);
      }),
  }),
  defineBehavior({
    id: 'mood.sleepy',
    implements: ['INT-051'],
    on: ['MOOD_CHANGED'],
    priority: Priority.AMBIENT,
    cooldownMs: 30_000,
    when: (c) => c.event.payload.to === 'sleepy',
    react: (c) => act('tick', 3000, () => void say(c, 'tick', LINES.tickSleep), { ambient: true }),
  }),
  defineBehavior({
    id: 'mood.affectionate',
    implements: ['INT-076'],
    on: ['MOOD_CHANGED'],
    priority: Priority.CHARACTER,
    cooldownMs: 40_000,
    when: (c) => c.event.payload.to === 'affectionate',
    react: (c) =>
      act('pim', 3000, () => {
        face(c, 'pim', 'affectionate', 2800);
        say(c, 'pim', LINES.pimAffection, 3000);
      }),
  }),
  defineBehavior({
    id: 'mood.mischievous',
    implements: ['INT-077'],
    on: ['MOOD_CHANGED'],
    priority: Priority.CHARACTER,
    cooldownMs: 40_000,
    when: (c) => c.event.payload.to === 'mischievous',
    react: (c) =>
      act('pim', 3000, () => {
        face(c, 'pim', 'mischievous', 2800);
        say(c, 'pim', LINES.pimMischief, 3000);
      }),
  }),
  defineBehavior({
    id: 'mood.confused',
    on: ['MOOD_CHANGED'],
    priority: Priority.CHARACTER,
    cooldownMs: 20_000,
    when: (c) => c.event.payload.to === 'confused',
    react: (c) =>
      act('pim', 2600, () => {
        face(c, 'pim', 'confused', 2400);
        say(c, 'pim', LINES.pimConfused);
        anim(c, 'dot', 'spin');
      }),
  }),

  // ---- being ignored (INT-073) and falling asleep (INT-051)
  defineBehavior({
    id: 'idle.short',
    implements: ['INT-073'],
    on: ['USER_IDLE'],
    priority: Priority.AMBIENT,
    when: (c) => c.event.payload.level === 'short',
    react: (c) => {
      const who: ActorId = c.rng() < 0.5 ? 'pim' : 'dot';
      return act(
        who,
        4200,
        (ctl) => {
          send(c, who, { type: 'gaze', target: { x: -1, y: 0 }, durationMs: 900 });
          ctl.after(900, () => send(c, who, { type: 'gaze', target: { x: 1, y: -0.2 }, durationMs: 900 }));
          ctl.after(1900, () => say(c, who, LINES.idleShort, 2400));
        },
        { ambient: true },
      );
    },
  }),
  defineBehavior({
    id: 'idle.long',
    implements: ['INT-051', 'INT-088'],
    on: ['USER_IDLE'],
    // AMBIENT so any direct input (DIRECT priority) wakes everyone up
    priority: Priority.AMBIENT,
    when: (c) => c.event.payload.level === 'long',
    react: (c) =>
      act('room', 600_000, () => {
        // sitting still until the whole Living Room nods off is its own small reward
        if (c.view.room === 'living') c.effects.discover('patient');
        for (const id of ['pim', 'tick', 'dot', 'nimbus'] as const) face(c, id, 'asleep', 600_000);
        return () => {
          for (const id of ['pim', 'tick', 'dot', 'nimbus'] as const) send(c, id, { type: 'reset' });
        };
      }),
  }),
  defineBehavior({
    id: 'idle.wake',
    on: ['USER_ACTIVE'],
    priority: Priority.DIRECT,
    when: (c) => c.event.payload.idleMs >= 45_000,
    react: (c) =>
      act('tick', 2400, () => {
        // the DIRECT priority already cancelled the sleeping reaction; make waking visible
        face(c, 'tick', 'surprised', 1800);
        anim(c, 'tick', 'shake');
        say(c, 'tick', LINES.tickWake, 2200);
        face(c, 'pim', 'surprised', 1200);
      }),
  }),

  // ---- coming back from another tab (INT-052)
  defineBehavior({
    id: 'tab.return',
    implements: ['INT-052'],
    on: ['TAB_VISIBILITY_CHANGED'],
    priority: Priority.CHARACTER,
    cooldownMs: 20_000,
    when: (c) => c.event.payload.visible && c.event.payload.awayMs > 4000,
    react: (c) =>
      act('pim', 2800, () => {
        face(c, 'pim', 'surprised', 900);
        say(c, 'pim', LINES.welcomeBack, 2800);
        anim(c, 'dot', 'jump');
      }),
  }),

  // ---- occasional original thought (INT-059)
  defineBehavior({
    id: 'ambient.thought',
    implements: ['INT-059'],
    on: ['POINTER_MOVED', 'SCROLL_CHANGED'],
    rooms: ['living', 'after-hours'],
    priority: Priority.AMBIENT,
    chance: 0.06,
    cooldownMs: 28_000,
    cooldownKey: 'thought',
    react: (c) => {
      const who: ActorId = c.view.room === 'after-hours' ? 'pim' : c.rng() < 0.6 ? 'pim' : 'ferdinand';
      return act(who, 3200, () => void say(c, who, LINES.thoughts, 3200), { ambient: true });
    },
  }),

  // ---- playful character initiates (INT-077)
  defineBehavior({
    id: 'dot.initiate',
    implements: ['INT-077'],
    on: ['POINTER_MOVED'],
    priority: Priority.AMBIENT,
    chance: 0.08,
    cooldownMs: 45_000,
    when: (c) => c.view.mood === 'playful' || c.view.vars.mischief > 0.35,
    react: (c) =>
      act(
        'dot',
        2600,
        () => {
          anim(c, 'dot', 'wiggle');
          say(c, 'dot', LINES.dotInitiate, 2400);
        },
        { ambient: true },
      ),
  }),
];
