import { defineBehavior } from '../engine/behaviorEngine';
import { Priority } from '../engine/scheduler';
import { act, anim, face, isTarget, say } from './helpers';

const NIGHT = ['after-hours'] as const;
const changed = (c: { event: { payload: unknown } }, target: string, key: string) => {
  const p = c.event.payload as { target?: string; key?: string };
  return p.target === target && p.key === key;
};

/** After Hours: a different character state, unique gestures, its own surprises. */
export const nightBehaviors = [
  defineBehavior({
    id: 'night.switch',
    implements: ['INT-050', 'INT-055'],
    on: ['OBJECT_STATE_CHANGED'],
    priority: Priority.CHARACTER,
    when: (c) => changed(c, 'settings', 'afterHours'),
    react: (c) =>
      act('pim', 2600, () => {
        c.effects.nudge(c.event.payload.value ? { mischief: 0.2, energy: -0.05 } : { mischief: -0.1, energy: 0.1 });
        face(c, 'pim', c.event.payload.value ? 'mischievous' : 'happy', 2400);
        say(c, 'pim', c.event.payload.value ? ['it’s after hours. anything goes.', 'lights low. ideas high.'] : ['good morning! nobody did anything weird.', 'morning already?'], 2400);
      }),
  }),
  defineBehavior({
    id: 'night.moth',
    implements: ['INT-056', 'INT-019'],
    on: ['OBJECT_STATE_CHANGED'],
    rooms: NIGHT,
    priority: Priority.DIRECT,
    when: (c) => changed(c, 'porchlight', 'on') && c.event.payload.value === true,
    react: (c) =>
      act('moth', 2600, (ctl) => {
        ctl.after(700, () => say(c, 'moth', ['LIGHT!', 'ooh. ooooh. pretty.', 'I live here now.'], 1800));
        c.effects.discover('moth');
      }),
  }),
  defineBehavior({
    id: 'night.radio',
    on: ['OBJECT_STATE_CHANGED'],
    rooms: NIGHT,
    priority: Priority.CHARACTER,
    when: (c) => changed(c, 'radio', 'on'),
    react: (c) =>
      act('pim', 2400, () => {
        if (c.event.payload.value) {
          face(c, 'pim', 'affectionate', 2200);
          say(c, 'pim', ['ooh, my song.', 'a lullaby. I’m not sleepy. (I am.)'], 2200);
          c.effects.nudge({ fatigue: 0.15, stimulation: -0.15 });
        } else say(c, 'pim', ['aw.', 'the silence is also nice.'], 1600);
      }),
  }),
  defineBehavior({
    id: 'night.pim.click',
    implements: ['INT-088', 'INT-072'],
    on: ['OBJECT_CLICKED'],
    rooms: NIGHT,
    priority: Priority.DIRECT,
    when: (c) => isTarget(c, 'pim'),
    react: (c) =>
      act('pim', 1800, () => {
        face(c, 'pim', c.rng() < 0.5 ? 'sleepy' : 'mischievous', 1600);
        say(c, 'pim', ['I’m not asleep. I’m resting my eyes.', 'zzz… (fake)', 'shh. I’m pretending.'], 1800);
      }),
  }),
  defineBehavior({
    id: 'night.link',
    on: ['OBJECT_STATE_CHANGED'],
    rooms: NIGHT,
    priority: Priority.AMBIENT,
    chance: 0.3,
    cooldownMs: 8000,
    when: (c) => changed(c, 'sky', 'link'),
    react: (c) => act('pim', 1800, () => void say(c, 'pim', ['ooh, a line.', 'connect the dots! literally.'], 1600), { ambient: true }),
  }),
  defineBehavior({
    id: 'night.constellation',
    implements: ['INT-092'],
    on: ['OBJECT_STATE_CHANGED'],
    rooms: NIGHT,
    priority: Priority.DIRECT,
    when: (c) => changed(c, 'sky', 'constellation'),
    react: (c) =>
      act('pim', 3000, () => {
        face(c, 'pim', 'excited', 2600);
        anim(c, 'pim', 'jump');
        say(c, 'pim', [`that’s ${String(c.event.payload.value)}! everyone knows that one.`], 3000);
        c.effects.discover('constellation');
      }),
  }),
  defineBehavior({
    id: 'night.shooting',
    implements: ['INT-094'],
    on: ['RARE_EVENT'],
    rooms: NIGHT,
    priority: Priority.RARE,
    when: (c) => (c.event.payload as { event: string }).event === 'shooting-star',
    react: (c) => act('pim', 2400, (ctl) => ctl.after(400, () => say(c, 'pim', ['a shooting star! make a wish!', 'did you see that? over the chimney.'], 2200))),
  }),
  defineBehavior({
    id: 'night.welcome',
    implements: ['INT-035'],
    on: ['ROOM_ENTERED'],
    rooms: NIGHT,
    priority: Priority.CHARACTER,
    react: (c) => act('pim', 2600, (ctl) => ctl.after(700, () => say(c, 'pim', c.event.payload.visits > 1 ? ['back for the night shift?'] : ['shh. everyone’s pretending to sleep.'], 2400))),
  }),
  defineBehavior({
    id: 'night.living',
    implements: ['INT-080'],
    on: ['ROOM_ENTERED'],
    rooms: ['living'],
    priority: Priority.AMBIENT,
    when: (c) => c.view.afterHours,
    react: (c) => act('lumen', 2400, (ctl) => ctl.after(1200, () => say(c, 'lumen', ['night shift. I’m the only light that matters now.'], 2400)), { ambient: true }),
  }),
];
