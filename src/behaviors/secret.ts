import { defineBehavior } from '../engine/behaviorEngine';
import { Priority } from '../engine/scheduler';
import { SOLUTION } from '../rooms/SecretSpace/puzzle';
import { act, anim, isTarget, say } from './helpers';

const SECRET = ['secret'] as const;

/** The Secret Space: a chest, a token puzzle, a candle and a visiting aunt. */
export const secretBehaviors = [
  defineBehavior({
    id: 'secret.chest.locked',
    on: ['OBJECT_CLICKED'],
    rooms: SECRET,
    priority: Priority.DIRECT,
    when: (c) => isTarget(c, 'chest') && c.view.flag('secret.keyFound') !== true,
    react: (c) =>
      act('room', 1800, () => {
        anim(c, 'room', 'shake');
        say(c, 'room', ['*rattle* locked.', 'it won’t budge. a key went missing somewhere bouncy.'], 1800);
      }),
  }),
  defineBehavior({
    id: 'secret.chest.open',
    implements: ['INT-095', 'INT-081'],
    on: ['OBJECT_STATE_CHANGED'],
    rooms: SECRET,
    priority: Priority.DIRECT,
    when: (c) => c.event.payload.target === 'chest' && c.event.payload.key === 'open',
    react: (c) =>
      act('room', 2600, () => {
        say(c, 'room', ['creeeak. …a sock?', 'treasure! (it’s a sock.)'], 2600);
        c.effects.discover('chest');
      }),
  }),
  defineBehavior({
    id: 'secret.combo.wrong',
    on: ['OBJECT_STATE_CHANGED'],
    rooms: SECRET,
    priority: Priority.DIRECT,
    when: (c) => c.event.payload.target === 'cabinet' && c.event.payload.value !== SOLUTION,
    react: (c) =>
      act('cabinet', 1400, (ctl) => {
        // the tokens pop back out after a beat
        ctl.after(900, () => c.effects.setFlag('secret.slots', ''));
      }),
  }),
  defineBehavior({
    id: 'secret.combo.right',
    implements: ['INT-082', 'INT-085', 'INT-025'],
    on: ['OBJECT_STATE_CHANGED'],
    rooms: SECRET,
    priority: Priority.DIRECT,
    when: (c) => c.event.payload.target === 'cabinet' && c.event.payload.value === SOLUTION,
    react: (c) =>
      act('aunt', 6000, (ctl) => {
        c.effects.discover('aunt');
        ctl.after(900, () => say(c, 'aunt', ['well. finally someone with manners.', 'I’m Great-Aunt Pim. I’ve been in that frame since 1997.'], 3200));
        ctl.after(4300, () => say(c, 'aunt', ['tell Pim to sit up straight.'], 1800));
      }),
  }),
  defineBehavior({
    id: 'secret.candle',
    implements: ['INT-084', 'INT-081'],
    on: ['OBJECT_STATE_CHANGED'],
    rooms: SECRET,
    priority: Priority.DIRECT,
    when: (c) => c.event.payload.target === 'candle' && c.event.payload.value === true,
    react: (c) => act('candle', 1500, (ctl) => ctl.after(1300, () => c.effects.discover('candle'))),
  }),
  defineBehavior({
    id: 'secret.welcome',
    on: ['ROOM_ENTERED'],
    rooms: SECRET,
    priority: Priority.CHARACTER,
    react: (c) =>
      act('room', 2400, (ctl) => ctl.after(600, () => say(c, 'room', c.event.payload.visits > 1 ? ['back again? we never saw you.'] : ['shh. you were never here.'], 2200))),
  }),
];
